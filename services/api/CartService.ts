import {
    AddToCartRequest,
    Cart,
    CreateOrderRequest,
    Order,
    OrdersResponse,
    UpdateCartItemRequest
} from '../../types/order';
import ApiService from './ApiService';

class CartService {
  private readonly BASE_URL = '/cart';

  // Récupérer le panier de l'entreprise
  async getCart(): Promise<Cart> {
    try {
      console.log('🚀 CartService - Récupération panier');
      
      const response = await ApiService.get<Cart>(`${this.BASE_URL}`);
      
      if (response.success && response.data) {
        console.log('✅ Panier récupéré avec succès');
        return response.data;
      }
      
      throw new Error('Échec de la récupération du panier');
    } catch (error: any) {
      console.error('❌ Erreur récupération panier:', error);
      throw new Error(error.response?.data?.message || error.message || 'Récupération du panier échouée');
    }
  }

  // Ajouter un produit au panier
  async addToCart(requestData: AddToCartRequest): Promise<Cart> {
    try {
      console.log('🚀 CartService - Ajout au panier:', requestData.productId);
      
      const response = await ApiService.post<Cart>(`${this.BASE_URL}/add`, requestData);
      
      if (response.success && response.data) {
        console.log('✅ Produit ajouté au panier avec succès');
        return response.data;
      }
      
      throw new Error('Échec de l\'ajout au panier');
    } catch (error: any) {
      console.error('❌ Erreur ajout au panier:', error);
      throw new Error(error.response?.data?.message || error.message || 'Ajout au panier échoué');
    }
  }

  // Mettre à jour la quantité d'un produit dans le panier
  async updateCartItem(itemId: string, requestData: UpdateCartItemRequest): Promise<Cart> {
    try {
      console.log('🚀 CartService - Mise à jour item panier:', itemId);
      
      const response = await ApiService.put<Cart>(`${this.BASE_URL}/items/${itemId}`, requestData);
      
      if (response.success && response.data) {
        console.log('✅ Item panier mis à jour avec succès');
        return response.data;
      }
      
      throw new Error('Échec de la mise à jour du panier');
    } catch (error: any) {
      console.error('❌ Erreur mise à jour item panier:', error);
      throw new Error(error.response?.data?.message || error.message || 'Mise à jour du panier échouée');
    }
  }

  // Supprimer un produit du panier
  async removeFromCart(itemId: string): Promise<Cart> {
    try {
      console.log('🚀 CartService - Suppression du panier:', itemId);
      
      const response = await ApiService.delete<Cart>(`${this.BASE_URL}/items/${itemId}`);
      
      if (response.success && response.data) {
        console.log('✅ Produit supprimé du panier avec succès');
        return response.data;
      }
      
      throw new Error('Échec de la suppression du panier');
    } catch (error: any) {
      console.error('❌ Erreur suppression du panier:', error);
      throw new Error(error.response?.data?.message || error.message || 'Suppression du panier échouée');
    }
  }

  // Vider le panier
  async clearCart(): Promise<void> {
    try {
      console.log('🚀 CartService - Vidage du panier');
      
      const response = await ApiService.delete(`${this.BASE_URL}/clear`);
      
      if (response.success) {
        console.log('✅ Panier vidé avec succès');
        return;
      }
      
      throw new Error('Échec du vidage du panier');
    } catch (error: any) {
      console.error('❌ Erreur vidage du panier:', error);
      throw new Error(error.response?.data?.message || error.message || 'Vidage du panier échoué');
    }
  }

  // Créer une commande à partir du panier
  async createOrder(orderData: CreateOrderRequest): Promise<Order> {
    try {
      console.log('🚀 CartService - Création commande');
      
      const response = await ApiService.post<Order>(`${this.BASE_URL}/checkout`, orderData);
      
      if (response.success && response.data) {
        console.log('✅ Commande créée avec succès');
        return response.data;
      }
      
      throw new Error('Échec de la création de la commande');
    } catch (error: any) {
      console.error('❌ Erreur création commande:', error);
      throw new Error(error.response?.data?.message || error.message || 'Création de la commande échouée');
    }
  }
}

