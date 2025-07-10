import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useToast } from "../../../../../components/ui/ToastManager";

import ProductService from "../../../../../services/api/ProductService";
import { Product } from "../../../../../types/product";

const styles = StyleSheet.create({
  carousel: {
    width: '100%',
    height: 350,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f7f7f7',
  },
  carouselItem: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  carouselImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 16,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  counter: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  imageNavButton: {
    position: 'absolute',
    top: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    transform: [{ translateY: -25 }],
  },
  thumbnailContainer: {
    marginTop: 12,
    paddingBottom: 8,
  },
  thumbnailImage: {
    width: 70, 
    height: 70,
    borderRadius: 10,
    marginRight: 12,
  },
  thumbnailSelected: {
    borderWidth: 3,
    borderColor: '#FE8C00',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    fontFamily: 'Quicksand-Bold',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
});

export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  
  // Référence et variables pour le carrousel d'images
  const flatListRef = useRef<FlatList>(null);
  const screenWidth = Dimensions.get('window').width;
  const scrollX = useRef(new Animated.Value(0)).current;
  const viewabilityConfig = { itemVisiblePercentThreshold: 50 };

  console.log('🚀 ProductDetails - Product ID:', id);

  const loadProduct = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📡 Chargement du produit:', id);
      
      const productData = await ProductService.getProductById(id);
      console.log('✅ Produit chargé:', productData.name);
      setProduct(productData);
    } catch (err: any) {
      console.error('❌ Erreur chargement produit:', err);
      setError(err.message || 'Erreur lors du chargement du produit');
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
      console.error('❌ Erreur refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!product) return;
    
    const action = product.isActive ? 'désactiver' : 'activer';
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} le produit`,
      `Voulez-vous vraiment ${action} ce produit ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          onPress: async () => {
            try {
              console.log('🔄 Changement de statut:', product._id, !product.isActive);
              await ProductService.toggleProductStatus(product._id, !product.isActive);
              setProduct(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
              showSuccess(`Produit ${action}é avec succès`);
            } catch (error: any) {
              console.error('❌ Erreur changement statut:', error);
              showError('Erreur', error.message || 'Une erreur est survenue');
            }
          }
        }
      ]
    );
  };

  const handleDeleteProduct = async () => {
    if (!product) return;
    
    Alert.alert(
      "Supprimer le produit",
      "Êtes-vous sûr ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              console.log('🗑️ Suppression du produit:', product._id);
              await ProductService.deleteProduct(product._id);
              showSuccess("Produit supprimé avec succès");
              router.back();
            } catch (error: any) {
              console.error('❌ Erreur suppression:', error);
              showError('Erreur', error.message || 'Une erreur est survenue');
            }
          }
        }
      ]
    );
  };

  const handleEditProduct = () => {
    console.log('✏️ Édition du produit à implémenter:', product?._id);
    showInfo("Fonctionnalité à venir", "L'édition de produit sera bientôt disponible");
  };

  // Hook pour les toasts
  const { showSuccess, showError, showInfo } = useToast();

  // Utilitaires
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { text: 'Rupture de stock', color: 'text-red-500', bgColor: 'bg-red-100' };
    if (stock <= 5) return { text: 'Stock faible', color: 'text-orange-500', bgColor: 'bg-orange-100' };
    return { text: 'En stock', color: 'text-green-500', bgColor: 'bg-green-100' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Gestion du défilement des images
  const handleViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0) {
      setSelectedImageIndex(viewableItems[0].index);
    }
  }, []);
  
  const onViewRef = useRef(handleViewableItemsChanged);

  // États d'affichage
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background-secondary">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FE8C00" />
          <Text className="mt-4 text-neutral-600 font-quicksand-medium">
            Chargement du produit...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView className="flex-1 bg-background-secondary">
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="warning" size={64} color="#EF4444" />
          <Text className="text-xl font-quicksand-bold text-neutral-800 mt-4 text-center">
            Erreur de chargement
          </Text>
          <Text className="text-neutral-600 font-quicksand mt-2 text-center">
            {error || 'Produit non trouvé'}
          </Text>
          <TouchableOpacity
            onPress={loadProduct}
            className="bg-primary-500 py-3 px-6 rounded-2xl mt-6"
          >
            <Text className="text-white font-quicksand-semibold">
              Réessayer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-4"
          >
            <Text className="text-neutral-500 font-quicksand">
              Retour
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const stockStatus = getStockStatus(product.stock);

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      {/* Header */}
      <View className="bg-white px-6 pt-16 py-4 border-b border-neutral-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => {
              console.log('🔙 Retour demandé');
              router.back();
            }}
            className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-quicksand-bold text-neutral-800 flex-1 text-center" numberOfLines={1}>
            {product.name}
          </Text>
          <TouchableOpacity
            onPress={handleEditProduct}
            className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center"
          >
            <Ionicons name="pencil" size={18} color="#FE8C00" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FE8C00']}
          />
        }
      >
        <View className="px-6 py-6">
          <View className="mb-6">
            {product.images && product.images.length > 0 ? (
              <View>
                {/* Carousel des images avec effet de défilement fluide */}
                <View style={styles.carousel}>
                  <FlatList
                    ref={flatListRef}
                    data={product.images}
                    keyExtractor={(_, index) => index.toString()}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    snapToAlignment="center"
                    decelerationRate="normal"
                    snapToInterval={screenWidth - 32}
                    bounces={true}
                    bouncesZoom={true}
                    onViewableItemsChanged={onViewRef.current}
                    viewabilityConfig={viewabilityConfig}
                    onScroll={Animated.event(
                      [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                      { useNativeDriver: false }
                    )}
                    renderItem={({ item }) => (
                      <View style={[styles.carouselItem, { width: screenWidth - 32 }]}>
                        <Image
                          source={{ uri: item }}
                          style={styles.carouselImage}
                        />
                      </View>
                    )}
                  />
                  
                  {/* Indicateurs de pagination animés */}
                  <View style={styles.paginationContainer}>
                    {product.images.map((_, index) => {
                      const inputRange = [
                        (index - 1) * screenWidth,
                        index * screenWidth,
                        (index + 1) * screenWidth,
                      ];
                      
                      const opacity = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.4, 1, 0.4],
                        extrapolate: 'clamp',
                      });
                      
                      const scale = scrollX.interpolate({
                        inputRange,
                        outputRange: [1, 1.3, 1],
                        extrapolate: 'clamp',
                      });
                      
                      return (
                        <Animated.View
                          key={index}
                          style={[
                            styles.paginationDot,
                            {
                              opacity,
                              transform: [{ scale }],
                              backgroundColor: selectedImageIndex === index ? '#FE8C00' : '#FFFFFF',
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                  
                  {/* Compteur d'images */}
                  <View style={styles.counter}>
                    <Text className="text-white font-quicksand-medium text-sm">
                      {selectedImageIndex + 1} / {product.images.length}
                    </Text>
                  </View>
                </View>
                
                {/* Miniatures des images */}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.thumbnailContainer}
                >
                  {product.images.map((image, index) => {
                    // Animation de pulsation pour la miniature sélectionnée
                    const scale = new Animated.Value(1);
                    
                    if (selectedImageIndex === index) {
                      Animated.sequence([
                        Animated.timing(scale, {
                          toValue: 1.1,
                          duration: 300,
                          useNativeDriver: true
                        }),
                        Animated.timing(scale, {
                          toValue: 1,
                          duration: 300,
                          useNativeDriver: true
                        })
                      ]).start();
                    }
                    
                    return (
                      <TouchableOpacity
                        key={index}
                        onPress={() => {
                          setSelectedImageIndex(index);
                          flatListRef.current?.scrollToIndex({ index, animated: true });
                        }}
                      >
                        <Animated.View
                          style={{
                            transform: [{ scale }],
                            borderWidth: selectedImageIndex === index ? 3 : 1,
                            borderColor: selectedImageIndex === index ? '#FE8C00' : '#e0e0e0',
                            borderRadius: 12,
                            padding: 2,
                            marginRight: 12
                          }}
                        >
                          <Image
                            source={{ uri: image }}
                            style={{
                              width: 65,
                              height: 65,
                              borderRadius: 8
                            }}
                            resizeMode="cover"
                          />
                        </Animated.View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <View className="w-full h-72 bg-neutral-100 rounded-2xl items-center justify-center">
                <Ionicons name="image" size={48} color="#9CA3AF" />
                <Text className="text-neutral-500 font-quicksand-medium mt-2">Aucune image</Text>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-1 mr-4">
                <Text className="text-2xl font-quicksand-bold text-neutral-800 mb-2">
                  {product.name}
                </Text>
                <View className="flex-row items-center">
                  <Animated.View 
                    className={`px-3 py-1 rounded-full ${stockStatus.bgColor}`}
                    style={{
                      transform: [{ scale: new Animated.Value(1) }]
                    }}
                  >
                    <Text className={`text-sm font-quicksand-semibold ${stockStatus.color}`}>
                      {stockStatus.text}
                    </Text>
                  </Animated.View>
                  <Animated.View className={`ml-2 px-3 py-1 rounded-full ${
                    product.isActive ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <Text className={`text-sm font-quicksand-semibold ${
                      product.isActive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {product.isActive ? 'Actif' : 'Inactif'}
                    </Text>
                  </Animated.View>
                </View>
              </View>
              <Animated.Text 
                className="text-3xl font-quicksand-bold text-primary-500"
                style={{
                  shadowColor: '#FE8C00',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 3,
                  elevation: 3,
                }}
              >
                {formatPrice(product.price)}
              </Animated.Text>
            </View>

            <View className="flex-row items-center mb-4">
              <View className="items-center flex-1">
                <Text className="text-sm text-neutral-500 font-quicksand">Stock</Text>
                <Text className="text-lg font-quicksand-bold text-neutral-800">
                  {product.stock}
                </Text>
              </View>
              {typeof product.category === 'object' && (
                <View className="items-center flex-1">
                  <Text className="text-sm text-neutral-500 font-quicksand">Catégorie</Text>
                  <Text className="text-lg font-quicksand-bold text-neutral-800">
                    {product.category.name}
                  </Text>
                </View>
              )}
              <View className="items-center flex-1">
                <Text className="text-sm text-neutral-500 font-quicksand">Vues</Text>
                <Text className="text-lg font-quicksand-bold text-neutral-800">
                  {product.stats.views}
                </Text>
              </View>
            </View>

            <View className="border-t border-neutral-100 pt-4">
              <Text className="text-sm text-neutral-500 font-quicksand mb-2">Description</Text>
              <Text 
                className="text-neutral-700 font-quicksand-medium leading-6"
                numberOfLines={showFullDescription ? undefined : 3}
              >
                {product.description}
              </Text>
              {product.description.length > 150 && (
                <TouchableOpacity
                  onPress={() => setShowFullDescription(!showFullDescription)}
                  className="mt-2"
                >
                  <Text className="text-primary-500 font-quicksand-semibold">
                    {showFullDescription ? 'Voir moins' : 'Voir plus'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {product.specifications && product.specifications.length > 0 && (
            <View className="bg-white rounded-3xl p-6 shadow-sm">
              <Text className="text-xl font-quicksand-bold text-neutral-800 mb-4">
                Spécifications
              </Text>
              <View>
                {product.specifications.map((spec: any, index: number) => (
                  <View key={index} className="flex-row justify-between py-2 border-b border-neutral-100">
                    <Text className="text-neutral-600 font-quicksand flex-1">{spec.key}</Text>
                    <Text className="text-neutral-800 font-quicksand-semibold flex-1 text-right">
                      {spec.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {product.tags && product.tags.length > 0 && (
            <View className="bg-white rounded-3xl p-6 shadow-sm">
              <Text className="text-xl font-quicksand-bold text-neutral-800 mb-4">
                Tags
              </Text>
              <View className="flex-row flex-wrap">
                {product.tags.map((tag, index) => (
                  <View key={index} className="bg-primary-100 px-3 py-1 rounded-full mr-2 mb-2">
                    <Text className="text-primary-600 font-quicksand-medium">#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View className="bg-white rounded-3xl p-6 shadow-sm">
            <Text className="text-xl font-quicksand-bold text-neutral-800 mb-4">
              Informations
            </Text>
            <View>
              <View className="flex-row justify-between py-2">
                <Text className="text-neutral-600 font-quicksand">Note moyenne</Text>
                <View className="flex-row items-center">
                  <Ionicons name="star" size={16} color="#FE8C00" />
                  <Text className="text-neutral-800 font-quicksand-semibold ml-1">
                    {product.stats.averageRating.toFixed(1)} ({product.stats.totalReviews} avis)
                  </Text>
                </View>
              </View>
              
              <View className="flex-row justify-between py-2">
                <Text className="text-neutral-600 font-quicksand">Ventes totales</Text>
                <Text className="text-neutral-800 font-quicksand-semibold">
                  {formatPrice(product.stats.totalSales)}
                </Text>
              </View>

              {product.weight && (
                <View className="flex-row justify-between py-2">
                  <Text className="text-neutral-600 font-quicksand">Poids</Text>
                  <Text className="text-neutral-800 font-quicksand-semibold">
                    {product.weight} kg
                  </Text>
                </View>
              )}

              <View className="flex-row justify-between py-2">
                <Text className="text-neutral-600 font-quicksand">Créé le</Text>
                <Text className="text-neutral-800 font-quicksand-semibold">
                  {formatDate(product.createdAt)}
                </Text>
              </View>

              <View className="flex-row justify-between py-2">
                <Text className="text-neutral-600 font-quicksand">Modifié le</Text>
                <Text className="text-neutral-800 font-quicksand-semibold">
                  {formatDate(product.updatedAt)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="bg-white px-6 py-6 border-t border-neutral-100" 
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 5,
          elevation: 10,
        }}
      >
        <View className="flex-row">
          <Animated.View style={{ flex: 1, marginRight: 12 }}>
            <TouchableOpacity
              onPress={handleToggleStatus}
              className={`py-4 rounded-2xl ${
                product.isActive ? 'bg-orange-500' : 'bg-green-500'
              }`}
              style={{
                shadowColor: product.isActive ? '#F97316' : '#22C55E',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 6,
              }}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons 
                  name={product.isActive ? "power" : "checkmark-circle"} 
                  size={20} 
                  color="white"
                  style={{ marginRight: 6 }} 
                />
                <Text className="text-white text-center font-quicksand-semibold">
                  {product.isActive ? 'Désactiver' : 'Activer'}
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
          
          <Animated.View style={{ flex: 1, marginRight: 12 }}>
            <TouchableOpacity
              onPress={handleEditProduct}
              className="bg-primary-500 py-4 rounded-2xl"
              style={{
                shadowColor: '#FE8C00',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 6,
              }}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="pencil" size={18} color="white" style={{ marginRight: 6 }} />
                <Text className="text-white text-center font-quicksand-semibold">
                  Modifier
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
          
          <TouchableOpacity
            onPress={handleDeleteProduct}
            className="bg-red-500 py-4 px-6 rounded-2xl"
            style={{
              shadowColor: '#EF4444',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 6,
            }}
          >
            <Ionicons name="trash" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
