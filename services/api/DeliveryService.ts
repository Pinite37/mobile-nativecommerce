import ApiService from './ApiService';

export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CreateOfferPayload {
  product: string;
  customer: string;
  deliveryZone: string;
  deliveryFee: number;
  urgency?: UrgencyLevel;
  specialInstructions?: string;
  expiresAt: string; // ISO string
}

export interface DeliveryOffer {
  _id: string;
  enterprise: string;
  product: string | { _id: string; name?: string; price?: number; images?: string[] };
  order?: string;
  customer: string | { _id: string; firstName?: string; lastName?: string; phone?: string };
  deliveryZone: string;
  deliveryFee: number;
  urgency: UrgencyLevel;
  specialInstructions?: string;
  expiresAt: string;
  status: 'OPEN' | 'ASSIGNED' | 'CANCELLED' | 'EXPIRED';
  requestedDeliverers: string[];
  createdAt: string;
  updatedAt: string;
}

class DeliveryService {
  private readonly BASE_URL = '/delivery';

  async createOffer(payload: CreateOfferPayload): Promise<DeliveryOffer> {
    try {
        console.log('🚀 Soumission offre - payload:', payload);
      const response = await ApiService.post<DeliveryOffer>(`${this.BASE_URL}/offers`, payload);
      if (response.success && response.data) return response.data;
      throw new Error(response.message || 'Échec de la création de l\'offre');
    } catch (error: any) {
      console.error('❌ DeliveryService.createOffer error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Création de l\'offre échouée');
    }
  }

  async listEnterpriseOffers(status?: 'OPEN' | 'ASSIGNED' | 'CANCELLED' | 'EXPIRED'): Promise<DeliveryOffer[]> {
    try {
      const url = status ? `${this.BASE_URL}/offers?status=${encodeURIComponent(status)}` : `${this.BASE_URL}/offers`;
      const response = await ApiService.get<DeliveryOffer[]>(url);
      if (response.success && response.data) return response.data;
      throw new Error(response.message || 'Échec du chargement des offres');
    } catch (error: any) {
      console.error('❌ DeliveryService.listEnterpriseOffers error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Chargement des offres échoué');
    }
  }

  async deleteOffer(offerId: string): Promise<DeliveryOffer> {
    try {
      const response = await ApiService.delete<DeliveryOffer>(`${this.BASE_URL}/offers/${offerId}`);
      if (response.success && response.data) return response.data;
      throw new Error(response.message || "Échec de la suppression de l'offre");
    } catch (error: any) {
      console.error('❌ DeliveryService.deleteOffer error:', error);
      throw new Error(error.response?.data?.message || error.message || "Suppression de l'offre échouée");
    }
  }
}

export default new DeliveryService();
