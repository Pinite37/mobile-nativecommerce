import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
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
        }

        const deviceInfo = await this.getDeviceInfo();
        config.headers['X-Device-Info'] = JSON.stringify(deviceInfo);

        config.headers['Content-Type'] = 'application/json';
        return config;
      },
      (error: any) => {
        console.error('❌ API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: any) => {
        
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
            return Promise.reject(error);
          }
          
          originalRequest._retry = true;

          // Si la requête n'avait pas de token, c'est une requête anonyme qui échoue
          // normalement (ex: utilisateur non connecté). Pas besoin de refresh.
          const hadToken = !!originalRequest.headers?.['X-Auth-Token'];
          if (!hadToken) {
            return Promise.reject(error);
          }

          // Si un refresh est déjà en cours, attendre qu'il se termine
          if (this.isRefreshing) {
            return new Promise((resolve) => {
              this.addRefreshSubscriber((token: string) => {
                originalRequest.headers['X-Auth-Token'] = `Bearer ${token}`;
                resolve(this.axiosInstance(originalRequest));
              });
            });
          }
          
          this.isRefreshing = true;

          try {
            const refreshToken = await TokenStorageService.getRefreshToken();

            if (!refreshToken) {
              this.isRefreshing = false;
              await this.handleSessionExpired();
              return Promise.reject(error);
            }

            const newTokens = await this.refreshAccessToken(refreshToken);

            if (!newTokens || !newTokens.accessToken) {
              this.isRefreshing = false;
              await this.handleSessionExpired();
              return Promise.reject(error);
            }

            await TokenStorageService.setTokens(newTokens.accessToken, newTokens.refreshToken);
            this.onRefreshed(newTokens.accessToken);
            this.isRefreshing = false;

            originalRequest.headers['X-Auth-Token'] = `Bearer ${newTokens.accessToken}`;
            return this.axiosInstance(originalRequest);

          } catch (refreshError: any) {
            this.isRefreshing = false;

            if (this.isNetworkError(refreshError)) {
              return Promise.reject(error);
            }

            if (refreshError.response?.status === 401 || refreshError.response?.status === 403) {
              await this.handleSessionExpired();
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
    await TokenStorageService.clearAll();
    AuthEventEmitter.emitTokenInvalidated();
  }

  private _cachedDeviceId: string | null = null;

  private async getDeviceInfo(): Promise<object> {
    if (!this._cachedDeviceId) {
      this._cachedDeviceId = await TokenStorageService.getOrCreateDeviceId();
    }
    return {
      deviceId: this._cachedDeviceId,
      platform: Platform.OS,
      deviceName: Device.deviceName ?? Device.modelName ?? Platform.OS,
    };
  }

  private async refreshAccessToken(refreshToken: string, retryCount: number = 0): Promise<{ accessToken: string; refreshToken: string }> {
    const maxRetries = 2; // Réessayer 2 fois en cas d'erreur réseau
    
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
      
      if (!response.data || !response.data.data) {
        throw new Error('Réponse de refresh token invalide');
      }
      
      return response.data.data;
      
    } catch (error: any) {
      if (this.isNetworkError(error) && retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.refreshAccessToken(refreshToken, retryCount + 1);
      }
      throw error;
    }
  }

  private handleError(error: any): Error {
    if (error.response) {
      const preservedError = new Error(error.message || `HTTP ${error.response.status}`);
      (preservedError as any).response = error.response;
      return preservedError;
    } else if (error.request) {
      return new Error('No response from server. Please check your connection.');
    } else {
      return new Error(error.message || 'Unknown error occurred');
    }
  }

  // Generic request methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.get(url, config);
      return response.data;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.axiosInstance.post(url, data, config);
      return response.data;
    } catch (error: any) {
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
      throw this.handleError(error);
    }
  }

  async registerExpoPushToken(expoPushToken: string): Promise<ApiResponse<any>> {
    try {
      return await this.post('/push-notifications/expo-token', { expoPushToken });
    } catch (error: any) {
      throw this.handleError(error);
    }
  }
}

export default new ApiService();
