import { useCallback, useEffect, useState } from 'react';
import NotificationService from '../services/api/NotificationService';

export const useUnreadNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadUnreadCount = useCallback(async () => {
    try {
      setLoading(true);
      const count = await NotificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Erreur chargement compteur notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await NotificationService.markAllAsRead();
      setUnreadCount(0);
    } catch (error) {
      console.error('Erreur marquage notifications:', error);
    }
  }, []);

  // useEffect(() => {
  //   loadUnreadCount();

  //   // Recharger le compteur toutes les 30 secondes
  //   const interval = setInterval(() => {
  //     loadUnreadCount();
  //   }, 30000);

  //   return () => {
  //     clearInterval(interval);
  //   };
  // }, [loadUnreadCount]);

  return {
    unreadCount,
    loading,
    loadUnreadCount,
    markAllAsRead,
  };
};
