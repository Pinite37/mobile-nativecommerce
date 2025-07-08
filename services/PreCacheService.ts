import StartupPerformanceMonitor from '../utils/StartupPerformanceMonitor';
import TokenStorageService from './TokenStorageService';

class PreCacheService {
  private static instance: PreCacheService;
  private preloadPromise: Promise<void> | null = null;

  static getInstance(): PreCacheService {
    if (!PreCacheService.instance) {
      PreCacheService.instance = new PreCacheService();
    }
    return PreCacheService.instance;
  }

  /**
   * Précharge les données critiques dès le démarrage de l'app
   * pour éviter les appels synchrones plus tard
   */
  async preloadCriticalData(): Promise<void> {
    if (this.preloadPromise) {
      return this.preloadPromise;
    }

    this.preloadPromise = this.doPreload();
    return this.preloadPromise;
  }

  private async doPreload(): Promise<void> {
    try {
      StartupPerformanceMonitor.mark('PreCache - Début préchargement');
      console.log('🚀 Préchargement des données critiques...');
      
      // Précharger toutes les données d'auth en une seule fois
      const start = Date.now();
      
      await Promise.all([
        TokenStorageService.getTokens(),
        TokenStorageService.getUserData(),
        TokenStorageService.getUserRole()
      ]);
      
      const duration = Date.now() - start;
      console.log(`⚡ Préchargement terminé en ${duration}ms`);
      StartupPerformanceMonitor.mark('PreCache - Préchargement terminé');
      
    } catch (error) {
      console.warn('⚠️ Erreur lors du préchargement (ignorée):', error);
      StartupPerformanceMonitor.mark('PreCache - Erreur préchargement');
    }
  }
}

export default PreCacheService.getInstance();
