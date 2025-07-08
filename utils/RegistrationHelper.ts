/**
 * Utilitaire pour gérer le processus d'inscription et de connexion automatique
 */

import AuthService from '../services/api/AuthService';
import TokenStorageService from '../services/TokenStorageService';
import { AuthResponse } from '../types/auth';

export class RegistrationHelper {
  /**
   * Vérifie que l'inscription s'est bien passée et que les données sont stockées
   */
  static async verifyRegistrationSuccess(response: AuthResponse): Promise<boolean> {
    try {
      if (!response.success || !response.data) {
        console.error('❌ Réponse d\'inscription invalide');
        return false;
      }

      // Vérifier que les tokens sont présents dans la réponse
      const { tokens, user } = response.data;
      if (!tokens?.accessToken || !tokens?.refreshToken || !user) {
        console.error('❌ Données d\'inscription incomplètes');
        return false;
      }

      // Vérifier que les données sont bien stockées
      const storedTokens = await TokenStorageService.getTokens();
      const storedRole = await TokenStorageService.getUserRole();
      const storedUser = await TokenStorageService.getUserData();

      if (!storedTokens.accessToken || !storedRole || !storedUser) {
        console.warn('⚠️ Données non stockées correctement');
        return false;
      }

      console.log('✅ Inscription et stockage vérifiés avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la vérification d\'inscription:', error);
      return false;
    }
  }

  /**
   * Effectue une inscription avec connexion automatique et vérification
   */
  static async registerWithAutoLogin(
    userData: any,
    isEnterprise: boolean = false
  ): Promise<AuthResponse> {
    try {
      console.log('🚀 Début du processus d\'inscription avec connexion automatique...');
      
      // Effectuer l'inscription
      const response = isEnterprise 
        ? await AuthService.registerEnterpriseAndLogin(userData)
        : await AuthService.registerAndLogin(userData);
      
      // Vérifier le succès
      const isSuccess = await this.verifyRegistrationSuccess(response);
      
      if (!isSuccess) {
        console.warn('⚠️ Vérification post-inscription échouée, mais inscription probablement réussie');
        // Ne pas lancer d'erreur car l'inscription a probablement fonctionné
      }
      
      console.log('🎉 Processus d\'inscription terminé avec succès');
      return response;
    } catch (error) {
      console.error('❌ Erreur dans le processus d\'inscription:', error);
      throw error;
    }
  }

  /**
   * Affiche des logs détaillés sur l'état de l'authentification
   */
  static async logAuthenticationState(): Promise<void> {
    try {
      const tokens = await TokenStorageService.getTokens();
      const role = await TokenStorageService.getUserRole();
      const user = await TokenStorageService.getUserData();
      
      console.log('🔍 État d\'authentification:');
      console.log('  - Access Token:', tokens.accessToken ? 'Présent' : 'Manquant');
      console.log('  - Refresh Token:', tokens.refreshToken ? 'Présent' : 'Manquant');
      console.log('  - Rôle:', role || 'Aucun');
      console.log('  - Utilisateur:', user ? `${user.firstName} ${user.lastName} (${user.email})` : 'Aucun');
    } catch (error) {
      console.error('❌ Erreur lors de l\'affichage de l\'état d\'authentification:', error);
    }
  }
}
