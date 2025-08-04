import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CachedSearchItem {
  query: string;
  timestamp: number;
  results: any[];
  searchInfo: any;
  filters: any;
}

export interface RecentSearch {
  query: string;
  timestamp: number;
  resultCount: number;
}

class SearchCacheService {
  private static CACHE_KEY = '@search_cache';
  private static RECENT_SEARCHES_KEY = '@recent_searches';
  private static CACHE_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes
  private static MAX_RECENT_SEARCHES = 10;
  private static RECENT_SEARCH_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 jours

  /**
   * Met en cache les résultats d'une recherche
   */
  static async cacheSearchResults(
    query: string,
    results: any[],
    searchInfo: any,
    filters: any = {}
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(query, filters);
      const cachedItem: CachedSearchItem = {
        query,
        timestamp: Date.now(),
        results,
        searchInfo,
        filters
      };

      await AsyncStorage.setItem(`${this.CACHE_KEY}_${cacheKey}`, JSON.stringify(cachedItem));
      console.log('✅ Résultats mis en cache pour:', query);
    } catch (error) {
      console.error('❌ Erreur mise en cache:', error);
    }
  }

  /**
   * Récupère les résultats en cache s'ils sont encore valides
   */
  static async getCachedSearchResults(
    query: string,
    filters: any = {}
  ): Promise<CachedSearchItem | null> {
    try {
      const cacheKey = this.generateCacheKey(query, filters);
      const cachedData = await AsyncStorage.getItem(`${this.CACHE_KEY}_${cacheKey}`);
      
      if (!cachedData) return null;

      const cachedItem: CachedSearchItem = JSON.parse(cachedData);
      const isExpired = Date.now() - cachedItem.timestamp > this.CACHE_EXPIRY_TIME;

      if (isExpired) {
        // Supprimer le cache expiré
        await AsyncStorage.removeItem(`${this.CACHE_KEY}_${cacheKey}`);
        console.log('🗑️ Cache expiré supprimé pour:', query);
        return null;
      }

      console.log('⚡ Résultats récupérés du cache pour:', query);
      return cachedItem;
    } catch (error) {
      console.error('❌ Erreur récupération cache:', error);
      return null;
    }
  }

  /**
   * Ajoute une recherche à l'historique récent
   */
  static async addToRecentSearches(query: string, resultCount: number): Promise<void> {
    try {
      const recentSearches = await this.getRecentSearches();
      
      // Supprimer la recherche si elle existe déjà
      const filteredSearches = recentSearches.filter(search => search.query !== query);
      
      // Ajouter la nouvelle recherche au début
      const newSearch: RecentSearch = {
        query,
        timestamp: Date.now(),
        resultCount
      };
      
      filteredSearches.unshift(newSearch);
      
      // Limiter le nombre de recherches récentes
      const limitedSearches = filteredSearches.slice(0, this.MAX_RECENT_SEARCHES);
      
      await AsyncStorage.setItem(this.RECENT_SEARCHES_KEY, JSON.stringify(limitedSearches));
      console.log('📝 Recherche ajoutée à l\'historique:', query);
    } catch (error) {
      console.error('❌ Erreur ajout recherche récente:', error);
    }
  }

  /**
   * Récupère les recherches récentes (non expirées)
   */
  static async getRecentSearches(): Promise<RecentSearch[]> {
    try {
      const recentSearchesData = await AsyncStorage.getItem(this.RECENT_SEARCHES_KEY);
      if (!recentSearchesData) return [];

      const recentSearches: RecentSearch[] = JSON.parse(recentSearchesData);
      const now = Date.now();
      
      // Filtrer les recherches expirées
      const validSearches = recentSearches.filter(
        search => now - search.timestamp < this.RECENT_SEARCH_EXPIRY
      );

      // Sauvegarder seulement les recherches valides
      if (validSearches.length !== recentSearches.length) {
        await AsyncStorage.setItem(this.RECENT_SEARCHES_KEY, JSON.stringify(validSearches));
        console.log('🧹 Recherches expirées nettoyées');
      }

      return validSearches;
    } catch (error) {
      console.error('❌ Erreur récupération recherches récentes:', error);
      return [];
    }
  }

  /**
   * Supprime une recherche récente
   */
  static async removeFromRecentSearches(query: string): Promise<void> {
    try {
      const recentSearches = await this.getRecentSearches();
      const filteredSearches = recentSearches.filter(search => search.query !== query);
      
      await AsyncStorage.setItem(this.RECENT_SEARCHES_KEY, JSON.stringify(filteredSearches));
      console.log('🗑️ Recherche supprimée de l\'historique:', query);
    } catch (error) {
      console.error('❌ Erreur suppression recherche récente:', error);
    }
  }

  /**
   * Vide tout l'historique des recherches récentes
   */
  static async clearRecentSearches(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.RECENT_SEARCHES_KEY);
      console.log('🧹 Historique des recherches vidé');
    } catch (error) {
      console.error('❌ Erreur vidage historique:', error);
    }
  }

  /**
   * Nettoie tout le cache de recherche expiré
   */
  static async cleanExpiredCache(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.CACHE_KEY));
      
      let cleanedCount = 0;
      for (const key of cacheKeys) {
        const cachedData = await AsyncStorage.getItem(key);
        if (cachedData) {
          const cachedItem: CachedSearchItem = JSON.parse(cachedData);
          const isExpired = Date.now() - cachedItem.timestamp > this.CACHE_EXPIRY_TIME;
          
          if (isExpired) {
            await AsyncStorage.removeItem(key);
            cleanedCount++;
          }
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 ${cleanedCount} caches expirés nettoyés`);
      }
    } catch (error) {
      console.error('❌ Erreur nettoyage cache:', error);
    }
  }

  /**
   * Génère une clé de cache unique basée sur la requête et les filtres
   */
  private static generateCacheKey(query: string, filters: any): string {
    const filterString = JSON.stringify(filters);
    return `${query}_${Buffer.from(filterString).toString('base64').slice(0, 10)}`;
  }

  /**
   * Obtient des statistiques sur le cache
   */
  static async getCacheStats(): Promise<{
    totalCachedSearches: number;
    recentSearchesCount: number;
    cacheSize: string;
  }> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => key.startsWith(this.CACHE_KEY));
      const recentSearches = await this.getRecentSearches();
      
      // Estimation approximative de la taille du cache
      let totalSize = 0;
      for (const key of cacheKeys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalSize += data.length;
        }
      }
      
      return {
        totalCachedSearches: cacheKeys.length,
        recentSearchesCount: recentSearches.length,
        cacheSize: `${(totalSize / 1024).toFixed(2)} KB`
      };
    } catch (error) {
      console.error('❌ Erreur statistiques cache:', error);
      return {
        totalCachedSearches: 0,
        recentSearchesCount: 0,
        cacheSize: '0 KB'
      };
    }
  }
}

export default SearchCacheService;