class OrderService {
  private readonly BASE_URL = '/orders';

  // Récupérer les commandes (acheteur)
  async getBuyerOrders(page = 1, limit = 10, status?: string): Promise<OrdersResponse> {
    try {
      console.log('🚀 OrderService - Récupération commandes acheteur');
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(status && { status }),
      });

      const response = await ApiService.get<{ orders: Order[]; pagination: any }>(`${this.BASE_URL}/buyer?${params}`);
      
      if (response.success && response.data) {
        console.log('✅ Commandes acheteur récupérées:', response.data.orders.length);
        return {
          orders: response.data.orders,
          pagination: response.data.pagination
        };
      }
      
      throw new Error('Échec de la récupération des commandes');
    } catch (error: any) {
      console.error('❌ Erreur récupération commandes acheteur:', error);
      throw new Error(error.response?.data?.message || error.message || 'Récupération des commandes échouée');
    }
  }

  // Récupérer les commandes (vendeur)
  async getSellerOrders(page = 1, limit = 10, status?: string): Promise<OrdersResponse> {
    try {
      console.log('🚀 OrderService - Récupération commandes vendeur');
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(status && { status }),
      });

      const response = await ApiService.get<{ orders: Order[]; pagination: any }>(`${this.BASE_URL}/seller?${params}`);
      
      if (response.success && response.data) {
        console.log('✅ Commandes vendeur récupérées:', response.data.orders.length);
        return {
          orders: response.data.orders,
          pagination: response.data.pagination
        };
      }
      
      throw new Error('Échec de la récupération des commandes');
    } catch (error: any) {
      console.error('❌ Erreur récupération commandes vendeur:', error);
      throw new Error(error.response?.data?.message || error.message || 'Récupération des commandes échouée');
    }
  }

  // Récupérer une commande par ID
  async getOrderById(orderId: string): Promise<Order> {
    try {
      console.log('🚀 OrderService - Récupération commande:', orderId);
      
      const response = await ApiService.get<Order>(`${this.BASE_URL}/${orderId}`);
      
      if (response.success && response.data) {
        console.log('✅ Commande récupérée avec succès');
        return response.data;
      }
      
      throw new Error('Commande non trouvée');
    } catch (error: any) {
      console.error('❌ Erreur récupération commande:', error);
      throw new Error(error.response?.data?.message || error.message || 'Récupération de la commande échouée');
    }
  }

  // Mettre à jour le statut d'une commande (vendeur)
  async updateOrderStatus(orderId: string, status: Order['status']): Promise<Order> {
    try {
      console.log('🚀 OrderService - Mise à jour statut commande:', orderId, status);
      
      const response = await ApiService.put<Order>(`${this.BASE_URL}/${orderId}/status`, { status });
      
      if (response.success && response.data) {
        console.log('✅ Statut commande mis à jour avec succès');
        return response.data;
      }
      
      throw new Error('Échec de la mise à jour du statut');
    } catch (error: any) {
      console.error('❌ Erreur mise à jour statut commande:', error);
      throw new Error(error.response?.data?.message || error.message || 'Mise à jour du statut échouée');
    }
  }

  // Annuler une commande
  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    try {
      console.log('🚀 OrderService - Annulation commande:', orderId);
      
      const response = await ApiService.put<Order>(`${this.BASE_URL}/${orderId}/cancel`, { reason });
      
      if (response.success && response.data) {
        console.log('✅ Commande annulée avec succès');
        return response.data;
      }
      
      throw new Error('Échec de l\'annulation de la commande');
    } catch (error: any) {
      console.error('❌ Erreur annulation commande:', error);
      throw new Error(error.response?.data?.message || error.message || 'Annulation de la commande échouée');
    }
  }
}

export const cartService = new CartService();
export const orderService = new OrderService();
export default cartService;
