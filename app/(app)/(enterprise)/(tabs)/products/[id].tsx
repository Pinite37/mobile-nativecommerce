import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import {
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Image,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import NotificationModal, {
    useNotification,
} from "../../../../../components/ui/NotificationModal";
import { useToast } from "../../../../../components/ui/ToastManager";
import { useTheme } from "../../../../../contexts/ThemeContext";
import i18n from "../../../../../i18n/i18n";
import ProductService from "../../../../../services/api/ProductService";
import { Product } from "../../../../../types/product";
import { createPublicProductShareUrl } from "../../../../../utils/AppLinks";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const HEADER_HEIGHT = Math.round(screenHeight * 0.45);
const COMPACT_HEADER_HEIGHT = 100;
const TITLE_APPEAR_OFFSET = HEADER_HEIGHT - COMPACT_HEADER_HEIGHT - 50;

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const AnimatedImage = Animated.createAnimatedComponent(ExpoImage);

// Skeleton Loader Component
const ShimmerBlock = ({ style, isDark }: { style?: any; isDark?: boolean }) => {
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
        { backgroundColor: isDark ? "#374151" : "#E5E7EB", overflow: "hidden" },
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
            ? "rgba(255,255,255,0.1)"
            : "rgba(255,255,255,0.35)",
          opacity: 0.7,
        }}
      />
    </View>
  );
};

