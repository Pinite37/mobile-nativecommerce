import ApiService from './ApiService';

export interface CreatePaymentIntentRequest {
  subscriptionType: 'DELIVER' | 'ENTERPRISE';
  planId?: string;
  metadata?: {
    source: string;
    deviceId?: string;
    [key: string]: any;
  };
}

export interface CreatePaymentIntentResponse {
  success: boolean;
  message: string;
  data: {
    intentId: string;
    amount: number;
    subscriptionType: string;
    planId?: string;
    expiresAt: string;
  };
}

export interface ConfirmPaymentRequest {
  intentId: string;
  transactionId: string;
}

export interface ConfirmPaymentResponse {
  success: boolean;
  message: string;
  data: {
    payment: {
      _id: string;
      subscriptionType: string;
      amount: number;
      status: string;
      transactionId: string;
    };
    subscription: {
      _id: string;
      isActive: boolean;
      startDate: string;
      endDate: string;
    };
    action: 'created' | 'renewed';
  };
}

export interface PaymentHistory {
  _id: string;
  subscriptionType: string;
  amount: number;
  status: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentHistoryResponse {
  success: boolean;
  message: string;
  data: PaymentHistory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class PaymentService {
  /**
   * Créer une intention de paiement pour une souscription
   */
  static async createPaymentIntent(
    data: CreatePaymentIntentRequest
  ): Promise<CreatePaymentIntentResponse> {
    try {
      console.log('🔄 Création intention de paiement:', data);
      const response: any = await ApiService.post(
        '/payments/subscriptions/create-intent',
        data
      );
      console.log('✅ Intention créée:', response);
      // ApiService retourne déjà l'objet complet avec success, message, data
      return response;
    } catch (error: any) {
      console.error('❌ Erreur création intention:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Confirmer un paiement après transaction KKiaPay
   */
  static async confirmPayment(
    data: ConfirmPaymentRequest
  ): Promise<ConfirmPaymentResponse> {
    try {
      console.log('🔄 Confirmation paiement:', data);
      const response: any = await ApiService.post(
        '/payments/subscriptions/confirm',
        data
      );
      console.log('✅ Paiement confirmé:', response);
      // ApiService retourne déjà l'objet complet avec success, message, data
      return response;
    } catch (error: any) {
      console.error('❌ Erreur confirmation paiement:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Récupérer l'historique des paiements
   */
  static async getPaymentHistory(
    page: number = 1,
    limit: number = 10
  ): Promise<PaymentHistoryResponse> {
    try {
      console.log('🔄 Récupération historique paiements, page:', page);
      const response: any = await ApiService.get(
        '/payments/subscriptions/history',
        {
          params: { page, limit }
        }
      );
      console.log('✅ Historique récupéré:', response);
      // ApiService retourne déjà l'objet complet avec success, message, data, pagination
      return response;
    } catch (error: any) {
      console.error('❌ Erreur récupération historique:', error.response?.data || error.message);
      throw error;
    }
  }
}

export default PaymentService;
