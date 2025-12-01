import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NotificationModal, {
  useNotification,
} from "../../../../../components/ui/NotificationModal";
import { useLocale } from "../../../../../contexts/LocaleContext";
import { useTheme } from "../../../../../contexts/ThemeContext";
import i18n from "../../../../../i18n/i18n";
import DeliveryService, {
  DeliveryOffer,
} from "../../../../../services/api/DeliveryService";

const getFilters = () => [
  { id: "ALL" as const, label: i18n.t("enterprise.offers.filters.all") },
  { id: "OPEN" as const, label: i18n.t("enterprise.offers.filters.open") },
  { id: "ASSIGNED" as const, label: i18n.t("enterprise.offers.filters.assigned") },
  { id: "CANCELLED" as const, label: i18n.t("enterprise.offers.filters.cancelled") },
];

function formatPrice(n?: number) {
  if (!n && n !== 0) return "—";
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function EnterpriseOffersScreen() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { locale } = useLocale(); // Écoute les changements de langue pour re-render automatiquement
  const { colors, isDark } = useTheme();
  const FILTERS = getFilters();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 360;
  const isTablet = width >= 768;
  const barBaseHeight = isTablet ? 68 : isSmallPhone ? 58 : 62;
  const bottomSpacer = barBaseHeight + insets.bottom + 16; // ensure content clears the custom tab bar
  const [filter, setFilter] = useState<
    "ALL" | "OPEN" | "ASSIGNED" | "CANCELLED"
  >("ALL");
  const [offers, setOffers] = useState<DeliveryOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notification, showNotification, hideNotification } =
    useNotification();

  // Confirmation state
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<DeliveryOffer | null>(
    null
  );

  const fetchOffers = useCallback(
    async (withSpinner = true) => {
      try {
        if (withSpinner) setLoading(true);
        setError(null);
        const status = filter === "ALL" ? undefined : filter;
        const list = await DeliveryService.listEnterpriseOffers(status as any);
        console.log(`📦 ${list} offres chargées (filtre: ${filter})`);
        setOffers(list);
      } catch (e: any) {
        setError(e.message || i18n.t("enterprise.offers.error.loadError"));
      } finally {
        if (withSpinner) setLoading(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    fetchOffers(true);
  }, [fetchOffers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchOffers(false);
    } finally {
      setRefreshing(false);
    }
  }, [fetchOffers]);

  // Skeleton Loader Component
  const ShimmerBlock = ({ style }: { style?: any }) => {
    const shimmer = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      const loop = Animated.loop(
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    }, [shimmer]);
    const translateX = shimmer.interpolate({
      inputRange: [0, 1],
      outputRange: [-150, 150],
    });
    return (
      <View style={[{ backgroundColor: isDark ? colors.tertiary : "#E5E7EB", overflow: "hidden" }, style]}>
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: 120,
            transform: [{ translateX }],
            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.35)",
            opacity: 0.7,
          }}
        />
      </View>
    );
  };

  const SkeletonCard = () => (
    <View 
      style={{ 
        backgroundColor: colors.card,
        borderColor: colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1
      }}
      className="rounded-2xl p-4 mx-4 mb-4 border"
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <ShimmerBlock style={{ width: 40, height: 40, borderRadius: 8 }} />
          <View className="ml-3">
            <ShimmerBlock
              style={{
                height: 16,
                borderRadius: 8,
                width: 120,
                marginBottom: 4,
              }}
            />
            <ShimmerBlock style={{ height: 12, borderRadius: 6, width: 80 }} />
          </View>
        </View>
        <ShimmerBlock style={{ height: 24, borderRadius: 12, width: 80 }} />
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-3">
          <ShimmerBlock
            style={{ height: 12, borderRadius: 6, width: 40, marginBottom: 4 }}
          />
          <ShimmerBlock style={{ height: 14, borderRadius: 6, width: 100 }} />
        </View>
        <View className="items-end">
          <ShimmerBlock
            style={{ height: 12, borderRadius: 6, width: 40, marginBottom: 4 }}
          />
          <ShimmerBlock style={{ height: 14, borderRadius: 6, width: 80 }} />
        </View>
      </View>

      <View 
        style={{ borderTopColor: colors.border }}
        className="flex-row items-center justify-between mt-4 pt-3 border-t"
      >
        <ShimmerBlock style={{ height: 18, borderRadius: 8, width: 100 }} />
        <View className="flex-row">
          <ShimmerBlock
            style={{ height: 32, borderRadius: 8, width: 60, marginRight: 8 }}
          />
          <ShimmerBlock style={{ height: 32, borderRadius: 8, width: 120 }} />
        </View>
      </View>
    </View>
  );

  const renderSkeletons = () => {
    return (
      <FlatList
        data={Array.from({ length: 4 }).map((_, i) => i.toString())}
        renderItem={() => <SkeletonCard />}
        keyExtractor={(item) => item}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const renderItem = ({ item }: { item: DeliveryOffer }) => {
    // Utiliser productData qui contient les infos du produit
    const productData = (item as any).productData || {};
    const customer = (item as any).customer || {};
    const status = item.status;

    const statusPill = (() => {
      switch (status) {
        case "OPEN":
          return {
            color: "#10B981",
            bg: "#D1FAE5",
            text: i18n.t("enterprise.offers.status.open"),
            icon: "alert",
          };
        case "ASSIGNED":
          return {
            color: "#3B82F6",
            bg: "#DBEAFE",
            text: i18n.t("enterprise.offers.status.assigned"),
            icon: "person",
          };
        case "CANCELLED":
          return {
            color: "#EF4444",
            bg: "#FEE2E2",
            text: i18n.t("enterprise.offers.status.cancelled"),
            icon: "close",
          };

        default:
          return {
            color: "#6B7280",
            bg: "#F3F4F6",
            text: status,
            icon: "information-circle",
          };
      }
    })();

    return (
      <View
        style={{
          backgroundColor: colors.card,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.03,
          shadowRadius: 4,
          elevation: 1,
        }}
        className="rounded-2xl p-4 mx-4 mb-4"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Image
              source={{
                uri:
                  productData.images?.[0] ||
                  "https://via.placeholder.com/40x40/CCCCCC/FFFFFF?text=PD",
              }}
              className="w-10 h-10 rounded-lg"
            />
            <View className="ml-3">
              <Text
                style={{ color: colors.textPrimary }}
                className="text-sm font-quicksand-semibold"
                numberOfLines={1}
              >
                {productData.name || i18n.t("enterprise.offers.labels.product")}
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-xs">
                {formatPrice(productData.price)}
              </Text>
            </View>
          </View>
          <View
            className="flex-row items-center px-3 py-1 rounded-full"
            style={{ backgroundColor: statusPill.bg }}
          >
            <Ionicons
              name={statusPill.icon as any}
              size={14}
              color={statusPill.color}
            />
            <Text
              className="text-xs font-quicksand-semibold ml-1"
              style={{ color: statusPill.color }}
            >
              {statusPill.text}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <Text style={{ color: colors.textTertiary }} className="text-xs">{i18n.t("enterprise.offers.labels.client")}</Text>
            <Text
              style={{ color: colors.textPrimary }}
              className="text-sm font-quicksand-medium"
              numberOfLines={1}
            >
              {customer.firstName || customer.lastName
                ? `${customer.firstName || ""} ${customer.lastName || ""
                  }`.trim()
                : customer._id || i18n.t("enterprise.offers.labels.client")}
            </Text>
          </View>
          <View className="items-end">
            <Text style={{ color: colors.textTertiary }} className="text-xs">{i18n.t("enterprise.offers.labels.expires")}</Text>
            <Text style={{ color: colors.textPrimary }} className="text-sm font-quicksand-semibold">
              {formatDateTime(item.expiresAt)}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View 
          style={{ borderTopColor: colors.border }}
          className="flex-row items-center justify-between mt-4 pt-3 border-t"
        >
          <Text style={{ color: colors.brandPrimary }} className="text-base font-quicksand-bold">
            {formatPrice(item.deliveryFee)}
          </Text>
          <View
            className="flex-row"
            style={{ flexWrap: "wrap", justifyContent: "flex-end" }}
          >
            {status === "OPEN" && (
              <TouchableOpacity
                style={{ backgroundColor: isDark ? colors.tertiary : '#FEF2F2' }}
                className="rounded-lg px-3 py-2 mb-2"
                activeOpacity={0.8}
                onPress={() => {
                  console.log(
                    "🔴 Bouton Supprimer cliqué pour offre:",
                    item._id
                  );
                  console.log("🔴 Offer details:", item);
                  setSelectedOffer(item);
                  setConfirmVisible(true);
                  console.log("🔴 Modal should be visible now");
                }}
              >
                <Text
                  className="text-sm font-quicksand-semibold"
                  style={{ color: colors.error }}
                >
                  Supprimer
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <LinearGradient
      colors={[colors.brandGradientStart, colors.brandGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      className="rounded-b-3xl shadow-md"
      style={{
        paddingTop: insets.top + 16,
        paddingLeft: insets.left + 24,
        paddingRight: insets.right + 24,
        paddingBottom: 16,
      }}
    >
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-2xl font-quicksand-bold text-white">
          {i18n.t("enterprise.offers.title")}
        </Text>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 6 }}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            onPress={() => setFilter(f.id)}
            style={{
              backgroundColor: filter === f.id 
                ? (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.30)')
                : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.20)')
            }}
            className="mr-2 px-4 py-2 rounded-full"
            activeOpacity={0.8}
          >
            <Text className="text-sm font-quicksand-medium text-white">
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View className="flex-row justify-between items-center mt-4">
        <Text className="text-white/80 font-quicksand-medium text-sm">
          {offers.length} {offers.length !== 1 ? i18n.t("enterprise.offers.count.offersPlural") : i18n.t("enterprise.offers.count.offers")}
        </Text>
      </View>
    </LinearGradient>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.secondary }}>
        <ExpoStatusBar style={isDark ? "light" : "light"} translucent />
        {/* Header avec gradient */}
        <LinearGradient
          colors={[colors.brandGradientStart, colors.brandGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="rounded-b-3xl shadow-md"
          style={{
            paddingTop: insets.top + 16,
            paddingLeft: insets.left + 24,
            paddingRight: insets.right + 24,
            paddingBottom: 16,
          }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-quicksand-bold text-white">
              {i18n.t("enterprise.offers.title")}
            </Text>
            <TouchableOpacity className="w-10 h-10 bg-white/20 rounded-full justify-center items-center">
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Skeleton filters */}
          <View className="flex-row mb-4">
            {FILTERS.map((f, index) => (
              <View
                key={f.id}
                className="mr-2 px-4 py-2 rounded-full bg-white/20"
              >
                <Text className="text-sm font-quicksand-medium text-white">
                  {f.label}
                </Text>
              </View>
            ))}
          </View>

          <View className="flex-row justify-between items-center">
            <ShimmerBlock style={{ height: 14, borderRadius: 6, width: 80 }} />
          </View>
        </LinearGradient>

        {/* Conteneur du contenu */}
        <View style={{ flex: 1, backgroundColor: colors.primary }}>{renderSkeletons()}</View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.secondary }}>
        <ExpoStatusBar style={isDark ? "light" : "light"} translucent />
        {renderHeader()}
        <View style={{ flex: 1, backgroundColor: colors.primary }} className="justify-center items-center px-6">
          <Ionicons name="warning" size={80} color={colors.error} />
          <Text style={{ color: colors.textPrimary }} className="font-quicksand-bold text-lg mt-4 mb-2">
            {i18n.t("enterprise.offers.error.title")}
          </Text>
          <Text style={{ color: colors.textSecondary }} className="font-quicksand-medium text-center mt-1">
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => fetchOffers(true)}
            style={{ backgroundColor: colors.brandPrimary }}
            className="mt-4 rounded-xl px-4 py-2"
          >
            <Text style={{ color: colors.textOnBrand }} className="font-quicksand-semibold">
              {i18n.t("enterprise.offers.error.retry")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      <ExpoStatusBar style={isDark ? "light" : "light"} translucent />
      {renderHeader()}

      <View style={{ flex: 1, backgroundColor: colors.primary }}>
        <FlatList
          data={offers}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.brandPrimary]}
              tintColor={colors.brandPrimary}
            />
          }
          ListFooterComponent={
            offers.length > 0 ? <View style={{ height: bottomSpacer }} /> : null
          }
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center px-6 mt-20">
              <Ionicons name="bicycle" size={80} color={colors.textTertiary} />
              <Text style={{ color: colors.textPrimary }} className="text-xl font-quicksand-bold mt-4 mb-2">
                {i18n.t("enterprise.offers.empty.title")}
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-center font-quicksand-medium">
                {i18n.t("enterprise.offers.empty.message")}
              </Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: 8,
            paddingBottom: 8,
          }}
        />
      </View>

      {/* Confirmation Modal - VERSION SIMPLE */}
      {confirmVisible && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.overlay,
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              padding: 24,
              margin: 20,
              maxWidth: 400,
              width: "90%",
            }}
          >
            {/* Icône */}
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: isDark ? colors.tertiary : "#FEE2E2",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="warning" size={32} color={colors.error} />
              </View>
            </View>

            {/* Titre */}
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 20,
                textAlign: "center",
                marginBottom: 8,
              }}
              className="font-quicksand-bold"
            >
              {i18n.t("enterprise.offers.deleteModal.title")}
            </Text>

            {/* Message */}
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                textAlign: "center",
                marginBottom: 24,
              }}
              className="font-quicksand-medium"
            >
              {i18n.t("enterprise.offers.deleteModal.message")}
            </Text>

            {/* Boutons */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  console.log("🟡 Annulation");
                  setConfirmVisible(false);
                  setTimeout(() => setSelectedOffer(null), 300);
                }}
                style={{
                  flex: 1,
                  backgroundColor: colors.tertiary,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                }}
                disabled={confirmLoading}
              >
                <Text style={{ color: colors.textPrimary }} className="font-quicksand-semibold">
                  {i18n.t("enterprise.offers.deleteModal.cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={async () => {
                  console.log("🟢 Confirmation suppression");
                  if (!selectedOffer || confirmLoading) return;
                  setConfirmLoading(true);
                  try {
                    console.log(
                      "🔵 Appel API deleteOffer pour:",
                      selectedOffer._id
                    );
                    await DeliveryService.deleteOffer(selectedOffer._id);
                    console.log("✅ Offre supprimée avec succès");
                    setOffers((prev) =>
                      prev.filter((o) => o._id !== selectedOffer._id)
                    );
                    showNotification(
                      "success",
                      i18n.t("enterprise.offers.deleteModal.successTitle"),
                      i18n.t("enterprise.offers.deleteModal.successMessage")
                    );
                    setConfirmVisible(false);
                    setTimeout(() => setSelectedOffer(null), 300);
                  } catch (e: any) {
                    console.error("❌ Erreur suppression offre:", e);
                    showNotification(
                      "error",
                      i18n.t("enterprise.offers.deleteModal.errorTitle"),
                      e.message || i18n.t("enterprise.offers.deleteModal.errorMessage")
                    );
                  } finally {
                    setConfirmLoading(false);
                  }
                }}
                style={{
                  flex: 1,
                  backgroundColor: confirmLoading ? (isDark ? "#DC2626" : "#FCA5A5") : colors.error,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                }}
                disabled={confirmLoading}
              >
                {confirmLoading ? (
                  <Text style={{ color: colors.textOnBrand }} className="font-quicksand-semibold">
                    {i18n.t("enterprise.offers.deleteModal.deleting")}
                  </Text>
                ) : (
                  <Text style={{ color: colors.textOnBrand }} className="font-quicksand-semibold">
                    {i18n.t("enterprise.offers.deleteModal.confirm")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Notification toast/modal */}
      <NotificationModal
        visible={!!notification}
        type={notification?.type || "info"}
        title={notification?.title || ""}
        message={notification?.message || ""}
        onClose={hideNotification}
      />
    </View>
  );
}
