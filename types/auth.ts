export interface User {
  _id: string;
  email: string;
  role: 'CLIENT' | 'ENTERPRISE';
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  profileImage?: string;
  isBlocked: boolean;
  blockedUntil?: Date;
  blockedReason?: string;
  lastActive: Date;
  location: {
    type: 'Point';
    coordinates: [number, number];
    address: string;
  };
  preferences: {
    language: string;
    currency: string;
    theme?: string; // ajout du thème
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
  subscription?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    tokens: AuthTokens;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: 'CLIENT' | 'ENTERPRISE';
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
}

export interface EnterpriseRegisterRequest extends RegisterRequest {
  companyName: string;
  ifuNumber: string;
  agreedToTerms: boolean;
  description: string;
  city: string;
  district: string;
  companyEmail?: string;
  whatsapp?: string;
  website?: string;
  socialLinks?: {
    platform: string;
    url: string;
  }[];
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
}

export interface DeviceInfo {
  deviceName?: string;
  platform?: string;
  ip?: string;
}
