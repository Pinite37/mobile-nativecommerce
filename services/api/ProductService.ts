import {
  CreateProductRequest,
  Product,
  ProductFilters,
  ProductsResponse,
  RemoveImageRequest,
  UpdateProductRequest,
} from '../../types/product';
import ApiService from './ApiService';

class ProductService {
  private readonly BASE_URL = '/products';

  // Créer un produit (Entreprise)
  async createProduct(productData: CreateProductRequest): Promise<Product> {
    try {
      console.log('🚀 ProductService - Création produit:', productData.name);
      
      const response = await ApiService.post<Product>(`${this.BASE_URL}/create`, productData);
      
      if (response.success && response.data) {
        console.log('✅ Produit créé avec succès');
        return response.data;
      }
      
      throw new Error('Échec de la création du produit');
    } catch (error: any) {
      console.error('❌ Erreur création produit:', error);
      throw new Error(error.response?.data?.message || error.message || 'Création du produit échouée');
    }
  }

  // Récupérer les produits de l'entreprise
  async getEnterpriseProducts(page = 1, limit = 10, filters: ProductFilters = {}): Promise<ProductsResponse> {
    try {
      console.log('🚀 ProductService - Récupération produits entreprise');
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        ),
      });

      const response = await ApiService.get<any>(`${this.BASE_URL}/enterprise/my-products?${params}`);
      
      console.log('🔍 Raw API Response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data !== undefined) {
        const products = Array.isArray(response.data) ? response.data : [];
        const pagination = (response as any).pagination || { page: 1, limit: 10, total: 0, pages: 0 };
        
        console.log('✅ Produits entreprise récupérés:', products.length);
        console.log('📄 Pagination:', pagination);
        
        return {
          products: products,
          pagination: pagination
        };
      }
      
      throw new Error('Échec de la récupération des produits');
    } catch (error: any) {
      console.error('❌ Erreur récupération produits entreprise:', error);
      throw new Error(error.response?.data?.message || error.message || 'Récupération des produits échouée');
    }
  }

  // Récupérer un produit par ID
  async getProductById(productId: string): Promise<Product> {
    try {
      console.log('🚀 ProductService - Récupération produit:', productId);
      
      const response = await ApiService.get<Product>(`${this.BASE_URL}/${productId}`);
      
      if (response.success && response.data) {
        console.log('✅ Produit récupéré avec succès');
        return response.data;
      }
      
      throw new Error('Produit non trouvé');
    } catch (error: any) {
      console.error('❌ Erreur récupération produit:', error);
      throw new Error(error.response?.data?.message || error.message || 'Récupération du produit échouée');
    }
  }

  // Mettre à jour un produit
  async updateProduct(productId: string, productData: UpdateProductRequest): Promise<Product> {
    try {
      console.log('🚀 ProductService - Mise à jour produit:', productId);
      
      const response = await ApiService.put<Product>(`${this.BASE_URL}/${productId}`, productData);
      
      if (response.success && response.data) {
        console.log('✅ Produit mis à jour avec succès');
        return response.data;
      }
      
      throw new Error('Échec de la mise à jour du produit');
    } catch (error: any) {
      console.error('❌ Erreur mise à jour produit:', error);
      throw new Error(error.response?.data?.message || error.message || 'Mise à jour du produit échouée');
    }
  }

  // Activer/Désactiver un produit
  async toggleProductStatus(productId: string, isActive: boolean): Promise<Product> {
    try {
      console.log('🚀 ProductService - Changement statut produit:', productId, isActive);
      
      const response = await ApiService.put<Product>(`${this.BASE_URL}/${productId}/status`, { isActive });
      
      if (response.success && response.data) {
        console.log('✅ Statut produit mis à jour avec succès');
        return response.data;
      }
      
      throw new Error('Échec du changement de statut du produit');
    } catch (error: any) {
      console.error('❌ Erreur changement statut produit:', error);
      throw new Error(error.response?.data?.message || error.message || 'Changement de statut échoué');
    }
  }

  // Supprimer une image d'un produit
  async removeProductImage(productId: string, imageUrl: string): Promise<Product> {
    try {
      console.log('🚀 ProductService - Suppression image produit:', productId);
      
      const requestData: RemoveImageRequest = { imageUrl };
      const response = await ApiService.delete<Product>(`${this.BASE_URL}/${productId}/image`, { data: requestData });
      
      if (response.success && response.data) {
        console.log('✅ Image supprimée avec succès');
        return response.data;
      }
      
      throw new Error('Échec de la suppression de l\'image');
    } catch (error: any) {
      console.error('❌ Erreur suppression image:', error);
      throw new Error(error.response?.data?.message || error.message || 'Suppression de l\'image échouée');
    }
  }

  // Supprimer un produit
  async deleteProduct(productId: string): Promise<void> {
    try {
      console.log('🚀 ProductService - Suppression produit:', productId);
      
      const response = await ApiService.delete(`${this.BASE_URL}/${productId}`);
      
      if (response.success) {
        console.log('✅ Produit supprimé avec succès');
        return;
      }
      
      throw new Error('Échec de la suppression du produit');
    } catch (error: any) {
      console.error('❌ Erreur suppression produit:', error);
      throw new Error(error.response?.data?.message || error.message || 'Suppression du produit échouée');
    }
  }

  // Récupérer tous les produits (Public)
  async getAllProducts(page = 1, limit = 20, filters: ProductFilters = {}): Promise<ProductsResponse> {
    try {
      console.log('🚀 ProductService - Récupération tous produits');
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        ),
      });

      const response = await ApiService.get<{ products: Product[]; pagination: any }>(`${this.BASE_URL}?${params}`);
      
      if (response.success && response.data) {
        console.log('✅ Produits publics récupérés:', response.data.products.length);
        return {
          products: response.data.products,
          pagination: response.data.pagination
        };
      }
      
      throw new Error('Échec de la récupération des produits');
    } catch (error: any) {
      console.error('❌ Erreur récupération produits publics:', error);
      throw new Error(error.response?.data?.message || error.message || 'Récupération des produits échouée');
    }
  }

  // Rechercher des produits
  async searchProducts(searchTerm: string, page = 1, limit = 20, filters: ProductFilters = {}): Promise<ProductsResponse> {
    try {
      console.log('🚀 ProductService - Recherche produits:', searchTerm);
      
      const params = new URLSearchParams({
        search: searchTerm,
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        ),
      });

      const response = await ApiService.get<any>(`${this.BASE_URL}/search?${params}`);
      
      console.log('🔍 Raw Search Response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data !== undefined) {
        const products = Array.isArray(response.data) ? response.data : [];
        const pagination = (response as any).pagination || { page: 1, limit: 20, total: 0, pages: 0 };
        
        console.log('✅ Recherche produits terminée:', products.length);
        console.log('📄 Search Pagination:', pagination);
        
        return {
          products: products,
          pagination: pagination
        };
      }
      
      throw new Error('Échec de la recherche');
    } catch (error: any) {
      console.error('❌ Erreur recherche produits:', error);
      throw new Error(error.response?.data?.message || error.message || 'Recherche échouée');
    }
  }

  // Récupérer les produits par catégorie
  async getProductsByCategory(categoryId: string, page = 1, limit = 20, filters: ProductFilters = {}): Promise<ProductsResponse> {
    try {
      console.log('🚀 ProductService - Produits par catégorie:', categoryId);
      
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

  // Mettre à jour les statistiques d'un produit
  async updateProductStats(productId: string, stats: Partial<Product['stats']>): Promise<Product> {
    try {
      console.log('🚀 ProductService - Mise à jour stats produit:', productId);
      
      const response = await ApiService.put<Product>(`${this.BASE_URL}/${productId}/stats`, stats);
      
      if (response.success && response.data) {
        console.log('✅ Stats produit mises à jour');
        return response.data;
      }
      
      throw new Error('Échec de la mise à jour des statistiques');
    } catch (error: any) {
      console.error('❌ Erreur mise à jour stats:', error);
      throw new Error(error.response?.data?.message || error.message || 'Mise à jour des statistiques échouée');
    }
  }
}

export default new ProductService();
