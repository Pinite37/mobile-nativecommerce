import * as SecureStore from 'expo-secure-store';

class TokenStorageService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_DATA_KEY = 'user_data';
  private readonly USER_ROLE_KEY = 'user_role';
  
  // Cache en mémoire pour éviter les appels répétés à SecureStore
  private memoryCache: {
    accessToken?: string | null;
    refreshToken?: string | null;
    userData?: any | null;
    userRole?: string | null;
  } = {};
  
  private cacheTimestamp = 0;
  private readonly CACHE_DURATION = 30000; // 30 secondes

  // Check if cache is still valid
  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_DURATION;
  }

  // Clear memory cache
  private clearMemoryCache(): void {
    this.memoryCache = {};
    this.cacheTimestamp = 0;
  }

  // Store access token
  async setAccessToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(this.ACCESS_TOKEN_KEY, token);
      this.memoryCache.accessToken = token;
      this.cacheTimestamp = Date.now();
    } catch (error) {
      console.error('Error storing access token:', error);
      throw new Error('Failed to store access token');
    }
  }

  // Get access token
  async getAccessToken(): Promise<string | null> {
    try {
      // Use cache if valid
      if (this.isCacheValid() && this.memoryCache.accessToken !== undefined) {
        return this.memoryCache.accessToken;
      }
      
      const token = await SecureStore.getItemAsync(this.ACCESS_TOKEN_KEY);
      this.memoryCache.accessToken = token;
      this.cacheTimestamp = Date.now();
      return token;
    } catch (error) {
      console.error('Error retrieving access token:', error);
      return null;
    }
  }

  // Store refresh token
  async setRefreshToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(this.REFRESH_TOKEN_KEY, token);
      this.memoryCache.refreshToken = token;
      this.cacheTimestamp = Date.now();
    } catch (error) {
      console.error('Error storing refresh token:', error);
      throw new Error('Failed to store refresh token');
    }
  }

  // Get refresh token
  async getRefreshToken(): Promise<string | null> {
    try {
      // Use cache if valid
      if (this.isCacheValid() && this.memoryCache.refreshToken !== undefined) {
        return this.memoryCache.refreshToken;
      }
      
      const token = await SecureStore.getItemAsync(this.REFRESH_TOKEN_KEY);
      this.memoryCache.refreshToken = token;
      this.cacheTimestamp = Date.now();
      return token;
    } catch (error) {
      console.error('Error retrieving refresh token:', error);
      return null;
    }
  }

  // Store both tokens
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      await Promise.all([
        this.setAccessToken(accessToken),
        this.setRefreshToken(refreshToken),
      ]);
      // Cache is updated in individual methods
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw new Error('Failed to store tokens');
    }
  }

  // Store user data
  async setUserData(userData: any): Promise<void> {
    try {
      await SecureStore.setItemAsync(this.USER_DATA_KEY, JSON.stringify(userData));
      this.memoryCache.userData = userData;
      this.cacheTimestamp = Date.now();
    } catch (error) {
      console.error('Error storing user data:', error);
      throw new Error('Failed to store user data');
    }
  }

  // Get user data
  async getUserData(): Promise<any | null> {
    try {
      // Use cache if valid
      if (this.isCacheValid() && this.memoryCache.userData !== undefined) {
        return this.memoryCache.userData;
      }
      
      const userData = await SecureStore.getItemAsync(this.USER_DATA_KEY);
      const parsedData = userData ? JSON.parse(userData) : null;
      this.memoryCache.userData = parsedData;
      this.cacheTimestamp = Date.now();
      return parsedData;
    } catch (error) {
      console.error('Error retrieving user data:', error);
      return null;
    }
  }

  // Store user role
  async setUserRole(role: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(this.USER_ROLE_KEY, role);
      this.memoryCache.userRole = role;
      this.cacheTimestamp = Date.now();
    } catch (error) {
      console.error('Error storing user role:', error);
      throw new Error('Failed to store user role');
    }
  }

  // Get user role
  async getUserRole(): Promise<string | null> {
    try {
      // Use cache if valid
      if (this.isCacheValid() && this.memoryCache.userRole !== undefined) {
        return this.memoryCache.userRole;
      }
      
      const role = await SecureStore.getItemAsync(this.USER_ROLE_KEY);
      this.memoryCache.userRole = role;
      this.cacheTimestamp = Date.now();
      return role;
    } catch (error) {
      console.error('Error retrieving user role:', error);
      return null;
    }
  }

  // Clear all tokens and user data
  async clearAll(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(this.ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(this.REFRESH_TOKEN_KEY),
        SecureStore.deleteItemAsync(this.USER_DATA_KEY),
        SecureStore.deleteItemAsync(this.USER_ROLE_KEY),
      ]);
      this.clearMemoryCache();
    } catch (error) {
      console.error('Error clearing stored data:', error);
      this.clearMemoryCache();
      // Don't throw error here, as we still want to clear what we can
    }
  }

  // Clear only tokens
  async clearTokens(): Promise<void> {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(this.ACCESS_TOKEN_KEY),
        SecureStore.deleteItemAsync(this.REFRESH_TOKEN_KEY),
      ]);
      this.memoryCache.accessToken = null;
      this.memoryCache.refreshToken = null;
      this.cacheTimestamp = Date.now();
    } catch (error) {
      console.error('Error clearing tokens:', error);
      // Don't throw error here, as we still want to clear what we can
    }
  }

  // Check if user is logged in
  async isLoggedIn(): Promise<boolean> {
    try {
      const accessToken = await this.getAccessToken();
      const refreshToken = await this.getRefreshToken();
      return !!(accessToken && refreshToken);
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  }

  // Get all tokens (optimized version)
  async getTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    try {
      // If cache is valid and has both tokens, return from cache
      if (this.isCacheValid() && 
          this.memoryCache.accessToken !== undefined && 
          this.memoryCache.refreshToken !== undefined) {
        return { 
          accessToken: this.memoryCache.accessToken, 
          refreshToken: this.memoryCache.refreshToken 
        };
      }
      
      // Otherwise, fetch from secure store
      const [accessToken, refreshToken] = await Promise.all([
        SecureStore.getItemAsync(this.ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(this.REFRESH_TOKEN_KEY),
      ]);
      
      // Update cache
      this.memoryCache.accessToken = accessToken;
      this.memoryCache.refreshToken = refreshToken;
      this.cacheTimestamp = Date.now();
      
      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Error retrieving tokens:', error);
      return { accessToken: null, refreshToken: null };
    }
  }
}

export default new TokenStorageService();
