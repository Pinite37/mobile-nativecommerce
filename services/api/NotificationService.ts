import * as Device from 'expo-device';
import { AppState, Platform } from 'react-native';
import ApiService from './ApiService';
import mqttClient from './MQTTClient';

// Check if notifications are available (not in Expo Go)
const notificationsAvailable = (() => {
  try {
    // Check if expo-notifications is available
    return !!require.resolve('expo-notifications');
  } catch {
    return false;
  }
})();

// Conditionally import expo-notifications
let Notifications: any = null;
if (notificationsAvailable) {
  try {
    // Use dynamic import to avoid require issues
    const notificationModule = eval('require')('expo-notifications');
    Notifications = notificationModule.default || notificationModule;
  } catch {
    // Fallback if import fails
  }
}

export interface NotificationData {
  _id: string;
  user: string;
  title: string;
  message: string;
  type: 'MESSAGE' | 'ORDER' | 'REVIEW' | 'SYSTEM' | 'PRODUCT';
  data: {
    messageId?: string;
    conversationId?: string;
    productId?: string;
    senderId?: string;
    orderId?: string;
  };
  read: boolean;
  readAt?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  success: boolean;
  message: string;
  data: NotificationData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface UnreadCountResponse {
  success: boolean;
  message: string;
  data: {
    unreadCount: number;
  };
}

class NotificationService {
  private baseUrl = '/notifications';
  private notificationToken: string | null = null;

  private isExpoGo(): boolean {
    // Méthode pour détecter Expo Go
    return !Device.brand && !Device.manufacturer;
  }

  // === CONFIGURATION DES NOTIFICATIONS ===

  async initializeNotifications(): Promise<void> {
    if (!notificationsAvailable || !Notifications) {
      console.warn('🔔 Notifications not available (likely running in Expo Go)');
      return;
    }

    try {
      // Configurer le gestionnaire de notifications
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      // Écouter les interactions avec les notifications
      Notifications.addNotificationReceivedListener(this.handleNotificationReceived.bind(this));
      Notifications.addNotificationResponseReceivedListener(this.handleNotificationResponse.bind(this));
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation des notifications:', error);
    }
  }

  private async handleNotificationReceived(notification: any): Promise<void> {
    console.log('🔔 Notification reçue:', notification);

    // Ici vous pouvez ajouter une logique personnalisée
    // Par exemple, mettre à jour l'état local, jouer un son spécifique, etc.
  }

  private async handleNotificationResponse(response: any): Promise<void> {
    console.log('👆 Interaction notification:', response);

    const data = response.notification.request.content.data;

    // Gérer la navigation basée sur le type de notification
    if (data?.conversationId) {
      // Navigation vers la conversation
      // Cette logique sera gérée dans le composant qui utilise ce service
      console.log('📱 Navigation vers conversation:', data.conversationId);
    }
  }

  // === GESTION DU TOKEN DE NOTIFICATION ===

  async registerForPushNotificationsAsync(): Promise<string | null> {
    if (!notificationsAvailable || !Notifications) {
      console.warn('🔔 Push notifications not available (likely running in Expo Go)');
      return null;
    }

    try {
      console.log('🔧 Enregistrement pour les notifications push');

      // Vérifier si c'est un appareil physique
      if (!Device.isDevice) {
        console.log('📱 Notifications push uniquement sur appareil physique');
        return null;
      }

      // Vérifier si on est dans Expo Go (où les notifications push ne fonctionnent plus)
      const isExpoGo = this.isExpoGo();
      if (isExpoGo) {
        console.log('📱 Expo Go détecté - notifications push désactivées');
        console.log('💡 Utilisez un development build pour les notifications push');
        console.log('🔧 Commande: npx expo run:android ou npx expo run:ios');
        return null;
      }

      // Demander les permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Permission notifications refusée');
        return null;
      }

      // Obtenir le token
      const token = await Notifications.getExpoPushTokenAsync();
      this.notificationToken = token.data;

      console.log('✅ Token de notification obtenu:', this.notificationToken);
      return this.notificationToken;

    } catch (error) {
      console.error('❌ Erreur enregistrement notifications:', error);
      return null;
    }
  }

