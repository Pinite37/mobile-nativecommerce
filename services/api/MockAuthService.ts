import { AuthResponse, EnterpriseRegisterRequest, LoginRequest, RegisterRequest, User } from '../../types/auth';

// Mock authentication service for testing
export class MockAuthService {
  private static MOCK_DELAY = 1000; // 1 second delay to simulate network

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    await this.delay(this.MOCK_DELAY);
    
    // Mock validation
    if (!credentials.email || !credentials.password) {
      throw new Error('Email and password are required');
    }
    
    // Mock user data based on email
    const isEnterprise = credentials.email.includes('enterprise') || credentials.email.includes('business');
    const mockUser: User = {
      _id: '1',
      email: credentials.email,
      role: isEnterprise ? 'ENTERPRISE' : 'CLIENT',
      firstName: isEnterprise ? 'Enterprise' : 'Client',
      lastName: 'User',
      phone: '+229 12345678',
      address: 'Cotonou, Benin',
      profileImage: undefined,
      isBlocked: false,
      lastActive: new Date(),
      location: {
        type: 'Point',
        coordinates: [6.3573, 2.4181], // Cotonou coordinates
        address: 'Cotonou, Benin',
      },
      preferences: {
        language: 'fr',
        currency: 'XOF',
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    return {
      success: true,
      message: 'Login successful',
      data: {
        user: mockUser,
        tokens: {
          accessToken: 'mock-access-token-' + Date.now(),
          refreshToken: 'mock-refresh-token-' + Date.now(),
        },
      },
    };
  }

  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    await this.delay(this.MOCK_DELAY);
    
    if (!userData.email || !userData.password || !userData.firstName || !userData.lastName) {
      throw new Error('Email, password, first name, and last name are required');
    }
    
    const mockUser: User = {
      _id: '1',
      email: userData.email,
      role: userData.role,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      address: userData.address,
      profileImage: undefined,
      isBlocked: false,
      lastActive: new Date(),
      location: {
        type: 'Point',
        coordinates: [6.3573, 2.4181], // Cotonou coordinates
        address: userData.address,
      },
      preferences: {
        language: 'fr',
        currency: 'XOF',
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    return {
      success: true,
      message: 'Registration successful',
      data: {
        user: mockUser,
        tokens: {
          accessToken: 'mock-access-token-' + Date.now(),
          refreshToken: 'mock-refresh-token-' + Date.now(),
        },
      },
    };
  }

  static async registerEnterprise(userData: EnterpriseRegisterRequest): Promise<AuthResponse> {
    await this.delay(this.MOCK_DELAY);
    
    if (!userData.email || !userData.password || !userData.firstName || !userData.lastName || !userData.companyName) {
      throw new Error('Email, password, first name, last name, and company name are required');
    }
    
    const mockUser: User = {
      _id: '1',
      email: userData.email,
      role: userData.role,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phone: userData.phone,
      address: userData.address,
      profileImage: undefined,
      isBlocked: false,
      lastActive: new Date(),
      location: {
        type: 'Point',
        coordinates: [6.3573, 2.4181], // Cotonou coordinates
        address: userData.address,
      },
      preferences: {
        language: 'fr',
        currency: 'XOF',
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
      },
      subscription: 'enterprise',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    return {
      success: true,
      message: 'Enterprise registration successful',
      data: {
        user: mockUser,
        tokens: {
          accessToken: 'mock-access-token-' + Date.now(),
          refreshToken: 'mock-refresh-token-' + Date.now(),
        },
      },
    };
  }
}
