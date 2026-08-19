import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
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
import { useTheme } from "../../../../../contexts/ThemeContext";
import i18n from "../../../../../i18n/i18n";
import EnterpriseService, {
  Enterprise,
} from "../../../../../services/api/EnterpriseService";
import FollowService from "../../../../../services/api/FollowService";
import { Product } from "../../../../../types/product";
import {
  openPhoneCall,
  openWebsiteUrl,
  openWhatsAppChat,
} from "../../../../../utils/ContactLinks";

const { width: screenWidth } = Dimensions.get("window");

export default function EnterpriseDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0,
  });

  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: "",
    message: "",
  });

  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadEnterpriseData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadEnterpriseData = async () => {
    try {
      setLoading(true);

      const [enterpriseData, productsData] = await Promise.all([
        EnterpriseService.getPublicEnterpriseById(id!),
        EnterpriseService.getEnterpriseProducts(id!, 1, 12),
      ]);

      setEnterprise(enterpriseData);
      setProducts(productsData.products || []);
      setPagination(
        productsData.pagination || {
          page: 1,
          limit: 12,
          total: 0,
          pages: 0,
        },
      );
      if (id) {
        FollowService.getStatus(id).then(s => {
          setIsFollowing(s.isFollowing);
          setFollowerCount(s.followerCount);
        }).catch(() => {});
      }
    } catch (error) {
      console.log("❌ Erreur chargement entreprise:", error);
      setErrorModal({
        visible: true,
        title: i18n.t("messages.error"),
        message: i18n.t("enterprise.profile.messages.loadErrorMessage"),
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMoreProducts = async () => {
    if (loadingProducts || pagination.page >= pagination.pages) return;

    try {
      setLoadingProducts(true);
      const nextPage = pagination.page + 1;
      const productsData = await EnterpriseService.getEnterpriseProducts(
        id!,
        nextPage,
        12,
      );

      setProducts((prev) => [...prev, ...(productsData.products || [])]);
      setPagination(productsData.pagination || pagination);
    } catch (error) {
      console.log("❌ Erreur chargement produits supplémentaires:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEnterpriseData();
    setRefreshing(false);
  };

  const handleToggleFollow = async () => {
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  const ShimmerBlock = ({ style }: { style?: any }) => {
    const shimmer = React.useRef(new Animated.Value(0)).current;
    useEffect(() => {
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
      <View
        style={[
          {
            backgroundColor: isDark ? "#374151" : "#E5E7EB",
            overflow: "hidden",
          },
          style,
        ]}
      >
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: 120,
            transform: [{ translateX }],
            backgroundColor: isDark
              ? "rgba(255,255,255,0.05)"
              : "rgba(255,255,255,0.35)",
            opacity: 0.7,
          }}
        />
      </View>
    );
  };

  const SkeletonEnterprise = () => (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style="light" translucent backgroundColor="transparent" />

      {/* Fixed back button skeleton */}
      <View style={{ position: "absolute", top: insets.top + 8, left: 16, zIndex: 100 }}>
        <View style={{ width: 40, height: 40, backgroundColor: "rgba(0,0,0,0.15)", borderRadius: 20 }} />
      </View>

      <LinearGradient
        colors={["#047857", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 64,
          paddingBottom: 44,
          alignItems: "center",
        }}
      >
        <ShimmerBlock style={{ width: 140, height: 20, borderRadius: 10 }} />
      </LinearGradient>

      {/* Logo skeleton */}
      <View style={{ alignItems: "center", marginTop: -44, marginBottom: 12 }}>
        <ShimmerBlock style={{ width: 88, height: 88, borderRadius: 22 }} />
      </View>

      <View style={{ alignItems: "center", paddingHorizontal: 24, marginBottom: 20 }}>
        <ShimmerBlock style={{ width: 160, height: 20, borderRadius: 10, marginBottom: 8 }} />
        <ShimmerBlock style={{ width: 120, height: 14, borderRadius: 7 }} />
      </View>

      <View style={{ flexDirection: "row", marginHorizontal: 20, marginBottom: 20, gap: 10 }}>
        <ShimmerBlock style={{ flex: 1, height: 70, borderRadius: 14 }} />
        <ShimmerBlock style={{ flex: 1, height: 70, borderRadius: 14 }} />
      </View>

      <View style={{ marginHorizontal: 20, gap: 10 }}>
        <ShimmerBlock style={{ height: 50, borderRadius: 14 }} />
        <ShimmerBlock style={{ height: 50, borderRadius: 14 }} />
      </View>
    </View>
  );

  const openWhatsApp = async (phone: string) => {
    const message = `Bonjour ! Je découvre votre entreprise "${enterprise?.companyName}" sur Axi Marketplace. Pouvez-vous me donner plus d'informations sur vos produits ? Merci !`;
    const result = await openWhatsAppChat({ phone, message });

    if (!result.ok) {
      setErrorModal({
        visible: true,
        title: i18n.t("messages.error"),
        message:
          result.reason === "invalid_phone"
            ? "Numéro de téléphone invalide"
            : "Impossible d'ouvrir WhatsApp",
      });
    }
  };

  const makePhoneCall = async (phone: string) => {
    const result = await openPhoneCall(phone);

    if (!result.ok) {
      setErrorModal({
        visible: true,
        title: i18n.t("messages.error"),
        message:
          result.reason === "invalid_phone"
            ? "Numéro de téléphone invalide"
            : "Impossible de passer l'appel",
      });
    }
  };

  const openWebsite = async (website: string) => {
    const result = await openWebsiteUrl(website);
    if (!result.ok) {
      setErrorModal({
        visible: true,
        title: i18n.t("messages.error"),
        message: "Impossible d'ouvrir le site web",
      });
    }
  };

  const ProductCard = ({ product }: { product: Product }) => (
    <TouchableOpacity
      style={{
        width: (screenWidth - 48) / 2,
        marginBottom: 12,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: colors.card || colors.background,
      }}
      activeOpacity={0.85}
      onPress={() => {
        router.push(`/(app)/(enterprise)/product/${product._id}`);
      }}
    >
      <ExpoImage
        source={{ uri: product.images[0] || undefined }}
        style={{ width: "100%", height: 120 } as any}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
      <View style={{ padding: 10 }}>
        <Text
          numberOfLines={2}
          className="text-sm font-quicksand-semibold"
          style={{ color: colors.text, marginBottom: 6, minHeight: 36, lineHeight: 18 }}
        >
          {product.name}
        </Text>
        <Text className="text-sm font-quicksand-bold" style={{ color: "#FE8C00" }}>
          {formatPrice(product.price)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <SkeletonEnterprise />;
  }

  if (!enterprise) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Ionicons name="business-outline" size={64} color="#EF4444" />
          <Text
            className="mt-4 text-xl font-quicksand-bold"
            style={{ color: colors.text }}
          >
            {i18n.t("enterprise.profile.messages.loadError")}
          </Text>
          <Text
            className="mt-2 font-quicksand-medium text-center px-6"
            style={{ color: colors.textSecondary }}
          >
            L&apos;entreprise que vous recherchez n&apos;existe pas ou
            n&apos;est plus active.
          </Text>
          <TouchableOpacity
            className="mt-6 bg-primary-500 rounded-2xl px-6 py-3"
            onPress={() => router.back()}
          >
            <Text className="text-white font-quicksand-semibold">
              {i18n.t("common.actions.cancel")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const locationText = [enterprise.location?.city, enterprise.location?.district]
    .filter(Boolean)
    .join(", ");

  const hasPhone = !!enterprise.contactInfo?.phone;
  const hasWebsite = !!enterprise.contactInfo?.website;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style="light" translucent backgroundColor="transparent" />

      {/* Back button — fixed over gradient, always visible */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 16,
          zIndex: 100,
          elevation: 100,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            backgroundColor: "rgba(0,0,0,0.25)",
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        renderItem={({ item }) => <ProductCard product={item} />}
        keyExtractor={(item) => item._id}
        numColumns={2}
        columnWrapperStyle={{
          justifyContent: "space-between",
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FE8C00"]}
            tintColor="#FE8C00"
          />
        }
        onEndReached={loadMoreProducts}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          <View>
            {/* Gradient header — inside FlatList so logo can overlap it */}
            <LinearGradient
              colors={["#047857", "#10B981"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingTop: insets.top + 16,
                paddingHorizontal: 64,
                paddingBottom: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                numberOfLines={1}
                className="text-xl font-quicksand-bold text-white text-center"
              >
                {enterprise.companyName}
              </Text>
            </LinearGradient>

            {/* Logo overlapping gradient */}
            <View style={{ alignItems: "center", marginTop: -44, marginBottom: 12 }}>
              <View
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 22,
                  borderWidth: 3,
                  borderColor: colors.background,
                  overflow: "hidden",
                  backgroundColor: colors.card || colors.background,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                {enterprise.logo ? (
                  <ExpoImage
                    source={{ uri: enterprise.logo }}
                    style={{ width: 82, height: 82 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: "#FEF3C7",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons name="business" size={36} color="#FE8C00" />
                  </View>
                )}
              </View>
            </View>

            {/* Company name, location, status — centered */}
            <View
              style={{
                alignItems: "center",
                paddingHorizontal: 24,
                marginBottom: 20,
              }}
            >
              <Text
                className="text-xl font-quicksand-bold text-center"
                style={{ color: colors.text, marginBottom: 6 }}
              >
                {enterprise.companyName}
              </Text>
              {locationText ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <Ionicons
                    name="location-sharp"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text
                    className="text-sm font-quicksand-medium ml-1"
                    style={{ color: colors.textSecondary }}
                  >
                    {locationText}
                  </Text>
                </View>
              ) : null}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: isDark ? "#052e16" : "#F0FDF4",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 20,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: "#10B981",
                    marginRight: 5,
                  }}
                />
                <Text
                  className="text-xs font-quicksand-semibold"
                  style={{ color: "#16A34A" }}
                >
                  {i18n.t(
                    "enterprise.profile.modals.enterpriseDetails.active",
                  )}
                </Text>
              </View>
            </View>

            {/* Description */}
            {enterprise.description ? (
              <View
                style={{
                  paddingHorizontal: 20,
                  marginBottom: 20,
                }}
              >
                <Text
                  className="font-quicksand-medium leading-5 text-center"
                  style={{ color: colors.textSecondary, fontSize: 14 }}
                >
                  {enterprise.description}
                </Text>
              </View>
            ) : null}

            {/* Bouton S'abonner */}
            <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
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

            {/* Stats row */}
            <View
              style={{
                flexDirection: "row",
                marginHorizontal: 20,
                marginBottom: 20,
                gap: 10,
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 14,
                  padding: 14,
                  backgroundColor: isDark ? "#1f2937" : "#f9fafb",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 3,
                  }}
                >
                  <Ionicons name="star" size={15} color="#FE8C00" />
                  <Text
                    className="text-lg font-quicksand-bold ml-1"
                    style={{ color: colors.text }}
                  >
                    {enterprise.stats.averageRating?.toFixed(1) || "0.0"}
                  </Text>
                </View>
                <Text
                  className="text-xs font-quicksand-medium"
                  style={{ color: colors.textSecondary }}
                >
                  {i18n.t("client.enterprise.stats.reviews", {
                    count: enterprise.stats.totalReviews || 0,
                  })}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  borderRadius: 14,
                  padding: 14,
                  backgroundColor: isDark ? "#1f2937" : "#f9fafb",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 3,
                  }}
                >
                  <Ionicons name="cube" size={15} color="#10B981" />
                  <Text
                    className="text-lg font-quicksand-bold ml-1"
                    style={{ color: colors.text }}
                  >
                    {(enterprise as any).totalActiveProducts || products.length}
                  </Text>
                </View>
                <Text
                  className="text-xs font-quicksand-medium"
                  style={{ color: colors.textSecondary }}
                >
                  {i18n.t(
                    "enterprise.profile.modals.enterpriseDetails.products",
                  )}
                </Text>
              </View>

              <View
                style={{
                  flex: 1,
                  borderRadius: 14,
                  padding: 14,
                  backgroundColor: isDark ? "#1f2937" : "#f9fafb",
                  alignItems: "center",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                  <Ionicons name="people" size={15} color="#8B5CF6" />
                  <Text className="text-lg font-quicksand-bold ml-1" style={{ color: colors.text }}>
                    {followerCount}
                  </Text>
                </View>
                <Text className="text-xs font-quicksand-medium" style={{ color: colors.textSecondary }}>
                  abonnés
                </Text>
              </View>
            </View>

            {/* Contact section */}
            {(hasPhone || hasWebsite) && (
              <View style={{ marginHorizontal: 20, marginBottom: 24 }}>
                <Text
                  className="text-sm font-quicksand-semibold mb-3"
                  style={{ color: colors.text }}
                >
                  {i18n.t(
                    "enterprise.profile.modals.enterpriseDetails.contact",
                  )}
                </Text>

                {hasPhone && (
                  <View style={{ flexDirection: "row", gap: 10, marginBottom: hasWebsite ? 10 : 0 }}>
                    <TouchableOpacity
                      onPress={() => openWhatsApp(enterprise.contactInfo.phone)}
                      activeOpacity={0.8}
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isDark ? "#052e16" : "#F0FDF4",
                        borderRadius: 14,
                        paddingVertical: 14,
                        gap: 6,
                      }}
                    >
                      <Ionicons name="logo-whatsapp" size={18} color="#16A34A" />
                      <Text
                        className="font-quicksand-semibold text-sm"
                        style={{ color: "#16A34A" }}
                      >
                        {i18n.t(
                          "enterprise.profile.modals.enterpriseDetails.whatsapp",
                        )}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => makePhoneCall(enterprise.contactInfo.phone)}
                      activeOpacity={0.8}
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isDark ? "#431407" : "#FFF7ED",
                        borderRadius: 14,
                        paddingVertical: 14,
                        gap: 6,
                      }}
                    >
                      <Ionicons name="call" size={18} color="#EA580C" />
                      <Text
                        className="font-quicksand-semibold text-sm"
                        style={{ color: "#EA580C" }}
                      >
                        {i18n.t(
                          "enterprise.profile.modals.enterpriseDetails.call",
                        )}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {hasWebsite && (
                  <TouchableOpacity
                    onPress={() => openWebsite(enterprise.contactInfo.website!)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isDark ? "#1e3a5f" : "#EFF6FF",
                      borderRadius: 14,
                      paddingVertical: 14,
                      gap: 6,
                    }}
                  >
                    <Ionicons name="globe" size={18} color="#3B82F6" />
                    <Text
                      className="font-quicksand-semibold text-sm"
                      style={{ color: "#3B82F6" }}
                    >
                      {i18n.t(
                        "enterprise.profile.modals.enterpriseDetails.website",
                      )}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Products section header */}
            <View
              style={{
                height: 1,
                backgroundColor: colors.border,
                marginHorizontal: 20,
                marginBottom: 16,
              }}
            />
            <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
              <Text
                className="text-lg font-quicksand-bold"
                style={{ color: colors.text }}
              >
                {i18n.t(
                  "enterprise.profile.modals.enterpriseDetails.enterpriseProducts",
                )}
              </Text>
              {pagination.total > 0 && (
                <Text
                  className="text-sm font-quicksand-medium mt-1"
                  style={{ color: colors.textSecondary }}
                >
                  {pagination.total}{" "}
                  {i18n.t(
                    "enterprise.profile.modals.enterpriseDetails.products",
                  )}
                </Text>
              )}
            </View>
          </View>
        }
        ListFooterComponent={
          loadingProducts ? (
            <View style={{ paddingVertical: 16, alignItems: "center" }}>
              <ActivityIndicator size="small" color="#FE8C00" />
              <Text
                className="mt-2 font-quicksand-medium text-sm"
                style={{ color: colors.textSecondary }}
              >
                {i18n.t("enterprise.settings.loading")}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingVertical: 80,
              }}
            >
              <Ionicons
                name="cube-outline"
                size={64}
                color={colors.textSecondary}
              />
              <Text
                className="mt-4 text-lg font-quicksand-bold"
                style={{ color: colors.textSecondary }}
              >
                {i18n.t(
                  "enterprise.profile.modals.enterpriseDetails.noProductsAvailable",
                )}
              </Text>
              <Text
                className="mt-2 font-quicksand-medium text-center px-6"
                style={{ color: colors.textSecondary }}
              >
                {i18n.t(
                  "enterprise.profile.modals.enterpriseDetails.noProductsMessage",
                )}
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* Error modal */}
      <Modal
        visible={errorModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setErrorModal({ visible: false, title: "", message: "" })
        }
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() =>
            setErrorModal({ visible: false, title: "", message: "" })
          }
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 24,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{
              borderRadius: 24,
              padding: 24,
              width: "100%",
              maxWidth: 384,
              backgroundColor: colors.card || colors.background,
            }}
          >
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  backgroundColor: "#FEE2E2",
                  borderRadius: 32,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="alert-circle" size={32} color="#EF4444" />
              </View>
            </View>

            <Text
              className="text-xl font-quicksand-bold text-center mb-2"
              style={{ color: colors.text }}
            >
              {errorModal.title}
            </Text>

            <Text
              className="text-base font-quicksand-medium text-center mb-6"
              style={{ color: colors.textSecondary }}
            >
              {errorModal.message}
            </Text>

            <TouchableOpacity
              onPress={() =>
                setErrorModal({ visible: false, title: "", message: "" })
              }
              style={{
                backgroundColor: "#FE8C00",
                paddingVertical: 14,
                borderRadius: 14,
              }}
              activeOpacity={0.7}
            >
              <Text className="text-white font-quicksand-bold text-center">
                {i18n.t("common.actions.understood")}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
