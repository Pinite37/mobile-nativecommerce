import {
  CreateProductRequest,
  FavoriteItem,
  Product,
  ProductFilters,
  ProductsResponse,
  RemoveImageRequest,
  UpdateProductRequest
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

  // Ajouter un produit aux favoris
  async addProductToFavorites(productId: string): Promise<void> {
    try {
      console.log('🚀 ProductService - Ajout produit aux favoris:', productId);
      const response = await ApiService.post(`${this.BASE_URL}/${productId}/favorites`);
      if (response.success) {
        console.log('✅ Produit ajouté aux favoris avec succès');
        return;
      }
      throw new Error('Échec de l\'ajout du produit aux favoris');
    } catch (error: any) {
      console.error('❌ Erreur ajout produit aux favoris:', error);
      throw new Error(error.response?.data?.message || error.message || 'Ajout du produit aux favoris échoué');
    }
  }

  // Supprimer un produit des favoris

  async removeProductFromFavorites(productId: string): Promise<void> {
    try {
      console.log('🚀 ProductService - Suppression produit des favoris:', productId);
      const response = await ApiService.delete(`${this.BASE_URL}/${productId}/favorites`);
      if (response.success) {
        console.log('✅ Produit supprimé des favoris avec succès');
        return;
      }
      throw new Error('Échec de la suppression du produit des favoris');
    } catch (error: any) {
      console.error('❌ Erreur suppression produit des favoris:', error);
      throw new Error(error.response?.data?.message || error.message || 'Suppression du produit des favoris échouée');
    }
  }

  // Récupérer les produits favoris
  async getFavoriteProducts(): Promise<FavoriteItem[]> {
    try {
      console.log('🚀 ProductService - Récupération produits favoris');
      const response = await ApiService.get(`${this.BASE_URL}/favorites/list`);

      console.log('📦 Response complète:', response); // Pour débugger

      if (response.success && response.data) {
        const favorites = Array.isArray(response.data) ? response.data : [];
        console.log('✅ Produits favoris récupérés:', favorites.length);
        return favorites; // Retourner un tableau typé
      }

      throw new Error('Échec de la récupération des produits favoris');
    } catch (error: any) {
      console.error('❌ Erreur récupération produits favoris:', error);
      console.error('❌ Response data:', error.response?.data); // Pour voir la structure exacte
      throw new Error(error.response?.data?.message || error.message || 'Récupération des produits favoris échouée');
    }
  }

  async checkIfProductIsFavorite(productId: string): Promise<boolean> {
    try {
      console.log('🚀 ProductService - Vérification si produit est favori:', productId);
      const response = await ApiService.get<{ isFavorite: boolean }>(`${this.BASE_URL}/${productId}/favorites/check`);


      if (response.success && response.data) {
        console.log('✅ Vérification terminée, est favori:', response.data.isFavorite);
        return response.data.isFavorite;
      }

      throw new Error('Échec de la vérification du statut favori');
    } catch (error: any) {
      console.error('❌ Erreur vérification produit favori:', error);
      throw new Error(error.response?.data?.message || error.message || 'Vérification du statut favori échouée');
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

  // Rechercher des produits de l'entreprise
  async searchEnterpriseProducts(searchTerm: string, page = 1, limit = 10, filters: ProductFilters = {}): Promise<ProductsResponse> {
    try {
      console.log('🔥 ProductService - Recherche produits entreprise:', searchTerm);

      const params = new URLSearchParams({
        search: searchTerm,
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        ),
      });

      const response = await ApiService.get<any>(`${this.BASE_URL}/enterprise/search?${params}`);

      console.log('🔍 Raw Enterprise Search Response:', JSON.stringify(response, null, 2));

      if (response.success && response.data !== undefined) {
        const products = Array.isArray(response.data) ? response.data : [];
        const pagination = (response as any).pagination || { page: 1, limit: 10, total: 0, pages: 0 };

        console.log('✅ Recherche produits entreprise terminée:', products.length);
        console.log('📄 Enterprise Search Pagination:', pagination);

        return {
          products: products,
          pagination: pagination
        };
      }

      throw new Error('Échec de la recherche des produits entreprise');
    } catch (error: any) {
      console.error('❌ Erreur recherche produits entreprise:', error);
      throw new Error(error.response?.data?.message || error.message || 'Recherche des produits entreprise échouée');
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

  // ========== MÉTHODES PUBLIQUES POUR LES CLIENTS ==========

  /**
   * Récupérer tous les produits publics (pour clients)
   */
  async getAllPublicProducts(filters: ProductFilters = {}): Promise<ProductsResponse> {
    try {
      console.log('🔥 PRODUCT SERVICE - Récupération produits publics avec filtres:', filters);

      const queryParams = new URLSearchParams();

      // Ajouter les paramètres de filtrage
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.minPrice) queryParams.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) queryParams.append('maxPrice', filters.maxPrice.toString());
      if (filters.sort) queryParams.append('sort', filters.sort);
      if (filters.city) queryParams.append('city', filters.city);
      if (filters.district) queryParams.append('district', filters.district);

      const url = `${this.BASE_URL}?${queryParams.toString()}`;
      const response = await ApiService.get<any>(url);

      if (response.success && response.data) {
        console.log('✅ PRODUCT SERVICE - Produits publics récupérés:', response.data.length);
        return {
          products: response.data,
          pagination: (response as any).pagination || {
            page: filters.page || 1,
            limit: filters.limit || 20,
            total: response.data.length,
            pages: 1
          }
        };
      }

      throw new Error('Échec de la récupération des produits publics');
    } catch (error: any) {
      console.error('❌ PRODUCT SERVICE - Erreur récupération produits publics:', error);
      throw new Error(error.response?.data?.message || error.message || 'Récupération des produits publics échouée');
    }
  }

  /**
   * Récupérer les détails d'un produit spécifique (pour clients)
   */
  async getPublicProductById(productId: string): Promise<Product> {
    try {
      console.log('🔥 PRODUCT SERVICE - Récupération détails produit public:', productId);

      const response = await ApiService.get<any>(`${this.BASE_URL}/${productId}`);

      if (response.success && response.data) {
        // Le backend renvoie maintenant { product: {...}, enterprise: {...} }
        const productData = response.data.product;
        const enterpriseData = response.data.enterprise;

        // Fusionner les données du produit avec les infos de l'entreprise
        const completeProduct = {
          ...productData,
          enterprise: enterpriseData
        };

        console.log('✅ PRODUCT SERVICE - Détails produit public récupérés:', completeProduct.name);
        return completeProduct;
      }

      throw new Error('Échec de la récupération des détails du produit');
    } catch (error: any) {
      console.error('❌ PRODUCT SERVICE - Erreur récupération détails produit public:', error);
      throw new Error(error.response?.data?.message || error.message || 'Récupération des détails du produit échouée');
    }
  }

  /**
   * Rechercher des produits publics
   */
  async searchPublicProducts(query: string, filters: Omit<ProductFilters, 'search'> = {}): Promise<ProductsResponse> {
    try {
      console.log('🔍 PRODUCT SERVICE - Recherche produits publics:', query);

      return this.getAllPublicProducts({
        ...filters,
        search: query
      });
    } catch (error: any) {
      console.error('❌ PRODUCT SERVICE - Erreur recherche produits publics:', error);
      throw error;
    }
  }

  /**
   * Récupérer les produits populaires
   */
  async getPopularProducts(limit: number = 10): Promise<ProductsResponse> {
    try {
      console.log('🔥 PRODUCT SERVICE - Produits populaires, limite:', limit);

      return this.getAllPublicProducts({
        limit,
        sort: 'popular'
      });
    } catch (error: any) {
      console.error('❌ PRODUCT SERVICE - Erreur produits populaires:', error);
      throw error;
    }
  }

  /**
   * Récupérer les nouveaux produits
   */
  async getNewProducts(limit: number = 10): Promise<ProductsResponse> {
    try {
      console.log('🆕 PRODUCT SERVICE - Nouveaux produits, limite:', limit);

      return this.getAllPublicProducts({
        limit,
        sort: 'newest'
      });
    } catch (error: any) {
      console.error('❌ PRODUCT SERVICE - Erreur nouveaux produits:', error);
      throw error;
    }
  }

  /**
   * Récupérer les produits similaires à un produit donné
   */
  async getSimilarProducts(productId: string, limit: number = 10): Promise<{
    referenceProduct: {
      id: string;
      name: string;
      category: string;
    };
    similarProducts: Product[];
    totalFound: number;
  }> {
    try {
      console.log('🔄 PRODUCT SERVICE - Produits similaires pour:', productId);
      console.log('📊 Limite:', limit);

      const response = await ApiService.get<{
        referenceProduct: {
          id: string;
          name: string;
          category: string;
        };
        similarProducts: Product[];
        totalFound: number;
      }>(`${this.BASE_URL}/similar/${productId}?limit=${limit}`);

      if (response.success && response.data) {
        console.log('✅ Produits similaires récupérés:', response.data.similarProducts.length);
        return response.data;
      }

      throw new Error('Échec de récupération des produits similaires');
    } catch (error: any) {
      console.error('❌ PRODUCT SERVICE - Erreur produits similaires:', error);
      throw new Error(error.response?.data?.message || error.message || 'Échec de récupération des produits similaires');
    }
  }
}

export default new ProductService();
