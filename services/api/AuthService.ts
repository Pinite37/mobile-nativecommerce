import {
    AuthResponse,
    AuthTokens,
    ChangePasswordRequest,
    EnterpriseRegisterRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    User,
} from '../../types/auth';
import TokenStorageService from '../TokenStorageService';
import ApiService from './ApiService';
import { MockAuthService } from './MockAuthService';

// Enable mock mode for testing
const USE_MOCK_API = __DEV__; // Use mock in development mode

class AuthService {
  private readonly BASE_URL = '/auth';

  // Register a new user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await ApiService.post<AuthResponse['data']>(`${this.BASE_URL}/register`, userData);
      
      if (response.success && response.data) {
        // Store tokens
        await ApiService.setAuthTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
        // Store user role
        await ApiService.setUserRole(response.data.user.role);
        // Store user data
        await TokenStorageService.setUserData(response.data.user);
      }
      
      return {
        success: response.success,
        message: response.message,
        data: response.data!,
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  }

  // Register a new enterprise
  async registerEnterprise(userData: EnterpriseRegisterRequest): Promise<AuthResponse> {
    try {
      const response = await ApiService.post<AuthResponse['data']>(`${this.BASE_URL}/register`, userData);
      
      if (response.success && response.data) {
        // Store tokens
        await ApiService.setAuthTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
        // Store user role
        await ApiService.setUserRole(response.data.user.role);
        // Store user data
        await TokenStorageService.setUserData(response.data.user);
      }
      
      return {
        success: response.success,
        message: response.message,
        data: response.data!,
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Enterprise registration failed');
    }
  }

  // Login user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      // Use mock service in development mode
      if (USE_MOCK_API) {
        const response = await MockAuthService.login(credentials);
        
        if (response.success && response.data) {
          // Store tokens
          await ApiService.setAuthTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
          // Store user role
          await ApiService.setUserRole(response.data.user.role);
          // Store user data
          await TokenStorageService.setUserData(response.data.user);
        }
        
        return response;
      }
      
      // Use real API service
      const response = await ApiService.post<AuthResponse['data']>(`${this.BASE_URL}/login`, credentials);
      
      if (response.success && response.data) {
        // Store tokens
        await ApiService.setAuthTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
        // Store user role
        await ApiService.setUserRole(response.data.user.role);
        // Store user data
        await TokenStorageService.setUserData(response.data.user);
      }
      
      return {
        success: response.success,
        message: response.message,
        data: response.data!,
      };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  }

  // Refresh access token
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const response = await ApiService.post<AuthTokens>(`${this.BASE_URL}/refresh-token`, { refreshToken });
      
      if (response.success && response.data) {
        // Store new tokens
        await ApiService.setAuthTokens(response.data.accessToken, response.data.refreshToken);
        return response.data;
      }
      
      throw new Error('Token refresh failed');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Token refresh failed');
    }
  }

  // Logout user
  async logout(refreshToken?: string): Promise<void> {
    try {
      await ApiService.post(`${this.BASE_URL}/logout`, { refreshToken });
    } catch (error: any) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens regardless of API success
      await ApiService.clearAuthTokens();
    }
  }

  // Logout from all devices
  async logoutAll(): Promise<void> {
    try {
      await ApiService.post(`${this.BASE_URL}/logout-all`);
    } catch (error: any) {
      console.error('Logout all error:', error);
    } finally {
      // Clear tokens regardless of API success
      await ApiService.clearAuthTokens();
    }
  }

  // Get current user profile
  async getCurrentUser(): Promise<User> {
    try {
      const response = await ApiService.get<User>(`${this.BASE_URL}/me`);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to get user profile');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get user profile');
    }
  }

  // Change password
  async changePassword(passwordData: ChangePasswordRequest): Promise<void> {
    try {
      const response = await ApiService.post(`${this.BASE_URL}/change-password`, passwordData);
      
      if (!response.success) {
        throw new Error(response.message || 'Password change failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Password change failed');
    }
  }

  // Request password reset
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const response = await ApiService.post(`${this.BASE_URL}/forgot-password`, { email });
      
      if (!response.success) {
        throw new Error(response.message || 'Password reset request failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Password reset request failed');
    }
  }

  // Reset password with token
  async resetPassword(resetData: ResetPasswordRequest): Promise<void> {
    try {
      const response = await ApiService.post(`${this.BASE_URL}/reset-password`, resetData);
      
      if (!response.success) {
        throw new Error(response.message || 'Password reset failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Password reset failed');
    }
  }

  // Verify token
  async verifyToken(): Promise<boolean> {
    try {
      const response = await ApiService.get(`${this.BASE_URL}/verify-token`);
      return response.success;
    } catch {
      return false;
    }
  }

  // Get connected devices
  async getConnectedDevices(): Promise<any[]> {
    try {
      const response = await ApiService.get<any[]>(`${this.BASE_URL}/devices`);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return [];
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get connected devices');
    }
  }

  // Disconnect a device
  async disconnectDevice(deviceId: string): Promise<void> {
    try {
      const response = await ApiService.delete(`${this.BASE_URL}/devices/${deviceId}`);
      
      if (!response.success) {
        throw new Error(response.message || 'Device disconnection failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Device disconnection failed');
    }
  }
}

export default new AuthService();