const SkeletonProduct = ({
  colors,
  isDark,
}: {
  colors: any;
  isDark: boolean;
}) => (
  <View style={{ flex: 1, backgroundColor: colors.secondary }}>
    <ExpoStatusBar
      style={isDark ? "light" : "dark"}
      translucent
      backgroundColor="transparent"
    />

    {/* Header Skeleton */}
    <LinearGradient
      colors={["rgba(0,0,0,0.6)", "transparent"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      className="absolute top-0 left-0 right-0 z-10"
      style={{ paddingTop: Platform.OS === "ios" ? 66 : 16 }}
    >
      <View className="flex-row items-center justify-between px-4 pb-3">
        <ShimmerBlock
          isDark={isDark}
          style={{ width: 40, height: 40, borderRadius: 20 }}
        />
        <ShimmerBlock
          isDark={isDark}
          style={{ width: 120, height: 16, borderRadius: 8 }}
        />
        <View className="flex-row">
          <ShimmerBlock
            isDark={isDark}
            style={{ width: 40, height: 40, borderRadius: 20, marginRight: 8 }}
          />
          <ShimmerBlock
            isDark={isDark}
            style={{ width: 40, height: 40, borderRadius: 20 }}
          />
        </View>
      </View>
    </LinearGradient>

    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Image Skeleton */}
      <View style={{ marginTop: Platform.OS === "ios" ? 100 : 80 }}>
        <ShimmerBlock isDark={isDark} style={{ width: "100%", height: 350 }} />

        {/* Indicators Skeleton */}
        <View className="absolute bottom-4 left-0 right-0 flex-row justify-center">
          {[1, 2, 3].map((i) => (
            <ShimmerBlock
              isDark={isDark}
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                marginHorizontal: 4,
              }}
            />
          ))}
        </View>

        {/* Counter Skeleton */}
        <View className="absolute top-3 right-3">
          <ShimmerBlock
            isDark={isDark}
            style={{ width: 60, height: 24, borderRadius: 12 }}
          />
        </View>
      </View>

      {/* Thumbnails Skeleton */}
      <View className="px-6 mt-3">
        <View className="flex-row">
          {[1, 2, 3, 4].map((i) => (
            <ShimmerBlock
              isDark={isDark}
              key={i}
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                marginRight: 12,
              }}
            />
          ))}
        </View>
      </View>

      {/* Product Info Skeleton */}
      <View className="px-6 py-6">
        {/* Price and Name */}
        <View className="mb-4">
          <ShimmerBlock
            isDark={isDark}
            style={{
              width: "30%",
              height: 32,
              borderRadius: 16,
              marginBottom: 12,
            }}
          />
          <ShimmerBlock
            isDark={isDark}
            style={{
              width: "80%",
              height: 28,
              borderRadius: 14,
              marginBottom: 8,
            }}
          />
          <ShimmerBlock
            isDark={isDark}
            style={{
              width: "100%",
              height: 16,
              borderRadius: 8,
              marginBottom: 4,
            }}
          />
          <ShimmerBlock
            isDark={isDark}
            style={{ width: "60%", height: 16, borderRadius: 8 }}
          />
        </View>

        {/* Status Button Skeleton */}
        <View className="mb-6">
          <ShimmerBlock
            isDark={isDark}
            style={{
              width: 80,
              height: 32,
              borderRadius: 16,
              alignSelf: "flex-start",
            }}
          />
        </View>

        {/* Informations Section Skeleton */}
        <View className="mb-6">
          <View className="flex-row items-center mb-4">
            <ShimmerBlock
              isDark={isDark}
              style={{ width: 6, height: 24, borderRadius: 3, marginRight: 12 }}
            />
            <ShimmerBlock
              isDark={isDark}
              style={{ width: "30%", height: 24, borderRadius: 12 }}
            />
          </View>

          <View
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 24,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <View className="flex-row items-center mb-4">
              <ShimmerBlock
                isDark={isDark}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  marginRight: 16,
                }}
              />
              <View className="flex-1">
                <ShimmerBlock
                  isDark={isDark}
                  style={{
                    width: "60%",
                    height: 20,
                    borderRadius: 10,
                    marginBottom: 8,
                  }}
                />
                <ShimmerBlock
                  isDark={isDark}
                  style={{ width: "40%", height: 16, borderRadius: 8 }}
                />
              </View>
              <ShimmerBlock
                isDark={isDark}
                style={{ width: 60, height: 24, borderRadius: 12 }}
              />
            </View>

            <View
              style={{
                borderTopWidth: 1,
                borderTopColor: colors.border,
                paddingTop: 16,
              }}
            >
              <View className="flex-row flex-wrap -mx-2">
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} className="w-1/2 px-2 mb-3">
                    <View className="flex-row items-center">
                      <ShimmerBlock
                        isDark={isDark}
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          marginRight: 8,
                        }}
                      />
                      <ShimmerBlock
                        isDark={isDark}
                        style={{ width: "60%", height: 12, borderRadius: 6 }}
                      />
                    </View>
                    <ShimmerBlock
                      isDark={isDark}
                      style={{
                        width: "80%",
                        height: 14,
                        borderRadius: 7,
                        marginTop: 4,
                      }}
                    />
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Specifications Skeleton */}
        <View className="mb-6">
          <View className="flex-row items-center mb-4">
            <ShimmerBlock
              isDark={isDark}
              style={{ width: 6, height: 24, borderRadius: 3, marginRight: 12 }}
            />
            <ShimmerBlock
              isDark={isDark}
              style={{ width: "35%", height: 24, borderRadius: 12 }}
            />
          </View>

          <View
            className="rounded-3xl overflow-hidden"
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                className="flex-row items-center py-4 px-5"
                style={
                  i !== 3
                    ? { borderBottomWidth: 1, borderBottomColor: colors.border }
                    : {}
                }
              >
                <ShimmerBlock
                  isDark={isDark}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    marginRight: 12,
                  }}
                />
                <ShimmerBlock
                  isDark={isDark}
                  style={{
                    width: "40%",
                    height: 16,
                    borderRadius: 8,
                    marginRight: 16,
                  }}
                />
                <ShimmerBlock
                  isDark={isDark}
                  style={{ width: "30%", height: 16, borderRadius: 8 }}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Enterprise Section Skeleton */}
        <View className="px-6 mb-6">
          <View className="flex-row items-center mb-4">
            <ShimmerBlock
              isDark={isDark}
              style={{ width: 6, height: 24, borderRadius: 3, marginRight: 12 }}
            />
            <ShimmerBlock
              isDark={isDark}
              style={{ width: "40%", height: 24, borderRadius: 12 }}
            />
          </View>

          <View
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 24,
              padding: 20,
            }}
          >
            <View className="flex-row items-center mb-5">
              <ShimmerBlock
                isDark={isDark}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  marginRight: 16,
                }}
              />
              <View className="flex-1">
                <ShimmerBlock
                  isDark={isDark}
                  style={{
                    width: "70%",
                    height: 20,
                    borderRadius: 10,
                    marginBottom: 8,
                  }}
                />
                <ShimmerBlock
                  isDark={isDark}
                  style={{ width: "50%", height: 16, borderRadius: 8 }}
                />
              </View>
            </View>

            <View className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <View key={i} className="flex-row items-center py-3">
                  <ShimmerBlock
                    isDark={isDark}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      marginRight: 12,
                    }}
                  />
                  <View className="flex-1">
                    <ShimmerBlock
                      isDark={isDark}
                      style={{
                        width: "30%",
                        height: 12,
                        borderRadius: 6,
                        marginBottom: 6,
                      }}
                    />
                    <ShimmerBlock
                      isDark={isDark}
                      style={{ width: "60%", height: 14, borderRadius: 7 }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  </View>
);

