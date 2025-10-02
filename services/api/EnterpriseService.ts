/**
 * EnterpriseService
 * Tous les mocks ont été retirés (sept. 2025) pour n'utiliser que l'API backend réelle.
 * Si besoin d'environnement de démo, implémenter un flag externe ou un adapter séparé.
 */
import { User } from '../../types/auth';
import ApiService from './ApiService';

// Types pour l'API Enterprise
export interface EnterpriseProfile {
  user: User;
  enterprise: Enterprise;
}

export interface Enterprise {
  _id: string;
  user: string;
  companyName: string;
  contactInfo: {
    email: string;
    phone: string;
    whatsapp?: string;
    website?: string;
  };
  logo: string;
  description: string;
  products: string[];
  socialLinks: SocialLink[];
  deliveryPartners: DeliveryPartner[];
  stats: EnterpriseStats;
  location: {
    city: string;
    district: string;
  };
  isActive: boolean;
  lastActiveDate: string;
  blockedUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface DeliveryPartner {
  _id: string;
  /** Identifiant primaire du livreur (deliverer) côté backend */
  delivererId?: string;
  /** Identifiant de l'utilisateur rattaché (user._id) */
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  profileImage?: string;
  availability?: boolean;
  isActive?: boolean;
  vehicleType?: string;
  rating?: number;
}

// Version enrichie lorsqu'on consomme l'endpoint with-status
export interface DeliveryPartnerStatus extends DeliveryPartner {
  isAssociated: boolean; // l'entreprise courante est associée à ce livreur
  isVerified?: boolean; // statut de vérification côté plateforme
  workingHours?: any; // structure horaire (TODO: typer quand backend stabilisé)
  stats?: any; // statistiques spécifiques (livraisons, rating détaillé, etc.)
}

export interface DeliveryPartnersWithStatusResponse {
  total: number; // nombre total de livreurs disponibles côté backend (filtre donné)
  associatedCount: number; // nombre déjà associés à l'entreprise courante
  deliverers: DeliveryPartnerStatus[]; // liste enrichie
}

// Réponse potentielle pour un partenaire unique enrichi (selon standard backend à confirmer)
export interface DeliveryPartnerWithStatusResponse {
  partner?: any; // backend pourrait utiliser partner / deliverer / data
  deliverer?: any;
  data?: any;
  isAssociated?: boolean; // certains backends peuvent le mettre à la racine
}

export interface EnterpriseStats {
  totalSales: number;
  totalOrders: number;
  averageRating: number;
  totalReviews: number;
}

export interface UpdateUserProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
    address: string;
  };
  preferences?: any;
}

export interface UpdateEnterpriseInfoRequest {
  companyName?: string;
  description?: string;
  socialLinks?: SocialLink[];
  location?: {
    city: string;
    district: string;
  };
}

export interface UpdateStatsRequest {
  totalSales?: number;
  totalOrders?: number;
  averageRating?: number;
  totalReviews?: number;
}

export interface AddDeliveryPartnerRequest {
  partnerId: string;
}

// NOTE: Suppression des mocks : le service pointe uniquement vers l'API réelle.

class EnterpriseService {
  private readonly BASE_URL = '/enterprise';
  /** Normalise un livreur brut venant du backend complexe (avec user imbriqué) */
  private mapRawDeliveryPartner(raw: any): DeliveryPartner {
    if (!raw) return raw;
    // Le backend renvoie un objet Deliver avec champ user embarqué
    const user = raw.user || {};
    const stats = raw.stats || {};
    // IMPORTANT: l'identifiant métier du livreur est "id" (et non le user._id). On le privilégie.
    const delivererId = raw.id || raw._id || user._id; // ordre de priorité
    const userId = user._id || raw.userId;
    return {
      _id: delivererId,
      delivererId,
      userId,
      firstName: user.firstName || raw.firstName || '',
      lastName: user.lastName || raw.lastName || '',
      email: user.email || raw.email || '',
      phone: user.phone || raw.phone || '',
      profileImage: user.profileImage || raw.profileImage,
      availability: raw.availability,
      isActive: raw.isActive,
      vehicleType: raw.vehicleType,
      rating: stats.rating ?? 0,
    };
  }

