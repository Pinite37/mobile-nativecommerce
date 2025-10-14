import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import NotificationPermissionService from '../services/NotificationPermissionService';
import ApiService from '../services/api/ApiService';

interface NotificationSetupResult {
  success: boolean;
  token?: string;
  message?: string;
}

/**
 * Hook pour gérer les notifications push
 */
export const useNotifications = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  /**
   * Vérifie l'état actuel des permissions
   */
  const checkPermissionStatus = useCallback(async () => {
    try {
      const permission = await NotificationPermissionService.hasPermission();
      setHasPermission(permission);
      return permission;
    } catch (err) {
      console.error('❌ Erreur vérification permissions:', err);
      return false;
    }
  }, []);

  /**
   * Demande les permissions de notifications
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const granted = await NotificationPermissionService.requestPermissions();
      setHasPermission(granted);

      return granted;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la demande de permissions';
      console.error('❌ Erreur demande permissions:', err);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Configure complètement les notifications (permissions + token + enregistrement backend)
   */
  const setupNotifications = useCallback(async (): Promise<NotificationSetupResult> => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔧 Début configuration notifications complète...');

      // 1. Vérifier/obtenir les permissions
      let granted = await NotificationPermissionService.hasPermission();
      
      if (!granted) {
        granted = await NotificationPermissionService.requestPermissions();
      }

      if (!granted) {
        const message = 'Permissions de notifications non accordées';
        setError(message);
        return { success: false, message };
      }

      // 2. Configurer les canaux Android et autres paramètres
      await NotificationPermissionService.setupNotifications();

      // 3. Obtenir le token Expo Push
      const token = await NotificationPermissionService.getExpoPushToken();

      if (!token) {
        const message = 'Impossible d\'obtenir le token de notifications';
        setError(message);
        return { success: false, message };
      }

      setExpoPushToken(token);
      console.log('✅ Token Expo Push obtenu:', token);

      // 4. Enregistrer le token sur le backend
      try {
        await ApiService.registerExpoPushToken(token);
        console.log('✅ Token enregistré sur le backend');
      } catch (backendError) {
        console.error('⚠️ Erreur enregistrement token backend:', backendError);
        // On ne considère pas cela comme une erreur critique
        // L'utilisateur peut toujours recevoir des notifications locales
      }

      setHasPermission(true);
      return { success: true, token };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la configuration des notifications';
      console.error('❌ Erreur configuration notifications:', err);
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Enregistre le token Expo Push sur le backend
   */
  const registerToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      await ApiService.registerExpoPushToken(token);
      console.log('✅ Token enregistré avec succès');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement du token';
      console.error('❌ Erreur enregistrement token:', err);
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Vérifie si le modal de permission doit être affiché
   */
  const shouldShowPermissionModal = useCallback(async (): Promise<boolean> => {
    return await NotificationPermissionService.shouldShowPermissionModal();
  }, []);

  /**
   * Ajoute un listener pour les notifications reçues en foreground
   */
  const addNotificationReceivedListener = useCallback((
    callback: (notification: Notifications.Notification) => void
  ) => {
    return Notifications.addNotificationReceivedListener(callback);
  }, []);

  /**
   * Ajoute un listener pour les interactions avec les notifications
   */
  const addNotificationResponseReceivedListener = useCallback((
    callback: (response: Notifications.NotificationResponse) => void
  ) => {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }, []);

  /**
   * Réinitialise l'état des permissions (pour les tests)
   */
  const resetPermissionState = useCallback(async () => {
    await NotificationPermissionService.resetPermissionState();
    setHasPermission(false);
    setExpoPushToken(null);
  }, []);

  // Vérifier les permissions au montage
  useEffect(() => {
    checkPermissionStatus();
  }, [checkPermissionStatus]);

  return {
    isLoading,
    error,
    hasPermission,
    expoPushToken,
    requestPermissions,
    setupNotifications,
    registerToken,
    shouldShowPermissionModal,
    checkPermissionStatus,
    addNotificationReceivedListener,
    addNotificationResponseReceivedListener,
    resetPermissionState,
  };
};
