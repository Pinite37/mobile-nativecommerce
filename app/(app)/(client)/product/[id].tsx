import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Modal,
  Platform,
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
} from "../../../../components/ui/NotificationModal";
import { useAuth } from "../../../../contexts/AuthContext";
import { useLocale } from "../../../../contexts/LocaleContext";
import { useTheme } from "../../../../contexts/ThemeContext";
import i18n from "../../../../i18n/i18n";
import MessagingService from "../../../../services/api/MessagingService";
import ProductService from "../../../../services/api/ProductService";
import { Product } from "../../../../types/product";
import { createPublicProductShareUrl } from "../../../../utils/AppLinks";
import {
  openPhoneCall,
  openWebsiteUrl,
  openWhatsAppChat,
} from "../../../../utils/ContactLinks";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const HEADER_HEIGHT = Math.round(screenHeight * 0.45);
const COMPACT_HEADER_HEIGHT = 100;
const TITLE_APPEAR_OFFSET = HEADER_HEIGHT - COMPACT_HEADER_HEIGHT - 50;

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const AnimatedImage = Animated.createAnimatedComponent(ExpoImage);

export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const { locale } = useLocale();
  const { colors, isDark } = useTheme();
  const { notification, showNotification, hideNotification } =
    useNotification();
  const imagesListRef = useRef<FlatList<string>>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const requireAuth = (
    message: string = "Connectez-vous pour utiliser cette fonctionnalite.",
  ) => {
    if (isAuthenticated) return true;

    showNotification("warning", "Connexion requise", message);
    setTimeout(() => {
      router.push("/(auth)/signin");
    }, 150);
    return false;
  };

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

  useEffect(() => {
    const loadProductDetails = async () => {
      try {
        setLoading(true);
        const productData = await ProductService.getPublicProductById(id!);
        console.log("✅ Produit chargé:", JSON.stringify(productData, null, 2));
        setProduct(productData);

        // Vérifier le statut favori uniquement pour un utilisateur connecté
        if (isAuthenticated) {
          const favoriteStatus = await ProductService.checkIfProductIsFavorite(
            id!,
          );
          setIsFavorite(favoriteStatus);
        } else {
          setIsFavorite(false);
        }

        // Charger les produits similaires après avoir chargé le produit principal
        loadSimilarProducts(id!);
      } catch (error) {
        console.error("❌ Erreur chargement détails produit:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProductDetails();
    }
  }, [id, isAuthenticated]);

  const loadSimilarProducts = async (productId: string) => {
    try {
      setLoadingSimilar(true);
      const response = await ProductService.getSimilarProducts(productId, 6);
      setSimilarProducts(response.similarProducts);
      console.log(
        "✅ Produits similaires chargés:",
        response.similarProducts.length,
      );
    } catch (error) {
      console.error("❌ Erreur chargement produits similaires:", error);
      setSimilarProducts([]);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const toggleFavorite = async () => {
    if (
      !requireAuth("Connectez-vous pour ajouter ce produit a vos favoris.")
    ) {
      return;
    }

    try {
      if (isFavorite) {
        await ProductService.removeProductFromFavorites(id!);
        showNotification(
          "info",
          i18n.t("client.product.favorites.title"),
          i18n.t("client.product.favorites.removed"),
        );
      } else {
        await ProductService.addProductToFavorites(id!);
        showNotification(
          "success",
          i18n.t("client.product.favorites.title"),
          i18n.t("client.product.favorites.added"),
        );
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error("❌ Erreur lors de la mise à jour des favoris:", error);
      showNotification(
        "error",
        "Erreur",
        i18n.t("client.product.favorites.error"),
      );
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  // Composant pour une carte de produit similaire
  const SimilarProductCard = ({
    product: similarProduct,
  }: {
    product: Product;
  }) => (
    <TouchableOpacity
      className="rounded-xl mr-4 overflow-hidden"
      style={{
        width: 140,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
      onPress={() => {
        router.push(`/(app)/(client)/product/${similarProduct._id}`);
      }}
    >
      <View className="relative">
        <ExpoImage
          source={{
            uri:
              similarProduct.images[0] ||
              "https://via.placeholder.com/140x100/CCCCCC/FFFFFF?text=No+Image",
          }}
          style={{ width: 140, height: 140 }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
        {/* Badge stock si faible */}
        {/* {similarProduct.stock <= 5 && similarProduct.stock > 0 && (
          <View className="absolute top-2 left-2 bg-warning-500 rounded-full px-2 py-1">
            <Text className="text-white text-xs font-quicksand-bold">
              {similarProduct.stock} {i18n.t("client.product.stock.remaining")}
            </Text>
          </View>
        )} */}
      </View>

      <View className="p-3">
        <Text
          numberOfLines={2}
          style={{ color: colors.textPrimary }}
          className="text-sm font-quicksand-semibold mb-2 leading-5"
        >
          {similarProduct.name}
        </Text>

        <Text className="text-base font-quicksand-bold text-emerald-600">
          {formatPrice(similarProduct.price)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const openWhatsApp = async (phone: string) => {
    if (
      !requireAuth(
        "Connectez-vous pour contacter une entreprise sur WhatsApp.",
      )
    ) {
      return;
    }

    const message = i18n.t("client.product.whatsapp.message", {
      productName: product?.name,
      price: product ? formatPrice(product.price) : "",
    });

    // Vérifier que le numéro est valide
    if (!phone || phone.trim() === "") {
      showNotification("error", "Erreur", "Numéro de téléphone non disponible");
      return;
    }

    const result = await openWhatsAppChat({ phone, message });

    if (!result.ok) {
      showNotification(
        "warning",
        i18n.t("client.product.whatsapp.notAvailable"),
        i18n.t("client.product.whatsapp.notAvailableMessage"),
      );
      makePhoneCall(phone);
    }
  };

  const makePhoneCall = async (phone: string) => {
    if (
      !requireAuth(
        "Connectez-vous pour contacter une entreprise par telephone.",
      )
    ) {
      return;
    }

    const result = await openPhoneCall(phone);

    if (!result.ok) {
      showNotification(
        "error",
        "Erreur",
        result.reason === "invalid_phone"
          ? "Numéro de téléphone non disponible"
          : i18n.t("client.product.contact.callError"),
      );
    }
  };

  const openWebsite = async (website: string) => {
    const result = await openWebsiteUrl(website);

    if (!result.ok) {
      showNotification("error", "Erreur", "Impossible d'ouvrir le site web");
    }
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
        style={[{ backgroundColor: colors.border, overflow: "hidden" }, style]}
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

  const SkeletonProduct = () => (
    <View className="flex-1" style={{ backgroundColor: "transparent" }}>
      <ExpoStatusBar style="light" translucent backgroundColor="transparent" />

      {/* Header Skeleton */}
      <LinearGradient
        colors={["rgba(0,0,0,0.6)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        className="absolute top-0 left-0 right-0 z-10"
        style={{ paddingTop: insets.top + 16, paddingBottom: 16 }}
      >
        <View className="flex-row items-center justify-between px-4 pb-3">
          <ShimmerBlock style={{ width: 40, height: 40, borderRadius: 20 }} />
          <ShimmerBlock style={{ width: 120, height: 16, borderRadius: 8 }} />
          <View className="flex-row">
            <ShimmerBlock
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                marginRight: 8,
              }}
            />
            <ShimmerBlock style={{ width: 40, height: 40, borderRadius: 20 }} />
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        style={{
          backgroundColor: colors.card,
          marginTop: HEADER_HEIGHT * 0.6,
        }}
        contentInsetAdjustmentBehavior="never"
      >
        {/* Image Skeleton */}
        <View style={{ marginTop: 0 }}>
          <ShimmerBlock style={{ width: "100%", height: 200 }} />
        </View>

        {/* Content Skeleton */}
        <View
          style={{ backgroundColor: colors.card }}
          className="px-6 py-6 rounded-t-3xl -mt-6"
        >
          {/* ... skeleton content ... */}
          <ShimmerBlock
            style={{
              width: "30%",
              height: 32,
              borderRadius: 16,
              marginBottom: 12,
            }}
          />
          <ShimmerBlock
            style={{
              width: "80%",
              height: 28,
              borderRadius: 14,
              marginBottom: 8,
            }}
          />
          <ShimmerBlock
            style={{
              width: "100%",
              height: 16,
              borderRadius: 8,
              marginBottom: 4,
            }}
          />
        </View>
      </ScrollView>
    </View>
  );

  if (loading) {
    return <SkeletonProduct />;
  }

  if (!product) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.card }}>
        <ExpoStatusBar
          style={isDark ? "light" : "dark"}
          translucent
          backgroundColor="transparent"
        />
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text
            style={{ color: colors.textPrimary }}
            className="mt-4 text-xl font-quicksand-bold"
          >
            {i18n.t("client.product.error.notFound")}
          </Text>
          <Text
            style={{ color: colors.textSecondary }}
            className="mt-2 font-quicksand-medium text-center"
          >
            {i18n.t("client.product.error.notFoundMessage")}
          </Text>
          <TouchableOpacity
            className="mt-6 bg-primary-500 rounded-2xl px-6 py-3"
            onPress={() => router.back()}
          >
            <Text className="text-white font-quicksand-semibold">
              {i18n.t("client.product.error.back")}
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
          tint="light"
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.compactHeaderContent}>
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 justify-center items-center"
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>

          <Text
            style={[styles.compactTitle, { color: "#000" }]}
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
                    message:
                      product && product.name
                        ? `${product.name} • ${formatPrice(product.price)}\n${createPublicProductShareUrl(product._id)}`
                        : (i18n.t("client.product.share.message") ??
                          "Voir ce produit"),
                  });
                } catch {}
              }}
              className="w-10 h-10 justify-center items-center mr-1"
            >
              <Ionicons name="share-social-outline" size={22} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleFavorite}
              className="w-10 h-10 justify-center items-center mr-1"
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={22}
                color={isFavorite ? "#EF4444" : "#000"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              className="w-10 h-10 justify-center items-center"
              onPress={() => setImageModalVisible(true)}
            >
              <Ionicons name="images-outline" size={22} color="#000" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Fixed Back Button (Always visible initially, fades out or stays?) 
          Actually, the design usually has a back button that stays or transforms. 
          In the user's snippet, there is a back button in the compact header and one likely in the big header.
          Let's keep a back button always accessible or cross-fade.
      */}
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
                message: product
                  ? `${product.name} • ${formatPrice(product.price)}\n${createPublicProductShareUrl(product._id)}`
                  : (i18n.t("enterprise.productDetails.share.defaultMessage") ??
                    "Voir ce produit"),
              });
            } catch {}
          }}
          className="w-10 h-10 bg-black/30 rounded-full justify-center items-center mr-2"
        >
          <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={toggleFavorite}
          className="w-10 h-10 bg-black/30 rounded-full justify-center items-center mr-2"
        >
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={20}
            color={isFavorite ? "#EF4444" : "#FFFFFF"}
          />
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
      >
        <View
          style={[styles.contentContainer, { backgroundColor: colors.card }]}
        >
          {/* Thumbnails */}
          {product.images.length > 1 && (
            <View className="mt-4 mb-6">
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
                        imagesListRef.current?.scrollToIndex({
                          index,
                          animated: true,
                        });
                      }}
                      className="mr-3"
                    >
                      <ExpoImage
                        source={{ uri: item }}
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 12,
                          borderWidth: active ? 2 : 1,
                          borderColor: active ? "#FE8C00" : "#E5E7EB",
                        }}
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

          {/* Price and Description */}
          <View className="mb-6">
            <Text className="text-3xl font-quicksand-bold text-primary-600 mb-2">
              {formatPrice(product.price)}
            </Text>
            <Text
              style={{ color: colors.textSecondary }}
              className="font-quicksand-medium leading-6"
            >
              {product.description}
            </Text>
          </View>

          {/* Enterprise Section */}
          <View
            style={{
              backgroundColor: colors.secondary,
              borderColor: colors.border,
            }}
            className="p-4 border rounded-2xl mb-6"
          >
            <Text
              style={{ color: colors.textPrimary }}
              className="text-lg font-quicksand-bold mb-3"
            >
              {i18n.t("client.product.enterprise.title")}
            </Text>
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => {
                if (
                  typeof product.enterprise === "object" &&
                  product.enterprise._id
                ) {
                  router.push(
                    `/(app)/(client)/enterprise/${product.enterprise._id}`,
                  );
                }
              }}
            >
              {typeof product.enterprise === "object" &&
              product.enterprise.logo ? (
                <Image
                  source={{ uri: product.enterprise.logo }}
                  className="w-14 h-14 rounded-2xl"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-14 h-14 bg-primary-100 rounded-2xl justify-center items-center">
                  <Ionicons name="storefront" size={24} color="#FE8C00" />
                </View>
              )}
              <View className="ml-4 flex-1">
                <Text
                  style={{ color: colors.textPrimary }}
                  className="text-lg font-quicksand-bold"
                >
                  {typeof product.enterprise === "object"
                    ? product.enterprise.companyName
                    : product.enterprise}
                </Text>
                {typeof product.enterprise === "object" &&
                  product.enterprise.location && (
                    <Text
                      style={{ color: colors.textSecondary }}
                      className="text-sm mt-1"
                    >
                      📍 {product.enterprise.location.city},{" "}
                      {product.enterprise.location.district}
                    </Text>
                  )}
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Contact Options */}
            {typeof product.enterprise === "object" &&
              (product.enterprise.contactInfo?.phone ||
                product.enterprise.contactInfo?.website) && (
                <View
                  style={{ borderTopColor: colors.border }}
                  className="mt-4 pt-4 border-t"
                >
                  <Text
                    style={{ color: colors.textSecondary }}
                    className="text-sm font-quicksand-bold mb-3 uppercase tracking-wider"
                  >
                    {i18n.t("client.enterprise.contact.title")}
                  </Text>
                  <View className="flex-row flex-wrap -mx-1">
                    {typeof product.enterprise === "object" &&
                      product.enterprise.contactInfo?.phone && (
                        <>
                          <TouchableOpacity
                            onPress={() =>
                              typeof product.enterprise === "object" &&
                              product.enterprise.contactInfo?.phone
                                ? openWhatsApp(
                                    product.enterprise.contactInfo.phone,
                                  )
                                : undefined
                            }
                            style={{
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            }}
                            className="flex-1 rounded-xl px-3 py-3 m-1 flex-row items-center justify-center border shadow-sm"
                          >
                            <Ionicons
                              name="logo-whatsapp"
                              size={18}
                              color="#10B981"
                            />
                            <Text
                              style={{ color: colors.textPrimary }}
                              className="ml-2 font-quicksand-bold text-sm"
                            >
                              WhatsApp
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              typeof product.enterprise === "object" &&
                              product.enterprise.contactInfo?.phone
                                ? makePhoneCall(
                                    product.enterprise.contactInfo.phone,
                                  )
                                : undefined
                            }
                            style={{
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                            }}
                            className="flex-1 rounded-xl px-3 py-3 m-1 flex-row items-center justify-center border shadow-sm"
                          >
                            <Ionicons name="call" size={18} color="#FE8C00" />
                            <Text
                              style={{ color: colors.textPrimary }}
                              className="ml-2 font-quicksand-bold text-sm"
                            >
                              {i18n.t("client.enterprise.contact.call")}
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                  </View>
                </View>
              )}

            {/* Faire une offre */}
            <TouchableOpacity
              onPress={async () => {
                if (
                  !requireAuth("Connectez-vous pour demarrer une conversation.")
                ) {
                  return;
                }

                try {
                  const conversation =
                    await MessagingService.createConversationForProduct(id!);
                  router.push(
                    `/(app)/(client)/conversation/${conversation._id}`,
                  );
                } catch (error) {
                  console.error("Erreur création conversation:", error);
                  showNotification(
                    "error",
                    "Erreur",
                    "Impossible de créer la conversation",
                  );
                }
              }}
              className="bg-amber-100 rounded-xl py-3 flex-row items-center justify-center mt-4"
            >
              <Ionicons name="chatbubbles" size={18} color="#D97706" />
              <Text className="ml-2 text-amber-800 font-quicksand-bold text-sm">
                {i18n.t("client.product.actions.negotiate")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Similar Products */}
          {(similarProducts.length > 0 || loadingSimilar) && (
            <View
              style={{ borderTopColor: colors.border }}
              className="py-4 border-t"
            >
              <View className="flex-row justify-between items-center mb-4">
                <Text
                  style={{ color: colors.textPrimary }}
                  className="text-xl font-quicksand-bold"
                >
                  {i18n.t("client.product.similar.title")}
                </Text>
              </View>
              {loadingSimilar ? (
                <ActivityIndicator size="small" color="#FE8C00" />
              ) : (
                <FlatList
                  data={similarProducts}
                  renderItem={({ item }) => (
                    <SimilarProductCard product={item} />
                  )}
                  keyExtractor={(item) => item._id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 8 }}
                />
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
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
            className="absolute top-0 left-0 right-0"
            style={{ paddingTop: insets.top + 8, zIndex: 10 }}
          >
            <View className="flex-row justify-between items-center px-4 pb-2">
              <TouchableOpacity
                onPress={() => setImageModalVisible(false)}
                className="w-10 h-10 bg-white/15 rounded-full justify-center items-center"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text className="text-white font-quicksand-medium">
                {currentImageIndex + 1}/{product.images.length}
              </Text>
              <View className="w-10" />
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
                  height: screenHeight,
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
    elevation: 10, // Pour Android
    shadowColor: "#000", // Pour iOS
    shadowOffset: { width: 0, height: 4 }, // Pour iOS
    shadowOpacity: 0.3, // Pour iOS
    shadowRadius: 4, // Pour iOS
    backgroundColor: "rgba(255,255,255,0.8)", // Fallback plus clair
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
    // fontWeight: "700", // Removed in favor of font-quicksand-bold
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
    // fontWeight: "900", // Removed in favor of font-quicksand-bold
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    marginBottom: 4,
  },
  subTitle: {
    color: "#eee",
    fontSize: 16,
    // fontWeight: '600', // Removed in favor of font-quicksand-medium
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
    marginTop: -20, // Overlap slightly
  },
  bottomActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 30 : 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
});
