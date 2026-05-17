import {
  AuthResponse,
  AuthTokens,
  ChangePasswordRequest,
  EnterpriseRegisterRequest,
  ForgotPasswordResponse,
  LoginRequest,
  OtpResetPasswordRequest,
  RegisterRequest,
  ResetPasswordRequest,
  User,
} from "../../types/auth";
import TokenStorageService from "../TokenStorageService";
import ApiService from "./ApiService";

class AuthService {
  private readonly BASE_URL = "/auth";

  // Register a new user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await ApiService.post<AuthResponse["data"]>(
        `${this.BASE_URL}/register`,
        userData,
      );

      if (response.success && response.data) {
        // Store tokens
        await ApiService.setAuthTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken,
        );
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
      throw new Error(error.response?.data?.message || "Registration failed");
    }
  }

  // Register a new enterprise
  async registerEnterprise(
    userData: EnterpriseRegisterRequest,
  ): Promise<AuthResponse> {
    try {
      const response = await ApiService.post<AuthResponse["data"]>(
        `${this.BASE_URL}/register`,
        userData,
      );

      if (response.success && response.data) {
        // Store tokens
        await ApiService.setAuthTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken,
        );
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
      throw new Error(
        error.response?.data?.message || "Enterprise registration failed",
      );
    }
  }

  // Login user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      // Use real API service only
      const response = await ApiService.post<AuthResponse["data"]>(
        `${this.BASE_URL}/login`,
        credentials,
      );

      if (response.success && response.data) {
        // Store tokens
        await ApiService.setAuthTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken,
        );
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
      throw new Error(
        error.response?.data?.message || error.message || "Login failed",
      );
    }
  }

  // Refresh access token
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const response = await ApiService.post<AuthTokens>(
        `${this.BASE_URL}/refresh-token`,
        { refreshToken },
      );

      if (response.success && response.data) {
        // Store new tokens
        await ApiService.setAuthTokens(
          response.data.accessToken,
          response.data.refreshToken,
        );
        return response.data;
      }

      throw new Error("Token refresh failed");
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Token refresh failed");
    }
  }

  // Logout user
  async logout(refreshToken?: string): Promise<void> {
    try {
      await ApiService.post(`${this.BASE_URL}/logout`, { refreshToken });
    } catch (error: any) {
      console.error("Logout error:", error);
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
      console.error("Logout all error:", error);
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

      throw new Error("Failed to get user profile");
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Failed to get user profile",
      );
    }
  }

  // Change password
  async changePassword(passwordData: ChangePasswordRequest): Promise<void> {
    try {
      const response = await ApiService.post(
        `${this.BASE_URL}/change-password`,
        passwordData,
      );

      if (!response.success) {
        throw new Error(response.message || "Password change failed");
      }
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Password change failed",
      );
    }
  }

  // Request password reset
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const response = await ApiService.post(
        `${this.BASE_URL}/forgot-password`,
        { email },
      );

      if (!response.success) {
        throw new Error(response.message || "Password reset request failed");
      }
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Password reset request failed",
      );
    }
  }

  // Reset password with token
  async resetPassword(resetData: ResetPasswordRequest): Promise<void> {
    try {
      const response = await ApiService.post(
        `${this.BASE_URL}/reset-password`,
        resetData,
      );

      if (!response.success) {
        throw new Error(response.message || "Password reset failed");
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Password reset failed");
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
      throw new Error(
        error.response?.data?.message || "Failed to get connected devices",
      );
    }
  }

  // Disconnect a device
  async disconnectDevice(deviceId: string): Promise<void> {
    try {
      const response = await ApiService.delete(
        `${this.BASE_URL}/devices/${deviceId}`,
      );

      if (!response.success) {
        throw new Error(response.message || "Device disconnection failed");
      }
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Device disconnection failed",
      );
    }
  }

  // Delete account
  async deleteAccount(): Promise<void> {
    try {
      const response = await ApiService.delete(`${this.BASE_URL}/account`);

      if (!response.success) {
        throw new Error(response.message || "Account deletion failed");
      }
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || "Account deletion failed",
      );
    }
  }

  // Nouvelle méthode pour gérer l'inscription avec connexion automatique
  async registerAndLogin(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      console.log("🚀 Inscription et connexion automatique...");

      const response = await ApiService.post<AuthResponse["data"]>(
        `${this.BASE_URL}/register`,
        userData,
      );

      if (response.success && response.data) {
        console.log(
          "✅ Inscription réussie, traitement de la connexion automatique...",
        );

        // Stocker immédiatement les tokens de façon séquentielle pour éviter les conflits
        await ApiService.setAuthTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken,
        );

        // Stocker le rôle utilisateur
        await ApiService.setUserRole(response.data.user.role);

        // Stocker les données utilisateur
        await TokenStorageService.setUserData(response.data.user);

        // Vérifier que les données sont bien stockées
        const storedTokens = await TokenStorageService.getTokens();
        const storedRole = await TokenStorageService.getUserRole();
        const storedUser = await TokenStorageService.getUserData();

        if (!storedTokens.accessToken || !storedRole || !storedUser) {
          console.warn(
            "⚠️ Données non stockées correctement, nouvelle tentative...",
          );

          // Nouvelle tentative de stockage
          await ApiService.setAuthTokens(
            response.data.tokens.accessToken,
            response.data.tokens.refreshToken,
          );
          await ApiService.setUserRole(response.data.user.role);
          await TokenStorageService.setUserData(response.data.user);
        }

        console.log("🎉 Tokens et données utilisateur stockés avec succès");
        console.log(
          "🔍 Vérification - Access Token:",
          storedTokens.accessToken ? "Présent" : "Manquant",
        );
        console.log("🔍 Vérification - Rôle:", storedRole);
        console.log("🔍 Vérification - Utilisateur:", storedUser?.email);

        return {
          success: response.success,
          message: response.message,
          data: response.data,
        };
      } else {
        throw new Error("Réponse invalide du serveur");
      }
    } catch (error: any) {
      console.error("❌ Erreur lors de l'inscription:", error);
      throw new Error(
        error.response?.data?.message || error.message || "Inscription échouée",
      );
    }
  }

  // Nouvelle méthode pour gérer l'inscription entreprise avec connexion automatique
  async registerEnterpriseAndLogin(
    userData: EnterpriseRegisterRequest,
  ): Promise<AuthResponse> {
    try {
      console.log("🚀 Inscription entreprise et connexion automatique...");
      console.log(
        "📤 Envoi des données d'inscription entreprise:",
        JSON.stringify(userData, null, 2),
      );

      const response = await ApiService.post<AuthResponse["data"]>(
        `${this.BASE_URL}/register`,
        userData,
      );

      if (response.success && response.data) {
        console.log(
          "✅ Inscription entreprise réussie, traitement de la connexion automatique...",
        );

        // Stocker immédiatement les tokens de façon séquentielle pour éviter les conflits
        await ApiService.setAuthTokens(
          response.data.tokens.accessToken,
          response.data.tokens.refreshToken,
        );

        // Stocker le rôle utilisateur
        await ApiService.setUserRole(response.data.user.role);

        // Stocker les données utilisateur
        await TokenStorageService.setUserData(response.data.user);

        // Vérifier que les données sont bien stockées
        const storedTokens = await TokenStorageService.getTokens();
        const storedRole = await TokenStorageService.getUserRole();
        const storedUser = await TokenStorageService.getUserData();

        if (!storedTokens.accessToken || !storedRole || !storedUser) {
          console.warn(
            "⚠️ Données entreprise non stockées correctement, nouvelle tentative...",
          );

          // Nouvelle tentative de stockage
          await ApiService.setAuthTokens(
            response.data.tokens.accessToken,
            response.data.tokens.refreshToken,
          );
          await ApiService.setUserRole(response.data.user.role);
          await TokenStorageService.setUserData(response.data.user);
        }

        console.log("🎉 Tokens et données entreprise stockés avec succès");
        console.log(
          "🔍 Vérification - Access Token:",
          storedTokens.accessToken ? "Présent" : "Manquant",
        );
        console.log("🔍 Vérification - Rôle:", storedRole);
        console.log("🔍 Vérification - Entreprise:", storedUser?.email);

        return {
          success: response.success,
          message: response.message,
          data: response.data,
        };
      } else {
        throw new Error("Réponse invalide du serveur");
      }
    } catch (error: any) {
      console.error("❌ Erreur lors de l'inscription entreprise:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Inscription entreprise échouée",
      );
    }
  }

  // Send forgot-password OTP code
  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    try {
      const response = await ApiService.post<ForgotPasswordResponse>(
        `${this.BASE_URL}/forgot-password`,
        { email },
      );

      if (response.success && response.data) {
        return response.data;
      }

      return { sent: true, expiresAt: "" };
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || error.message || "Envoi du code échoué",
      );
    }
  }

  // Reset password using email + OTP
  async resetPasswordWithOtp(resetData: OtpResetPasswordRequest): Promise<void> {
    try {
      const response = await ApiService.post(
        `${this.BASE_URL}/reset-password`,
        resetData,
      );

      if (!response.success) {
        throw new Error(response.message || "Réinitialisation du mot de passe échouée");
      }
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || error.message || "Réinitialisation du mot de passe échouée",
      );
    }
  }

  // Verify email OTP
  async verifyEmailOtp(
    otp: string,
    email?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log("🔄 Vérification OTP email...");
      const body: any = { otp };
      if (email) body.email = email;
      const response = await ApiService.post<any>(
        `${this.BASE_URL}/verify-email-otp`,
        body,
      );

      if (response.success) {
        console.log("✅ OTP vérifié avec succès");
        // Update stored user data with emailVerified = true
        const storedUser = await TokenStorageService.getUserData();
        if (storedUser) {
          storedUser.emailVerified = true;
          await TokenStorageService.setUserData(storedUser);
        }
      }

      return {
        success: response.success,
        message: response.message || "OTP vérifié",
      };
    } catch (error: any) {
      console.error("❌ Erreur vérification OTP:", error);
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Vérification OTP échouée",
      );
    }
  }

  // Resend email OTP
  async resendEmailOtp(
    email?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log("🔄 Renvoi OTP email...");
      const body: any = {};
      if (email) body.email = email;
      const response = await ApiService.post<any>(
        `${this.BASE_URL}/resend-email-otp`,
        body,
      );
      console.log("renvoi OTP response:", response);

      return {
        success: response.success,
        message: response.message || "OTP renvoyé",
      };
    } catch (error: any) {
      console.error("❌ Erreur renvoi OTP:", error);
      throw new Error(
        error.response?.data?.message || error.message || "Renvoi OTP échoué",
      );
    }
  }
}

export default new AuthService();
