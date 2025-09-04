import NotificationService from '../services/api/NotificationService';
import StartupPerformanceMonitor from './StartupPerformanceMonitor';

/**
 * Utilitaire pour préparer l'app au démarrage ultra-rapide
 * Centralise toutes les optimisations de performance
 */
class AppBootstrap {
  private static instance: AppBootstrap;
  private isBootstrapped = false;

  static getInstance(): AppBootstrap {
    if (!AppBootstrap.instance) {
      AppBootstrap.instance = new AppBootstrap();
    }
    return AppBootstrap.instance;
  }

  /**
   * Initialise l'app avec toutes les optimisations
   */
  async bootstrap(): Promise<void> {
    if (this.isBootstrapped) {
      return;
    }

    try {
      StartupPerformanceMonitor.mark('Bootstrap - Début initialisation');
      console.log('🚀 Initialisation ultra-rapide de l\'app...');
      
      // Préparer tous les services critiques
      await this.prepareServices();
      
      this.isBootstrapped = true;
      StartupPerformanceMonitor.mark('Bootstrap - Initialisation terminée');
      console.log('⚡ App prête en mode ultra-rapide');
      
    } catch (error) {
      console.warn('⚠️ Erreur lors du bootstrap (ignorée):', error);
      StartupPerformanceMonitor.mark('Bootstrap - Erreur initialisation');
    }
  }

  private async prepareServices(): Promise<void> {
    // Préparer tous les services qui pourraient être lents

    // Initialiser le service de notifications
    await NotificationService.initialize();

    // Marquer que les services sont prêts
    console.log('📦 Services préparés');
  }

  /**
   * Vérifie si l'app est prête pour un démarrage ultra-rapide
   */
  isReady(): boolean {
    return this.isBootstrapped;
  }
}

export default AppBootstrap.getInstance();
