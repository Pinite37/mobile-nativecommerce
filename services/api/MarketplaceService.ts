import { Product, ProductFilters, ProductsResponse } from '../../types/product';
import ApiService from './ApiService';

class MarketplaceService {
  private readonly BASE_URL = '/products';

  // Récupérer tous les produits publics (marketplace)
  async getAllProducts(page = 1, limit = 20, filters: ProductFilters = {}): Promise<ProductsResponse> {
    try {
      console.log('🚀 MarketplaceService - Récupération produits marketplace');
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        ),
      });

      const response = await ApiService.get<{ products: Product[]; pagination: any }>(`${this.BASE_URL}?${params}`);
      
      if (response.success && response.data) {
        console.log('✅ Produits marketplace récupérés:', response.data.products.length);
        return {
          products: response.data.products,
          pagination: response.data.pagination
        };
      }
      
      throw new Error('Échec de la récupération des produits marketplace');
    } catch (error: any) {
      console.error('❌ Erreur récupération produits marketplace:', error);
      throw new Error(error.response?.data?.message || error.message || 'Récupération des produits échouée');
    }
  }

  // Rechercher des produits dans la marketplace
  async searchProducts(searchTerm: string, page = 1, limit = 20, filters: ProductFilters = {}): Promise<ProductsResponse> {
    try {
      console.log('🚀 MarketplaceService - Recherche produits marketplace:', searchTerm);
      
      const params = new URLSearchParams({
        search: searchTerm,
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        ),
      });

      const response = await ApiService.get<{ products: Product[]; pagination: any }>(`${this.BASE_URL}/search?${params}`);
      
      if (response.success && response.data) {
        console.log('✅ Recherche marketplace terminée:', response.data.products.length);
        return {
          products: response.data.products,
          pagination: response.data.pagination
        };
      }
      
      throw new Error('Échec de la recherche');
    } catch (error: any) {
      console.error('❌ Erreur recherche produits marketplace:', error);
      throw new Error(error.response?.data?.message || error.message || 'Recherche échouée');
    }
  }

  // Récupérer les produits par catégorie
  async getProductsByCategory(categoryId: string, page = 1, limit = 20, filters: ProductFilters = {}): Promise<ProductsResponse> {
    try {
      console.log('🚀 MarketplaceService - Produits par catégorie:', categoryId);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        ),
      });

      const response = await ApiService.get<{ products: Product[]; pagination: any }>(`${this.BASE_URL}/category/${categoryId}?${params}`);
      
      if (response.success && response.data) {
        console.log('✅ Produits par catégorie récupérés:', response.data.products.length);
        return {
          products: response.data.products,
          pagination: response.data.pagination
        };
      }
      
      throw new Error('Échec de la récupération des produits par catégorie');
    } catch (error: any) {
      console.error('❌ Erreur produits par catégorie:', error);
      throw new Error(error.response?.data?.message || error.message || 'Récupération par catégorie échouée');
    }
  }

  // Récupérer un produit par ID
  async getProductById(productId: string): Promise<Product> {
    try {
      console.log('🚀 MarketplaceService - Récupération produit:', productId);
      
      const response = await ApiService.get<Product>(`${this.BASE_URL}/${productId}`);
      
      if (response.success && response.data) {
        console.log('✅ Produit récupéré:', response.data.name);
        return response.data;
      }
      
      throw new Error('Produit non trouvé');
    } catch (error: any) {
      console.error('❌ Erreur récupération produit:', error);
      throw new Error(error.response?.data?.message || error.message || 'Récupération du produit échouée');
    }
  }

  // Mettre à jour les vues d'un produit
  async updateProductViews(productId: string): Promise<void> {
    try {
      console.log('🚀 MarketplaceService - Mise à jour vues produit:', productId);
      
      const response = await ApiService.put(`${this.BASE_URL}/${productId}/stats`, {
        views: 1
      });
      
      if (response.success) {
        console.log('✅ Vues produit mises à jour');
        return;
      }
      
      throw new Error('Échec de la mise à jour des vues');
    } catch (error: any) {
      console.error('❌ Erreur mise à jour vues:', error);
      // Ne pas lever d'erreur pour les vues, c'est optionnel
    }
  }
}

export default new MarketplaceService();
