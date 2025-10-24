
import ApiService from './ApiService';

export interface SubscriptionPlan {
  id: string;
  code: 'AKWABA' | 'CAURIS' | 'LISSA';
  name: string;
  price: number; // monthly price in FCFA maybe
  currency: string;
  description?: string;
  features: string[];
  highlight?: boolean;
}

export interface BackendPlan {
  _id: string;
  name: string;
  description: string;
  duration: string;
  isActive: boolean;
  features: {
    maxProducts: number;
    maxImagesPerProduct: number;
    phone: boolean;
    sms: boolean;
    whatsapp: boolean;
    messaging: boolean;
    advertisements: boolean;
  };
  price: {
    amount: number;
    currency: string;
  };
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface Plan {
  id: string;
  name: string;
  key: string;
  price: string;
  period: string;
  color: string;
  features: string[];
  popular?: boolean;
}

export interface ActiveSubscription {
  planCode: SubscriptionPlan['code'];
  startedAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  autoRenew?: boolean;
}

class SubscriptionService {
  private readonly BASE_URL = '/enterprise/subscriptions';
  private readonly PLANS_BASE_URL = '/plans';

  private mockPlans: SubscriptionPlan[] = [
    {
      id: 'plan-akwaba',
      code: 'AKWABA',
      name: 'Akwaba',
      price: 0,
      currency: 'FCFA',
      description: 'Découverte de la plateforme',
      features: ['Nombre limité de produits', 'Visibilité basique', 'Support communautaire'],
    },
    {
      id: 'plan-cauris',
      code: 'CAURIS',
      name: 'Cauris',
      price: 5000,
      currency: 'FCFA',
      description: 'Croissance et expansion',
      features: ['Plus de produits', 'Statistiques avancées', 'Support prioritaire'],
      highlight: true,
    },
    {
      id: 'plan-lissa',
      code: 'LISSA',
      name: 'Lissa',
      price: 15000,
      currency: 'FCFA',
      description: 'Performance maximale',
      features: ['Produits illimités', 'Publicités incluses', 'Gestionnaire de compte'],
    },
  ];

  private active: ActiveSubscription | null = null;

  // Map backend plan to frontend format
  private mapBackendPlanToFrontend(backendPlan: BackendPlan): Plan {
    const colors = ['#10B981', '#059669', '#047857', '#065F46'];
    const colorIndex = Math.floor(Math.random() * colors.length); // For now, random color

    const features: string[] = [];

    // Map features from backend
    if (backendPlan.price.amount === 0) {
      features.push('1 mois d\'essai gratuit');
    }
    features.push(`${backendPlan.features.maxProducts} produits maximum`);
    features.push(`${backendPlan.features.maxImagesPerProduct} images par produit`);

    // Contact features - only show enabled ones
    if (backendPlan.features.phone) {
      features.push('Support téléphonique');
    }
    if (backendPlan.features.sms) {
      features.push('Notifications SMS');
    }
    if (backendPlan.features.whatsapp) {
      features.push('Intégration WhatsApp');
    }
    if (backendPlan.features.messaging) {
      features.push('Messagerie intégrée');
    }
    if (backendPlan.features.advertisements) {
      features.push('Gestion des publicités');
    }

    return {
      id: backendPlan._id,
      name: backendPlan.name,
      key: backendPlan.name, // Use name as key since there's no separate key field
      price: backendPlan.price.amount === 0 ? 'Gratuit' : `${backendPlan.price.amount.toLocaleString()} ${backendPlan.price.currency === 'XOF' ? 'F' : backendPlan.price.currency}`,
      period: backendPlan.duration === 'MONTHLY' ? '/mois' : '',
      color: colors[colorIndex],
      features,
      popular: backendPlan.name === 'CAURIS', // Mark Cauris as popular
    };
  }

