import ApiService from './ApiService';

export type UrgencyLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type DeliveryStatus = 'OPEN' | 'ASSIGNED' | 'COMPLETED' | 'CANCELLED';

export interface CreateOfferPayload {
  product: string;
  customer: string;
  deliveryZone: string;
  deliveryFee: number;
  urgency?: UrgencyLevel;
  specialInstructions?: string;
  expiresAt: string; // ISO string
  // [longitude, latitude] du point de retrait — optionnel côté payload : en
  // pratique le backend lit toujours l'emplacement précis de la boutique
  // (Enterprise.location), ce champ n'a plus besoin d'être envoyé.
  pickupCoordinates?: [number, number];
  // Choisis par le CLIENT lui-même via une DeliveryAddressRequest (bouton
  // "Demander la livraison" sur la fiche produit) — pré-remplis dans le
  // formulaire d'offre quand une demande en attente existe pour ce client.
  deliveryCoordinates?: [number, number];
  deliveryAddress?: string;
  deliveryAddressRequestId?: string;
}

export interface CreateDeliveryCallPayload {
  productName: string;
  description?: string;
  pickupLocation: string;
  deliveryLocation: string;
  customerInfo: {
    name: string;
    phone: string;
  };
  deliveryFee: number;
  urgency?: UrgencyLevel;
  specialInstructions?: string;
  expiresAt: string; // ISO string
  // [longitude, latitude] du point de retrait — optionnel, voir CreateOfferPayload.
  pickupCoordinates?: [number, number];
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
  status: DeliveryStatus;
  requestedDeliverers: string[];
  createdAt: string;
  updatedAt: string;
  // Adresse précise de livraison — absente tant que le client ne l'a pas
  // donnée (avant ou après la création de l'offre, voir DeliveryService
  // listMyOffersForProduct / updateDeliveryAddress).
  deliveryCoordinates?: { type: 'Point'; coordinates: [number, number] };
  deliveryAddress?: string;
}

export interface DeliveryCall {
  _id: string;
  enterprise: string;
  productName: string;
  description?: string;
  pickupLocation: string;
  deliveryLocation: string;
  customerInfo:
    | string
    | {
        name?: string;
        phone?: string;
      };
  deliveryFee: number;
  urgency: UrgencyLevel;
  specialInstructions?: string;
  expiresAt: string;
  status: DeliveryStatus;
  requestedDeliverers: string[];
  createdAt: string;
  updatedAt: string;
}

class DeliveryService {
  private readonly BASE_URL = '/delivery';
  private readonly BASE_DELIVERRYCALL_URL = '/delivery-calls';

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

  async listEnterpriseOffers(status?: DeliveryStatus): Promise<DeliveryOffer[]> {
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

  // Client : mes offres pour un produit (savoir si une adresse a déjà été précisée)
  async listMyOffersForProduct(productId: string): Promise<DeliveryOffer[]> {
    try {
      const response = await ApiService.get<DeliveryOffer[]>(`${this.BASE_URL}/offers/mine/${productId}`);
      return response.success && response.data ? response.data : [];
    } catch (error: any) {
      console.error(
        '❌ DeliveryService.listMyOffersForProduct error:',
        error.response?.status,
        error.response?.data,
        error.message
      );
      return [];
    }
  }

  // Client : préciser/corriger l'adresse de livraison sur une offre déjà créée
  async updateDeliveryAddress(
    offerId: string,
    params: { deliveryAddress: string; deliveryCoordinates: [number, number] }
  ): Promise<DeliveryOffer> {
    try {
      const response = await ApiService.patch<DeliveryOffer>(`${this.BASE_URL}/offers/${offerId}/delivery-address`, params);
      if (response.success && response.data) return response.data;
      throw new Error(response.message || "Échec de la mise à jour de l'adresse");
    } catch (error: any) {
      console.error(
        '❌ DeliveryService.updateDeliveryAddress error:',
        error.response?.status,
        error.response?.data,
        error.message
      );
      throw new Error(error.response?.data?.message || error.message || "Mise à jour de l'adresse échouée");
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

  async createCall(payload: CreateDeliveryCallPayload): Promise<DeliveryCall> {
    try {
      console.log('🚀 Soumission appel livraison - payload:', payload);
      const response = await ApiService.post<DeliveryCall>(`${this.BASE_DELIVERRYCALL_URL}`, payload);
      if (response.success && response.data) return response.data;
      throw new Error(response.message || "Échec de la création de l'appel à livraison");
    } catch (error: any) {
      console.error('❌ DeliveryService.createCall error:', error);
      throw new Error(error.response?.data?.message || error.message || "Création de l'appel à livraison échouée");
    }
  }

  async listEnterpriseCalls(status?: DeliveryStatus): Promise<DeliveryCall[]> {
    try {
      const url = status ? `${this.BASE_DELIVERRYCALL_URL}?status=${encodeURIComponent(status)}` : `${this.BASE_DELIVERRYCALL_URL}`;
      const response = await ApiService.get<DeliveryCall[]>(url);
      if (response.success && response.data) return response.data;
      throw new Error(response.message || "Échec du chargement des appels à livraison");
    } catch (error: any) {
      console.error('❌ DeliveryService.listEnterpriseCalls error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Chargement des appels à livraison échoué');
    }
  }

  async deleteCall(callId: string): Promise<DeliveryCall> {
    try {
      const response = await ApiService.delete<DeliveryCall>(`${this.BASE_DELIVERRYCALL_URL}/${callId}`);
      if (response.success && response.data) return response.data;
      throw new Error(response.message || "Échec de la suppression de l'appel à livraison");
    } catch (error: any) {
      console.error('❌ DeliveryService.deleteCall error:', error);
      throw new Error(error.response?.data?.message || error.message || "Suppression de l'appel à livraison échouée");
    }
  }
}

export default new DeliveryService();
