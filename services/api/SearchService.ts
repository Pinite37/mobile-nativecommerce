import { Category, Product } from '../../types/product';
import ApiService from './ApiService';

// Types pour les suggestions
export interface SearchSuggestion {
  type: 'product' | 'category' | 'enterprise';
  text: string;
  value: string;
}

// Types pour la recherche avancée
export interface AdvancedSearchFilters {
  searchTerm?: string;
  categories?: string[];
  priceRange?: {
    min?: number;
    max?: number;
  };
  location?: {
    city?: string;
    district?: string;
  };
  enterprises?: string[];
  specifications?: {
    key: string;
    value: string;
  }[];
  tags?: string[];
  sort?: 'relevance' | 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'rating' | 'popular';
  page?: number;
  limit?: number;
}

// Types pour les filtres disponibles
export interface AvailableFilters {
  categories: Category[];
  locations: {
    cities: string[];
    districtsByCity: Record<string, string[]>;
  };
  priceRange: {
    minPrice: number;
    maxPrice: number;
  };
  popularTags: string[];
  sortOptions: {
    value: string;
    label: string;
  }[];
}

// Response types selon la structure réelle de l'API
export interface SearchProductsResponse {
  success: boolean;
  message: string;
  data: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  searchInfo: {
    query: string;
    totalResults: number;
    searchTime: number;
  };
}

export interface EnterpriseSearchResponse {
  enterprises: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class SearchService {
  private readonly BASE_URL = '/search';

  /**
   * Recherche avancée multi-critères utilisant l'endpoint POST /advanced
   */
  async advancedSearch(filters: AdvancedSearchFilters): Promise<SearchProductsResponse> {
    try {
      console.log('🔍 SEARCH SERVICE - Recherche avancée:', filters);

      const response = await ApiService.post<any>(`${this.BASE_URL}/advanced`, filters);

      console.log('✅ Réponse recherche avancée reçue:', response);
      
      if (response.success !== undefined) {
        return response as SearchProductsResponse;
      } else {
        return {
          success: response.success || false,
          message: response.message || 'Recherche terminée',
          data: response.data || [],
          pagination: (response as any).pagination || {
            page: filters.page || 1,
            limit: filters.limit || 20,
            total: (response.data || []).length,
            pages: 1
          },
          searchInfo: (response as any).searchInfo || {
            query: filters.searchTerm || '',
            totalResults: (response.data || []).length,
            searchTime: 0
          }
        };
      }

    } catch (error: any) {
      console.error('❌ Erreur recherche avancée:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Recherche avancée échouée',
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        searchInfo: { query: filters.searchTerm || '', totalResults: 0, searchTime: 0 }
      };
    }
  }

  /**
   * Recherche générale de produits (utilise l'endpoint GET /products)
   */
  async searchProducts(
    query: string,
    filters: {
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      city?: string;
      district?: string;
      enterprise?: string;
      sort?: string;
      page?: number;
      limit?: number;
      inStock?: boolean;
    } = {}
  ): Promise<SearchProductsResponse> {
    try {
      console.log('🔍 SEARCH SERVICE - Recherche produits:', query);
      console.log('🔧 Filtres appliqués:', filters);

      const params = new URLSearchParams();
      params.append('q', query);
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await ApiService.get<any>(`${this.BASE_URL}/products?${params}`);

      console.log('✅ Réponse de recherche reçue:', response);
      
      if (response.success !== undefined) {
        return response as SearchProductsResponse;
      } else {
        return {
          success: response.success || false,
          message: response.message || 'Recherche terminée',
          data: response.data || [],
          pagination: (response as any).pagination || {
            page: filters.page || 1,
            limit: filters.limit || 20,
            total: (response.data || []).length,
            pages: 1
          },
          searchInfo: (response as any).searchInfo || {
            query,
            totalResults: (response.data || []).length,
            searchTime: 0
          }
        };
      }

    } catch (error: any) {
      console.error('❌ Erreur recherche produits:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Recherche de produits échouée',
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        searchInfo: { query, totalResults: 0, searchTime: 0 }
      };
    }
  }

  /**
   * Recherche par catégorie spécifique (utilise l'endpoint GET /category/:id)
   */
  async searchByCategory(categoryId: string, filters: any = {}): Promise<SearchProductsResponse> {
    try {
      console.log('🏷️ SEARCH SERVICE - Recherche par catégorie:', categoryId);

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await ApiService.get<any>(`${this.BASE_URL}/category/${categoryId}?${params}`);

      console.log('✅ Réponse recherche par catégorie reçue:', response);
      
      if (response.success !== undefined) {
        return response as SearchProductsResponse;
      } else {
        return {
          success: response.success || false,
          message: response.message || 'Recherche par catégorie terminée',
          data: response.data || [],
          pagination: (response as any).pagination || {
            page: filters.page || 1,
            limit: filters.limit || 20,
            total: (response.data || []).length,
            pages: 1
          },
          searchInfo: (response as any).searchInfo || {
            query: `Catégorie ${categoryId}`,
            totalResults: (response.data || []).length,
            searchTime: 0
          }
        };
      }

    } catch (error: any) {
      console.error('❌ Erreur recherche par catégorie:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Recherche par catégorie échouée',
        data: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 },
        searchInfo: { query: `Catégorie ${categoryId}`, totalResults: 0, searchTime: 0 }
      };
    }
  }

