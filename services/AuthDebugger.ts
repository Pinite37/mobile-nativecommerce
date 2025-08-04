import TokenStorageService from './TokenStorageService';

export class AuthDebugger {
  static async debugTokenStatus() {
    console.log('🔍 === DEBUG TOKEN STATUS ===');
    
    try {
      const accessToken = await TokenStorageService.getAccessToken();
      const refreshToken = await TokenStorageService.getRefreshToken();
      const userData = await TokenStorageService.getUserData();
      const userRole = await TokenStorageService.getUserRole();
      
      console.log('🔍 Access Token:', accessToken ? `***${accessToken.slice(-10)}` : 'NULL');
      console.log('🔍 Refresh Token:', refreshToken ? `***${refreshToken.slice(-10)}` : 'NULL');
      console.log('🔍 User Data:', userData ? 'EXISTS' : 'NULL');
      console.log('🔍 User Role:', userRole);
      
      if (!accessToken) {
        console.log('❌ PROBLÈME: Aucun access token trouvé!');
        return false;
      }
      
      if (!refreshToken) {
        console.log('❌ PROBLÈME: Aucun refresh token trouvé!');
        return false;
      }
      
      console.log('✅ Tokens trouvés correctement');
      return true;
      
    } catch (error) {
      console.error('❌ Erreur lors du debug des tokens:', error);
      return false;
    }
  }
  
  static async clearAllTokens() {
    console.log('🧹 Nettoyage de tous les tokens...');
    await TokenStorageService.clearAll();
    console.log('✅ Tous les tokens supprimés');
  }
  
  static async simulateExpiredToken() {
    console.log('🔧 Simulation d\'un token expiré...');
    
    try {
      const refreshToken = await TokenStorageService.getRefreshToken();
      if (!refreshToken) {
        console.log('❌ Pas de refresh token pour la simulation');
        return false;
      }
      
      // Remplacer l'access token par un token expiré/invalide
      await TokenStorageService.setAccessToken('expired_token_simulation');
      console.log('✅ Token expiré simulé - le prochain appel API devrait déclencher le refresh');
      return true;
      
    } catch (error) {
      console.error('❌ Erreur simulation token expiré:', error);
      return false;
    }
  }
}
