import { useTheme } from "@/contexts/ThemeContext";
import notificationService, {
  NotificationData,
} from "@/services/api/NotificationService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface NotificationsScreenProps {
  title: string;
  emptyMessage: string;
}

interface DisplayNotification extends NotificationData {
  wasUnread: boolean;
}

const ICONS_BY_TYPE: Record<string, any> = {
  MESSAGE: "chatbubble-outline",
  ORDER: "bag-outline",
  REVIEW: "star-half-outline",
  PRODUCT: "cube-outline",
  SUBSCRIPTION: "star-outline",
  SYSTEM: "megaphone-outline",
  BROADCAST: "megaphone-outline",
};

export default function NotificationsScreen({
  title,
  emptyMessage,
}: NotificationsScreenProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState<DisplayNotification[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1,
  });

  const markAllAsReadSilently = useCallback(() => {
    notificationService.markAllAsRead().catch((error) => {
      console.error("❌ Erreur marquage global des notifications:", error);
    });
  }, []);

  const fetchPage = useCallback(
    async (page: number, replace: boolean) => {
      try {
        const response = await notificationService.getUserNotifications(
          page,
          20,
          true
        );
        const items: DisplayNotification[] = (response.data || []).map(
          (n) => ({ ...n, wasUnread: !n.read })
        );
        setNotifications((prev) =>
          replace ? items : [...prev, ...items]
        );
        setPagination(response.pagination);
        if (replace && items.some((n) => n.wasUnread)) {
          markAllAsReadSilently();
        }
      } catch (error) {
        console.error("❌ Erreur chargement notifications:", error);
      }
    },
    [markAllAsReadSilently]
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPage(1, true).finally(() => setLoading(false));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPage(1, true);
    setRefreshing(false);
  }, [fetchPage]);

  const onEndReached = useCallback(async () => {
    if (loadingMore || pagination.page >= pagination.pages) return;
    setLoadingMore(true);
    await fetchPage(pagination.page + 1, false);
    setLoadingMore(false);
  }, [fetchPage, loadingMore, pagination]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.secondary }}>
      <LinearGradient
        colors={[colors.brandGradientStart, colors.brandGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="pt-16 pb-6 rounded-b-3xl shadow-md"
      >
        <View className="px-6">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 bg-white/20 rounded-full justify-center items-center"
            >
              <Ionicons name="chevron-back" size={20} color="white" />
            </TouchableOpacity>
            <View className="flex-1 mx-4">
              <Text className="text-lg font-quicksand-bold text-white text-center">
                {title}
              </Text>
            </View>
            <View className="w-10 h-10" />
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.brandPrimary}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={onEndReached}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons
                name="notifications-off-outline"
                size={48}
                color={colors.textTertiary}
              />
              <Text
                className="mt-3 font-quicksand-medium"
                style={{ color: colors.textSecondary }}
              >
                {emptyMessage}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              className="p-4 rounded-2xl mb-3 border overflow-hidden"
              style={{
                backgroundColor: item.wasUnread ? colors.brandLight : colors.card,
                borderColor: colors.border,
              }}
            >
              {item.imageUrl && (
                <Image
                  source={{ uri: item.imageUrl }}
                  className="w-full h-40 rounded-xl mb-3"
                  resizeMode="cover"
                />
              )}
              <View className="flex-row items-start">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: colors.brandLight }}
              >
                <Ionicons
                  name={ICONS_BY_TYPE[item.type] || "notifications-outline"}
                  size={20}
                  color={colors.brandPrimary}
                />
              </View>
              <View className="flex-1">
                <Text
                  className="font-quicksand-bold"
                  style={{ color: colors.textPrimary }}
                >
                  {item.title}
                </Text>
                <Text
                  className="font-quicksand mt-1"
                  style={{ color: colors.textSecondary }}
                >
                  {item.message}
                </Text>
                <Text
                  className="font-quicksand text-xs mt-2"
                  style={{ color: colors.textTertiary }}
                >
                  {formatDate(item.createdAt)}
                </Text>
              </View>
              {item.wasUnread && (
                <View
                  className="w-2.5 h-2.5 rounded-full ml-2 mt-1"
                  style={{ backgroundColor: colors.brandPrimary }}
                />
              )}
              </View>
            </View>
          )}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator className="my-4" color={colors.brandPrimary} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
