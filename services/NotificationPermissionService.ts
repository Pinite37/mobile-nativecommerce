import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

const PERMISSION_ASKED_KEY = '@notification_permission_asked';
const PERMISSION_GRANTED_KEY = '@notification_permission_granted';

import Notifications from '@/services/notificationsModule';

class NotificationPermissionService {
  private static instance: NotificationPermissionService;

  private constructor() {}

  public static getInstance(): NotificationPermissionService {
    if (!NotificationPermissionService.instance) {
      NotificationPermissionService.instance = new NotificationPermissionService();
    }
    return NotificationPermissionService.instance;
  }

  async hasAskedForPermission(): Promise<boolean> {
    try {
      const asked = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
      return asked === 'true';
    } catch {
      return false;
    }
  }

  async markPermissionAsked(): Promise<void> {
    try {
      await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');
    } catch {}
  }

  async hasPermission(): Promise<boolean> {
    if (!Notifications) return false;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      const granted = status === 'granted';
      await AsyncStorage.setItem(PERMISSION_GRANTED_KEY, granted.toString());
      return granted;
    } catch {
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (!Notifications) return false;
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      await this.markPermissionAsked();

      const granted = finalStatus === 'granted';
      await AsyncStorage.setItem(PERMISSION_GRANTED_KEY, granted.toString());
      return granted;
    } catch {
      return false;
    }
  }

  async setupAndroidChannel(): Promise<void> {
    if (!Notifications || Platform.OS !== 'android') return;
    try {
      await Notifications.setNotificationChannelAsync('axi_default', {
        name: 'Notifications par défaut',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Commandes',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
      });
      await Notifications.setNotificationChannelAsync('promotions', {
        name: 'Promotions',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#F59E0B',
      });
    } catch (error) {
      console.error('❌ Erreur configuration canaux Android:', error);
    }
  }

  async getExpoPushToken(): Promise<string | null> {
    if (!Notifications) return null;
    try {
      if (!Device.isDevice) return null;

      const hasPermission = await this.hasPermission();
      if (!hasPermission) return null;

      const projectId =
        Constants.easConfig?.projectId ??
        (Constants.expoConfig?.extra as any)?.eas?.projectId;

      if (!projectId) {
        console.error('❌ ProjectId non trouvé');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      return tokenData.data;
    } catch (error: any) {
      console.error('❌ Erreur token push:', error?.message);
      return null;
    }
  }

  async shouldShowPermissionModal(): Promise<boolean> {
    if (!Notifications) return false;
    try {
      const hasAsked = await this.hasAskedForPermission();
      if (hasAsked) return false;

      const hasPermission = await this.hasPermission();
      if (hasPermission) {
        await this.markPermissionAsked();
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  async resetPermissionState(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PERMISSION_ASKED_KEY);
      await AsyncStorage.removeItem(PERMISSION_GRANTED_KEY);
    } catch {}
  }

  async setupNotifications(): Promise<void> {
    if (!Notifications) return;
    try {
      await this.setupAndroidChannel();
    } catch (error) {
      console.error('❌ Erreur configuration notifications:', error);
    }
  }
}

export default NotificationPermissionService.getInstance();