  /**
   * Recherche d'entreprises (utilise l'endpoint GET /enterprises)
   */
  async searchEnterprises(
    query: string,
    filters: {
      city?: string;
      district?: string;
      category?: string;
      verified?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<EnterpriseSearchResponse> {
    try {
      console.log('🏢 SEARCH SERVICE - Recherche entreprises:', query);

      const params = new URLSearchParams();
      params.append('q', query);
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await ApiService.get<any>(`${this.BASE_URL}/enterprises?${params}`);

      console.log('✅ Réponse recherche entreprises reçue:', response);
      
      return {
        enterprises: response.data || [],
        pagination: (response as any).pagination || {
          page: filters.page || 1,
          limit: filters.limit || 20,
          total: (response.data || []).length,
          pages: 1
        }
      };

    } catch (error: any) {
      console.error('❌ Erreur recherche entreprises:', error);
      
      return {
        enterprises: [],
        pagination: { page: 1, limit: 20, total: 0, pages: 0 }
      };
    }
  }

  /**
   * Obtenir des suggestions d'autocomplétion (utilise l'endpoint GET /suggestions)
   */
  async getSuggestions(query: string, limit: number = 10): Promise<SearchSuggestion[]> {
    try {
      console.log('💡 SEARCH SERVICE - Récupération suggestions pour:', query);

      if (!query || query.trim().length < 2) {
        return [];
      }

      const params = new URLSearchParams({
        q: query.trim(),
        limit: String(limit)
      });

      const response = await ApiService.get<SearchSuggestion[]>(`${this.BASE_URL}/suggestions?${params}`);

      if (response.success && response.data) {
        console.log('✅ Suggestions reçues:', response.data.length);
        return response.data;
      }

      return [];
    } catch (error: any) {
      console.error('❌ Erreur récupération suggestions:', error);
      return [];
    }
  }

  /**
   * Obtenir les filtres disponibles pour la recherche (utilise l'endpoint GET /filters)
   */
  async getAvailableFilters(): Promise<AvailableFilters> {
    try {
      console.log('🎛️ SEARCH SERVICE - Récupération filtres disponibles');

      const response = await ApiService.get<AvailableFilters>(`${this.BASE_URL}/filters`);

      if (response.success && response.data) {
        console.log('✅ Filtres disponibles récupérés');
        return response.data;
      }

      // Retourner des filtres par défaut si l'API échoue
      return {
        categories: [],
        locations: {
          cities: [],
          districtsByCity: {}
        },
        priceRange: {
          minPrice: 0,
          maxPrice: 1000000
        },
        popularTags: [],
        sortOptions: [
          { value: 'relevance', label: 'Pertinence' },
          { value: 'newest', label: 'Plus récent' },
          { value: 'oldest', label: 'Plus ancien' },
          { value: 'price_asc', label: 'Prix croissant' },
          { value: 'price_desc', label: 'Prix décroissant' },
          { value: 'rating', label: 'Mieux notés' },
          { value: 'popular', label: 'Populaires' }
        ]
      };
    } catch (error: any) {
      console.error('❌ Erreur récupération filtres:', error);
      
      return {
        categories: [],
        locations: { cities: [], districtsByCity: {} },
        priceRange: { minPrice: 0, maxPrice: 1000000 },
        popularTags: [],
        sortOptions: [
          { value: 'relevance', label: 'Pertinence' },
          { value: 'price_asc', label: 'Prix croissant' },
          { value: 'price_desc', label: 'Prix décroissant' }
        ]
      };
    }
  }

  // Méthodes de mise en cache et optimisation
  private searchCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Recherche avec mise en cache
   */
  async cachedSearch(query: string, filters: any = {}): Promise<SearchProductsResponse> {
    const cacheKey = JSON.stringify({ query, filters });
    const cached = this.searchCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('📋 Utilisation du cache pour:', query);
      return cached.data;
    }

    const result = await this.searchProducts(query, filters);
    this.searchCache.set(cacheKey, { data: result, timestamp: Date.now() });
    
    return result;
  }

  /**
   * Nettoyer le cache
   */
  clearCache(): void {
    this.searchCache.clear();
    console.log('🧹 Cache de recherche vidé');
  }

  /**
   * Recherche intelligente qui détermine automatiquement le type de recherche
   */
  async smartSearch(query: string, context?: {
    userLocation?: { city?: string; district?: string };
    userPreferences?: { categories?: string[]; priceRange?: { min?: number; max?: number } };
    previousSearches?: string[];
  }): Promise<SearchProductsResponse> {
    try {
      console.log('🧠 SEARCH SERVICE - Recherche intelligente:', query, context);

      // Construction des filtres intelligents basés sur le contexte
      const smartFilters: AdvancedSearchFilters = {
        searchTerm: query,
        page: 1,
        limit: 20,
        sort: 'relevance'
      };

      // Ajout de la localisation si disponible
      if (context?.userLocation) {
        smartFilters.location = context.userLocation;
      }

      // Ajout des préférences utilisateur
      if (context?.userPreferences) {
        if (context.userPreferences.categories?.length) {
          smartFilters.categories = context.userPreferences.categories;
        }
        if (context.userPreferences.priceRange) {
          smartFilters.priceRange = context.userPreferences.priceRange;
        }
      }

      // Utiliser la recherche avancée pour la recherche intelligente
      return await this.advancedSearch(smartFilters);

    } catch (error: any) {
      console.error('❌ Erreur recherche intelligente:', error);
      
      // Fallback vers une recherche simple
      return await this.searchProducts(query);
    }
  }
}

export default new SearchService();