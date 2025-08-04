import { useEffect } from 'react';
import SearchCacheService from '../services/SearchCacheService';

/**
 * Hook personnalisé pour gérer automatiquement le cache de recherche
 * - Nettoie le cache expiré au montage
 * - Peut être utilisé dans différents composants
 */
export const useSearchCache = () => {
  useEffect(() => {
    const initializeCache = async () => {
      try {
        // Nettoyer le cache expiré
        await SearchCacheService.cleanExpiredCache();
        
        // Obtenir les statistiques pour debug
        const stats = await SearchCacheService.getCacheStats();
        console.log('🧹 Cache initialisé:', stats);
      } catch (error) {
        console.error('❌ Erreur initialisation cache:', error);
      }
    };

    initializeCache();
    
    // Nettoyer le cache périodiquement (toutes les 10 minutes)
    const cleanupInterval = setInterval(async () => {
      try {
        await SearchCacheService.cleanExpiredCache();
        console.log('🕐 Nettoyage périodique du cache effectué');
      } catch (error) {
        console.error('❌ Erreur nettoyage périodique:', error);
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => {
      clearInterval(cleanupInterval);
    };
  }, []);

  return {
    // Fonctions utiles pour les composants
    getCacheStats: SearchCacheService.getCacheStats,
    clearCache: SearchCacheService.cleanExpiredCache,
    clearHistory: SearchCacheService.clearRecentSearches,
  };
};

export default useSearchCache;