export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const { notification, hideNotification } = useNotification();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  // Cacher la tab bar
  useLayoutEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: "none" },
    });

    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: undefined,
      });
    };
  }, [navigation]);

  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    type: "toggle_status" | "delete";
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
    onConfirm: () => void;
  } | null>(null);
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  // Référence et variables pour le carrousel d'images
  const imagesListRef = useRef<FlatList<string>>(null);

  // Animation pour le parallax
  const scrollY = useRef(new Animated.Value(0)).current;

  const imageOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT - COMPACT_HEADER_HEIGHT],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const imageTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -HEADER_HEIGHT * 0.6],
    extrapolate: "clamp",
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-HEADER_HEIGHT, 0],
    outputRange: [2, 1],
    extrapolate: "clamp",
  });

  const blurIntensity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT * 0.7],
    outputRange: [0, 50],
    extrapolate: "clamp",
  });

  const compactHeaderTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT - COMPACT_HEADER_HEIGHT],
    outputRange: [-100, 0],
    extrapolate: "clamp",
  });

  const compactHeaderOpacity = scrollY.interpolate({
    inputRange: [TITLE_APPEAR_OFFSET, HEADER_HEIGHT - COMPACT_HEADER_HEIGHT],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const bigTitleOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT * 0.5],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  console.log("🚀 ProductDetails - Product ID:", id);

  const loadProduct = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("📡 Chargement du produit:", id);

      const response: any = await ProductService.getProductById(id);
      console.log(
        "✅ Réponse API complète:",
        JSON.stringify(response, null, 2),
      );

      // Extraire les données du produit de la réponse API
      const productData = response.product || response;
      const enterpriseData = response.enterprise;

      // Si l'enterprise est fournie séparément, l'attacher au produit
      if (enterpriseData && typeof productData.enterprise === "string") {
        productData.enterprise = enterpriseData;
      }

      console.log("✅ Produit traité:", productData.name);
      console.log(
        "📊 Enterprise data:",
        typeof productData.enterprise === "object"
          ? JSON.stringify(productData.enterprise)
          : "ID only",
      );
      setProduct(productData);
    } catch (err: any) {
      console.error("❌ Erreur chargement produit:", err);
      setError(err.message || "Erreur lors du chargement du produit");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id, loadProduct]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadProduct();
    } catch (error) {
      console.error("❌ Erreur refresh:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const showConfirmation = (
    type: "toggle_status" | "delete",
    onConfirm: () => void,
  ) => {
    if (!product) return;

    let title = "";
    let message = "";
    let confirmText = "";
    let confirmColor = "";

    switch (type) {
      case "toggle_status":
        const action = product.isActive
          ? i18n.t("enterprise.productsDetails.status.deactivate")
          : i18n.t("enterprise.productsDetails.status.activate");
        title = `${action.charAt(0).toUpperCase() + action.slice(1)} ${i18n.t("enterprise.productsDetails.sections.enterprise").toLowerCase()}`;
        message = product.isActive
          ? i18n.t(
              "enterprise.productsDetails.modals.confirmation.deactivate.message",
            )
          : i18n.t(
              "enterprise.productsDetails.modals.confirmation.activate.message",
            );
        confirmText = action.charAt(0).toUpperCase() + action.slice(1);
        confirmColor = product.isActive ? "#F59E0B" : "#10B981";
        break;
      case "delete":
        title = i18n.t(
          "enterprise.productsDetails.modals.confirmation.delete.title",
        );
        message = i18n.t(
          "enterprise.productsDetails.modals.confirmation.delete.message",
        );
        confirmText = i18n.t(
          "enterprise.productsDetails.modals.confirmation.delete.confirm",
        );
        confirmColor = "#EF4444";
        break;
    }

    setConfirmationAction({
      type,
      title,
      message,
      confirmText,
      confirmColor,
      onConfirm,
    });
    setConfirmationVisible(true);
  };

  const closeConfirmation = () => {
    setConfirmationVisible(false);
    setConfirmationAction(null);
  };

  const executeConfirmedAction = () => {
    if (confirmationAction?.onConfirm) {
      confirmationAction.onConfirm();
    }
    closeConfirmation();
  };

  const handleToggleStatus = async () => {
    showConfirmation("toggle_status", async () => {
      try {
        console.log(
          "🔄 Changement de statut:",
          product!._id,
          !product!.isActive,
        );
        await ProductService.toggleProductStatus(
          product!._id,
          !product!.isActive,
        );
        setProduct((prev) =>
          prev ? { ...prev, isActive: !prev.isActive } : null,
        );
        showSuccess(
          product!.isActive
            ? i18n.t("enterprise.productsDetails.toasts.deactivateSuccess")
            : i18n.t("enterprise.productsDetails.toasts.activateSuccess"),
        );
      } catch (error: any) {
        console.error("❌ Erreur changement statut:", error);
        showError(
          i18n.t("enterprise.productsDetails.toasts.error"),
          error.message ||
            i18n.t("enterprise.productsDetails.toasts.errorMessage"),
        );
      }
    });
  };

  const handleDeleteProduct = async () => {
    showConfirmation("delete", async () => {
      try {
        console.log("🗑️ Suppression du produit:", product!._id);
        await ProductService.deleteProduct(product!._id);
        showSuccess(i18n.t("enterprise.productsDetails.toasts.deleteSuccess"));
        router.back();
      } catch (error: any) {
        console.error("❌ Erreur suppression:", error);
        showError(
          i18n.t("enterprise.productsDetails.toasts.error"),
          error.message ||
            i18n.t("enterprise.productsDetails.toasts.errorMessage"),
        );
      }
    });
  };

  // Hook pour les toasts
  const { showSuccess, showError } = useToast();

  // Utilitaires
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  // États d'affichage
  if (loading) {
    return <SkeletonProduct colors={colors} isDark={isDark} />;
  }

  if (error || !product) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.secondary,
          paddingTop: insets.top,
        }}
      >
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="warning" size={64} color="#EF4444" />
          <Text
            className="text-xl font-quicksand-bold mt-4 text-center"
            style={{ color: colors.textPrimary }}
          >
            {i18n.t("enterprise.productsDetails.error.title")}
          </Text>
          <Text
            className="font-quicksand-regular mt-2 text-center"
            style={{ color: colors.textSecondary }}
          >
            {i18n.t("enterprise.productsDetails.error.message")}
          </Text>
          <TouchableOpacity
            onPress={loadProduct}
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 16,
            }}
          >
            <Text className="text-white font-quicksand-semibold">
              {i18n.t("enterprise.productsDetails.error.retry")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} className="mt-4">
            <Text style={{ color: colors.textSecondary, fontWeight: "500" }}>
              {i18n.t("enterprise.productsDetails.error.back")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: colors.card }]}>
      <ExpoStatusBar
        style={isDark ? "light" : "dark"}
        translucent
        backgroundColor="transparent"
      />

      {/* Compact Header (Appears on scroll) */}
      <Animated.View
        style={[
          styles.compactHeaderContainer,
          {
            paddingTop: insets.top,
            height: COMPACT_HEADER_HEIGHT,
            opacity: compactHeaderOpacity,
            transform: [{ translateY: compactHeaderTranslateY }],
          },
        ]}
        pointerEvents="box-none"
      >
        <BlurView
          intensity={100}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.compactHeaderContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 justify-center items-center"
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={isDark ? "#FFF" : "#000"}
            />
          </TouchableOpacity>

          <Text
            style={[styles.compactTitle, { color: isDark ? "#FFF" : "#000" }]}
            className="font-quicksand-bold"
            numberOfLines={1}
          >
            {product.name}
          </Text>

          <View style={{ flexDirection: "row" }}>
            <TouchableOpacity
              onPress={async () => {
                try {
                  await Share.share({
                    message: (product
                      ? `${product.name} • ${formatPrice(product.price)}\n${createPublicProductShareUrl(product._id)}`
                      : i18n.t(
                          "enterprise.productsDetails.share.defaultMessage",
                        )) as string,
                  });
                } catch {}
              }}
              className="w-10 h-10 justify-center items-center mr-1"
            >
              <Ionicons
                name="share-social-outline"
                size={22}
                color={isDark ? "#FFF" : "#000"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              className="w-10 h-10 justify-center items-center"
              onPress={() => setImageModalVisible(true)}
            >
              <Ionicons
                name="images-outline"
                size={22}
                color={isDark ? "#FFF" : "#000"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Fixed Back Button (visible initially) */}
      <Animated.View
        style={{
          position: "absolute",
          top: insets.top + 10,
          left: 16,
          zIndex: 900,
          opacity: scrollY.interpolate({
            inputRange: [0, HEADER_HEIGHT - COMPACT_HEADER_HEIGHT - 20],
            outputRange: [1, 0],
            extrapolate: "clamp",
          }),
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-black/30 rounded-full justify-center items-center"
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        style={{
          position: "absolute",
          top: insets.top + 10,
          right: 16,
          zIndex: 900,
          flexDirection: "row",
          opacity: scrollY.interpolate({
            inputRange: [0, HEADER_HEIGHT - COMPACT_HEADER_HEIGHT - 20],
            outputRange: [1, 0],
            extrapolate: "clamp",
          }),
        }}
      >
        <TouchableOpacity
          onPress={async () => {
            try {
              await Share.share({
                message: (product
                  ? `${product.name} • ${formatPrice(product.price)}\n${createPublicProductShareUrl(product._id)}`
                  : "Voir ce produit") as string,
              });
            } catch {}
          }}
          className="w-10 h-10 bg-black/30 rounded-full justify-center items-center mr-2"
        >
          <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          className="w-10 h-10 bg-black/30 rounded-full justify-center items-center"
          onPress={() => setImageModalVisible(true)}
        >
          <Ionicons name="images-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* Parallax Header Background */}
      <View style={styles.headerWrapper} pointerEvents="none">
        <AnimatedImage
          source={{ uri: product.images?.[0] }}
          style={[
            styles.headerImage,
            {
              opacity: imageOpacity,
              transform: [
                { translateY: imageTranslateY },
                { scale: imageScale },
              ],
            },
          ]}
          contentFit="cover"
        />

        <AnimatedBlurView
          intensity={blurIntensity}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
        />

        <Animated.View
          style={[
            styles.bigTitleContainer,
            { opacity: bigTitleOpacity, paddingBottom: 40 },
          ]}
        >
          <Text style={styles.bigTitle} className="font-quicksand-bold">
            {product.name}
          </Text>
          <Text style={styles.subTitle} className="font-quicksand-medium">
            {typeof product.category === "object" && product.category?.name
              ? product.category.name
              : "Produit"}{" "}
            • {formatPrice(product.price)}
          </Text>
        </Animated.View>
      </View>

      {/* Scrollable Content */}
      <Animated.ScrollView
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            progressViewOffset={HEADER_HEIGHT}
          />
        }
      >
        <View
          style={[styles.contentContainer, { backgroundColor: colors.card }]}
        >
          {/* Thumbnails */}
          {product.images.length > 1 && (
            <View className="mt-6 mb-2">
              <FlatList
                ref={imagesListRef}
                data={product.images}
                horizontal
                keyExtractor={(item, index) => `thumb-${index}`}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item, index }) => {
                  const active = index === currentImageIndex;
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        setCurrentImageIndex(index);
                      }}
                      className="mr-3"
                      activeOpacity={0.8}
                    >
                      <ExpoImage
                        source={{ uri: item }}
                        style={{
                          width: 70,
                          height: 70,
                          borderRadius: 16,
                          borderWidth: active ? 2 : 0,
                          borderColor: active ? "#10B981" : "transparent",
                        }}
                        className={!active ? "opacity-70" : ""}
                        contentFit="cover"
                        transition={200}
                      />
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={{ paddingHorizontal: 0 }}
              />
            </View>
          )}

          {/* Price & Status Section */}
          <View className="mt-4 mb-6 flex-row items-center justify-between">
            <View>
              <Text
                style={{ color: colors.textSecondary }}
                className="text-sm font-quicksand-medium mb-1"
              >
                Prix de vente
              </Text>
              <Text className="text-3xl font-quicksand-bold text-emerald-600">
                {formatPrice(product.price)}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleToggleStatus}
              style={{
                backgroundColor: product.isActive
                  ? "rgba(16, 185, 129, 0.1)"
                  : "rgba(239, 68, 68, 0.1)",
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: product.isActive
                  ? "rgba(16, 185, 129, 0.2)"
                  : "rgba(239, 68, 68, 0.2)",
              }}
              className="flex-row items-center"
            >
              <View
                className={`w-2 h-2 rounded-full mr-2 ${product.isActive ? "bg-emerald-500" : "bg-red-500"}`}
              />
              <Text
                style={{
                  color: product.isActive ? "#10B981" : "#EF4444",
                  fontWeight: "700",
                  fontSize: 14,
                }}
              >
                {product.isActive
                  ? i18n.t("enterprise.productsDetails.status.active")
                  : i18n.t("enterprise.productsDetails.status.inactive")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Description Section */}
          <View className="mb-8">
            <Text
              style={{ color: colors.textPrimary }}
              className="text-lg font-quicksand-bold mb-3"
            >
              Description
            </Text>
            <View
              style={{
                backgroundColor: isDark ? colors.tertiary : colors.secondary,
              }}
              className="p-5 rounded-2xl"
            >
              <Text
                style={{ color: colors.textSecondary }}
                className="font-quicksand-medium leading-7 text-base"
                numberOfLines={showFullDescription ? undefined : 4}
              >
                {product.description}
              </Text>
              {product.description && product.description.length > 150 && (
                <TouchableOpacity
                  onPress={() => setShowFullDescription(!showFullDescription)}
                  className="mt-3 self-start"
                >
                  <Text style={{ color: colors.primary, fontWeight: "700" }}>
                    {showFullDescription
                      ? i18n.t("enterprise.productsDetails.description.seeLess")
                      : i18n.t(
                          "enterprise.productsDetails.description.seeMore",
                        )}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Specifications Section */}
          {product.specifications && product.specifications.length > 0 && (
            <View className="mb-8">
              <Text
                style={{ color: colors.textPrimary }}
                className="text-lg font-quicksand-bold mb-4"
              >
                {i18n.t("enterprise.productsDetails.sections.specifications")}
              </Text>

              <View
                style={{
                  backgroundColor: colors.card,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 3,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
                className="rounded-3xl overflow-hidden"
              >
                {product.specifications.map((spec: any, index: number) => (
                  <View
                    key={index}
                    className="flex-row items-center py-4 px-5"
                    style={{
                      borderBottomWidth:
                        index !== product.specifications.length - 1 ? 1 : 0,
                      borderBottomColor: colors.border,
                      backgroundColor:
                        index % 2 === 0
                          ? "transparent"
                          : isDark
                            ? "rgba(255,255,255,0.02)"
                            : "rgba(0,0,0,0.01)",
                    }}
                  >
                    <Text
                      className="flex-1 font-quicksand-medium text-base"
                      style={{ color: colors.textSecondary }}
                    >
                      {String(spec.key)}
                    </Text>
                    <Text
                      className="font-quicksand-bold text-base"
                      style={{ color: colors.textPrimary }}
                    >
                      {String(spec.value)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Enterprise Info (Preview) */}
          <View className="mb-8">
            <Text
              style={{ color: colors.textPrimary }}
              className="text-lg font-quicksand-bold mb-4"
            >
              {i18n.t("enterprise.productsDetails.sections.enterprise")}
            </Text>

            <View
              style={{
                backgroundColor: isDark ? colors.tertiary : colors.secondary,
                borderRadius: 24,
                padding: 20,
              }}
            >
              <View className="flex-row items-center mb-5">
                <View className="p-1 rounded-2xl bg-white dark:bg-neutral-800 shadow-sm">
                  {typeof product.enterprise === "object" &&
                  product.enterprise.logo ? (
                    <Image
                      source={{ uri: product.enterprise.logo }}
                      className="w-14 h-14 rounded-xl"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-14 h-14 rounded-xl bg-emerald-50 items-center justify-center">
                      <Ionicons name="storefront" size={24} color="#10B981" />
                    </View>
                  )}
                </View>

                <View className="flex-1 ml-4">
                  <Text
                    className="font-quicksand-bold text-lg mb-1"
                    style={{ color: colors.textPrimary }}
                  >
                    {typeof product.enterprise === "object" &&
                    product.enterprise.companyName
                      ? product.enterprise.companyName
                      : "Votre Entreprise"}
                  </Text>
                  <View className="flex-row items-center">
                    <Ionicons name="location-sharp" size={12} color="#10B981" />
                    <Text
                      style={{ color: colors.textSecondary }}
                      className="text-xs ml-1 font-quicksand-medium"
                    >
                      {typeof product.enterprise === "object" &&
                      product.enterprise.location
                        ? `${product.enterprise.location.city}, ${product.enterprise.location.district}`
                        : i18n.t(
                            "enterprise.productsDetails.enterpriseInfo.notSpecified",
                          )}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons - Fixed at bottom or inline? Inline is better for scrolling content */}
          <View className="pb-8 pt-2">
            <Text
              style={{ color: colors.textPrimary }}
              className="text-lg font-quicksand-bold mb-4"
            >
              Actions rapides
            </Text>

            <View className="flex-row gap-3">
              {/* Status Toggle Button */}
              <TouchableOpacity
                onPress={handleToggleStatus}
                className={`flex-1 py-4 rounded-2xl flex-row items-center justify-center border ${
                  product.isActive
                    ? "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30"
                    : "bg-neutral-50 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700"
                }`}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={product.isActive ? "eye" : "eye-off"}
                  size={20}
                  color={product.isActive ? "#10B981" : colors.textSecondary}
                />
                <Text
                  style={{
                    color: product.isActive ? "#10B981" : colors.textSecondary,
                  }}
                  className="ml-2 text-base font-quicksand-bold"
                >
                  {product.isActive ? "Produit visible" : "Produit masqué"}
                </Text>
              </TouchableOpacity>

              {/* Delete Button */}
              <TouchableOpacity
                onPress={handleDeleteProduct}
                style={{
                  width: 60,
                  backgroundColor: "#EF4444",
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Image Viewer Modal */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View className="flex-1 bg-black/95">
          <View
            className="absolute top-0 left-0 right-0 z-50"
            style={{ paddingTop: insets.top + 8 }}
          >
            <View className="flex-row justify-between items-center px-4 pb-2">
              <TouchableOpacity
                onPress={() => {
                  // Petit délai pour éviter les conflits de gestes sur iOS
                  setTimeout(() => setImageModalVisible(false), 50);
                }}
                onPressIn={() => {}}
                activeOpacity={0.7}
                className="w-12 h-12 bg-white/20 rounded-full justify-center items-center"
                style={{ zIndex: 60 }}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text className="text-white font-quicksand-medium">
                {`${currentImageIndex + 1}/${product.images.length}`}
              </Text>
              <View className="w-12" />
            </View>
          </View>

          <FlatList
            data={product.images}
            renderItem={({ item }) => (
              <View
                style={{
                  width: screenWidth,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ExpoImage
                  source={{ uri: item }}
                  style={{ width: screenWidth, height: screenWidth }}
                  contentFit="contain"
                  transition={300}
                />
              </View>
            )}
            keyExtractor={(item, index) => `full-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={currentImageIndex}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(
                e.nativeEvent.contentOffset.x / screenWidth,
              );
              setCurrentImageIndex(newIndex);
            }}
            onScrollToIndexFailed={({ index }) => {
              setTimeout(() => {}, 100);
            }}
          />
        </View>
      </Modal>

      {/* Modal de confirmation */}
      <Modal
        visible={confirmationVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeConfirmation}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-6">
          <View
            className="rounded-3xl p-6 w-full max-w-sm"
            style={{ backgroundColor: colors.card }}
          >
            <View className="items-center mb-4">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-3"
                style={{
                  backgroundColor: confirmationAction?.confirmColor + "20",
                }}
              >
                <Ionicons
                  name={
                    confirmationAction?.type === "delete" ? "trash" : "power"
                  }
                  size={28}
                  color={confirmationAction?.confirmColor}
                />
              </View>
              <Text
                className="text-xl font-quicksand-bold text-center"
                style={{ color: colors.textPrimary }}
              >
                {confirmationAction?.title}
              </Text>
            </View>

            <Text
              className="text-base font-quicksand-medium mb-6 text-center"
              style={{ color: colors.textSecondary }}
            >
              {confirmationAction?.message}
            </Text>

            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 rounded-2xl py-4"
                style={{ backgroundColor: colors.secondary }}
                onPress={closeConfirmation}
              >
                <Text
                  className="font-quicksand-bold text-center text-base"
                  style={{ color: colors.textPrimary }}
                >
                  {i18n.t(
                    "enterprise.productsDetails.modals.confirmation.delete.cancel",
                  )}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 rounded-2xl py-4"
                style={{ backgroundColor: confirmationAction?.confirmColor }}
                onPress={executeConfirmedAction}
              >
                <Text className="text-white font-quicksand-bold text-center text-base">
                  {confirmationAction?.confirmText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <NotificationModal
        visible={notification?.visible || false}
        type={notification?.type || "info"}
        title={notification?.title || ""}
        message={notification?.message || ""}
        onClose={hideNotification}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  compactHeaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "flex-end",
    paddingBottom: 10,
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  compactHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  compactTitle: {
    color: "#fff",
    fontSize: 18,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
  },
  headerWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  headerImage: {
    width: screenWidth,
    height: HEADER_HEIGHT + 100,
    position: "absolute",
  },
  bigTitleContainer: {
    position: "absolute",
    bottom: 0,
    left: 20,
    right: 20,
    justifyContent: "flex-end",
  },
  bigTitle: {
    color: "#fff",
    fontSize: 32,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    marginBottom: 4,
  },
  subTitle: {
    color: "#eee",
    fontSize: 16,
    opacity: 0.9,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    minHeight: screenHeight,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
});
