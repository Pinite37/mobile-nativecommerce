import ApiService from './ApiService';

/**
 * Commande — l'accord de livraison entre un client et une entreprise.
 *
 * Ce n'est pas une commande marchande : le paiement des produits se fait
 * hors de l'app et il n'y a pas de stock. C'est l'objet qui manquait entre
 * la conversation (la négociation) et la mission (le transport).
 *
 * Le partage des rôles est ce qui rend une mission incomplète impossible :
 * l'entreprise propose (elle seule connaît le prix convenu et où est le
 * colis), le client confirme en donnant SON adresse.
 */

export type CommandeStatus =
  | 'PROPOSEE'
  | 'CONFIRMEE'
  | 'EN_LIVRAISON'
  | 'LIVREE'
  | 'ANNULEE';

export interface CommandeItem {
  product: string;
  quantity: number;
  /** Figés à la création : le produit peut changer de prix ensuite. */
  unitPrice: number;
  nameSnapshot: string;
  imageSnapshot?: string;
}

export interface GeoLabel {
  label?: string;
  address?: string;
  coordinates?: [number, number];
}

/**
 * Qui livre, où en est la course, comment le joindre.
 *
 * `null` tant qu'aucune mission n'est publiée. Le téléphone du livreur est
 * obligatoire à son inscription — c'est ce qui permet au client de le
 * joindre s'il ne trouve pas l'adresse ou s'il n'est pas là.
 */
export interface CommandeDelivery {
  missionId: string;
  status: 'OPEN' | 'ASSIGNED' | 'PICKED_UP' | 'COMPLETED' | 'CANCELLED' | 'RETURNED';
  pickedUpAt?: string | null;
  deliveryFee?: number;
  durationMin?: number | null;
  distanceKm?: number | null;
  missionCount?: number;
  deliverer?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    profileImage?: string;
    vehicleType?: string;
  } | null;
}

export interface Commande {
  _id: string;
  client: string | { _id: string; firstName?: string; lastName?: string; phone?: string };
  enterprise: string | { _id: string; companyName?: string; logo?: string };
  conversation?: string;
  items: CommandeItem[];
  /** Total réellement convenu — peut différer de la somme des lignes. */
  agreedTotal: number;
  pickupPoint?: GeoLabel;
  deliveryAddress?: GeoLabel;
  deliveryFee: number;
  deliveryFeePaidBy: 'ENTREPRISE' | 'CLIENT';
  status: CommandeStatus;
  missions?: string[];
  /** Renseigné par le serveur sur getById uniquement. */
  delivery?: CommandeDelivery | null;
  cancelStage?: 'AVANT_PUBLICATION' | 'APRES_ACCEPTATION' | 'APRES_RETRAIT';
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommandePayload {
  client: string;
  conversation?: string;
  items: { product: string; quantity?: number; unitPrice?: number }[];
  agreedTotal?: number;
  deliveryFee?: number;
  deliveryFeePaidBy?: 'ENTREPRISE' | 'CLIENT';
  pickupPointId?: string;
}

const BASE_URL = '/commandes';

function fail(error: any, fallback: string): never {
  console.error('❌ CommandeService:', error.response?.status, error.response?.data, error.message);
  throw new Error(error.response?.data?.message || error.message || fallback);
}

class CommandeService {
  /** Entreprise : proposer une commande depuis la conversation. */
  async create(payload: CreateCommandePayload): Promise<Commande> {
    try {
      const r = await ApiService.post<Commande>(BASE_URL, payload);
      if (r.success && r.data) return r.data;
      throw new Error(r.message || 'Échec de la proposition');
    } catch (e: any) {
      fail(e, 'Impossible de proposer cette commande');
    }
  }

  /** Client : confirmer et fournir son adresse de livraison. */
  async confirm(
    commandeId: string,
    delivery: { coordinates: [number, number]; address?: string; label?: string }
  ): Promise<Commande> {
    try {
      const r = await ApiService.post<Commande>(`${BASE_URL}/${commandeId}/confirm`, delivery);
      if (r.success && r.data) return r.data;
      throw new Error(r.message || 'Échec de la confirmation');
    } catch (e: any) {
      fail(e, 'Impossible de confirmer cette commande');
    }
  }

  /** La liste s'adapte au rôle de l'appelant. */
  async listMine(params?: { status?: CommandeStatus; client?: string }): Promise<Commande[]> {
    try {
      const r = await ApiService.get<Commande[]>(BASE_URL, { params });
      return r.success && r.data ? r.data : [];
    } catch (error: any) {
      console.error('❌ CommandeService.listMine:', error.response?.status, error.message);
      return [];
    }
  }

  async getById(commandeId: string): Promise<Commande | null> {
    try {
      const r = await ApiService.get<Commande>(`${BASE_URL}/${commandeId}`);
      return r.success && r.data ? r.data : null;
    } catch {
      return null;
    }
  }

  /** Entreprise : publier la mission une fois le client confirmé. */
  async publishMission(commandeId: string, expiresAt?: string): Promise<any> {
    try {
      const r = await ApiService.post<any>(`${BASE_URL}/${commandeId}/publish-mission`, { expiresAt });
      if (r.success && r.data) return r.data;
      throw new Error(r.message || 'Échec de la publication');
    } catch (e: any) {
      fail(e, 'Impossible de publier cette livraison');
    }
  }

  async cancel(commandeId: string, reason?: string): Promise<Commande> {
    try {
      const r = await ApiService.post<Commande>(`${BASE_URL}/${commandeId}/cancel`, { reason });
      if (r.success && r.data) return r.data;
      throw new Error(r.message || "Échec de l'annulation");
    } catch (e: any) {
      fail(e, "Impossible d'annuler cette commande");
    }
  }

  statusLabel(status: CommandeStatus): string {
    switch (status) {
      case 'PROPOSEE': return 'En attente de votre confirmation';
      case 'CONFIRMEE': return 'Confirmée';
      case 'EN_LIVRAISON': return 'En cours de livraison';
      case 'LIVREE': return 'Livrée';
      case 'ANNULEE': return 'Annulée';
      default: return status;
    }
  }
}

export default new CommandeService();
