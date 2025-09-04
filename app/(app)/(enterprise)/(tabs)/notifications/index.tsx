import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import NotificationService, { NotificationData } from '../../../../../services/api/NotificationService';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) setLoading(true);

      const response = await NotificationService.getUserNotifications(pageNum, 20, true);

      if (append) {
        setNotifications(prev => [...prev, ...response.data]);
      } else {
        setNotifications(response.data);
      }

      setHasMore(response.data.length === 20);
      setPage(pageNum);

    } catch (error) {
      console.error('❌ Erreur chargement notifications:', error);
      Alert.alert('Erreur', 'Impossible de charger les notifications');
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await NotificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('❌ Erreur chargement compteur:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications(1, false);
    await loadUnreadCount();
    setRefreshing(false);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId);

      // Mettre à jour l'état local
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId
            ? { ...notif, read: true, readAt: new Date().toISOString() }
            : notif
        )
      );

      // Recharger le compteur
      await loadUnreadCount();

    } catch (error) {
      console.error('❌ Erreur marquage notification:', error);
      Alert.alert('Erreur', 'Impossible de marquer la notification comme lue');
    }
  };

  const markAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();

      // Mettre à jour l'état local
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true, readAt: new Date().toISOString() }))
      );

      setUnreadCount(0);

    } catch (error) {
      console.error('❌ Erreur marquage toutes notifications:', error);
      Alert.alert('Erreur', 'Impossible de marquer toutes les notifications comme lues');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    Alert.alert(
      'Supprimer la notification',
      'Êtes-vous sûr de vouloir supprimer cette notification ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await NotificationService.deleteNotification(notificationId);

              // Mettre à jour l'état local
              setNotifications(prev => prev.filter(notif => notif._id !== notificationId));

              // Recharger le compteur
              await loadUnreadCount();

            } catch (error) {
              console.error('❌ Erreur suppression notification:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la notification');
            }
          }
        }
      ]
    );
  };

  const handleNotificationPress = async (notification: NotificationData) => {
    // Marquer comme lue si pas déjà lu
    if (!notification.read) {
      await markAsRead(notification._id);
    }

    // Navigation basée sur le type de notification
    if (notification.type === 'MESSAGE' && notification.data.conversationId) {
      router.push(`/(app)/(enterprise)/conversation/${notification.data.conversationId}` as any);
    } else if (notification.type === 'ORDER' && notification.data.orderId) {
      // Navigation vers les détails de commande
      console.log('Navigation vers commande:', notification.data.orderId);
    } else if (notification.type === 'PRODUCT' && notification.data.productId) {
      // Navigation vers le produit
      console.log('Navigation vers produit:', notification.data.productId);
    }
  };

  // Charger les données au focus de la page
  useFocusEffect(
    useCallback(() => {
      loadNotifications(1, false);
      loadUnreadCount();
    }, [])
  );

  const renderNotificationItem = ({ item }: { item: NotificationData }) => {
    const icon = NotificationService.getNotificationIcon(item.type);
    const timeAgo = NotificationService.formatNotificationTime(item.createdAt);

    return (
      <TouchableOpacity
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => deleteNotification(item._id)}
        className={`mx-4 mb-2 p-4 rounded-xl border ${
          item.read
            ? 'bg-white border-neutral-200'
            : 'bg-primary-50 border-primary-200'
        }`}
        style={{
          shadowColor: item.read ? '#000' : '#FE8C00',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: item.read ? 0.05 : 0.1,
          shadowRadius: 2,
          elevation: item.read ? 1 : 3,
        }}
      >
        <View className="flex-row items-start">
          {/* Icône */}
          <View className={`w-10 h-10 rounded-full justify-center items-center mr-3 ${
            item.read ? 'bg-neutral-100' : 'bg-primary-100'
          }`}>
            <Text className="text-lg">{icon}</Text>
          </View>

          {/* Contenu */}
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text className={`text-sm font-quicksand-medium ${
                item.read ? 'text-neutral-500' : 'text-primary-600'
              }`}>
                {item.type === 'MESSAGE' ? 'Message' :
                 item.type === 'ORDER' ? 'Commande' :
                 item.type === 'REVIEW' ? 'Avis' :
                 item.type === 'PRODUCT' ? 'Produit' : 'Système'}
              </Text>
              <Text className="text-xs text-neutral-400 font-quicksand-regular">
                {timeAgo}
              </Text>
            </View>

            <Text className={`text-base font-quicksand-semibold mb-1 ${
              item.read ? 'text-neutral-700' : 'text-neutral-900'
            }`}>
              {item.title}
            </Text>

            <Text className={`text-sm font-quicksand-regular ${
              item.read ? 'text-neutral-600' : 'text-neutral-800'
            }`}>
              {item.message}
            </Text>

            {/* Indicateur non lu */}
            {!item.read && (
              <View className="w-2 h-2 bg-primary-500 rounded-full mt-2 self-start" />
            )}
          </View>

          {/* Actions */}
          <View className="ml-2">
            <TouchableOpacity
              onPress={() => deleteNotification(item._id)}
              className="w-8 h-8 justify-center items-center rounded-full bg-neutral-100"
            >
              <Ionicons name="trash-outline" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center py-20">
      <View className="bg-neutral-50 rounded-full w-20 h-20 justify-center items-center mb-4">
        <Ionicons name="notifications-outline" size={32} color="#9CA3AF" />
      </View>
      <Text className="text-lg font-quicksand-bold text-neutral-600 mb-2">
        Aucune notification
      </Text>
      <Text className="text-neutral-500 font-quicksand-medium text-center px-6">
        Vous serez notifié des nouveaux messages, commandes et mises à jour importantes ici.
      </Text>
    </View>
  );

  const renderHeader = () => (
    <LinearGradient
      colors={['#FE8C00', '#FF6B35']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      className="px-6 py-4 pt-16"
    >
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-white/20 rounded-full justify-center items-center"
        >
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>

        <Text className="text-2xl font-quicksand-bold text-white">
          Notifications
        </Text>

        <View className="w-10 h-10" />
      </View>

      {/* Statistiques */}
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-white/80 font-quicksand-medium text-sm">
          {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
        </Text>

        {unreadCount > 0 && (
          <View className="bg-white/20 rounded-full px-3 py-1">
            <Text className="text-white font-quicksand-medium text-sm">
              {unreadCount} non lu{unreadCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {unreadCount > 0 && (
        <TouchableOpacity
          onPress={markAllAsRead}
          className="bg-white/20 rounded-2xl px-4 py-3 flex-row items-center justify-center"
        >
          <Ionicons name="checkmark-done" size={18} color="white" style={{ marginRight: 8 }} />
          <Text className="text-white font-quicksand-semibold">
            Tout marquer comme lu
          </Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        {renderHeader()}
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FE8C00" />
          <Text className="mt-4 text-neutral-600 font-quicksand-medium">
            Chargement des notifications...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {renderHeader()}

      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FE8C00']}
            tintColor="#FE8C00"
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 20
        }}
        onEndReached={() => {
          if (hasMore && !loading) {
            loadNotifications(page + 1, true);
          }
        }}
        onEndReachedThreshold={0.5}
      />
    </SafeAreaView>
  );
}
