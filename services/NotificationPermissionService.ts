import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const PERMISSION_ASKED_KEY = '@notification_permission_asked';
const PERMISSION_GRANTED_KEY = '@notification_permission_granted';

/**
 * Service pour gérer les permissions de notifications et l'enregistrement du token Expo Push
 */
class NotificationPermissionService {
  private static instance: NotificationPermissionService;
  
  private constructor() {}

  public static getInstance(): NotificationPermissionService {
    if (!NotificationPermissionService.instance) {
      NotificationPermissionService.instance = new NotificationPermissionService();
    }
    return NotificationPermissionService.instance;
  }

  /**
   * Vérifie si l'utilisateur a déjà été sollicité pour les permissions
   */
  async hasAskedForPermission(): Promise<boolean> {
    try {
      const asked = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
      return asked === 'true';
    } catch (error) {
      console.error('❌ Erreur vérification permission demandée:', error);
      return false;
    }
  }

  /**
   * Marque que l'utilisateur a été sollicité pour les permissions
   */
  async markPermissionAsked(): Promise<void> {
    try {
      await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');
    } catch (error) {
      console.error('❌ Erreur marquage permission demandée:', error);
    }
  }

  /**
   * Vérifie si les permissions ont été accordées
   */
  async hasPermission(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      const granted = status === 'granted';
      
      // Sauvegarder l'état de la permission
      await AsyncStorage.setItem(PERMISSION_GRANTED_KEY, granted.toString());
      
      return granted;
    } catch (error) {
      console.error('❌ Erreur vérification permission:', error);
      return false;
    }
  }

  /**
   * Demande les permissions de notifications
   */
  async requestPermissions(): Promise<boolean> {
    try {
      console.log('📱 Demande de permissions de notifications...');

      // Vérifier qu'on est sur un appareil physique
      if (!Device.isDevice) {
        console.warn('⚠️ Les notifications nécessitent un appareil physique');
        return false;
      }

      // Vérifier l'état actuel des permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      console.log('📋 Statut actuel des permissions:', existingStatus);

      // Si pas encore accordées, demander
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('📋 Nouveau statut après demande:', finalStatus);
      }

      // Marquer que l'utilisateur a été sollicité
      await this.markPermissionAsked();

      const granted = finalStatus === 'granted';
      
      // Sauvegarder l'état
      await AsyncStorage.setItem(PERMISSION_GRANTED_KEY, granted.toString());

      if (granted) {
        console.log('✅ Permissions de notifications accordées');
      } else {
        console.log('❌ Permissions de notifications refusées');
      }

      return granted;
    } catch (error) {
      console.error('❌ Erreur lors de la demande de permissions:', error);
      return false;
    }
  }

  /**
   * Configure le canal de notifications pour Android
   */
  async setupAndroidChannel(): Promise<void> {
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Notifications par défaut',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
        });

        // Canal pour les commandes
        await Notifications.setNotificationChannelAsync('orders', {
          name: 'Commandes',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
        });

        // Canal pour les messages
        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Messages',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3B82F6',
        });

        // Canal pour les promotions
        await Notifications.setNotificationChannelAsync('promotions', {
          name: 'Promotions',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#F59E0B',
        });

        console.log('✅ Canaux de notifications Android configurés');
      } catch (error) {
        console.error('❌ Erreur configuration canaux Android:', error);
      }
    }
  }

  /**
   * Obtient le token Expo Push
   */
  async getExpoPushToken(): Promise<string | null> {
    try {
      console.log('📱 Récupération du token Expo Push...');

      // Vérifier qu'on est sur un appareil physique
      if (!Device.isDevice) {
        console.warn('⚠️ Les notifications nécessitent un appareil physique');
        return null;
      }

      // Vérifier les permissions
      const hasPermission = await this.hasPermission();
      if (!hasPermission) {
        console.warn('⚠️ Permissions de notifications non accordées');
        return null;
      }

      const projectId =
        Constants.easConfig?.projectId ??
        Constants.expoConfig?.extra?.eas?.projectId;

      if (!projectId) {
        console.error('❌ ProjectId non trouvé (Constants.easConfig ou app.json extra.eas)');
        return null;
      }

      console.log('🔧 Tentative de récupération du token avec projectId:', projectId);

      // Obtenir le token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      const token = tokenData.data;
      console.log('✅ Token Expo Push obtenu:', token);

      return token;
    } catch (error: any) {
      console.error('❌ Erreur lors de la récupération du token:', error);
      
      // Afficher des informations de debug pour mieux comprendre l'erreur
      if (error?.message?.includes('Firebase')) {
        console.error('⚠️ PROBLÈME FIREBASE DÉTECTÉ');
        console.error('📋 Pour résoudre:');
        console.error('   1. Utilisez Expo Go pour les tests en développement');
        console.error('   2. Ou faites un prebuild propre: npx expo prebuild --clean');
        console.error('   3. Ou configurez Firebase selon: https://docs.expo.dev/push-notifications/fcm-credentials/');
      }
      
      return null;
    }
  }

  /**
   * Vérifie si l'utilisateur doit voir le modal de permission
   */
  async shouldShowPermissionModal(): Promise<boolean> {
    try {
      console.log('🔍 shouldShowPermissionModal - DÉBUT');
      
      // Ne pas afficher si déjà demandé
      console.log('🔍 Vérification si déjà demandé...');
      const hasAsked = await this.hasAskedForPermission();
      console.log('🔍 hasAskedForPermission:', hasAsked);
      
      if (hasAsked) {
        console.log('ℹ️ Permission déjà demandée, pas de modal');
        return false;
      }

      // Ne pas afficher si déjà accordée
      console.log('🔍 Vérification si permission déjà accordée...');
      const hasPermission = await this.hasPermission();
      console.log('🔍 hasPermission:', hasPermission);
      
      if (hasPermission) {
        console.log('ℹ️ Permission déjà accordée, pas de modal');
        await this.markPermissionAsked();
        return false;
      }

      // Afficher le modal
      console.log('✅ Modal de permission DOIT être affiché');
      return true;
    } catch (error) {
      console.error('❌ Erreur vérification modal permission:', error);
      return false;
    }
  }

  /**
   * Réinitialise l'état des permissions (utile pour les tests)
   */
  async resetPermissionState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PERMISSION_ASKED_KEY);
      await AsyncStorage.removeItem(PERMISSION_GRANTED_KEY);
      console.log('🔄 État des permissions réinitialisé');
    } catch (error) {
      console.error('❌ Erreur réinitialisation permissions:', error);
    }
  }

  /**
   * Configuration complète des notifications
   * À appeler après l'obtention des permissions
   */
  async setupNotifications(): Promise<void> {
    try {
      console.log('🔧 Configuration des notifications...');
      
      // Configurer les canaux Android
      await this.setupAndroidChannel();
      
      console.log('✅ Notifications configurées avec succès');
    } catch (error) {
      console.error('❌ Erreur configuration notifications:', error);
      throw error;
    }
  }
}

export default NotificationPermissionService.getInstance();
