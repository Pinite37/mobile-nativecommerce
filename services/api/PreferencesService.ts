import ApiService from './ApiService';

export interface GeneralPreferences {
  language?: string;
  theme?: string;
}

export interface NotificationPreferences {
  pushEnabled?: boolean;
  types?: {
    delivery?: boolean;
    messages?: boolean;
    newProducts?: boolean;
    advertisements?: boolean;
    systemUpdates?: boolean;
  };
  quietHours?: {
    enabled?: boolean;
    startTime?: string;
    endTime?: string;
  };
}

export interface DisplayPreferences {
  productView?: 'grid' | 'list';
  productsPerPage?: number;
  highQualityImages?: boolean;
}

export interface DeliveryPreferences {
  defaultInstructions?: string;
  preferredTimeSlot?: 'morning' | 'afternoon' | 'evening';
}

export interface EnterprisePreferences {
  autoOnlineStatus?: boolean;
  autoAcceptOrders?: boolean;
  showProductRatings?: boolean;
  businessHours?: {
    day: number;
    open: string;
    close: string;
    isOpen: boolean;
  }[];
}

export interface PrivacyPreferences {
  locationServices?: boolean;
  biometricAuth?: boolean;
  publicProfile?: boolean;
  allowDataAnalytics?: boolean;
  saveLoginInfo?: boolean;
}

export interface UserPreferences {
  general?: GeneralPreferences;
  notifications?: NotificationPreferences;
  display?: DisplayPreferences;
  delivery?: DeliveryPreferences;
  enterprise?: EnterprisePreferences;
  privacy?: PrivacyPreferences;
}

class PreferencesService {
  // Récupérer toutes les préférences de l'utilisateur
  async getPreferences(): Promise<UserPreferences> {
    const response = await ApiService.get<UserPreferences>('/preferences');
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Impossible de récupérer les préférences');
  }

  // Mettre à jour les préférences générales
  async updateGeneral(data: GeneralPreferences): Promise<UserPreferences> {
    const response = await ApiService.put<UserPreferences>('/preferences/general', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Impossible de mettre à jour les préférences générales');
  }

  // Mettre à jour les préférences de notifications
  async updateNotifications(data: NotificationPreferences): Promise<UserPreferences> {
    const response = await ApiService.put<UserPreferences>('/preferences/notifications', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Impossible de mettre à jour les préférences de notifications');
  }

  // Mettre à jour les préférences d'affichage
  async updateDisplay(data: DisplayPreferences): Promise<UserPreferences> {
    const response = await ApiService.put<UserPreferences>('/preferences/display', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Impossible de mettre à jour les préférences d\'affichage');
  }

  // Mettre à jour les préférences de livraison
  async updateDelivery(data: DeliveryPreferences): Promise<UserPreferences> {
    const response = await ApiService.put<UserPreferences>('/preferences/delivery', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Impossible de mettre à jour les préférences de livraison');
  }

  // Mettre à jour les préférences entreprise
  async updateEnterprise(data: EnterprisePreferences): Promise<UserPreferences> {
    const response = await ApiService.put<UserPreferences>('/preferences/enterprise', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Impossible de mettre à jour les préférences entreprise');
  }

  // Mettre à jour les préférences de confidentialité
  async updatePrivacy(data: PrivacyPreferences): Promise<UserPreferences> {
    const response = await ApiService.put<UserPreferences>('/preferences/privacy', data);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Impossible de mettre à jour les préférences de confidentialité');
  }

  // Réinitialiser toutes les préférences
  async resetPreferences(): Promise<UserPreferences> {
    const response = await ApiService.post<UserPreferences>('/preferences/reset');
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Impossible de réinitialiser les préférences');
  }
}

export default new PreferencesService();
