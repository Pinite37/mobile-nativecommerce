
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

export interface ActiveSubscription {
  planCode: SubscriptionPlan['code'];
  startedAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  autoRenew?: boolean;
}

class SubscriptionService {
  private readonly BASE_URL = '/enterprise/subscriptions';
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