  async sendTokenToBackend(): Promise<void> {
    try {
      if (!this.notificationToken) {
        console.log('⚠️ Aucun token de notification à envoyer');
        return;
      }

      console.log('📤 Envoi token au backend');

      await ApiService.post('/auth/update-push-token', {
        pushToken: this.notificationToken,
        platform: Platform.OS,
      });

      console.log('✅ Token envoyé au backend');

    } catch (error) {
      console.error('❌ Erreur envoi token backend:', error);
    }
  }

  // === MÉTHODES API ===

  async getUserNotifications(page: number = 1, limit: number = 20, includeRead: boolean = true): Promise<NotificationResponse> {
    console.log('🔄 Récupération notifications utilisateur');

    try {
      const response = await ApiService.get<any>(
        `${this.baseUrl}?page=${page}&limit=${limit}&includeRead=${includeRead}`
      );

      if (!response || !response.data) {
        throw new Error('Réponse invalide du serveur');
      }

      console.log('✅ Notifications récupérées:', response.data.data?.length || 0);
      return response.data;

    } catch (error) {
      console.error('❌ Erreur récupération notifications:', error);
      throw error;
    }
  }

  async getUnreadCount(): Promise<number> {
    console.log('🔢 Comptage notifications non lues');

    try {
      const response = await ApiService.get<UnreadCountResponse>(`${this.baseUrl}/unread-count`);

      console.log('✅ Nombre notifications non lues:', response);
      if (!response || !response.data) {
        throw new Error('Réponse invalide du serveur');
      }

      const count = response.data.data?.unreadCount || 0;
      console.log('✅ Nombre notifications non lues:', count);
      return count;

    } catch (error) {
      console.error('❌ Erreur comptage notifications:', error);
      return 0;
    }
  }

  async markAsRead(notificationId: string): Promise<NotificationData> {
    console.log('👁️ Marquage notification comme lue:', notificationId);

    try {
      const response = await ApiService.put<any>(`${this.baseUrl}/${notificationId}/read`, {});

      if (!response || !response.data) {
        throw new Error('Réponse invalide du serveur');
      }

      console.log('✅ Notification marquée comme lue');
      return response.data.data;

    } catch (error) {
      console.error('❌ Erreur marquage notification:', error);
      throw error;
    }
  }

  async markAllAsRead(): Promise<{ modifiedCount: number }> {
    console.log('👁️ Marquage toutes notifications comme lues');

    try {
      const response = await ApiService.put<any>(`${this.baseUrl}/mark-all-read`, {});

      if (!response || !response.data) {
        throw new Error('Réponse invalide du serveur');
      }

      console.log('✅ Toutes les notifications marquées comme lues');
      return response.data.data;

    } catch (error) {
      console.error('❌ Erreur marquage toutes notifications:', error);
      throw error;
    }
  }

  async deleteNotification(notificationId: string): Promise<NotificationData> {
    console.log('🗑️ Suppression notification:', notificationId);

    try {
      const response = await ApiService.delete<any>(`${this.baseUrl}/${notificationId}`);

      if (!response || !response.data) {
        throw new Error('Réponse invalide du serveur');
      }

      console.log('✅ Notification supprimée');
      return response.data.data;

    } catch (error) {
      console.error('❌ Erreur suppression notification:', error);
      throw error;
    }
  }

  async deleteReadNotifications(): Promise<{ deletedCount: number }> {
    console.log('🗑️ Suppression notifications lues');

    try {
      const response = await ApiService.delete<any>(`${this.baseUrl}/read`);

      if (!response || !response.data) {
        throw new Error('Réponse invalide du serveur');
      }

      console.log('✅ Notifications lues supprimées');
      return response.data.data;

    } catch (error) {
      console.error('❌ Erreur suppression notifications lues:', error);
      throw error;
    }
  }

  // === NOTIFICATIONS LOCALES ===

