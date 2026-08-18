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
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface NotificationsScreenProps {
  title: string;
  emptyMessage: string;
}

interface DisplayNotification extends NotificationData {
  wasUnread: boolean;
}

const ICONS_BY_TYPE: Record<string, { name: any; color: string; bg: string }> =
  {
    MESSAGE: { name: "chatbubble-ellipses", color: "#6366F1", bg: "rgba(99,102,241,0.12)" },
    ORDER: { name: "bag-check", color: "#10B981", bg: "rgba(16,185,129,0.12)" },
    REVIEW: { name: "star", color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
    PRODUCT: { name: "cube", color: "#3B82F6", bg: "rgba(59,130,246,0.12)" },
    SUBSCRIPTION: { name: "diamond", color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
    SYSTEM: { name: "megaphone", color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
    BROADCAST: { name: "megaphone", color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
  };

const DEFAULT_ICON = { name: "notifications", color: "#10B981", bg: "rgba(16,185,129,0.12)" };

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

export default function NotificationsScreen({
  title,
  emptyMessage,
}: NotificationsScreenProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<DisplayNotification[]>([]);
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
    notificationService.markAllAsRead().catch(() => {});
  }, []);

  const fetchPage = useCallback(
    async (page: number, replace: boolean) => {
      try {
        const response = await notificationService.getUserNotifications(page, 20, true);
        const items: DisplayNotification[] = (response.data || []).map((n) => ({
          ...n,
          wasUnread: !n.read,
        }));
        setNotifications((prev) => (replace ? items : [...prev, ...items]));
        if (response.pagination) setPagination(response.pagination);
        if (replace && items.some((n) => n.wasUnread)) markAllAsReadSilently();
      } catch {}
    },
    [markAllAsReadSilently]
  );

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchPage(1, true).finally(() => setLoading(false));
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      {/* Header gradient */}
      <LinearGradient
        colors={[colors.brandGradientStart, colors.brandGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: 20,
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 38,
              height: 38,
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: 19,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>

          <Text
            className="font-quicksand-bold text-white text-lg"
            style={{ flex: 1, textAlign: "center" }}
          >
            {title}
          </Text>

          {/* Espace équilibrant le bouton back */}
          <View style={{ width: 38 }} />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: 16,
            paddingHorizontal: 16,
            paddingBottom: insets.bottom + 100,
          }}
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
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 80,
              }}
            >
              {/* Cercle illustratif */}
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: isDark
                    ? "rgba(16,185,129,0.1)"
                    : "rgba(16,185,129,0.08)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                <Ionicons
                  name="notifications-off-outline"
                  size={44}
                  color={colors.brandPrimary}
                />
              </View>
              <Text
                className="font-quicksand-bold text-base"
                style={{ color: colors.textPrimary, marginBottom: 6 }}
              >
                Tout est calme ici
              </Text>
              <Text
                className="font-quicksand-medium text-sm text-center"
                style={{ color: colors.textSecondary, maxWidth: 260 }}
              >
                {emptyMessage}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const icon = ICONS_BY_TYPE[item.type] ?? DEFAULT_ICON;

            return (
              <View
                style={{
                  backgroundColor: item.wasUnread
                    ? isDark
                      ? "rgba(16,185,129,0.07)"
                      : "rgba(16,185,129,0.05)"
                    : colors.card,
                  borderRadius: 16,
                  marginBottom: 10,
                  flexDirection: "row",
                  alignItems: "flex-start",
                  padding: 14,
                }}
              >
                {/* Icône colorée */}
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: icon.bg,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                    flexShrink: 0,
                  }}
                >
                  <Ionicons name={icon.name} size={20} color={icon.color} />
                </View>

                {/* Contenu */}
                <View style={{ flex: 1 }}>
                  {item.imageUrl && (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={{
                        width: "100%",
                        height: 140,
                        borderRadius: 12,
                        marginBottom: 10,
                      }}
                      resizeMode="cover"
                    />
                  )}
                  <Text
                    className="font-quicksand-bold"
                    style={{ color: colors.textPrimary, fontSize: 14 }}
                  >
                    {item.title}
                  </Text>
                  <Text
                    className="font-quicksand-medium"
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      marginTop: 3,
                      lineHeight: 18,
                    }}
                  >
                    {item.message}
                  </Text>
                  <Text
                    className="font-quicksand"
                    style={{
                      color: colors.textTertiary,
                      fontSize: 11,
                      marginTop: 6,
                    }}
                  >
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>

                {/* Pastille non-lu */}
                {item.wasUnread && (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.brandPrimary,
                      marginLeft: 10,
                      marginTop: 4,
                      flexShrink: 0,
                    }}
                  />
                )}
              </View>
            );
          }}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={colors.brandPrimary} />
            ) : null
          }
        />
      )}
    </View>
  );
}
