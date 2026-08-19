import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Shimmer } from "../../../../components/ui/Shimmer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NotificationModal, {
  useNotification,
} from "../../../../components/ui/NotificationModal";
import { useLocale } from "../../../../contexts/LocaleContext";
import { useTheme } from "../../../../contexts/ThemeContext";
import { ErrorState } from "../../../../components/ui/ErrorState";
import i18n from "../../../../i18n/i18n";
import FollowService from "../../../../services/api/FollowService";
import MessagingService from "../../../../services/api/MessagingService";
import ProductService from "../../../../services/api/ProductService";
import { Product } from "../../../../types/product";
import { createPublicProductShareUrl } from "../../../../utils/AppLinks";
import {
  openPhoneCall,
  openWhatsAppChat,
} from "../../../../utils/ContactLinks";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const HEADER_HEIGHT = Math.round(screenHeight * 0.45);
const COMPACT_HEADER_HEIGHT = 100;
const TITLE_APPEAR_OFFSET = HEADER_HEIGHT - COMPACT_HEADER_HEIGHT - 50;

const AnimatedImage = Animated.createAnimatedComponent(ExpoImage);

export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useLocale();
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
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      scrollY.value = event.contentOffset.y;
    },
  });

  const imageStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HEADER_HEIGHT - COMPACT_HEADER_HEIGHT], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(scrollY.value, [0, HEADER_HEIGHT], [0, -HEADER_HEIGHT * 0.6], Extrapolation.CLAMP) },
      { scale: interpolate(scrollY.value, [-HEADER_HEIGHT, 0], [2, 1], Extrapolation.CLAMP) },
    ],
  }));

  const overlayOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HEADER_HEIGHT * 0.7], [0, 0.45], Extrapolation.CLAMP),
  }));

  const compactHeaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [TITLE_APPEAR_OFFSET, HEADER_HEIGHT - COMPACT_HEADER_HEIGHT], [0, 1], Extrapolation.CLAMP),
  }));

  const bigTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HEADER_HEIGHT * 0.5], [1, 0], Extrapolation.CLAMP),
  }));

  const floatingBackStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HEADER_HEIGHT - COMPACT_HEADER_HEIGHT - 20], [1, 0], Extrapolation.CLAMP),
  }));

  const floatingActionsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, HEADER_HEIGHT - COMPACT_HEADER_HEIGHT - 20], [1, 0], Extrapolation.CLAMP),
  }));

  useEffect(() => {
    const loadProductDetails = async () => {
      try {
        setLoading(true);
        const productData = await ProductService.getPublicProductById(id!);
        console.log("✅ Produit chargé:", JSON.stringify(productData, null, 2));
        setProduct(productData);

        // Charger le statut d'abonnement à l'enterprise du produit
        const eid = typeof productData.enterprise === "object" ? productData.enterprise._id : productData.enterprise;
        if (eid) {
          FollowService.getStatus(eid).then(s => {
            setIsFollowing(s.isFollowing);
            setFollowerCount(s.followerCount);
          }).catch(() => {});
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
  }, [id]);

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

  const handleToggleFollow = async () => {
    const eid = typeof product?.enterprise === "object" ? product.enterprise._id : product?.enterprise;
    if (!eid) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        const res = await FollowService.unfollow(eid);
        setIsFollowing(false);
        setFollowerCount(res.followerCount);
      } else {
        const res = await FollowService.follow(eid);
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

  // Composant pour une carte de produit similaire
  const SimilarProductCard = ({
    product: similarProduct,
  }: {
    product: Product;
  }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={{
        width: 152,
        marginRight: 12,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: colors.card,
      }}
      onPress={() => {
        router.push(`/(app)/(enterprise)/product/${similarProduct._id}`);
      }}
    >
      <ExpoImage
        source={{
          uri:
            similarProduct.images[0] ||
            "https://via.placeholder.com/152x120/F3F4F6/9CA3AF?text=AXI",
        }}
        style={{ width: 152, height: 110 }}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
      <View style={{ padding: 10 }}>
        <Text
          numberOfLines={2}
          style={{ color: colors.textPrimary, fontSize: 12, lineHeight: 17, marginBottom: 6 }}
          className="font-quicksand-semibold"
        >
          {similarProduct.name}
        </Text>
        <Text style={{ color: "#10B981", fontSize: 13 }} className="font-quicksand-bold">
          {formatPrice(similarProduct.price)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const openWhatsApp = async (phone: string) => {
    const message = `Bonjour ! Je suis intéressé(e) par votre produit "${
      product?.name
    }" sur Axi. 
    
Prix affiché : ${product ? formatPrice(product.price) : ""}

Pouvez-vous me donner plus d'informations ? Merci !`;

    const result = await openWhatsAppChat({ phone, message });

    if (!result.ok) {
      showNotification(
        "warning",
        i18n.t("enterprise.productDetails.notifications.whatsappNotAvailable"),
        i18n.t(
          "enterprise.productDetails.notifications.whatsappNotAvailableMessage",
        ),
      );
      makePhoneCall(phone);
    }
  };

  const makePhoneCall = async (phone: string) => {
    const result = await openPhoneCall(phone);

    if (!result.ok) {
      showNotification(
        "error",
        i18n.t("enterprise.productDetails.notifications.callError"),
        result.reason === "invalid_phone"
          ? "Numéro de téléphone invalide"
          : i18n.t("enterprise.productDetails.notifications.callErrorMessage"),
      );
    }
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
          <Shimmer style={{ width: 40, height: 40, borderRadius: 20 }} />
          <Shimmer style={{ width: 120, height: 16, borderRadius: 8 }} />
          <View className="flex-row">
            <Shimmer
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                marginRight: 8,
              }}
            />
            <Shimmer style={{ width: 40, height: 40, borderRadius: 20 }} />
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
          <Shimmer style={{ width: "100%", height: 200 }} />
        </View>

        {/* Content Skeleton */}
        <View
          style={{ backgroundColor: colors.card }}
          className="px-6 py-6 rounded-t-3xl -mt-6"
        >
          {/* ... skeleton content ... */}
          <Shimmer
            style={{
              width: "30%",
              height: 32,
              borderRadius: 16,
              marginBottom: 12,
            }}
          />
          <Shimmer
            style={{
              width: "80%",
              height: 28,
              borderRadius: 14,
              marginBottom: 8,
            }}
          />
          <Shimmer
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
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ExpoStatusBar style={isDark ? "light" : "dark"} translucent backgroundColor="transparent" />
        <ErrorState
          variant="notFound"
          title={i18n.t("enterprise.productDetails.notFound.title")}
          message={i18n.t("enterprise.productDetails.notFound.message")}
          onSecondary={() => router.back()}
          secondaryLabel={i18n.t("enterprise.productDetails.notFound.backButton")}
        />
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
          },
          compactHeaderStyle,
        ]}
        pointerEvents="box-none"
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
        )}

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
                        : (i18n.t(
                            "enterprise.productDetails.share.defaultMessage",
                          ) ?? "Voir ce produit"),
                  });
                } catch {}
              }}
              className="w-10 h-10 justify-center items-center mr-1"
            >
              <Ionicons name="share-social-outline" size={22} color="#000" />
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
        style={[
          {
            position: "absolute",
            top: insets.top + 10,
            left: 16,
            zIndex: 900,
          },
          floatingBackStyle,
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-black/30 rounded-full justify-center items-center"
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        style={[
          {
            position: "absolute",
            top: insets.top + 10,
            right: 16,
            zIndex: 900,
            flexDirection: "row",
          },
          floatingActionsStyle,
        ]}
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
          className="w-10 h-10 bg-black/30 rounded-full justify-center items-center"
          onPress={() => setImageModalVisible(true)}
        >
          <Ionicons name="images-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* Parallax Header Background */}
      <View style={styles.headerWrapper} pointerEvents="none">
        <AnimatedImage
          source={{ uri: product.images?.[currentImageIndex] }}
          style={[styles.headerImage, imageStyle]}
          contentFit="cover"
        />

        <Animated.View
          style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000' }, overlayOpacityStyle]}
        />

        <Animated.View
          style={[
            styles.bigTitleContainer,
            { paddingBottom: 40 },
            bigTitleStyle,
          ]}
        >
          <Text style={styles.bigTitle} className="font-quicksand-bold">
            {product.name}
          </Text>
          <Text style={styles.subTitle} className="font-quicksand-medium">
            {typeof product.category === "object" && product.category?.name
              ? product.category.name
              : i18n.t("enterprise.productDetails.category.default")}{" "}
            • {formatPrice(product.price)}
          </Text>
        </Animated.View>
      </View>

      {/* Scrollable Content */}
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT }}
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
          <View style={{ marginBottom: 24 }}>
            {/* Boutique row */}
            <TouchableOpacity
              activeOpacity={0.75}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.secondary,
                borderRadius: 16,
                padding: 14,
                marginBottom: 10,
              }}
              onPress={() => {
                if (
                  typeof product.enterprise === "object" &&
                  product.enterprise._id
                ) {
                  router.push(
                    `/(app)/(enterprise)/(tabs)/enterprise/${product.enterprise._id}`,
                  );
                }
              }}
            >
              {typeof product.enterprise === "object" &&
              product.enterprise.logo ? (
                <Image
                  source={{ uri: product.enterprise.logo }}
                  style={{ width: 48, height: 48, borderRadius: 12 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{
                  width: 48, height: 48, borderRadius: 12,
                  backgroundColor: isDark ? "#2D2D2D" : "#FFF3E0",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Ionicons name="storefront" size={22} color="#FE8C00" />
                </View>
              )}
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 15 }} className="font-quicksand-bold">
                  {typeof product.enterprise === "object"
                    ? product.enterprise.companyName
                    : product.enterprise}
                </Text>
                {typeof product.enterprise === "object" &&
                  product.enterprise.location && (
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
                      <Ionicons name="location-sharp" size={12} color={colors.textSecondary} />
                      <Text style={{ color: colors.textSecondary, fontSize: 12, marginLeft: 3 }} className="font-quicksand-medium">
                        {product.enterprise.location.city},{" "}
                        {product.enterprise.location.district}
                      </Text>
                    </View>
                  )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Bouton S'abonner */}
            {typeof product.enterprise === "object" && (
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
                  marginBottom: 8,
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
            )}

            {/* Contact buttons */}
            {typeof product.enterprise === "object" &&
              product.enterprise.contactInfo?.phone && (
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() =>
                      typeof product.enterprise === "object" &&
                      product.enterprise.contactInfo?.phone
                        ? openWhatsApp(product.enterprise.contactInfo.phone)
                        : undefined
                    }
                    style={{
                      flex: 1, flexDirection: "row", alignItems: "center",
                      justifyContent: "center", paddingVertical: 13,
                      borderRadius: 14, backgroundColor: isDark ? "#052e16" : "#F0FDF4",
                    }}
                  >
                    <Ionicons name="logo-whatsapp" size={19} color="#16A34A" />
                    <Text style={{ color: "#16A34A", marginLeft: 7, fontSize: 14 }} className="font-quicksand-bold">
                      {i18n.t("enterprise.productDetails.store.whatsapp")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() =>
                      typeof product.enterprise === "object" &&
                      product.enterprise.contactInfo?.phone
                        ? makePhoneCall(product.enterprise.contactInfo.phone)
                        : undefined
                    }
                    style={{
                      flex: 1, flexDirection: "row", alignItems: "center",
                      justifyContent: "center", paddingVertical: 13,
                      borderRadius: 14, backgroundColor: isDark ? "#431407" : "#FFF7ED",
                    }}
                  >
                    <Ionicons name="call" size={19} color="#EA580C" />
                    <Text style={{ color: "#EA580C", marginLeft: 7, fontSize: 14 }} className="font-quicksand-bold">
                      {i18n.t("enterprise.productDetails.store.call")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

            {/* Discuter / Négocier */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={async () => {
                try {
                  const conversation =
                    await MessagingService.createConversationForProduct(id!);
                  router.push(
                    `/(app)/(enterprise)/conversation/${conversation._id}`,
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
              style={{
                flexDirection: "row", alignItems: "center", justifyContent: "center",
                paddingVertical: 14, borderRadius: 14, backgroundColor: "#FE8C00",
              }}
            >
              <Ionicons name="chatbubbles" size={19} color="#fff" />
              <Text style={{ color: "#fff", marginLeft: 8, fontSize: 15 }} className="font-quicksand-bold">
                {i18n.t("enterprise.productDetails.store.negotiate")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Similar Products */}
          {(similarProducts.length > 0 || loadingSimilar) && (
            <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 20, marginBottom: 8 }}>
              <Text
                style={{ color: colors.textPrimary, fontSize: 18, marginBottom: 14 }}
                className="font-quicksand-bold"
              >
                {i18n.t("enterprise.productDetails.similar.title")}
              </Text>
              {loadingSimilar ? (
                <View style={{ alignItems: "center", paddingVertical: 20 }}>
                  <ActivityIndicator size="small" color="#10B981" />
                </View>
              ) : (
                <FlatList
                  data={similarProducts}
                  renderItem={({ item }) => (
                    <SimilarProductCard product={item} />
                  )}
                  keyExtractor={(item) => item._id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 4 }}
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
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    justifyContent: "flex-end",
    paddingBottom: 10,
    overflow: "hidden",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
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
