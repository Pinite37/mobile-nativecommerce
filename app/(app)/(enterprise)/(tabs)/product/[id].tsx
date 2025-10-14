import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NotificationModal, { useNotification } from "../../../../../components/ui/NotificationModal";
import MessagingService from "../../../../../services/api/MessagingService";
import ProductService from "../../../../../services/api/ProductService";
import { Product } from "../../../../../types/product";

const { width: screenWidth } = Dimensions.get("window");

export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { notification, showNotification, hideNotification } = useNotification();
  const imagesListRef = useRef<FlatList<string>>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  useEffect(() => {
    const loadProductDetails = async () => {
      try {
        setLoading(true);
        const productData = await ProductService.getPublicProductById(id!);
        console.log("✅ Produit chargé:", JSON.stringify(productData, null, 2));
        setProduct(productData);

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
      console.log("✅ Produits similaires chargés:", response.similarProducts.length);
    } catch (error) {
      console.error("❌ Erreur chargement produits similaires:", error);
      setSimilarProducts([]);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  const renderImage = ({ item, index }: { item: string; index: number }) => (
    <View style={{ width: screenWidth }}>
      <TouchableOpacity activeOpacity={0.9} onPress={() => { setCurrentImageIndex(index); setImageModalVisible(true); }}>
        <ExpoImage
          source={{ uri: item }}
          style={{ width: screenWidth, height: 350 }}
          contentFit="cover"
          transition={300}
          cachePolicy="memory-disk"
        />
      </TouchableOpacity>
    </View>
  );

  // Composant pour une carte de produit similaire
  const SimilarProductCard = ({ product: similarProduct }: { product: Product }) => (
    <TouchableOpacity
      className="bg-white rounded-xl mr-4 border border-neutral-100 shadow-sm"
      style={{ width: 140 }}
      onPress={() => {
        router.push(`/(app)/(enterprise)/(tabs)/product/${similarProduct._id}`);
      }}
    >
      <View className="relative">
        <ExpoImage
          source={{
            uri: similarProduct.images[0] || "https://via.placeholder.com/140x100/CCCCCC/FFFFFF?text=No+Image",
          }}
          style={{ width: 140, height: 100 }}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          className="rounded-t-xl"
        />
        {/* Badge stock si faible */}
        {similarProduct.stock <= 5 && similarProduct.stock > 0 && (
          <View className="absolute top-2 left-2 bg-warning-500 rounded-full px-2 py-1">
            <Text className="text-white text-xs font-quicksand-bold">
              {similarProduct.stock} restants
            </Text>
          </View>
        )}
      </View>

      <View className="p-3">
        <Text numberOfLines={2} className="text-sm font-quicksand-semibold text-neutral-800 mb-2 leading-5">
          {similarProduct.name}
        </Text>

        <Text className="text-base font-quicksand-bold text-primary-600">
          {formatPrice(similarProduct.price)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const handleAddToCart = () => {
    // TODO: Implémenter l'ajout au panier
    console.log("Ajouter au panier:", {
      productId: id,
    });
  };

  const openWhatsApp = (phone: string) => {
    const message = `Bonjour ! Je suis intéressé(e) par votre produit "${product?.name}" sur Axi. 

Prix affiché : ${product ? formatPrice(product.price) : ""}

Pouvez-vous me donner plus d'informations ? Merci !`;

    const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          showNotification('warning', 'WhatsApp non disponible', "WhatsApp n'est pas installé sur votre appareil. Essayez d'appeler directement.");
          makePhoneCall(phone);
        }
      })
      .catch(() => {
        showNotification('error', 'Erreur', "Impossible d'ouvrir WhatsApp");
      });
  };

  const makePhoneCall = (phone: string) => {
    const phoneUrl = `tel:${phone}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        } else {
          showNotification('error', 'Erreur', "Impossible de passer l'appel");
        }
      })
      .catch(() => {
        showNotification('error', 'Erreur', "Impossible de passer l'appel");
      });
  };

  const openWebsite = (website: string) => {
    let url = website;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          showNotification('error', 'Erreur', "Impossible d'ouvrir le site web");
        }
      })
      .catch(() => {
        showNotification('error', 'Erreur', "Impossible d'ouvrir le site web");
      });
  };

  // showPhoneNumber retiré (non utilisé après refonte UI)

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
        })
      );
      loop.start();
      return () => loop.stop();
    }, [shimmer]);
    const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-150, 150] });
    return (
      <View style={[{ backgroundColor: '#E5E7EB', overflow: 'hidden' }, style]}>
        <Animated.View style={{
          position: 'absolute', top: 0, bottom: 0, width: 120,
          transform: [{ translateX }],
          backgroundColor: 'rgba(255,255,255,0.35)',
          opacity: 0.7,
        }} />
      </View>
    );
  };

  const SkeletonProduct = () => (
    <SafeAreaView className="flex-1 bg-white">
      <ExpoStatusBar style="light" translucent backgroundColor="transparent" />

      {/* Header Skeleton */}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        className="absolute top-0 left-0 right-0 z-10"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center justify-between px-4 pb-3">
          <ShimmerBlock style={{ width: 40, height: 40, borderRadius: 20 }} />
          <ShimmerBlock style={{ width: 120, height: 16, borderRadius: 8 }} />
          <View className="flex-row">
            <ShimmerBlock style={{ width: 40, height: 40, borderRadius: 20, marginRight: 8 }} />
            <ShimmerBlock style={{ width: 40, height: 40, borderRadius: 20 }} />
          </View>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Image Skeleton */}
        <View style={{ marginTop: insets.top }}>
          <ShimmerBlock style={{ width: '100%', height: 350 }} />

          {/* Indicators Skeleton */}
          <View className="absolute bottom-4 left-0 right-0 flex-row justify-center">
            {[1, 2, 3].map((i) => (
              <ShimmerBlock key={i} style={{ width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 }} />
            ))}
          </View>
        </View>

        {/* Thumbnails Skeleton */}
        <View className="px-6 mt-3">
          <View className="flex-row">
            {[1, 2, 3, 4].map((i) => (
              <ShimmerBlock key={i} style={{ width: 64, height: 64, borderRadius: 12, marginRight: 12 }} />
            ))}
          </View>
        </View>

        {/* Content Skeleton */}
        <View className="px-6 py-6">
          {/* Price and Name */}
          <View className="mb-4">
            <ShimmerBlock style={{ width: '30%', height: 32, borderRadius: 16, marginBottom: 12 }} />
            <ShimmerBlock style={{ width: '80%', height: 28, borderRadius: 14, marginBottom: 8 }} />
            <ShimmerBlock style={{ width: '100%', height: 16, borderRadius: 8, marginBottom: 4 }} />
            <ShimmerBlock style={{ width: '60%', height: 16, borderRadius: 8 }} />
          </View>

          {/* Enterprise Section */}
          <View className="px-4 py-4 border border-neutral-100 rounded-2xl mb-6">
            <ShimmerBlock style={{ width: '25%', height: 20, borderRadius: 10, marginBottom: 16 }} />
            <View className="flex-row items-center">
              <ShimmerBlock style={{ width: 56, height: 56, borderRadius: 16 }} />
              <View className="ml-4 flex-1">
                <ShimmerBlock style={{ width: '60%', height: 20, borderRadius: 10, marginBottom: 8 }} />
                <ShimmerBlock style={{ width: '40%', height: 14, borderRadius: 7 }} />
              </View>
              <ShimmerBlock style={{ width: 60, height: 32, borderRadius: 16 }} />
            </View>

            {/* Contact Options */}
            <View className="mt-4">
              <ShimmerBlock style={{ width: '30%', height: 20, borderRadius: 10, marginBottom: 16 }} />
              <View className="flex-row flex-wrap -mx-1">
                <ShimmerBlock style={{ width: '48%', height: 48, borderRadius: 16, margin: 4 }} />
                <ShimmerBlock style={{ width: '48%', height: 48, borderRadius: 16, margin: 4 }} />
              </View>
            </View>

            {/* Offer Button */}
            <ShimmerBlock style={{ width: '100%', height: 56, borderRadius: 16, marginTop: 24 }} />
          </View>

          {/* Stock Status */}
          <View className="mb-6">
            <ShimmerBlock style={{ width: '40%', height: 16, borderRadius: 8 }} />
          </View>

          {/* Similar Products */}
          <View className="px-4 py-4 border-t border-neutral-100">
            <View className="flex-row justify-between items-center mb-4">
              <ShimmerBlock style={{ width: '35%', height: 24, borderRadius: 12 }} />
              <ShimmerBlock style={{ width: 60, height: 16, borderRadius: 8 }} />
            </View>
            <View className="flex-row">
              {[1, 2, 3].map((i) => (
                <View key={i} className="mr-4" style={{ width: 140 }}>
                  <ShimmerBlock style={{ width: '100%', height: 100, borderRadius: 12, marginBottom: 12 }} />
                  <View className="p-3">
                    <ShimmerBlock style={{ width: '80%', height: 14, borderRadius: 7, marginBottom: 8 }} />
                    <ShimmerBlock style={{ width: '60%', height: 16, borderRadius: 8 }} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions Skeleton */}
      <View className="px-6 py-4 bg-white border-t border-neutral-200">
        <View className="flex-row">
          <ShimmerBlock style={{ width: 48, height: 48, borderRadius: 16, marginRight: 16 }} />
          <ShimmerBlock style={{ width: '100%', height: 56, borderRadius: 16 }} />
        </View>
      </View>
    </SafeAreaView>
  );

  if (loading) {
    return <SkeletonProduct />;
  }

  if (!product) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text className="mt-4 text-xl font-quicksand-bold text-neutral-800">
            Produit introuvable
          </Text>
          <Text className="mt-2 text-neutral-600 font-quicksand-medium text-center">
            Le produit que vous recherchez n&apos;existe pas ou n&apos;est plus disponible.
          </Text>
          <TouchableOpacity
            className="mt-6 bg-primary-500 rounded-2xl px-6 py-3"
            onPress={() => router.back()}
          >
            <Text className="text-white font-quicksand-semibold">Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ExpoStatusBar style="light" translucent backgroundColor="transparent" />
      {/* Header overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        className="absolute top-0 left-0 right-0 z-10"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center justify-between px-4 pb-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-black/25 rounded-full justify-center items-center"
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <Text numberOfLines={1} className="text-white font-quicksand-semibold">
              Détails du produit
            </Text>
          </View>
          <View className="flex-row">
            <TouchableOpacity
              onPress={async () => {
                try {
                  await Share.share({
                    message: product ? `${product.name} • ${formatPrice(product.price)}${product.images?.[0] ? `\n${product.images[0]}` : ''}` : 'Voir ce produit',
                  });
                } catch {}
              }}
              className="w-10 h-10 bg-black/25 rounded-full justify-center items-center mr-2"
            >
              <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              className="w-10 h-10 bg-black/25 rounded-full justify-center items-center"
              onPress={() => setImageModalVisible(true)}
            >
              <Ionicons 
                name="images-outline" 
                size={18} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Images Carousel */}
        <View style={{ marginTop: insets.top }}>
          <View className="relative">
            <FlatList
              ref={imagesListRef}
              data={product.images}
              renderItem={renderImage}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                setCurrentImageIndex(newIndex);
              }}
              onScrollToIndexFailed={({ index }) => {
                setTimeout(() => {
                  imagesListRef.current?.scrollToIndex({ index, animated: true });
                }, 100);
              }}
            />

            {/* Indicators */}
            {product.images.length > 1 && (
              <View className="absolute bottom-4 left-0 right-0 flex-row justify-center">
                {product.images.map((_: string, index: number) => {
                  const active = index === currentImageIndex;
                  return (
                    <View
                      key={index}
                      style={{
                        width: active ? 16 : 8,
                        height: 8,
                        borderRadius: 9999,
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        opacity: active ? 1 : 0.5,
                        marginHorizontal: 4,
                      }}
                    />
                  );
                })}
              </View>
            )}
          </View>

          {/* Thumbnails */}
            {product.images.length > 1 && (
              <View className="px-6 mt-3">
                <FlatList
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
                          imagesListRef.current?.scrollToIndex({ index, animated: true });
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
                            borderColor: active ? '#FE8C00' : '#E5E7EB',
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
        </View>

        {/* Product Info */}
        <View className="px-6 py-6">
          {/* Price and Name */}
          <View className="mb-4">
            <Text className="text-2xl font-quicksand-bold text-primary-500 mb-2">
              {formatPrice(product.price)}
            </Text>
            <Text className="text-xl font-quicksand-bold text-neutral-800 mb-2">
              {product.name}
            </Text>
            <Text className="text-neutral-600 font-quicksand-medium">
              {product.description}
            </Text>
          </View>

          {/* Enterprise Section (self) */}
          <View className="px-4 py-4 border border-neutral-100 rounded-2xl mb-6">
            <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3">
              Boutique
            </Text>
            <TouchableOpacity 
              className="flex-row items-center"
              onPress={() => {
                if (typeof product.enterprise === 'object' && product.enterprise._id) {
                  router.push(`/(app)/(enterprise)/(tabs)/enterprise/${product.enterprise._id}`);
                }
              }}
            >
              {typeof product.enterprise === 'object' && product.enterprise.logo ? (
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
                <Text className="text-lg font-quicksand-bold text-neutral-800">
                  {typeof product.enterprise === "object" ? product.enterprise.companyName : product.enterprise}
                </Text>
                {typeof product.enterprise === "object" && product.enterprise.location && (
                  <Text className="text-sm text-neutral-500 mt-1">
                    📍 {product.enterprise.location.city}, {product.enterprise.location.district}
                  </Text>
                )}
              </View>
              <View className="bg-primary-100 rounded-full px-4 py-2">
                <Text className="text-primary-600 font-quicksand-bold text-sm">Voir</Text>
              </View>
            </TouchableOpacity>

            {/* Contact Options */}
            {typeof product.enterprise === "object" && (product.enterprise.contactInfo?.phone || product.enterprise.contactInfo?.website) && (
              <View className="mt-2">
                <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3">
                  Contacter
                </Text>
                <View className="flex-row flex-wrap -mx-1">
                  {typeof product.enterprise === 'object' && product.enterprise.contactInfo?.phone && (
                    <>
                      <TouchableOpacity
                        onPress={() => typeof product.enterprise === 'object' && product.enterprise.contactInfo?.phone ? openWhatsApp(product.enterprise.contactInfo.phone) : undefined}
                        className="flex-1 bg-success-50 rounded-2xl px-4 py-3 m-1 flex-row items-center justify-center border border-success-100"
                      >
                        <Ionicons name="logo-whatsapp" size={20} color="#10B981" />
                        <Text className="ml-2 text-success-700 font-quicksand-bold text-base">
                          WhatsApp
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => typeof product.enterprise === 'object' && product.enterprise.contactInfo?.phone ? makePhoneCall(product.enterprise.contactInfo.phone) : undefined}
                        className="flex-1 bg-primary-50 rounded-2xl px-4 py-3 m-1 flex-row items-center justify-center border border-primary-100"
                      >
                        <Ionicons name="call" size={20} color="#FE8C00" />
                        <Text className="ml-2 text-primary-700 font-quicksand-bold text-base">
                          Appeler
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                  {typeof product.enterprise === 'object' && product.enterprise.contactInfo?.website && (
                    <TouchableOpacity
                      onPress={() => typeof product.enterprise === 'object' && product.enterprise.contactInfo?.website ? openWebsite(product.enterprise.contactInfo.website) : undefined}
                      className="flex-1 bg-blue-50 rounded-2xl px-4 py-3 m-1 flex-row items-center justify-center border border-blue-100"
                    >
                      <Ionicons name="globe" size={20} color="#3B82F6" />
                      <Text className="ml-2 text-blue-700 font-quicksand-bold text-base">
                        Site web
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Faire une offre (conversation) */}
            <TouchableOpacity
              onPress={async () => {
                try {
                  const conversation = await MessagingService.createConversationForProduct(id!);
                  router.push(`/(app)/(enterprise)/conversation/${conversation._id}`);
                } catch (error) {
                  console.error("Erreur création conversation:", error);
                  showNotification('error', 'Erreur', "Impossible de créer la conversation");
                }
              }}
              className="bg-amber-50 rounded-2xl py-4 flex-row items-center justify-center border border-amber-200 mt-6"
            >
              <Ionicons name="pricetag" size={20} color="#F59E0B" />
              <Text className="ml-2 text-amber-700 font-quicksand-bold text-base">
                Faire une offre
              </Text>
            </TouchableOpacity>
          </View>

          

          {/* Related Items */}
          {(similarProducts.length > 0 || loadingSimilar) && (
            <View className="px-4 py-4 border-t border-neutral-100">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-quicksand-bold text-neutral-800">
                  Produits similaires
                </Text>
                <TouchableOpacity>
                  <Text className="text-primary-500 font-quicksand-semibold text-base">Voir tous</Text>
                </TouchableOpacity>
              </View>
              {loadingSimilar ? (
                <View className="h-32 justify-center items-center">
                  <ActivityIndicator size="small" color="#FE8C00" />
                </View>
              ) : (
                <FlatList
                  data={similarProducts}
                  renderItem={({ item }) => <SimilarProductCard product={item} />}
                  keyExtractor={(item) => item._id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 8 }}
                />
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Image Viewer Modal */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View className="flex-1 bg-black/95">
          <View className="absolute top-0 left-0 right-0" style={{ paddingTop: insets.top + 8 }}>
            <View className="flex-row justify-between items-center px-4 pb-2">
              <TouchableOpacity
                onPress={() => setImageModalVisible(false)}
                className="w-10 h-10 bg-white/15 rounded-full justify-center items-center"
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
              <View style={{ width: screenWidth, alignItems: 'center', justifyContent: 'center' }}>
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
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
              setCurrentImageIndex(newIndex);
            }}
            onScrollToIndexFailed={({ index }) => {
              setTimeout(() => {}, 100);
            }}
          />
        </View>
      </Modal>

      {/* Bottom Actions */}
      <View className="px-6 py-4 bg-white border-t border-neutral-200">
        <View className="flex-row">
          {typeof product.enterprise === 'object' && product.enterprise.contactInfo?.phone ? (
            <TouchableOpacity 
              onPress={() => {
                const enterprise = product.enterprise;
                if (typeof enterprise === 'object' && enterprise.contactInfo?.phone) {
                  openWhatsApp(enterprise.contactInfo.phone);
                }
              }}
              className="w-12 h-12 bg-success-100 rounded-2xl justify-center items-center mr-4"
            >
              <Ionicons name="logo-whatsapp" size={20} color="#10B981" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity className="w-12 h-12 bg-neutral-100 rounded-2xl justify-center items-center mr-4">
              <Ionicons name="chatbubble-outline" size={20} color="#374151" />
            </TouchableOpacity>
          )}
          {product.stock > 0 ? (
            <TouchableOpacity
              onPress={handleAddToCart}
              className="flex-1 bg-primary-500 rounded-2xl py-4 justify-center items-center"
            >
              <Text className="text-white font-quicksand-bold text-base">
                Ajouter au panier
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="flex-1 bg-neutral-300 rounded-2xl py-4 justify-center items-center">
              <Text className="text-neutral-600 font-quicksand-bold text-base">
                Indisponible
              </Text>
            </View>
          )}
        </View>
      </View>
      <NotificationModal
        visible={notification?.visible || false}
        type={notification?.type || 'info'}
        title={notification?.title || ''}
        message={notification?.message || ''}
        onClose={hideNotification}
      />
    </SafeAreaView>
  );
}