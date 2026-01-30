import { Ionicons } from "@expo/vector-icons";
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
  Image,
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

  // États pour les modals d'erreur
  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    if (id) {
      loadEnterpriseData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadEnterpriseData = async () => {
    try {
      setLoading(true);

      console.log("🔄 Chargement données entreprise:", id);

      const [enterpriseData, productsData] = await Promise.all([
        EnterpriseService.getPublicEnterpriseById(id!),
        EnterpriseService.getEnterpriseProducts(id!, 1, 12),
      ]);

      console.log("📊 Enterprise data received:", enterpriseData);
      console.log("📦 Products data received:", productsData);

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

      console.log(
        "✅ Données entreprise chargées:",
        enterpriseData.companyName,
      );
      console.log("✅ Produits chargés:", (productsData.products || []).length);
    } catch (error) {
      console.error("❌ Erreur chargement entreprise:", error);
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
      console.error("❌ Erreur chargement produits supplémentaires:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEnterpriseData();
    setRefreshing(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  // Skeleton Loader Component
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
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ExpoStatusBar style="light" translucent backgroundColor="transparent" />

      {/* Header Skeleton */}
      <LinearGradient
        colors={["#047857", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingTop: insets.top + 16,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
          paddingBottom: 16,
        }}
      >
        <View className="flex-row items-center justify-between">
          <ShimmerBlock style={{ width: 40, height: 40, borderRadius: 20 }} />
          <ShimmerBlock style={{ width: 150, height: 20, borderRadius: 10 }} />
          <ShimmerBlock style={{ width: 40, height: 40, borderRadius: 20 }} />
        </View>
      </LinearGradient>

      <View className="flex-1">
        {/* Enterprise Info Skeleton */}
        <View
          className="mx-4 rounded-2xl mt-6 mb-6"
          style={{
            backgroundColor: colors.card || colors.background,
            borderColor: colors.border,
            borderWidth: 1,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View className="p-6">
            <View className="flex-row items-center mb-4">
              <ShimmerBlock
                style={{ width: 80, height: 80, borderRadius: 16 }}
              />
              <View className="ml-4 flex-1">
                <ShimmerBlock
                  style={{
                    width: "70%",
                    height: 20,
                    borderRadius: 10,
                    marginBottom: 8,
                  }}
                />
                <ShimmerBlock
                  style={{
                    width: "50%",
                    height: 14,
                    borderRadius: 7,
                    marginBottom: 8,
                  }}
                />
                <ShimmerBlock
                  style={{ width: "40%", height: 14, borderRadius: 7 }}
                />
              </View>
            </View>

            <ShimmerBlock
              style={{
                width: "100%",
                height: 16,
                borderRadius: 8,
                marginBottom: 4,
              }}
            />
            <ShimmerBlock
              style={{
                width: "80%",
                height: 16,
                borderRadius: 8,
                marginBottom: 20,
              }}
            />

            <View className="flex-row justify-between mb-4">
              <ShimmerBlock
                style={{ width: "30%", height: 60, borderRadius: 12 }}
              />
              <ShimmerBlock
                style={{ width: "30%", height: 60, borderRadius: 12 }}
              />
              <ShimmerBlock
                style={{ width: "30%", height: 60, borderRadius: 12 }}
              />
            </View>

            <ShimmerBlock
              style={{
                width: "35%",
                height: 16,
                borderRadius: 8,
                marginBottom: 12,
              }}
            />
            <View className="flex-row">
              <ShimmerBlock
                style={{
                  width: 80,
                  height: 32,
                  borderRadius: 16,
                  marginRight: 8,
                }}
              />
              <ShimmerBlock
                style={{
                  width: 80,
                  height: 32,
                  borderRadius: 16,
                  marginRight: 8,
                }}
              />
              <ShimmerBlock
                style={{ width: 80, height: 32, borderRadius: 16 }}
              />
            </View>
          </View>
        </View>

        {/* Products Header Skeleton */}
        <View className="px-4 mb-4">
          <View className="flex-row items-center justify-between">
            <ShimmerBlock
              style={{ width: "40%", height: 20, borderRadius: 10 }}
            />
            <ShimmerBlock style={{ width: 80, height: 24, borderRadius: 12 }} />
          </View>
        </View>

        {/* Products Grid Skeleton */}
        <View className="px-4">
          <View className="flex-row justify-between mb-3">
            <View style={{ width: (screenWidth - 48) / 2 }}>
              <ShimmerBlock
                style={{
                  width: "100%",
                  height: 120,
                  borderRadius: 16,
                  marginBottom: 12,
                }}
              />
              <View className="p-3">
                <ShimmerBlock
                  style={{
                    width: "80%",
                    height: 14,
                    borderRadius: 7,
                    marginBottom: 8,
                  }}
                />
                <ShimmerBlock
                  style={{
                    width: "60%",
                    height: 16,
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                />
                <ShimmerBlock
                  style={{ width: "40%", height: 12, borderRadius: 6 }}
                />
              </View>
            </View>
            <View style={{ width: (screenWidth - 48) / 2 }}>
              <ShimmerBlock
                style={{
                  width: "100%",
                  height: 120,
                  borderRadius: 16,
                  marginBottom: 12,
                }}
              />
              <View className="p-3">
                <ShimmerBlock
                  style={{
                    width: "80%",
                    height: 14,
                    borderRadius: 7,
                    marginBottom: 8,
                  }}
                />
                <ShimmerBlock
                  style={{
                    width: "60%",
                    height: 16,
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                />
                <ShimmerBlock
                  style={{ width: "40%", height: 12, borderRadius: 6 }}
                />
              </View>
            </View>
          </View>
        </View>
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

  // Composant pour une carte de produit
  const ProductCard = ({ product }: { product: Product }) => (
    <TouchableOpacity
      className="rounded-2xl mb-3 overflow-hidden"
      style={{
        width: (screenWidth - 48) / 2,
        backgroundColor: colors.card || colors.background,
        borderColor: colors.border,
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
      onPress={() => {
        router.push(`/(app)/(enterprise)/product/${product._id}`);
      }}
    >
      <View className="relative">
        <Image
          source={{
            uri:
              product.images[0] ||
              "https://via.placeholder.com/160x120/CCCCCC/FFFFFF?text=No+Image",
          }}
          className="w-full h-28 rounded-t-2xl"
          resizeMode="cover"
        />
        {/* {product.stock <= 5 && product.stock > 0 && (
          <View className="absolute top-2 right-2 bg-warning-500 rounded-full px-2 py-1">
            <Text className="text-white text-xs font-quicksand-bold">
              {i18n.t("client.enterprise.stock.remaining", {
                count: product.stock,
              })}
            </Text>
          </View>
        )} */}
      </View>

      <View className="p-3">
        <Text
          numberOfLines={2}
          className="text-sm font-quicksand-semibold mb-2 h-10"
          style={{ color: colors.text }}
        >
          {product.name}
        </Text>

        <Text
          className="text-base font-quicksand-bold mb-2"
          style={{ color: "#FE8C00" }}
        >
          {formatPrice(product.price)}
        </Text>

        {/* {product.stats && (
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text className="text-xs ml-1" style={{color: colors.textSecondary}}>
                {product.stats.averageRating?.toFixed(1) || '0.0'}
              </Text>
            </View>
            <Text className="text-xs" style={{color: colors.textSecondary}}>
              {i18n.t("client.enterprise.stats.sold", { count: product.stats.totalSales || 0 })}
            </Text>
          </View>
        )} */}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <SkeletonEnterprise />;
  }

  if (!enterprise) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <View className="flex-1 justify-center items-center">
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

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ExpoStatusBar style="light" translucent backgroundColor="transparent" />

      {/* Header vert commun */}
      <LinearGradient
        colors={["#047857", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingTop: insets.top + 8,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
          paddingBottom: 15,
        }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text
            numberOfLines={1}
            className="text-lg font-quicksand-bold text-white flex-1 text-center"
          >
            {enterprise.companyName}
          </Text>
          {/* <TouchableOpacity className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
            <Ionicons name="heart-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity> */}
        </View>
      </LinearGradient>

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
            {/* Informations de l'entreprise */}
            <View
              className="mx-4 rounded-2xl mb-6"
              style={{
                backgroundColor: colors.card || colors.background,
                borderColor: colors.border,
                borderWidth: 1,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              {/* Logo et infos principales */}
              <View className="p-6">
                <View className="flex-row items-center mb-4">
                  {enterprise.logo ? (
                    <Image
                      source={{ uri: enterprise.logo }}
                      className="w-20 h-20 rounded-2xl"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-20 h-20 bg-primary-100 rounded-2xl justify-center items-center">
                      <Ionicons name="business" size={32} color="#FE8C00" />
                    </View>
                  )}

                  <View className="ml-4 flex-1">
                    <Text
                      className="text-xl font-quicksand-bold mb-1"
                      style={{ color: colors.text }}
                    >
                      {enterprise.companyName}
                    </Text>
                    <View className="flex-row items-center mb-2">
                      <Ionicons
                        name="location"
                        size={14}
                        color={colors.textSecondary}
                      />
                      {enterprise.location &&
                      enterprise.location.city &&
                      enterprise.location.district ? (
                        <Text
                          className="text-sm ml-1"
                          style={{ color: colors.textSecondary }}
                        >
                          {enterprise.location.city},{" "}
                          {enterprise.location.district}
                        </Text>
                      ) : (
                        <Text
                          className="text-sm ml-1"
                          style={{ color: colors.textSecondary }}
                        >
                          {i18n.t(
                            "enterprise.enterpriseDetails.locationNotAvailable",
                          )}
                        </Text>
                      )}
                    </View>
                    <View className="flex-row items-center">
                      <View className="w-2 h-2 bg-success-500 rounded-full mr-2" />
                      <Text className="text-sm text-success-600 font-quicksand-medium">
                        {i18n.t(
                          "enterprise.profile.modals.enterpriseDetails.active",
                        )}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Description */}
                {enterprise.description && (
                  <View className="mb-4">
                    <Text
                      className="font-quicksand-medium leading-5"
                      style={{ color: colors.textSecondary }}
                    >
                      {enterprise.description}
                    </Text>
                  </View>
                )}

                {/* Statistiques */}
                <View className="flex-row justify-between mb-4">
                  <View
                    className="flex-1 rounded-xl p-3 mr-2"
                    style={{
                      backgroundColor: isDark
                        ? colors.surface || "#1f2937"
                        : "#f9fafb",
                    }}
                  >
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="star" size={16} color="#FE8C00" />
                      <Text
                        className="text-base font-quicksand-bold ml-1"
                        style={{ color: colors.text }}
                      >
                        {enterprise.stats.averageRating?.toFixed(1) || "0.0"}
                      </Text>
                    </View>
                    <Text
                      className="text-xs"
                      style={{ color: colors.textSecondary }}
                    >
                      {i18n.t("client.enterprise.stats.reviews", {
                        count: enterprise.stats.totalReviews || 0,
                      })}
                    </Text>
                  </View>

                  <View
                    className="flex-1 rounded-xl p-3 mx-1"
                    style={{
                      backgroundColor: isDark
                        ? colors.surface || "#1f2937"
                        : "#f9fafb",
                    }}
                  >
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="cube" size={16} color="#10B981" />
                      <Text
                        className="text-base font-quicksand-bold ml-1"
                        style={{ color: colors.text }}
                      >
                        {(enterprise as any).totalActiveProducts ||
                          products.length}
                      </Text>
                    </View>
                    <Text
                      className="text-xs"
                      style={{ color: colors.textSecondary }}
                    >
                      {i18n.t(
                        "enterprise.profile.modals.enterpriseDetails.products",
                      )}
                    </Text>
                  </View>

                  {/* <View className="flex-1 rounded-xl p-3 ml-2" style={{backgroundColor: isDark ? colors.surface || '#1f2937' : '#f9fafb'}}>
                    <View className="flex-row items-center mb-1">
                      <Ionicons name="people" size={16} color="#8B5CF6" />
                      <Text className="text-base font-quicksand-bold ml-1" style={{color: colors.text}}>
                        {enterprise.stats.totalOrders || 0}
                      </Text>
                    </View>
                    <Text className="text-xs" style={{color: colors.textSecondary}}>
                      {i18n.t("enterprise.profile.modals.enterpriseDetails.orders")}
                    </Text>
                  </View> */}
                </View>

                {/* Actions de contact */}
                <View>
                  <Text
                    className="text-sm font-quicksand-semibold mb-3"
                    style={{ color: colors.text }}
                  >
                    {i18n.t(
                      "enterprise.profile.modals.enterpriseDetails.contact",
                    )}
                  </Text>
                  <View className="flex-row flex-wrap">
                    {enterprise.contactInfo.phone && (
                      <>
                        <TouchableOpacity
                          onPress={() =>
                            openWhatsApp(enterprise.contactInfo.phone)
                          }
                          className="flex-row items-center bg-success-100 rounded-xl px-3 py-2 mr-2 mb-2"
                        >
                          <Ionicons
                            name="logo-whatsapp"
                            size={16}
                            color="#10B981"
                          />
                          <Text className="ml-2 text-success-700 font-quicksand-medium text-sm">
                            {i18n.t(
                              "enterprise.profile.modals.enterpriseDetails.whatsapp",
                            )}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() =>
                            makePhoneCall(enterprise.contactInfo.phone)
                          }
                          className="flex-row items-center bg-primary-100 rounded-xl px-3 py-2 mr-2 mb-2"
                        >
                          <Ionicons name="call" size={16} color="#FE8C00" />
                          <Text className="ml-2 text-primary-700 font-quicksand-medium text-sm">
                            {i18n.t(
                              "enterprise.profile.modals.enterpriseDetails.call",
                            )}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {enterprise.contactInfo.website && (
                      <TouchableOpacity
                        onPress={() =>
                          openWebsite(enterprise.contactInfo.website!)
                        }
                        className="flex-row items-center bg-blue-100 rounded-xl px-3 py-2 mr-2 mb-2"
                      >
                        <Ionicons name="globe" size={16} color="#3B82F6" />
                        <Text className="ml-2 text-blue-700 font-quicksand-medium text-sm">
                          {i18n.t(
                            "enterprise.profile.modals.enterpriseDetails.website",
                          )}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* Header produits */}
            <View className="px-4 mb-4">
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-lg font-quicksand-bold"
                  style={{ color: colors.text }}
                >
                  {i18n.t(
                    "enterprise.profile.modals.enterpriseDetails.enterpriseProducts",
                  )}
                </Text>
                {/* <Text className="text-sm px-3 py-1 rounded-full" style={{
                  color: colors.textSecondary,
                  backgroundColor: isDark ? colors.surface || '#1f2937' : '#f9fafb'
                }}>
                  {pagination.total} {i18n.t("enterprise.profile.modals.enterpriseDetails.products")}
                </Text> */}
              </View>
            </View>
          </View>
        }
        ListFooterComponent={
          loadingProducts ? (
            <View className="py-4 items-center">
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
            <View className="flex-1 justify-center items-center py-20">
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
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 20 }}
      />

      {/* Modal d'erreur */}
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
          className="flex-1 bg-black/50 justify-center items-center px-6"
        >
          <TouchableOpacity
            activeOpacity={1}
            className="rounded-3xl p-6 w-full max-w-sm"
            style={{ backgroundColor: colors.card || colors.background }}
          >
            {/* Icon d'erreur */}
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-red-100 rounded-full justify-center items-center">
                <Ionicons name="alert-circle" size={32} color="#EF4444" />
              </View>
            </View>

            {/* Titre */}
            <Text
              className="text-xl font-quicksand-bold text-center mb-2"
              style={{ color: colors.text }}
            >
              {errorModal.title}
            </Text>

            {/* Message */}
            <Text
              className="text-base font-quicksand-medium text-center mb-6"
              style={{ color: colors.textSecondary }}
            >
              {errorModal.message}
            </Text>

            {/* Bouton OK */}
            <TouchableOpacity
              onPress={() =>
                setErrorModal({ visible: false, title: "", message: "" })
              }
              className="bg-primary-500 py-3 rounded-xl"
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
