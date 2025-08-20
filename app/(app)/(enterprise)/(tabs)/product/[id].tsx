import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import ProductService from "../../../../../services/api/ProductService";
import MessagingService from "../../../../../services/api/MessagingService";
import { Product } from "../../../../../types/product";

const { width: screenWidth } = Dimensions.get("window");

export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

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
      <Image
        source={{ uri: item }}
        style={{ width: screenWidth, height: 320 }}
        resizeMode="cover"
      />
    </View>
  );

  // Composant pour une carte de produit similaire
  const SimilarProductCard = ({ product: similarProduct }: { product: Product }) => (
    <TouchableOpacity
      className="bg-white rounded-xl mr-4 border border-neutral-100"
      style={{ width: 140 }}
      onPress={() => {
        router.push(`/(app)/(enterprise)/(tabs)/product/${similarProduct._id}`);
      }}
    >
      <View className="relative">
        <Image
          source={{
            uri: similarProduct.images[0] || "https://via.placeholder.com/140x100/CCCCCC/FFFFFF?text=No+Image",
          }}
          className="w-full h-24 rounded-t-xl"
          resizeMode="contain"
        />
        {/* Badge de score de similarité si disponible */}
        {(similarProduct as any).similarityScore && (
          <View className="absolute top-2 right-2 bg-primary-500 rounded-full px-2 py-1">
            <Text className="text-white text-xs font-quicksand-bold">
              {Math.round((similarProduct as any).similarityScore)}%
            </Text>
          </View>
        )}
        {/* Badge stock si faible */}
        {similarProduct.stock <= 5 && similarProduct.stock > 0 && (
          <View className="absolute top-2 left-2 bg-warning-500 rounded-full px-2 py-1">
            <Text className="text-white text-xs font-quicksand-bold">
              {similarProduct.stock} restants
            </Text>
          </View>
        )}
      </View>

      <View className="p-2">
        <Text numberOfLines={2} className="text-sm font-quicksand-semibold text-neutral-800 mb-1">
          {similarProduct.name}
        </Text>

        <Text className="text-base font-quicksand-bold text-primary-600">
          {formatPrice(similarProduct.price)}
        </Text>

        {/* Stats */}
        {similarProduct.stats && (
          <View className="flex-row items-center mt-1">
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text className="text-xs text-neutral-600 ml-1">
              {similarProduct.stats.averageRating?.toFixed(1) || "0.0"}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const handleAddToCart = () => {
    // TODO: Implémenter l'ajout au panier
    console.log("Ajouter au panier:", {
      productId: id,
      quantity,
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
          Alert.alert(
            "WhatsApp non disponible",
            "WhatsApp n'est pas installé sur votre appareil. Voulez-vous appeler directement ?",
            [
              { text: "Annuler", style: "cancel" },
              { text: "Appeler", onPress: () => makePhoneCall(phone) },
            ]
          );
        }
      })
      .catch(() => {
        Alert.alert("Erreur", "Impossible d'ouvrir WhatsApp");
      });
  };

  const makePhoneCall = (phone: string) => {
    const phoneUrl = `tel:${phone}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        } else {
          Alert.alert("Erreur", "Impossible de passer l'appel");
        }
      })
      .catch(() => {
        Alert.alert("Erreur", "Impossible de passer l'appel");
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
          Alert.alert("Erreur", "Impossible d'ouvrir le site web");
        }
      })
      .catch(() => {
        Alert.alert("Erreur", "Impossible d'ouvrir le site web");
      });
  };

  const showPhoneNumber = (phone: string) => {
    Alert.alert(
      "Numéro de téléphone",
      phone,
      [
        { text: "Fermer", style: "cancel" },
        { text: "Appeler", onPress: () => makePhoneCall(phone) },
        { text: "WhatsApp", onPress: () => openWhatsApp(phone) },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FE8C00" />
          <Text className="mt-4 text-neutral-600 font-quicksand-medium">
            Chargement du produit...
          </Text>
        </View>
      </SafeAreaView>
    );
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
            Le produit que vous recherchez n'existe pas ou n'est plus disponible.
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
    <SafeAreaView className="flex-1 bg-white top-10">
      {/* Header */}
      <View className="flex-row items-center  justify-between px-4 py-3 bg-white border-b border-neutral-100">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 justify-center items-center"
        >
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-quicksand-bold text-neutral-800">
          Détails du produit
        </Text>
        <TouchableOpacity className="w-10 h-10 justify-center items-center">
          <Ionicons name="heart-outline" size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Images Section */}
        <View className="relative">
          {/* Carousel pour swipe */}
          <FlatList
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
          />

          {/* Miniatures superposées en bas à droite, verticales */}
          {product.images.length > 1 && (
            <View className="absolute bottom-4 right-4 flex-col items-end">
              {product.images.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setCurrentImageIndex(index)}
                  className="mb-1"
                >
                  <Image
                    source={{ uri: item }}
                    className={`w-12 h-12 rounded-md ${index === currentImageIndex ? "border-2 border-primary-500 opacity-100" : "opacity-60"}`}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Product Info */}
        <View className="px-4 py-4">
          <Text className="text-2xl font-quicksand-bold text-neutral-800 mb-2">
            {product.name}
          </Text>
          <View className="flex-row items-center mb-3">
            {product.stats && (
              <>
                <Ionicons name="star" size={18} color="#FFD700" />
                <Text className="text-base text-neutral-700 ml-1 font-quicksand-semibold">
                  {product.stats.averageRating?.toFixed(1) || "0.0"}
                </Text>
                <Text className="text-base text-neutral-500 ml-2">
                  ({product.stats.totalReviews || 0} avis)
                </Text>
              </>
            )}
          </View>
          <Text className="text-3xl font-quicksand-bold text-primary-600 mb-4">
            {formatPrice(product.price)}
          </Text>
          <View className="flex-row items-center mb-4">
            <View className="bg-success-100 rounded-full px-3 py-1">
              <Text className="text-success-700 font-quicksand-medium text-sm">
                Livraison rapide disponible
              </Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <View className="px-4 py-4 border-t border-neutral-100">
          <Text className="text-xl font-quicksand-bold text-neutral-800 mb-3">
            Description
          </Text>
          <Text className="text-base text-neutral-600 font-quicksand-medium leading-relaxed">
            {product.description}
          </Text>
          {product.description.length > 200 && (
            <TouchableOpacity>
              <Text className="text-primary-500 font-quicksand-semibold mt-2">Lire plus</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Enterprise Section */}
        <View className="px-4 py-4 border-t border-neutral-100">
          <Text className="text-xl font-quicksand-bold text-neutral-800 mb-4">
            Vendeur
          </Text>
          <TouchableOpacity
            className="flex-row items-center mb-6"
            onPress={() => {
              if (typeof product.enterprise === "object") {
                router.push(`/(app)/(enterprise)/(tabs)/enterprise/${product.enterprise._id}`);
              }
            }}
          >
            {(typeof product.enterprise === "object" && product.enterprise.logo) ? (
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
              <View className="flex-row items-center mt-1">
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text className="text-sm text-neutral-600 ml-1">Vendeur vérifié</Text>
              </View>
              {typeof product.enterprise === "object" && product.enterprise.location && (
                <Text className="text-sm text-neutral-500 mt-1">
                  📍 {product.enterprise.location.city}, {product.enterprise.location.district}
                </Text>
              )}
            </View>
            <View className="bg-primary-100 rounded-full px-4 py-2">
              <Text className="text-primary-600 font-quicksand-bold text-sm">Voir boutique</Text>
            </View>
          </TouchableOpacity>

          {/* Contact Options */}
          {typeof product.enterprise === "object" && (product.enterprise.contactInfo?.phone || product.enterprise.contactInfo?.website) && (
            <View className="mt-2">
              <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3">
                Contacter le vendeur
              </Text>
              <View className="flex-row flex-wrap -mx-1">
                {product.enterprise.contactInfo?.phone && (
                  <>
                    <TouchableOpacity
                      onPress={() => openWhatsApp(product.enterprise.contactInfo.phone)}
                      className="flex-1 bg-success-50 rounded-2xl px-4 py-3 m-1 flex-row items-center justify-center border border-success-100"
                    >
                      <Ionicons name="logo-whatsapp" size={20} color="#10B981" />
                      <Text className="ml-2 text-success-700 font-quicksand-bold text-base">
                        WhatsApp
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => makePhoneCall(product.enterprise.contactInfo.phone)}
                      className="flex-1 bg-primary-50 rounded-2xl px-4 py-3 m-1 flex-row items-center justify-center border border-primary-100"
                    >
                      <Ionicons name="call" size={20} color="#FE8C00" />
                      <Text className="ml-2 text-primary-700 font-quicksand-bold text-base">
                        Appeler
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
                {product.enterprise.contactInfo?.website && (
                  <TouchableOpacity
                    onPress={() => openWebsite(product.enterprise.contactInfo.website)}
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

          {/* Faire une offre */}
          <TouchableOpacity
            onPress={async () => {
              try {
                const conversation = await MessagingService.createConversationForProduct(id!);
                router.push(`/(app)/(enterprise)/conversation/${conversation._id}`);
              } catch (error) {
                console.error("Erreur création conversation:", error);
                Alert.alert("Erreur", "Impossible de créer la conversation");
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
      </ScrollView>

      {/* Bottom Actions */}
      <View className="px-4 py-4 bg-white border-t border-neutral-200">
        <View className="flex-row items-center">
          <View className="flex-row items-center bg-neutral-100 rounded-full px-2 py-1 mr-4">
            <TouchableOpacity
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-10 h-10 justify-center items-center rounded-full"
            >
              <Ionicons name="remove" size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-xl font-quicksand-bold mx-4 min-w-[30px] text-center">{quantity}</Text>
            <TouchableOpacity
              onPress={() => setQuantity(quantity + 1)}
              className="w-10 h-10 justify-center items-center rounded-full"
            >
              <Ionicons name="add" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={handleAddToCart}
            className="flex-1 bg-primary-500 rounded-full py-4 justify-center items-center flex-row"
          >
            <Ionicons name="cart-outline" size={24} color="white" className="mr-3" />
            <Text className="text-white font-quicksand-bold text-lg">
              Ajouter au panier
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}