import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse } from '../../types/auth';
import AuthEventEmitter from '../../utils/AuthEventEmitter';
import TokenStorageService from '../TokenStorageService';

class ApiService {
  private axiosInstance: AxiosInstance;
  private baseURL: string;
  private isRefreshing: boolean = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    // Utiliser la variable d'environnement ou valeur par défaut
    const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
    this.baseURL = `${backendUrl}/api`;

    console.log('🌐 API Base URL:', this.baseURL);
    console.log('🔧 Backend URL from .env:', process.env.EXPO_PUBLIC_BACKEND_URL);

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });

    this.setupInterceptors();
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback);
  }

  private setupInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config: any) => {
        // Add JWT Bearer token in custom header
        const token = await TokenStorageService.getAccessToken();
        if (token) {
          config.headers['X-Auth-Token'] = `Bearer ${token}`;
          console.log('🔐 Token JWT ajouté à X-Auth-Token:', `***${token.slice(-10)}`);
        } else {
          console.log('⚠️ Aucun token JWT disponible pour cette requête');
        }

        // Add device info
        const deviceInfo = this.getDeviceInfo();
        if (deviceInfo) {
          config.headers['X-Device-Info'] = JSON.stringify(deviceInfo);
        }

        // Toujours utiliser JSON maintenant que nous n'utilisons plus FormData
        config.headers['Content-Type'] = 'application/json';

        console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        console.log('📤 Request Headers:', config.headers);
        if (config.method?.toUpperCase() === 'GET') {
          console.log('📤 Request Body: (none for GET)');
        } else {
          const dataType = config.data === undefined ? 'undefined' : Array.isArray(config.data) ? 'array' : typeof config.data;
          console.log('📤 Request Data Type:', dataType);
        }
        return config;
      },
      (error: any) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error: any) => {
        const status = error.response?.status;
        if (status === 404) {
          console.warn('⚠️ API 404 Not Found:', error.config?.url);
        } else if (status !== 401) {
          console.error('❌ API Response Error:', status, error.response?.data);
        }
        
        // Handle 401 errors (unauthorized) - Token expiré
        if (error.response?.status === 401) {
          const originalRequest = error.config;

          // Les endpoints d'auth renvoient un 401 pour des raisons métier (mauvais mot de passe,
          // email inconnu…) et non pour une session expirée — on laisse passer sans toucher à la session.
          const isAuthEndpoint = /\/auth\/(login|signin|signup|register|forgot-password|reset-password|verify)/i
            .test(originalRequest?.url ?? '');
          if (isAuthEndpoint) {
            return Promise.reject(error);
          }

          // Éviter les boucles infinies
          if (originalRequest._retry) {
            console.warn('⚠️ Requête déjà retentée, abandon');
            return Promise.reject(error);
          }
          
          originalRequest._retry = true;
          
          // Si un refresh est déjà en cours, attendre qu'il se termine
          if (this.isRefreshing) {
            console.log('⏳ Refresh en cours, mise en file d\'attente...');
            return new Promise((resolve) => {
              this.addRefreshSubscriber((token: string) => {
                originalRequest.headers['X-Auth-Token'] = `Bearer ${token}`;
                resolve(this.axiosInstance(originalRequest));
              });
            });
          }
          
          this.isRefreshing = true;
          console.log('🔄 Access token expiré, tentative de refresh...');
          
          try {
            const refreshToken = await TokenStorageService.getRefreshToken();
            
            if (!refreshToken) {
              console.error('❌ Pas de refresh token disponible - Session expirée');
              this.isRefreshing = false;
              await this.handleSessionExpired();
              return Promise.reject(error);
            }
            
            console.log('🔄 Refresh token trouvé, appel au serveur...');
            const newTokens = await this.refreshAccessToken(refreshToken);
            
            if (!newTokens || !newTokens.accessToken) {
              console.error('❌ Impossible d\'obtenir de nouveaux tokens');
              this.isRefreshing = false;
              await this.handleSessionExpired();
              return Promise.reject(error);
            }
            
            console.log('✅ Nouveaux tokens obtenus avec succès');
            await TokenStorageService.setTokens(newTokens.accessToken, newTokens.refreshToken);
            
            // Notifier tous les subscribers en attente
            this.onRefreshed(newTokens.accessToken);
            this.isRefreshing = false;
            
            // Retry la requête originale avec le nouveau token
            originalRequest.headers['X-Auth-Token'] = `Bearer ${newTokens.accessToken}`;
            console.log('🔄 Nouvelle tentative de la requête originale...');
            
            return this.axiosInstance(originalRequest);
            
          } catch (refreshError: any) {
            this.isRefreshing = false;
            console.error('❌ Erreur lors du refresh:', refreshError);
            
            // Vérifier si c'est une erreur réseau temporaire ou token vraiment expiré
            if (this.isNetworkError(refreshError)) {
              console.warn('⚠️ Erreur réseau lors du refresh - Session conservée');
              // NE PAS déconnecter l'utilisateur en cas d'erreur réseau
              return Promise.reject(error);
            }
            
            // Si c'est une erreur 401/403 du refresh, alors le refresh token est expiré
            if (refreshError.response?.status === 401 || refreshError.response?.status === 403) {
              console.error('❌ Refresh token expiré - Déconnexion nécessaire');
              await this.handleSessionExpired();
            } else {
              console.warn('⚠️ Erreur inconnue lors du refresh - Session conservée');
            }
            
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Vérifie si l'erreur est due au réseau (temporaire)
  private isNetworkError(error: any): boolean {
    return (
      !error.response || // Pas de réponse du serveur
      error.code === 'ECONNABORTED' || // Timeout
      error.code === 'ERR_NETWORK' || // Erreur réseau
      error.message?.includes('Network Error') ||
      error.message?.includes('timeout')
    );
  }

  // Gère l'expiration de la session (déconnexion propre)
  private async handleSessionExpired(): Promise<void> {
    console.log('🔒 Session expirée - Nettoyage et déconnexion');
    await TokenStorageService.clearAll();
    AuthEventEmitter.emitTokenInvalidated();
  }

  private getDeviceInfo(): object | null {
    // This will be implemented with device info collection
    return {
      platform: 'mobile',
      deviceName: 'React Native App',
    };
  }

  private async refreshAccessToken(refreshToken: string, retryCount: number = 0): Promise<{ accessToken: string; refreshToken: string }> {
    const maxRetries = 2; // Réessayer 2 fois en cas d'erreur réseau
    
    console.log(`🔄 Appel API refresh token... (tentative ${retryCount + 1}/${maxRetries + 1})`);
    
    try {
      // Utiliser axios directement pour éviter l'intercepteur
      const response = await axios.post(`${this.baseURL}/auth/refresh-token`, {
        refreshToken,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      
      console.log('✅ Refresh token réussi');
      
      if (!response.data || !response.data.data) {
        throw new Error('Réponse de refresh token invalide');
      }
      
      return response.data.data;
      
    } catch (error: any) {
      console.error(`❌ Erreur refresh token (tentative ${retryCount + 1}):`, error.response?.data || error.message);
      
      // Si c'est une erreur réseau et qu'on peut réessayer
      if (this.isNetworkError(error) && retryCount < maxRetries) {
        console.log(`⏳ Réessai dans 1 seconde...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde
        return this.refreshAccessToken(refreshToken, retryCount + 1);
      }
      
      throw error;
    }
  }

  private handleError(error: any): Error {
    console.log('🔍 ApiService handleError - Full error:', error);
    console.log('🔍 ApiService handleError - Error response:', error.response?.data);
    
    // Preserve the full error object so ErrorHandler can access response data
    if (error.response) {
      // Create a new error that preserves the axios error structure
      const preservedError = new Error(error.message || `HTTP ${error.response.status}`);
      (preservedError as any).response = error.response;
      return preservedError;
    } else if (error.request) {
      // Request was made but no response received
      console.error('❌ No response received:', error.request);
      return new Error('No response from server. Please check your connection.');
    } else {
      // Something else happened
      return new Error(error.message || 'Unknown error occurred');
    }
  }

  // Generic request methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.get(url, config);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        console.warn('⚠️ GET 404:', url);
      } else {
        console.error('❌ GET Error:', error);
      }
      throw this.handleError(error);
    }
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      console.log('📤 POST Payload:', JSON.stringify(data, null, 2));
      console.log('📤 POST URL:', `${this.baseURL}${url}`);
      
      const response = await this.axiosInstance.post(url, data, config);
      console.log('📥 POST Response:', response.status, response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ POST Error:', error);
      console.error('❌ POST Error Response:', error.response?.data);
      console.error('❌ POST Error Status:', error.response?.status);
      console.error('❌ POST Error Message:', error.message);
      throw this.handleError(error);
    }
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.put(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.patch(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.axiosInstance.delete(url, config);
    return response.data;
  }

  // Set tokens method for auth service
  async setAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
    await TokenStorageService.setTokens(accessToken, refreshToken);
  }

  // Clear tokens method for auth service
  async clearAuthTokens(): Promise<void> {
    await TokenStorageService.clearAll();
  }

  // Set user role method
  async setUserRole(role: string): Promise<void> {
    await TokenStorageService.setUserRole(role);
  }

  // Get user role method
  async getUserRole(): Promise<string | null> {
    return await TokenStorageService.getUserRole();
  }

  // Get tokens method
  async getTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    return await TokenStorageService.getTokens();
  }

  // Méthode optimisée pour les appels critiques (profil utilisateur)
  async getFast<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      // Timeout réduit pour les appels de démarrage
      const fastConfig = {
        ...config,
        timeout: 5000, // 5s au lieu de 10s
      };
      
      const response = await this.axiosInstance.get(url, fastConfig);
      return response.data;
    } catch (error: any) {
      console.error('❌ GET Fast Error:', error);
      
      // Logging spécial pour les timeouts
      if (error.code === 'ECONNABORTED') {
        console.warn('⚠️ Connexion lente détectée - timeout de 5s atteint');
      }
      
      throw this.handleError(error);
    }
  }

  // Enregistrer le token Expo Push pour les notifications
  async registerExpoPushToken(expoPushToken: string): Promise<ApiResponse<any>> {
    try {
      console.log('📱 Enregistrement du token Expo Push sur le backend...');
      console.log('🔑 Token:', expoPushToken);

      const response = await this.post('/push-notifications/expo-token', { expoPushToken });
      
      console.log('✅ Token Expo Push enregistré avec succès sur le backend');
      return response;
    } catch (error: any) {
      console.error('❌ Erreur enregistrement token Expo Push:', error);
      throw this.handleError(error);
    }
  }
}

export default new ApiService();
