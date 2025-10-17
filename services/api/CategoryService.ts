import { Category } from '../../types/product';
import ApiService from './ApiService';

class CategoryService {
  private readonly BASE_URL = '/categories';

  // Récupérer toutes les catégories
  async getAllCategories(): Promise<Category[]> {
    try {
      console.log('🚀 CategoryService - Récupération catégories');
      
      const response = await ApiService.get<Category[]>(`${this.BASE_URL}`);
      
      if (response.success && response.data) {
        console.log('✅ Catégories récupérées:', response.data.length);
        return response.data;
      }
      
      throw new Error('Échec de la récupération des catégories');
    } catch (error: any) {
      console.error('❌ Erreur récupération catégories:', error);
      throw new Error(error.response?.data?.message || error.message || 'Récupération des catégories échouée');
    }
  }

  // Récupérer les catégories actives
  async getActiveCategories(): Promise<Category[]> {
    try {
      console.log('🚀 CategoryService - Récupération catégories actives');
      
      const response = await ApiService.get<Category[]>(`${this.BASE_URL}/active`);
      
      if (response.success && response.data) {
        console.log('✅ Catégories actives récupérées:', response.data.length);
        return response.data;
      }
      
      throw new Error('Échec de la récupération des catégories actives');
    } catch (error: any) {
      console.error('❌ Erreur récupération catégories actives:', error);
      throw new Error(error.response?.data?.message || error.message || 'Récupération des catégories actives échouée');
    }
  }

  // Récupérer les catégories populaires
  async getFeaturedCategories(): Promise<Category[]> {
    try {
      console.log('🚀 CategoryService - Récupération catégories populaires');
      
      const response = await ApiService.get<Category[]>(`${this.BASE_URL}/featured`);
      
      if (response.success && response.data) {
        console.log('✅ Catégories populaires récupérées:', response.data.length);
        return response.data;
      }
      
      throw new Error('Échec de la récupération des catégories populaires');
    } catch (error: any) {
      console.error('❌ Erreur récupération catégories populaires:', error);
      throw new Error(error.response?.data?.message || error.message || 'Récupération des catégories populaires échouée');
    }
  }

  // Récupérer une catégorie par ID
  async getCategoryById(categoryId: string): Promise<Category> {
    try {
      console.log('🚀 CategoryService - Récupération catégorie:', categoryId);
      
      const response = await ApiService.get<Category>(`${this.BASE_URL}/${categoryId}`);
      
      if (response.success && response.data) {
        console.log('✅ Catégorie récupérée avec succès');
        return response.data;
      }
      
      throw new Error('Catégorie non trouvée');
    } catch (error: any) {
      console.error('❌ Erreur récupération catégorie:', error);
      throw new Error(error.response?.data?.message || error.message || 'Récupération de la catégorie échouée');
    }
  }

  // Récupérer les produits d'une catégorie avec filtres et pagination
  async getCategoryProducts(
    categoryId: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      minPrice?: number;
      maxPrice?: number;
      inStock?: boolean;
      enterprise?: string;
      search?: string;
      sortBy?: 'price_asc' | 'price_desc' | 'name' | 'popular' | 'newest';
    }
  ): Promise<{
    category: Category;
    products: any[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalProducts: number;
      productsPerPage: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    try {
      console.log('🚀 CategoryService - Récupération produits catégorie:', categoryId);
      console.log('📄 Pagination:', { page, limit });
      console.log('🔍 Filtres:', filters);

      // Construction des paramètres de requête
      const params: any = {
        page,
        limit,
      };

      if (filters?.minPrice) params.minPrice = filters.minPrice;
      if (filters?.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters?.inStock !== undefined) params.inStock = filters.inStock;
      if (filters?.enterprise) params.enterprise = filters.enterprise;
      if (filters?.search) params.search = filters.search;
      if (filters?.sortBy) params.sortBy = filters.sortBy;

      const response = await ApiService.get<{
        category: Category;
        products: any[];
        pagination: any;
      }>(`${this.BASE_URL}/${categoryId}/products`, { params });

      if (response.success && response.data) {
        console.log('✅ Produits de catégorie récupérés:', response.data.products.length);
        return response.data;
      }

      throw new Error('Échec de la récupération des produits');
    } catch (error: any) {
      console.error('❌ Erreur récupération produits catégorie:', error);
      throw new Error(error.response?.data?.message || error.message || 'Récupération des produits échouée');
    }
  }
}

export default new CategoryService();