  async scheduleLocalNotification(title: string, body: string, data?: any, delaySeconds: number = 0): Promise<string> {
    if (!notificationsAvailable || !Notifications) {
      console.warn('🔔 Cannot schedule local notification (not available)');
      return '';
    }

    try {
      const trigger = delaySeconds > 0 ? { seconds: delaySeconds, type: 'TIME_INTERVAL' } as any : null;

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
        },
        trigger,
      });

      console.log('✅ Notification locale programmée:', notificationId);
      return notificationId;

    } catch (error) {
      console.error('❌ Erreur programmation notification locale:', error);
      throw error;
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    if (!notificationsAvailable || !Notifications) {
      console.warn('🔔 Cannot cancel notification (not available)');
      return;
    }

    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('✅ Notification annulée:', notificationId);
    } catch (error) {
      console.error('❌ Erreur annulation notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    if (!notificationsAvailable || !Notifications) {
      console.warn('🔔 Cannot cancel notifications (not available)');
      return;
    }

    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('✅ Toutes les notifications annulées');
    } catch (error) {
      console.error('❌ Erreur annulation notifications:', error);
    }
  }

  // === INTÉGRATION AVEC MQTT ===

  setupSocketListeners(): void {
    console.log('🔌 Configuration listeners MQTT pour notifications');

    // Écouter les nouvelles notifications
    mqttClient.on('notification', (data: any) => {
      console.log('🔔 Nouvelle notification via MQTT:', data);

      // Afficher une notification push si l'app n'est pas au premier plan
      this.showPushNotification(data);
    });

    // Écouter les notifications marquées comme lues
    mqttClient.on('messages_read', (data: any) => {
      console.log('👁️ Messages marqués comme lus:', data);
      // Mettre à jour l'état local si nécessaire
    });
  }

  private async showPushNotification(notification: NotificationData): Promise<void> {
    try {
      // Vérifier si l'app est au premier plan
      const isAppActive = await this.isAppActive();

      if (!isAppActive) {
        // Vérifier si on peut utiliser les notifications push
        const isExpoGo = !Device.brand && !Device.manufacturer;

        if (isExpoGo) {
          // Utiliser une notification locale à la place
          console.log('📱 Expo Go détecté - utilisation notification locale');
          await this.scheduleLocalNotification(
            notification.title,
            notification.message,
            {
              notificationId: notification._id,
              type: notification.type,
              conversationId: notification.data.conversationId,
              ...notification.data
            },
            1 // Dans 1 seconde
          );
        } else {
          // Utiliser les notifications push normales
          await Notifications.presentNotificationAsync({
            title: notification.title,
            body: notification.message,
            data: {
              notificationId: notification._id,
              type: notification.type,
              conversationId: notification.data.conversationId,
              ...notification.data
            },
            sound: 'default',
          });
        }
      }
    } catch (error) {
      console.error('❌ Erreur affichage notification push:', error);
    }
  }

  private async isAppActive(): Promise<boolean> {
    try {
      // Utiliser l'AppState pour vérifier si l'app est active
      const currentState = AppState.currentState;
      return currentState === 'active';
    } catch (error) {
      // En cas d'erreur, on considère que l'app n'est pas active
      console.warn('⚠️ Impossible de déterminer l\'état de l\'app:', error);
      return false;
    }
  }

  // === UTILITAIRES ===

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'MESSAGE':
        return '💬';
      case 'ORDER':
        return '🛒';
      case 'REVIEW':
        return '⭐';
      case 'PRODUCT':
        return '📦';
      case 'SYSTEM':
      default:
        return '🔔';
    }
  }

  formatNotificationTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInMs / (1000 * 60));
      return minutes < 1 ? 'À l\'instant' : `Il y a ${minutes}min`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `Il y a ${hours}h`;
    } else if (diffInDays < 7) {
      const days = Math.floor(diffInDays);
      return `Il y a ${days}j`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: diffInDays > 365 ? '2-digit' : undefined
      });
    }
  }

  // === INITIALISATION ===

  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initialisation du service de notifications');

      // Vérifier si on est dans Expo Go
      const isExpoGo = !Device.brand && !Device.manufacturer;
      if (isExpoGo) {
        console.log('📱 Expo Go détecté - Mode notifications limité');
        console.log('💡 Pour les notifications push complètes, utilisez un development build');
      }

      // Enregistrer pour les notifications push
      await this.registerForPushNotificationsAsync();

      // Envoyer le token au backend
      await this.sendTokenToBackend();

      // Configurer les listeners Socket.IO
      this.setupSocketListeners();

      console.log('✅ Service de notifications initialisé');

    } catch (error) {
      console.error('❌ Erreur initialisation notifications:', error);
    }
  }
}

// Instance singleton
const notificationService = new NotificationService();

export default notificationService;