  /** Mapping enrichi pour endpoint with-status */
  private mapRawDeliveryPartnerWithStatus(raw: any): DeliveryPartnerStatus {
    const base = this.mapRawDeliveryPartner(raw);
    return {
      ...base,
      isAssociated: !!raw.isAssociated,
      isVerified: raw.isVerified,
      workingHours: raw.workingHours,
      stats: raw.stats, // gardé brut pour le moment (détails livraisons, etc.)
    };
  }

  // Récupérer le profil complet de l'entreprise
  async getProfile(): Promise<EnterpriseProfile> {
    try {

      const response = await ApiService.get<EnterpriseProfile>(`${this.BASE_URL}/profile`);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to get enterprise profile');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get enterprise profile');
    }
  }

  // Mettre à jour le profil utilisateur avec image
  async updateUserProfileWithImage(userData: UpdateUserProfileRequest, imageBase64?: string): Promise<User> {
    try {
      // mocks supprimés

      const updateData = {
        ...userData,
        ...(imageBase64 && {
          image: {
            base64: imageBase64,
            type: 'image/jpeg'
          }
        })
      };

      console.log('📤 Updating enterprise user profile:', updateData);

      const response = await ApiService.put<User>(`${this.BASE_URL}/profile/user`, updateData);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to update user profile');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update user profile');
    }
  }

  // Mettre à jour les informations de l'entreprise avec logo
  async updateEnterpriseInfoWithLogo(enterpriseData: UpdateEnterpriseInfoRequest, logoBase64?: string): Promise<Enterprise> {
    try {
      // mocks supprimés

      const updateData = {
        ...enterpriseData,
        ...(logoBase64 && {
          logo: {
            base64: logoBase64,
            type: 'image/jpeg'
          }
        })
      };

      console.log('📤 Updating enterprise info:', updateData);

      const response = await ApiService.put<Enterprise>(`${this.BASE_URL}/profile/enterprise`, updateData);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to update enterprise info');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update enterprise info');
    }
  }

  // Mettre à jour les statistiques
  async updateStats(stats: UpdateStatsRequest): Promise<Enterprise> {
    try {
      // mocks supprimés

      const response = await ApiService.put<Enterprise>(`${this.BASE_URL}/stats`, stats);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to update stats');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update stats');
    }
  }

  // Ajouter un partenaire de livraison
  async addDeliveryPartner(partnerId: string): Promise<Enterprise> {
    try {
      // mocks supprimés

      // NOTE: Backend actuel expose POST /enterprise/delivery-partners/:partnerId/associate
      // L'ancien endpoint sans :partnerId est remplacé par associateDeliveryPartner.
      // On garde cette méthode pour rétro-compatibilité mais on délègue à associateDeliveryPartner.
      console.warn('[DEPRECATED] addDeliveryPartner() utilise maintenant associateDeliveryPartner(partnerId)');
      return this.associateDeliveryPartner(partnerId);
      
      // Ancien code supprimé car endpoint différent.
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to add delivery partner');
    }
  }

  // Supprimer un partenaire de livraison
  async removeDeliveryPartner(partnerId: string): Promise<Enterprise> {
    // Essayer différentes routes pour la suppression
    const candidateUrls = [
      `${this.BASE_URL}/delivery-partners/${partnerId}`,
      `${this.BASE_URL}/deliverers/${partnerId}`
    ];

    let lastError: any = null;
    for (const url of candidateUrls) {
      try {
        const response = await ApiService.delete<Enterprise>(url);
        if (response.success && response.data) {
          return response.data;
        }
      } catch (error: any) {
        const status = error?.response?.status;
        if (status && status !== 404) {
          lastError = error;
          break;
        }
        // 404 -> try next pattern
      }
    }

    // Si toutes les routes échouent
    if (lastError) {
      throw new Error(lastError.response?.data?.message || lastError.message || 'Failed to remove delivery partner');
    }
    throw new Error('Failed to remove delivery partner');
  }

  /**
   * Récupérer tous les partenaires de livraison disponibles
   */
  async getDeliveryPartners(): Promise<DeliveryPartner[]> {
    // Essayer différentes routes pour récupérer la liste
    const candidateUrls = [
      `${this.BASE_URL}/delivery-partners`,
      `${this.BASE_URL}/deliverers`
    ];

    let lastError: any = null;
    for (const url of candidateUrls) {
      try {
        const response = await ApiService.get<any>(url);
        console.log('🔄 Delivery partners response (raw):', JSON.stringify(response, null, 2));
        if (response.success) {
          let rawList: any[] = [];
          if (Array.isArray(response.data)) rawList = response.data;
          else if (response.data?.data && Array.isArray(response.data.data)) rawList = response.data.data;
          else if (response.data?.deliveryPartners && Array.isArray(response.data.deliveryPartners)) rawList = response.data.deliveryPartners;
          return rawList.map(r => this.mapRawDeliveryPartner(r));
        }
      } catch (error: any) {
        const status = error?.response?.status;
        if (status && status !== 404) {
          lastError = error;
          break;
        }
        // 404 -> try next pattern
      }
    }

    // Si toutes les routes échouent
    if (lastError) {
      throw new Error(lastError.response?.data?.message || lastError.message || 'Échec de récupération des partenaires de livraison');
    }
    throw new Error('Échec de récupération des partenaires de livraison');
  }

  /**
   * Nouvel endpoint enrichi: /enterprise/delivery-partners/with-status
   * Retour attendu: { total, associatedCount, deliverers: [ { ...isAssociated, isVerified, workingHours, stats } ] }
   */
  async getDeliveryPartnersWithStatus(): Promise<DeliveryPartnersWithStatusResponse> {
    try {
      const response = await ApiService.get<any>(`${this.BASE_URL}/delivery-partners/with-status`);
      console.log('🔄 Delivery partners WITH STATUS response (raw):', JSON.stringify(response, null, 2));
      if (response.success) {
        const data = response.data || {};
        // Tolérance structures diverses
        const total = data.total ?? data.count ?? (Array.isArray(data.deliverers) ? data.deliverers.length : 0);
        const associatedCount = data.associatedCount ?? data.associated ?? 0;
        let rawList: any[] = [];
        if (Array.isArray(data.deliverers)) rawList = data.deliverers;
        else if (Array.isArray(data.data)) rawList = data.data; // fallback si backend renvoie directement la liste
        const deliverers = rawList.map(r => this.mapRawDeliveryPartnerWithStatus(r));
        return { total, associatedCount, deliverers };
      }
      throw new Error('Échec de récupération des partenaires (with-status)');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Échec de récupération des partenaires (with-status)');
    }
  }

  /**
   * Récupérer un partenaire par son ID
   */
  async getDeliveryPartnerById(partnerId: string): Promise<DeliveryPartner> {
    // Essayer différentes routes potentielles, silencieusement si 404
    const candidates = [
      `${this.BASE_URL}/delivery-partners/${partnerId}`, // Essayer d'abord delivery-partners (observé 200)
      `${this.BASE_URL}/deliverers/${partnerId}` // Puis deliverers
    ];
    let lastError: any = null;
    for (const url of candidates) {
      try {
        const response = await ApiService.get<any>(url);
        if (response.success && response.data) {
          const raw = (response.data as any).data || response.data;
          return this.mapRawDeliveryPartner(raw);
        }
      } catch (e: any) {
        const status = e?.response?.status;
        if (status && status !== 404) {
          lastError = e;
          break;
        }
        lastError = e;
        // continue loop for next candidate
      }
    }
    throw new Error(lastError?.response?.data?.message || 'Partenaire livraison non trouvé');
  }

  /**
   * Récupérer un partenaire avec statut enrichi si l'endpoint existe
   * Tentatives d'URL:
   *  - /enterprise/delivery-partners/:id/with-status (préfixe symétrique à la liste)
   *  - /enterprise/delivery-partners/:id/status
   *  - fallback sur getDeliveryPartnerById si 404
   */
  async getDeliveryPartnerWithStatusById(partnerId: string): Promise<DeliveryPartnerStatus> {
    const candidateUrls = [
      // Prioriser d'abord la route de base qui fonctionne
      `${this.BASE_URL}/delivery-partners/${partnerId}`, // Route directe delivery-partners (confirmée)
      // Puis tenter les endpoints enrichis s'ils existent
      `${this.BASE_URL}/delivery-partners/${partnerId}/with-status`,
      `${this.BASE_URL}/delivery-partners/${partnerId}/status`,
      // Puis tenter les variantes deliverers en fallback
      `${this.BASE_URL}/deliverers/${partnerId}`, // Route directe deliverers
      `${this.BASE_URL}/deliverers/${partnerId}/with-status`,
      `${this.BASE_URL}/deliverers/${partnerId}/status`
    ];
    for (const url of candidateUrls) {
      try {
        const response = await ApiService.get<any>(url);
        if (response.success && response.data) {
          const d = response.data as DeliveryPartnerWithStatusResponse | any;
          const raw = (d.partner || d.deliverer || d.data || d);
            if (d.isAssociated !== undefined && raw && raw.isAssociated === undefined) {
              raw.isAssociated = d.isAssociated;
            }
          return this.mapRawDeliveryPartnerWithStatus(raw);
        }
      } catch (error: any) {
        const status = error?.response?.status;
        if (status && status !== 404) {
          throw new Error(error.response?.data?.message || error.message || 'Échec récupération partenaire enrichi');
        }
        // 404 -> try next pattern
      }
    }
    const base = await this.getDeliveryPartnerById(partnerId);
    return { ...base, isAssociated: false };
  }

  /**
   * Associer un partenaire de livraison à l'entreprise courante
   */
  async associateDeliveryPartner(partnerId: string): Promise<Enterprise> {
    // Essayer différentes routes pour l'association
    const candidateUrls = [
      `${this.BASE_URL}/delivery-partners/${partnerId}/associate`,
      `${this.BASE_URL}/deliverers/${partnerId}/associate`
    ];

    let lastError: any = null;
    for (const url of candidateUrls) {
      try {
        const response = await ApiService.post<Enterprise>(url, {});
        if (response.success && response.data) {
          return response.data;
        }
      } catch (error: any) {
        const status = error?.response?.status;
        if (status && status !== 404) {
          lastError = error;
          break;
        }
        // 404 -> try next pattern
      }
    }

    // Si toutes les routes échouent
    if (lastError) {
      throw new Error(lastError.response?.data?.message || lastError.message || 'Échec de l\'association du partenaire');
    }
    throw new Error('Échec de l\'association du partenaire');
  }

  // Activer/désactiver l'entreprise
  async toggleActiveStatus(): Promise<Enterprise> {
    try {
      // mocks supprimés

      const response = await ApiService.put<Enterprise>(`${this.BASE_URL}/toggle-status`, {});
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to toggle active status');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to toggle active status');
    }
  }

  /**
   * Récupérer les informations publiques d'une entreprise par son ID
   */
  async getPublicEnterpriseById(enterpriseId: string): Promise<Enterprise> {
    try {
      console.log('🔄 ENTERPRISE SERVICE - Récupération entreprise publique:', enterpriseId);
      
      const response = await ApiService.get<Enterprise>(`${this.BASE_URL}/public/${enterpriseId}`);
      
      if (response.success && response.data) {
        console.log('✅ Entreprise publique récupérée');
        return response.data;
      }
      
      throw new Error('Entreprise non trouvée');
    } catch (error: any) {
      console.error('❌ ENTERPRISE SERVICE - Erreur récupération entreprise publique:', error);
      throw new Error(error.response?.data?.message || error.message || 'Échec de récupération de l\'entreprise');
    }
  }

  /**
   * Récupérer les produits d'une entreprise (vue publique)
   */
  async getEnterpriseProducts(
    enterpriseId: string, 
    page: number = 1, 
    limit: number = 20, 
    filters: {
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      sort?: string;
      search?: string;
    } = {}
  ): Promise<{
    products: any[];
    enterprise: {
      id: string;
      companyName: string;
      logo: string;
    };
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      console.log('🔄 ENTERPRISE SERVICE - Récupération produits entreprise:', enterpriseId);
      console.log('📄 Page:', page, 'Limite:', limit);
      console.log('🔍 Filtres:', filters);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        ),
      });

      const response = await ApiService.get<{
        products: any[];
        enterprise: {
          id: string;
          companyName: string;
          logo: string;
        };
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>(`${this.BASE_URL}/public/${enterpriseId}/products?${params}`);
      
      console.log('🔍 Response structure:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        // Gérer différentes structures de réponse possibles
        let products = [];
        let pagination = { page: 1, limit: 20, total: 0, pages: 0 };
        let enterprise = { id: enterpriseId, companyName: 'Entreprise', logo: '' };
        
        if (response.data) {
          // Si response.data contient directement les produits
          if (Array.isArray(response.data)) {
            products = response.data;
          } 
          // Si response.data a une structure avec products
          else if (response.data.products) {
            products = response.data.products;
            pagination = response.data.pagination || pagination;
            enterprise = response.data.enterprise || enterprise;
          }
          // Si response.data est un objet avec d'autres propriétés
          else {
            products = response.data.products || [];
            pagination = response.data.pagination || pagination;
            enterprise = response.data.enterprise || enterprise;
          }
        }
        
        console.log('✅ Produits entreprise récupérés:', products.length);
        return {
          products: products,
          enterprise: enterprise,
          pagination: pagination
        };
      }
      
      throw new Error('Échec de récupération des produits');
    } catch (error: any) {
      console.error('❌ ENTERPRISE SERVICE - Erreur récupération produits entreprise:', error);
      throw new Error(error.response?.data?.message || error.message || 'Échec de récupération des produits de l\'entreprise');
    }
  }

  /**
   * Vérifier si un partenaire de livraison est associé à l'entreprise courante
   */
  async checkDeliveryPartnerAssociation(partnerId: string): Promise<boolean> {
    try {
      console.log('🔄 ENTERPRISE SERVICE - Vérification association partenaire livraison:', partnerId);

      const response = await ApiService.get<any>(`${this.BASE_URL}/delivery-partners/${partnerId}/status`);

      if (response.success && response.data) {
        const isAssociated = response.data.isAssociated;
        console.log('📦 Statut association partenaire:', isAssociated);
        return isAssociated;
      }

      throw new Error('Échec de vérification du statut d\'association');
    } catch (error: any) {
      console.error('❌ ENTERPRISE SERVICE - Erreur vérification association partenaire:', error);
      throw new Error(error.response?.data?.message || error.message || 'Échec de vérification du statut d\'association');
    }
  }

  /**
   * Dissocier un partenaire de livraison de l'entreprise courante
   */
  async dissociateDeliveryPartner(partnerId: string): Promise<any> {
    try {
      console.log('🔄 ENTERPRISE SERVICE - Dissociation partenaire livraison:', partnerId);

      const response = await ApiService.post<any>(`${this.BASE_URL}/delivery-partners/${partnerId}/dissociate`, {});

      if (response.success && response.data) {
        console.log('✅ Partenaire dissocié avec succès');
        return response.data;
      }

      throw new Error('Échec de dissociation du partenaire');
    } catch (error: any) {
      console.error('❌ ENTERPRISE SERVICE - Erreur dissociation partenaire:', error);
      throw new Error(error.response?.data?.message || error.message || 'Échec de dissociation du partenaire');
    }
  }
}

export default new EnterpriseService();
