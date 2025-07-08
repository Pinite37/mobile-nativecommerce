import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Platform } from 'react-native';
import { ApiResponse } from '../../types/auth';
import TokenStorageService from '../TokenStorageService';

class ApiService {
  private axiosInstance: AxiosInstance;
  private baseURL: string;

  constructor() {
    // Configure baseURL based on platform
    if (Platform.OS === 'android') {
      // this.baseURL = 'http://192.168.86.143:4000/api'; 
      this.baseURL = 'http://192.168.0.105:4000/api'; 
    } else if (Platform.OS === 'ios') {
      this.baseURL = 'http://localhost:4000/api'; // iOS simulator
    } else {
      this.baseURL = 'http://localhost:4000/api'; // Web/other platforms
    }

    console.log('🌐 API Base URL:', this.baseURL);

    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      async (config: any) => {
        // Add auth token if available
        const token = await TokenStorageService.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
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
        console.log('📤 Request Data Type:', typeof config.data);
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
        console.error('❌ API Response Error:', error.response?.status, error.response?.data);
        
        // Handle 401 errors (unauthorized)
        if (error.response?.status === 401) {
          const originalRequest = error.config;
          
          if (!originalRequest._retry) {
            originalRequest._retry = true;
            
            try {
              const refreshToken = await TokenStorageService.getRefreshToken();
              if (refreshToken) {
                const newTokens = await this.refreshAccessToken(refreshToken);
                await TokenStorageService.setTokens(newTokens.accessToken, newTokens.refreshToken);
                
                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
                return this.axiosInstance(originalRequest);
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              await TokenStorageService.clearAll();
              // Redirect to login screen
              // You can emit an event or use a navigation service here
            }
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  private getDeviceInfo(): object | null {
    // This will be implemented with device info collection
    return {
      platform: 'mobile',
      deviceName: 'React Native App',
    };
  }

  private async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const response = await axios.post(`${this.baseURL}/auth/refresh-token`, {
      refreshToken,
    });
    
    return response.data.data;
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
      console.error('❌ GET Error:', error);
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
}

export default new ApiService();
