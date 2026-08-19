import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Modal,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../../contexts/AuthContext";
import { useTheme } from "../../../../contexts/ThemeContext";
import i18n from "../../../../i18n/i18n";
import EnterpriseService, {
  Enterprise,
} from "../../../../services/api/EnterpriseService";
import FollowService from "../../../../services/api/FollowService";
import { Product } from "../../../../types/product";
import {
  openPhoneCall,
  openWebsiteUrl,
  openWhatsAppChat,
} from "../../../../utils/ContactLinks";

const { width: screenWidth } = Dimensions.get("window");

// ─── Skeleton shimmer ─────────────────────────────────────────────────────────
const ShimmerBlock = ({ style }: { style?: any }) => {
  const shimmer = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);
  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 150],
  });
  return (
    <View style={[{ backgroundColor: "#E5E7EB", overflow: "hidden" }, style]}>
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 120,
          transform: [{ translateX }],
          backgroundColor: "rgba(255,255,255,0.4)",
        }}
      />
    </View>
  );
};

export default function ClientEnterpriseDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 0 });

  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false, title: "", message: "",
  });

  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (id) loadEnterpriseData();
  }, [id]);

  useFocusEffect(useCallback(() => {}, []));

  const loadEnterpriseData = async () => {
    try {
      setLoading(true);
      const [enterpriseData, productsData] = await Promise.all([
        EnterpriseService.getPublicEnterpriseById(id!),
        EnterpriseService.getEnterpriseProducts(id!, 1, 12),
      ]);
      setEnterprise(enterpriseData);
      setProducts(productsData.products || []);
      setPagination(productsData.pagination || { page: 1, limit: 12, total: 0, pages: 0 });
      // Charger le statut d'abonnement si authentifié
      if (isAuthenticated && id) {
        FollowService.getStatus(id).then(s => {
          setIsFollowing(s.isFollowing);
          setFollowerCount(s.followerCount);
        }).catch(() => {});
      }
    } catch {
      setErrorModal({ visible: true, title: "Erreur", message: i18n.t("client.enterprise.error.loading") });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!isAuthenticated) {
      router.push('/(auth)/signin');
      return;
    }
    setFollowLoading(true);
    try {
      if (isFollowing) {
        const res = await FollowService.unfollow(id!);
        setIsFollowing(false);
        setFollowerCount(res.followerCount);
      } else {
        const res = await FollowService.follow(id!);
        setIsFollowing(true);
        setFollowerCount(res.followerCount);
      }
    } catch {} finally {
      setFollowLoading(false);
    }
  };

  const loadMoreProducts = async () => {
    if (loadingProducts || pagination.page >= pagination.pages) return;
    try {
      setLoadingProducts(true);
      const productsData = await EnterpriseService.getEnterpriseProducts(id!, pagination.page + 1, 12);
      setProducts((prev) => [...prev, ...(productsData.products || [])]);
      setPagination(productsData.pagination || pagination);
    } catch {}
    finally { setLoadingProducts(false); }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEnterpriseData();
    setRefreshing(false);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("fr-FR").format(price) + " FCFA";

  const requireAuthForContact = () => {
    if (isAuthenticated) return true;
    setErrorModal({ visible: true, title: "Connexion requise", message: "Connectez-vous pour contacter une entreprise." });
    setTimeout(() => router.push("/(auth)/signin"), 200);
    return false;
  };

  const openWhatsApp = async (phone: string) => {
    if (!requireAuthForContact()) return;
    const result = await openWhatsAppChat({
      phone,
      message: i18n.t("client.enterprise.whatsapp.message", { companyName: enterprise?.companyName }),
    });
    if (!result.ok) {
      setErrorModal({
        visible: true,
        title: i18n.t("messages.error"),
        message: result.reason === "invalid_phone" ? "Numéro non disponible" : i18n.t("client.enterprise.error.whatsappError"),
      });
    }
  };

  const makePhoneCall = async (phone: string) => {
    if (!requireAuthForContact()) return;
    const result = await openPhoneCall(phone);
    if (!result.ok) {
      setErrorModal({
        visible: true,
        title: i18n.t("messages.error"),
        message: result.reason === "invalid_phone" ? "Numéro non disponible" : i18n.t("client.enterprise.error.callError"),
      });
    }
  };

  const openWebsite = async (website: string) => {
    if (!requireAuthForContact()) return;
    const result = await openWebsiteUrl(website);
    if (!result.ok) {
      setErrorModal({ visible: true, title: i18n.t("messages.error"), message: i18n.t("client.enterprise.error.websiteError") });
    }
  };

  // ─── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.secondary }}>
        <ExpoStatusBar style="light" translucent />
        <LinearGradient
          colors={["#047857", "#10B981"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 16, paddingBottom: 44, paddingHorizontal: 64, alignItems: "center" }}
        >
          <ShimmerBlock style={{ height: 20, borderRadius: 10, width: 160, backgroundColor: "rgba(255,255,255,0.3)" }} />
        </LinearGradient>
        <View style={{ alignItems: "center", marginTop: -44, marginBottom: 16 }}>
          <ShimmerBlock style={{ width: 88, height: 88, borderRadius: 22 }} />
        </View>
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <ShimmerBlock style={{ height: 80, borderRadius: 16 }} />
          <ShimmerBlock style={{ height: 56, borderRadius: 16 }} />
        </View>
      </View>
    );
  }

  // ─── Not found ─────────────────────────────────────────────────────────────
  if (!enterprise) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: "rgba(139,92,246,0.10)", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
            <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: "rgba(139,92,246,0.16)", alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="business-outline" size={34} color="#8B5CF6" />
            </View>
          </View>
          <Text className="font-quicksand-bold text-xl text-center" style={{ color: colors.textPrimary, marginBottom: 10 }}>
            {i18n.t("client.enterprise.error.notFound")}
          </Text>
          <Text className="font-quicksand-medium text-sm text-center" style={{ color: colors.textSecondary, marginBottom: 28 }}>
            {i18n.t("client.enterprise.error.notFoundMessage")}
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={{ borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)" }}>
            <Text className="font-quicksand-bold text-sm" style={{ color: colors.textSecondary }}>
              {i18n.t("client.enterprise.error.back")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Contenu principal ─────────────────────────────────────────────────────
  const hasPhone = !!enterprise.contactInfo?.phone;
  const hasWebsite = !!enterprise.contactInfo?.website;

  const ListHeader = (
    <View>
      {/* Gradient hero — INSIDE ListHeaderComponent pour que le logo overlap fonctionne */}
      <LinearGradient
        colors={["#047857", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 16, paddingHorizontal: 64, paddingBottom: 44, alignItems: "center", justifyContent: "center" }}
      >
        <Text numberOfLines={1} className="text-xl font-quicksand-bold text-white text-center">
          {enterprise.companyName}
        </Text>
      </LinearGradient>

      {/* Logo — overlap sur le gradient */}
      <View style={{ alignItems: "center", marginTop: -44, marginBottom: 12 }}>
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 22,
            borderWidth: 3,
            borderColor: colors.background,
            overflow: "hidden",
            backgroundColor: colors.card,
            elevation: 6,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 10,
          }}
        >
          {enterprise.logo ? (
            <ExpoImage
              source={{ uri: enterprise.logo }}
              style={{ width: 82, height: 82 } as any}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={{ flex: 1, backgroundColor: "#FEF3C7", justifyContent: "center", alignItems: "center" }}>
              <Ionicons name="business" size={36} color="#FE8C00" />
            </View>
          )}
        </View>
      </View>

      {/* Localisation */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Ionicons name="location-sharp" size={13} color={colors.textTertiary} />
        <Text className="font-quicksand-medium text-sm" style={{ color: colors.textSecondary, marginLeft: 3 }}>
          {enterprise.location?.district}, {enterprise.location?.city}
        </Text>
      </View>

      {/* Stats pills */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.09)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, gap: 6 }}>
          <Ionicons name="cube-outline" size={14} color="#10B981" />
          <Text className="font-quicksand-bold text-sm" style={{ color: colors.textPrimary }}>
            {(enterprise as any).totalActiveProducts || products.length}
          </Text>
          <Text className="font-quicksand text-xs" style={{ color: colors.textSecondary }}>
            {i18n.t("client.enterprise.stats.products")}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: isDark ? "rgba(139,92,246,0.12)" : "rgba(139,92,246,0.09)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, gap: 6 }}>
          <Ionicons name="people-outline" size={14} color="#8B5CF6" />
          <Text className="font-quicksand-bold text-sm" style={{ color: colors.textPrimary }}>
            {followerCount}
          </Text>
          <Text className="font-quicksand text-xs" style={{ color: colors.textSecondary }}>
            abonnés
          </Text>
        </View>
      </View>

      {/* Description */}
      {enterprise.description ? (
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Text className="font-quicksand-medium text-sm text-center" style={{ color: colors.textSecondary, lineHeight: 20 }}>
            {enterprise.description}
          </Text>
        </View>
      ) : null}

      {/* Bouton S'abonner */}
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <TouchableOpacity
          onPress={handleToggleFollow}
          disabled={followLoading}
          activeOpacity={0.8}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isFollowing
              ? (isDark ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.10)")
              : "#8B5CF6",
            borderRadius: 14,
            paddingVertical: 12,
            gap: 8,
            borderWidth: isFollowing ? 1.5 : 0,
            borderColor: isFollowing ? "#8B5CF6" : "transparent",
          }}
        >
          {followLoading ? (
            <ActivityIndicator size="small" color={isFollowing ? "#8B5CF6" : "#fff"} />
          ) : (
            <>
              <Ionicons
                name={isFollowing ? "checkmark-circle" : "add-circle-outline"}
                size={18}
                color={isFollowing ? "#8B5CF6" : "#fff"}
              />
              <Text
                className="font-quicksand-bold text-sm"
                style={{ color: isFollowing ? "#8B5CF6" : "#fff" }}
              >
                {isFollowing ? "Ne plus suivre" : "Suivre"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Boutons de contact */}
      {hasPhone && (
        <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={() => openWhatsApp(enterprise.contactInfo.phone)}
              activeOpacity={0.8}
              style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#10B981", borderRadius: 14, paddingVertical: 12, gap: 8 }}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text className="font-quicksand-bold text-sm text-white">
                {i18n.t("client.enterprise.contact.whatsapp")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => makePhoneCall(enterprise.contactInfo.phone)}
              activeOpacity={0.8}
              style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderRadius: 14, paddingVertical: 12, gap: 8, borderWidth: 1, borderColor: colors.border }}
            >
              <Ionicons name="call-outline" size={18} color={colors.textPrimary} />
              <Text className="font-quicksand-bold text-sm" style={{ color: colors.textPrimary }}>
                {i18n.t("client.enterprise.contact.call")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {hasWebsite && (
        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => openWebsite(enterprise.contactInfo.website!)}
            activeOpacity={0.8}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderRadius: 14, paddingVertical: 12, gap: 8, borderWidth: 1, borderColor: colors.border }}
          >
            <Ionicons name="globe-outline" size={18} color="#3B82F6" />
            <Text className="font-quicksand-bold text-sm" style={{ color: "#3B82F6" }}>
              {i18n.t("client.enterprise.contact.website")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Titre section produits */}
      {products.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <Text className="font-quicksand-bold text-base" style={{ color: colors.textPrimary }}>
            {i18n.t("client.enterprise.stats.products")}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      <ExpoStatusBar style="light" translucent />

      {/* Bouton retour flottant au-dessus de tout */}
      <View style={{ position: "absolute", top: insets.top + 8, left: 16, zIndex: 100, elevation: 100 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 40, height: 40, backgroundColor: "rgba(0,0,0,0.25)", borderRadius: 20, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" colors={["#10B981"]} />
        }
        onEndReached={loadMoreProducts}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 40, paddingHorizontal: 32 }}>
            <Ionicons name="cube-outline" size={48} color={colors.textTertiary} />
            <Text className="font-quicksand-bold text-base text-center" style={{ color: colors.textSecondary, marginTop: 12 }}>
              {i18n.t("client.enterprise.empty.title")}
            </Text>
            <Text className="font-quicksand-medium text-sm text-center" style={{ color: colors.textTertiary, marginTop: 6 }}>
              {i18n.t("client.enterprise.empty.message")}
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingProducts ? (
            <View style={{ paddingVertical: 16, alignItems: "center" }}>
              <ActivityIndicator size="small" color="#10B981" />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              width: (screenWidth - 48) / 2,
              backgroundColor: colors.card,
              borderRadius: 16,
              marginBottom: 12,
              overflow: "hidden",
            }}
            activeOpacity={0.85}
            onPress={() => router.push(`/(app)/(client)/product/${item._id}`)}
          >
            <ExpoImage
              source={{ uri: item.images?.[0] }}
              style={{ width: "100%", height: 120 } as any}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <View style={{ padding: 10 }}>
              <Text numberOfLines={2} className="font-quicksand-semibold text-sm" style={{ color: colors.textPrimary, minHeight: 36 }}>
                {item.name}
              </Text>
              <Text className="font-quicksand-bold text-sm" style={{ color: "#FE8C00", marginTop: 4 }}>
                {formatPrice(item.price)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Modal d'erreur / info */}
      <Modal
        visible={errorModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModal({ visible: false, title: "", message: "" })}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setErrorModal({ visible: false, title: "", message: "" })}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}
        >
          <TouchableOpacity activeOpacity={1} style={{ backgroundColor: colors.card, borderRadius: 24, padding: 24, width: "100%", maxWidth: 340 }}>
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(239,68,68,0.1)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="alert-circle" size={30} color="#EF4444" />
              </View>
            </View>
            <Text className="font-quicksand-bold text-lg text-center" style={{ color: colors.textPrimary, marginBottom: 8 }}>
              {errorModal.title}
            </Text>
            <Text className="font-quicksand-medium text-sm text-center" style={{ color: colors.textSecondary, marginBottom: 24, lineHeight: 20 }}>
              {errorModal.message}
            </Text>
            <TouchableOpacity
              onPress={() => setErrorModal({ visible: false, title: "", message: "" })}
              style={{ backgroundColor: "#10B981", borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
              activeOpacity={0.8}
            >
              <Text className="font-quicksand-bold text-sm text-white">
                {i18n.t("client.enterprise.error.modalOk")}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