  async getEnterprisePlans(): Promise<Plan[]> {
    try {
      console.log('🔥 SUBSCRIPTION SERVICE - Récupération des plans entreprise depuis API');

      const response = await ApiService.get<{ success: boolean; data: BackendPlan[] }>('/plans/enterprises');

      if (response.success && response.data && Array.isArray(response.data)) {
        const mappedPlans = response.data.map((plan: BackendPlan) => this.mapBackendPlanToFrontend(plan));
        console.log(`✅ SUBSCRIPTION SERVICE - ${mappedPlans.length} plans entreprise récupérés et mappés`);
        return mappedPlans;
      }

      console.warn('⚠️ SUBSCRIPTION SERVICE - Réponse API invalide, utilisation des données mockées');
      return this.getMockEnterprisePlans();
    } catch (error: any) {
      console.error('❌ SUBSCRIPTION SERVICE - Erreur récupération plans entreprise:', error.message);
      console.log('🔄 SUBSCRIPTION SERVICE - Fallback vers données mockées');
      return this.getMockEnterprisePlans();
    }
  }

  private getMockEnterprisePlans(): Plan[] {
    return [
      {
        id: 'akwaba',
        name: 'Akwaba',
        key: 'Akwaba',
        price: 'Gratuit',
        period: '',
        color: '#10B981',
        features: [
          '1 mois d\'essai gratuit',
          '10 produits maximum',
          '3 images par produit',
        ],
      },
      {
        id: 'cauris',
        name: 'Cauris',
        key: 'Cauris',
        price: '2 000 F',
        period: '/mois',
        color: '#059669',
        popular: true,
        features: [
          '20 produits maximum',
          '5 images par produit',
          'Support téléphonique',
          'Notifications SMS',
          'Intégration WhatsApp',
          'Messagerie intégrée',
          'Gestion des publicités',
        ],
      },
      {
        id: 'kwe',
        name: 'Kwe',
        key: 'Kwe',
        price: '5 000 F',
        period: '/mois',
        color: '#047857',
        features: [
          '35 produits maximum',
          '7 images par produit',
          'Support téléphonique',
          'Notifications SMS',
          'Intégration WhatsApp',
          'Messagerie intégrée',
          'Gestion des publicités',
        ],
      },
      {
        id: 'lissa',
        name: 'Lissa',
        key: 'Lissa',
        price: '8 000 F',
        period: '/mois',
        color: '#065F46',
        features: [
          '45 produits maximum',
          '7 images par produit',
          'Support téléphonique',
          'Notifications SMS',
          'Intégration WhatsApp',
          'Messagerie intégrée',
          'Gestion des publicités',
        ],
      },
    ];
  }

  async getPlans(): Promise<SubscriptionPlan[]> {
    try {
      // const res = await ApiService.get<SubscriptionPlan[]>(`${this.BASE_URL}/plans`);
      // return res.data || [];
      return this.mockPlans;
    } catch (e:any) {
      console.warn('Plans fallback (mock):', e.message);
      return this.mockPlans;
    }
  }

  async getActive(): Promise<ActiveSubscription | null> {
    try {
      // const res = await ApiService.get<ActiveSubscription | null>(`${this.BASE_URL}/active`);
      // return res.data || null;
      return this.active;
    } catch (e:any) {
      console.warn('Active subscription fallback (mock):', e.message);
      return this.active;
    }
  }

  async subscribe(planCode: SubscriptionPlan['code']): Promise<ActiveSubscription> {
    // const res = await ApiService.post<ActiveSubscription>(`${this.BASE_URL}/subscribe`, { planCode });
    // if (res.success && res.data) return res.data;
    const now = Date.now();
    this.active = {
      planCode,
      startedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 30*86400000).toISOString(),
      status: 'ACTIVE',
      autoRenew: true,
    };
    return this.active;
  }

  async cancelAutoRenew() {
    if (this.active) this.active.autoRenew = false;
  }
}

export default new SubscriptionService();
