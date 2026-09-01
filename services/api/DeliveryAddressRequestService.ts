import ApiService from './ApiService';

// Une demande du CLIENT : "je veux ce produit livré à cette adresse
// précise", créée au moment où il tape sur "Demander la livraison" sur la
// fiche produit — avant même qu'une offre existe. L'entreprise la lit dans
// sa conversation avec ce client pour pré-remplir l'offre.
export interface DeliveryAddressRequest {
  _id: string;
  client: { _id: string; firstName: string; lastName: string };
  product: { _id: string; name: string; images?: string[]; price?: number };
  deliveryAddress: string;
  deliveryCoordinates: { type: 'Point'; coordinates: [number, number] };
  status: 'PENDING' | 'FULFILLED' | 'CANCELLED';
  createdAt: string;
}

const BASE_URL = '/delivery-address-requests';

class DeliveryAddressRequestService {
  // Client : envoyer la demande
  async create(params: {
    productId: string;
    deliveryAddress: string;
    deliveryCoordinates: [number, number];
  }): Promise<DeliveryAddressRequest> {
    try {
      const response = await ApiService.post<DeliveryAddressRequest>(BASE_URL, params);
      if (response.success && response.data) return response.data;
      throw new Error('Échec de la demande de livraison');
    } catch (error: any) {
      console.error(
        '❌ DeliveryAddressRequestService.create error:',
        error.response?.status,
        error.response?.data,
        error.message
      );
      throw new Error(error.response?.data?.message || "Impossible d'envoyer la demande de livraison");
    }
  }

  // Entreprise : demandes en attente pour un client donné
  async listPending(clientId?: string): Promise<DeliveryAddressRequest[]> {
    try {
      const response = await ApiService.get<DeliveryAddressRequest[]>(
        `${BASE_URL}/pending`,
        { params: clientId ? { clientId } : undefined }
      );
      return response.success && response.data ? response.data : [];
    } catch {
      return [];
    }
  }
}

export default new DeliveryAddressRequestService();
