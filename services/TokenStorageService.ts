import * as SecureStore from 'expo-secure-store';

class TokenStorageService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_DATA_KEY = 'user_data';
  private readonly USER_ROLE_KEY = 'user_role';

  // Store access token
  async setAccessToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(this.ACCESS_TOKEN_KEY, token);
    } catch (error) {
      console.error('Error storing access token:', error);
      throw new Error('Failed to store access token');
    }
  }

  // Get access token
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(this.ACCESS_TOKEN_KEY);
    } catch (error) {
      console.error('Error retrieving access token:', error);
      return null;
    }
  }

  // Store refresh token
  async setRefreshToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(this.REFRESH_TOKEN_KEY, token);
    } catch (error) {
      console.error('Error storing refresh token:', error);
      throw new Error('Failed to store refresh token');
    }
  }

  // Get refresh token
  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(this.REFRESH_TOKEN_KEY);
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
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw new Error('Failed to store tokens');
    }
  }

  // Store user data
  async setUserData(userData: any): Promise<void> {
    try {
      await SecureStore.setItemAsync(this.USER_DATA_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Error storing user data:', error);
      throw new Error('Failed to store user data');
    }
  }

  // Get user data
  async getUserData(): Promise<any | null> {
    try {
      const userData = await SecureStore.getItemAsync(this.USER_DATA_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error retrieving user data:', error);
      return null;
    }
  }

  // Store user role
  async setUserRole(role: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(this.USER_ROLE_KEY, role);
    } catch (error) {
      console.error('Error storing user role:', error);
      throw new Error('Failed to store user role');
    }
  }

  // Get user role
  async getUserRole(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(this.USER_ROLE_KEY);
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
    } catch (error) {
      console.error('Error clearing stored data:', error);
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

  // Get all tokens
  async getTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.getAccessToken(),
        this.getRefreshToken(),
      ]);
      return { accessToken, refreshToken };
    } catch (error) {
      console.error('Error retrieving tokens:', error);
      return { accessToken: null, refreshToken: null };
    }
  }
}

export default new TokenStorageService();
