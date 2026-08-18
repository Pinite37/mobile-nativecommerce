import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import NotificationService from '../services/api/NotificationService';

// ─── Compteur partagé entre toutes les instances du hook ─────────────────────
let _globalCount = 0;
const _subscribers = new Set<(count: number) => void>();

function broadcastCount(count: number) {
  _globalCount = count;
  _subscribers.forEach((fn) => fn(count));
  // Met à jour le badge de l'icône de l'app sur iOS et Android
  Notifications.setBadgeCountAsync(count).catch(() => {});
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useUnreadNotifications = () => {
  const [unreadCount, setUnreadCount] = useState<number>(_globalCount);

  // S'abonner aux mises à jour du compteur global
  useEffect(() => {
    _subscribers.add(setUnreadCount);
    return () => {
      _subscribers.delete(setUnreadCount);
    };
  }, []);

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await NotificationService.getUnreadCount();
      broadcastCount(count);
    } catch {
      // Silencieux — erreur réseau ou utilisateur non connecté
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await NotificationService.markAllAsRead();
      broadcastCount(0);
    } catch (error) {
      console.error('Erreur marquage notifications:', error);
    }
  }, []);

  useEffect(() => {
    // Chargement initial
    loadUnreadCount();

    // Refresh toutes les 60 secondes quand l'app est en foreground
    const interval = setInterval(loadUnreadCount, 60_000);

    // Refresh immédiat quand l'app revient au premier plan (lock screen, multitâche…)
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadUnreadCount();
    });

    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [loadUnreadCount]);

  return {
    unreadCount,
    loadUnreadCount,
    markAllAsRead,
  };
};
