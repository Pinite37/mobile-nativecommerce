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
import { Product } from "../../../../../types/product";

const { width: screenWidth } = Dimensions.get('window');

export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const loadProductDetails = async () => {
      try {
        setLoading(true);
        const productData = await ProductService.getPublicProductById(id!);
        console.log("✅ Produit chargé:", JSON.stringify(productData, null, 2));
        setProduct(productData);
      } catch (error) {
        console.error('❌ Erreur chargement détails produit:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProductDetails();
    }
  }, [id]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const renderImage = ({ item, index }: { item: string; index: number }) => (
    <View style={{ width: screenWidth }}>
      <Image
        source={{ uri: item }}
        style={{ width: screenWidth, height: 300 }}
        resizeMode="cover"
      />
    </View>
  );

  const handleAddToCart = () => {
    // TODO: Implémenter l'ajout au panier
    console.log('Ajouter au panier:', {
      productId: id,
      quantity
    });
  };

  const openWhatsApp = (phone: string) => {
    const message = `Bonjour ! Je suis intéressé(e) par votre produit "${product?.name}" sur DealToo. 

Prix affiché : ${product ? formatPrice(product.price) : ''}

Pouvez-vous me donner plus d'informations ? Merci !`;
    
    const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(whatsappUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          Alert.alert(
            'WhatsApp non disponible',
            'WhatsApp n\'est pas installé sur votre appareil. Voulez-vous appeler directement ?',
            [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Appeler', onPress: () => makePhoneCall(phone) }
            ]
          );
        }
      })
      .catch(() => {
        Alert.alert('Erreur', 'Impossible d\'ouvrir WhatsApp');
      });
  };

  const makePhoneCall = (phone: string) => {
    const phoneUrl = `tel:${phone}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Erreur', 'Impossible de passer l\'appel');
        }
      })
      .catch(() => {
        Alert.alert('Erreur', 'Impossible de passer l\'appel');
      });
  };

  const openWebsite = (website: string) => {
    let url = website;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          Alert.alert('Erreur', 'Impossible d\'ouvrir le site web');
        }
      })
      .catch(() => {
        Alert.alert('Erreur', 'Impossible d\'ouvrir le site web');
      });
  };

  const showPhoneNumber = (phone: string) => {
    Alert.alert(
      'Numéro de téléphone',
      phone,
      [
        { text: 'Fermer', style: 'cancel' },
        { text: 'Appeler', onPress: () => makePhoneCall(phone) },
        { text: 'WhatsApp', onPress: () => openWhatsApp(phone) }
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
        <View className="flex-1 justify-center items-center">
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text className="mt-4 text-xl font-quicksand-bold text-neutral-800">
            Produit introuvable
          </Text>
          <Text className="mt-2 text-neutral-600 font-quicksand-medium text-center px-6">
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
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 pt-16 bg-white">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-neutral-100 rounded-full justify-center items-center"
        >
          <Ionicons name="chevron-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-quicksand-bold text-neutral-800">
          Détails du produit
        </Text>
        <TouchableOpacity className="w-10 h-10 bg-neutral-100 rounded-full justify-center items-center">
          <Ionicons name="heart-outline" size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Images Carousel */}
        <View className="relative">
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
          
          {/* Image Indicators */}
          {product.images.length > 1 && (
            <View className="absolute bottom-4 left-0 right-0 flex-row justify-center">
              {product.images.map((_: string, index: number) => (
                <View
                  key={index}
                  className={`w-2 h-2 rounded-full mx-1 ${
                    index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
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

          {/* Enterprise Info */}
          <View className="bg-neutral-50 rounded-2xl p-4 mb-6">
            <View className="flex-row items-center mb-4">
              {(typeof product.enterprise === 'object' && product.enterprise.logo) ? (
                <Image
                  source={{ uri: product.enterprise.logo }}
                  className="w-12 h-12 rounded-xl"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-12 h-12 bg-primary-100 rounded-xl justify-center items-center">
                  <Ionicons name="storefront" size={20} color="#FE8C00" />
                </View>
              )}
              <View className="ml-3 flex-1">
                <Text className="text-base font-quicksand-semibold text-neutral-800">
                  {typeof product.enterprise === 'object' ? product.enterprise.companyName : product.enterprise}
                </Text>
                <Text className="text-sm text-neutral-600">
                  Vendeur vérifié
                </Text>
                {typeof product.enterprise === 'object' && product.enterprise.location && (
                  <Text className="text-xs text-neutral-500 mt-1">
                    📍 {product.enterprise.location.city}, {product.enterprise.location.district}
                  </Text>
                )}
              </View>
              <TouchableOpacity className="bg-primary-100 rounded-xl px-3 py-2">
                <Text className="text-primary-500 font-quicksand-semibold text-sm">
                  Voir la boutique
                </Text>
              </TouchableOpacity>
            </View>

            {/* Contact Options */}
            {typeof product.enterprise === 'object' && (product.enterprise.contactInfo?.phone || product.enterprise.contactInfo?.website) && (
              <View>
                <Text className="text-sm font-quicksand-semibold text-neutral-800 mb-3">
                  Contacter le vendeur
                </Text>
                <View className="flex-row flex-wrap">
                  {typeof product.enterprise === 'object' && product.enterprise.contactInfo?.phone && (
                    <>
                      <TouchableOpacity
                        onPress={() => {
                          const enterprise = product.enterprise;
                          if (typeof enterprise === 'object' && enterprise.contactInfo?.phone) {
                            openWhatsApp(enterprise.contactInfo.phone);
                          }
                        }}
                        className="flex-row items-center bg-success-100 rounded-xl px-3 py-2 mr-2 mb-2"
                      >
                        <Ionicons name="logo-whatsapp" size={16} color="#10B981" />
                        <Text className="ml-2 text-success-700 font-quicksand-medium text-sm">
                          WhatsApp
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        onPress={() => {
                          const enterprise = product.enterprise;
                          if (typeof enterprise === 'object' && enterprise.contactInfo?.phone) {
                            makePhoneCall(enterprise.contactInfo.phone);
                          }
                        }}
                        className="flex-row items-center bg-primary-100 rounded-xl px-3 py-2 mr-2 mb-2"
                      >
                        <Ionicons name="call" size={16} color="#FE8C00" />
                        <Text className="ml-2 text-primary-700 font-quicksand-medium text-sm">
                          Appeler
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                  
                  {typeof product.enterprise === 'object' && product.enterprise.contactInfo?.website && (
                    <TouchableOpacity
                      onPress={() => {
                        const enterprise = product.enterprise;
                        if (typeof enterprise === 'object' && enterprise.contactInfo?.website) {
                          openWebsite(enterprise.contactInfo.website);
                        }
                      }}
                      className="flex-row items-center bg-blue-100 rounded-xl px-3 py-2 mr-2 mb-2"
                    >
                      <Ionicons name="globe" size={16} color="#3B82F6" />
                      <Text className="ml-2 text-blue-700 font-quicksand-medium text-sm">
                        Site web
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                {typeof product.enterprise === 'object' && product.enterprise.contactInfo?.phone && (
                  <TouchableOpacity 
                    onPress={() => {
                      const enterprise = product.enterprise;
                      if (typeof enterprise === 'object' && enterprise.contactInfo?.phone) {
                        showPhoneNumber(enterprise.contactInfo.phone);
                      }
                    }}
                    className="mt-2 bg-white rounded-xl p-3"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-xs text-neutral-600 mb-1">Numéro de téléphone :</Text>
                        <Text className="text-sm font-quicksand-semibold text-neutral-800">
                          {product.enterprise.contactInfo.phone}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <Ionicons name="copy-outline" size={16} color="#9CA3AF" />
                        <Text className="ml-1 text-xs text-neutral-500">Appuyer pour plus d&apos;options</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Stats */}
          <View className="flex-row justify-between mb-6">
            <View className="flex-1 bg-neutral-50 rounded-2xl p-4 mr-2">
              <View className="flex-row items-center mb-1">
                <Ionicons name="star" size={16} color="#FE8C00" />
                <Text className="text-base font-quicksand-bold text-neutral-800 ml-1">
                  {product.stats.averageRating.toFixed(1)}
                </Text>
              </View>
              <Text className="text-sm text-neutral-600">
                {product.stats.totalReviews} avis
              </Text>
            </View>
            
            <View className="flex-1 bg-neutral-50 rounded-2xl p-4 ml-2">
              <View className="flex-row items-center mb-1">
                <Ionicons name="people" size={16} color="#10B981" />
                <Text className="text-base font-quicksand-bold text-neutral-800 ml-1">
                  {product.stats.totalSales}
                </Text>
              </View>
              <Text className="text-sm text-neutral-600">
                vendus
              </Text>
            </View>
          </View>

          {/* Stock Status */}
          <View className="mb-6">
            <View className="flex-row items-center">
              <View
                className={`w-3 h-3 rounded-full mr-2 ${
                  product.stock > 0 ? 'bg-success-500' : 'bg-error-500'
                }`}
              />
              <Text
                className={`font-quicksand-semibold ${
                  product.stock > 0 ? 'text-success-600' : 'text-error-600'
                }`}
              >
                {product.stock > 0 ? `En stock (${product.stock} disponibles)` : 'Rupture de stock'}
              </Text>
            </View>
          </View>

          {/* Quantity Selector */}
          {product.stock > 0 && (
            <View className="mb-6">
              <Text className="text-base font-quicksand-semibold text-neutral-800 mb-3">
                Quantité
              </Text>
              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 bg-neutral-100 rounded-full justify-center items-center"
                >
                  <Ionicons name="remove" size={16} color="#374151" />
                </TouchableOpacity>
                <Text className="mx-4 text-lg font-quicksand-bold text-neutral-800">
                  {quantity}
                </Text>
                <TouchableOpacity
                  onPress={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="w-10 h-10 bg-neutral-100 rounded-full justify-center items-center"
                >
                  <Ionicons name="add" size={16} color="#374151" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

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
                Ajouter au panier • {formatPrice(product.price * quantity)}
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="flex-1 bg-neutral-300 rounded-2xl py-4 justify-center items-center">
              <Text className="text-neutral-600 font-quicksand-bold text-base">
                Produit indisponible
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
