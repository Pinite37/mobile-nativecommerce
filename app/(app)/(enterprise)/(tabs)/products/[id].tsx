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
  Platform,
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
    overflow: 'hidden',
    backgroundColor: '#f7f7f7',
  },
  carouselItem: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 16,
    marginBottom: 16,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    marginBottom: 16,
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  chatSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderRadius: 24,
    marginRight: 8,
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  sendMessageInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginVertical: 12,
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
      
      const response: any = await ProductService.getProductById(id);
      console.log("✅ Réponse API complète:", JSON.stringify(response, null, 2));
      
      // Extraire les données du produit de la réponse API
      const productData = response.product || response;
      const enterpriseData = response.enterprise;
      
      // Si l'enterprise est fournie séparément, l'attacher au produit
      if (enterpriseData && typeof productData.enterprise === 'string') {
        productData.enterprise = enterpriseData;
      }
      
      console.log('✅ Produit traité:', productData.name);
      console.log('📊 Enterprise data:', typeof productData.enterprise === 'object' ? JSON.stringify(productData.enterprise) : 'ID only');
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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'android' ? 30 : 0 }}>
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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'android' ? 30 : 0 }}>
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="warning" size={64} color="#EF4444" />
          <Text className="text-xl font-quicksand-bold text-neutral-800 mt-4 text-center">
            Erreur de chargement
          </Text>
          <Text className="text-neutral-600 font-quicksand-regular mt-2 text-center">
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
            <Text className="text-neutral-500 font-quicksand-medium">
              Retour
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'android' ? 30 : 0 }}>
      {/* Header */}
      <View className="px-4 py-4 border-b border-neutral-200 flex-row items-center justify-between">
        <TouchableOpacity
          onPress={() => {
            console.log('🔙 Retour demandé');
            router.back();
          }}
          className="flex-row items-center"
        >
          <Ionicons name="arrow-back" size={20} color="#333333" />
          <Text className="ml-2 text-neutral-800 font-quicksand-medium">Produits</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleEditProduct}>
          <Ionicons name="ellipsis-vertical" size={22} color="#333333" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        className="flex-1"
        style={{ backgroundColor: '#FFFFFF' }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FE8C00']}
          />
        }
      >
        {/* Carousel d'images */}
        {product.images && product.images.length > 0 ? (
          <View>
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
                snapToInterval={screenWidth}
                bounces={true}
                onViewableItemsChanged={onViewRef.current}
                viewabilityConfig={viewabilityConfig}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                  { useNativeDriver: false }
                )}
                renderItem={({ item }) => (
                  <View style={[styles.carouselItem, { width: screenWidth }]}>
                    <Image
                      source={{ uri: item }}
                      style={styles.carouselImage}
                    />
                  </View>
                )}
              />
              
              {/* Compteur d'images */}
              <View style={styles.counter}>
                <Text className="text-white font-quicksand-medium text-sm">
                  {selectedImageIndex + 1} / {product.images?.length || 0}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <View className="w-full h-[280px] bg-gray-100 items-center justify-center">
            <Ionicons name="image" size={48} color="#9CA3AF" />
            <Text className="mt-2 text-gray-500 font-quicksand-medium">Aucune image</Text>
          </View>
        )}

        {/* Nom du produit et prix */}
        <View className="bg-white p-4 shadow-sm border-b border-neutral-100">
          <Text className="text-neutral-800 text-2xl font-quicksand-bold mb-2">
            {product.name}
          </Text>
          <Text className="text-primary-500 text-xl font-quicksand-bold">
            {formatPrice(product.price)}
          </Text>
        </View>

        {/* Statut et performance du produit */}
        <View className="bg-white mt-2 p-4 shadow-sm">
          <Text className="text-neutral-800 text-lg font-quicksand-bold mb-3">
            Performance du produit
          </Text>
          <View className="flex-row flex-wrap mb-4">
            <View className="bg-neutral-50 rounded-lg p-3 mr-2 mb-2 w-[48%]">
              <Text className="text-neutral-500 text-xs font-quicksand-regular">Vues</Text>
              <Text className="text-neutral-800 font-quicksand-medium text-lg">
                {product.stats?.views?.toLocaleString('fr-FR') || '0'}
              </Text>
            </View>
            <View className="bg-neutral-50 rounded-lg p-3 mb-2 w-[48%]">
              <Text className="text-neutral-500 text-xs font-quicksand-regular">Ventes</Text>
              <Text className="text-neutral-800 font-quicksand-medium text-lg">
                {product.stats?.totalSales ? formatPrice(product.stats.totalSales) : '0 FCFA'}
              </Text>
            </View>
            <View className="bg-neutral-50 rounded-lg p-3 mr-2 mb-2 w-[48%]">
              <Text className="text-neutral-500 text-xs font-quicksand-regular">Note moyenne</Text>
              <View className="flex-row items-center">
                <Ionicons name="star" size={16} color="#F59E0B" />
                <Text className="text-neutral-800 font-quicksand-medium ml-1">
                  {product.stats?.averageRating?.toFixed(1) || '0.0'}
                </Text>
              </View>
            </View>
            <View className="bg-neutral-50 rounded-lg p-3 mb-2 w-[48%]">
              <Text className="text-neutral-500 text-xs font-quicksand-regular">Avis clients</Text>
              <Text className="text-neutral-800 font-quicksand-medium text-lg">
                {product.stats?.totalReviews || '0'}
              </Text>
            </View>
          </View>
        </View>

        {/* Caractéristiques du produit */}
        <View className="bg-white mt-2 p-4 shadow-sm">
          <Text className="text-neutral-800 text-lg font-quicksand-bold mb-3">
            Détails du produit
          </Text>
          
          <View className="flex-row flex-wrap mb-4">
            <View className="bg-neutral-50 rounded-lg p-3 mr-2 mb-2 w-[48%]">
              <Text className="text-neutral-500 text-xs font-quicksand-regular">Statut</Text>
              <View className="flex-row items-center">
                <View
                  className={`w-2 h-2 rounded-full mr-2 ${
                    product.isActive ? 'bg-success-500' : 'bg-error-500'
                  }`}
                />
                <Text className="text-neutral-800 font-quicksand-medium">
                  {product.isActive ? 'Actif' : 'Inactif'}
                </Text>
              </View>
            </View>
            <View className="bg-neutral-50 rounded-lg p-3 mb-2 w-[48%]">
              <Text className="text-neutral-500 text-xs font-quicksand-regular">Stock</Text>
              <Text className="text-neutral-800 font-quicksand-medium">{product.stock} unités</Text>
            </View>
            {typeof product.category === 'object' && (
              <View className="bg-neutral-50 rounded-lg p-3 mr-2 mb-2 w-[48%]">
                <Text className="text-neutral-500 text-xs font-quicksand-regular">Catégorie</Text>
                <Text className="text-neutral-800 font-quicksand-medium">{product.category.name}</Text>
              </View>
            )}
            {product.weight && (
              <View className="bg-neutral-50 rounded-lg p-3 mb-2 w-[48%]">
                <Text className="text-neutral-500 text-xs font-quicksand-regular">Poids</Text>
                <Text className="text-neutral-800 font-quicksand-medium">{product.weight} kg</Text>
              </View>
            )}
          </View>

          {/* Description */}
          <Text className="text-neutral-800 text-lg font-quicksand-bold mb-2">
            Description
          </Text>
          <Text 
            className="text-neutral-600 font-quicksand-regular leading-5 mb-3"
            numberOfLines={showFullDescription ? undefined : 3}
          >
            {product.description}
          </Text>
          {product.description && product.description.length > 150 && (
            <TouchableOpacity
              onPress={() => setShowFullDescription(!showFullDescription)}
            >
              <Text className="text-primary-500 font-quicksand-semibold">
                {showFullDescription ? 'Voir moins' : 'Voir plus'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Spécifications */}
          {product.specifications && product.specifications.length > 0 && (
            <View className="mt-4">
              <Text className="text-neutral-800 text-lg font-quicksand-bold mb-3">
                Spécifications techniques
              </Text>
              {product.specifications.map((spec: any, index: number) => (
                <View key={index} className="flex-row justify-between py-2 border-b border-neutral-200">
                  <Text className="text-neutral-500 font-quicksand-regular flex-1">{spec.key}</Text>
                  <Text className="text-neutral-700 font-quicksand-medium flex-1 text-right">
                    {spec.value}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Informations sur l'entreprise */}
        <View className="bg-white mt-2 p-4 shadow-sm">
          <Text className="text-neutral-800 text-lg font-quicksand-bold mb-3">
            Informations sur votre entreprise
          </Text>
          
          <View className="bg-neutral-50 rounded-lg p-4">
            <View className="flex-row items-center mb-3">
              {typeof product.enterprise === 'object' && product.enterprise.logo ? (
                <Image 
                  source={{ uri: product.enterprise.logo }}
                  className="w-14 h-14 rounded-full mr-3"
                />
              ) : (
                <View className="w-14 h-14 rounded-full bg-primary-500 items-center justify-center mr-3">
                  <Text className="text-white font-quicksand-bold text-lg">
                    {typeof product.enterprise === 'object' && product.enterprise.companyName
                      ? product.enterprise.companyName.charAt(0)
                      : "E"}
                  </Text>
                </View>
              )}
              <View>
                <Text className="text-neutral-800 font-quicksand-bold text-base">
                  {typeof product.enterprise === 'object' && product.enterprise.companyName 
                    ? product.enterprise.companyName 
                    : "Votre Entreprise"}
                </Text>
                <View className="flex-row items-center mt-1">
                  <Ionicons name="shield-checkmark-outline" size={14} color="#64748B" />
                  <Text className="text-neutral-600 font-quicksand-medium ml-1 text-sm">
                    {typeof product.enterprise === 'object' && product.enterprise.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Statistiques de l'entreprise */}
            <View className="mt-3 mb-3">
              <View className="flex-row justify-between py-2 border-b border-neutral-100">
                <Text className="text-neutral-500 font-quicksand-regular">Localisation</Text>
                <Text className="text-neutral-700 font-quicksand-medium">
                  {typeof product.enterprise === 'object' && product.enterprise.location 
                    ? `${product.enterprise.location.district}, ${product.enterprise.location.city}` 
                    : "Non spécifiée"}
                </Text>
              </View>

              <View className="flex-row justify-between py-2 border-b border-neutral-100">
                <Text className="text-neutral-500 font-quicksand-regular">Date d&apos;inscription</Text>
                <Text className="text-neutral-700 font-quicksand-medium">
                  {(() => {
                    if (typeof product.enterprise === 'object') {
                      const dateToFormat = product.enterprise.createdAt || product.enterprise.lastActiveDate;
                      if (dateToFormat) {
                        const dateString = typeof dateToFormat === 'string' ? dateToFormat : dateToFormat.toISOString();
                        return formatDate(dateString);
                      }
                    }
                    return "Non disponible";
                  })()}
                </Text>
              </View>
              
              <View className="flex-row justify-between py-2 border-b border-neutral-100">
                <Text className="text-neutral-500 font-quicksand-regular">Commandes totales</Text>
                <Text className="text-neutral-700 font-quicksand-medium">
                  {typeof product.enterprise === 'object' && product.enterprise.stats?.totalOrders 
                    ? product.enterprise.stats.totalOrders 
                    : "0"}
                </Text>
              </View>

              <View className="flex-row justify-between py-2">
                <Text className="text-neutral-500 font-quicksand-regular">Note entreprise</Text>
                <View className="flex-row items-center">
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text className="text-neutral-700 font-quicksand-medium ml-1">
                    {typeof product.enterprise === 'object' && product.enterprise.stats?.averageRating 
                      ? `${product.enterprise.stats?.averageRating?.toFixed(1)} (${product.enterprise.stats?.totalReviews || 0} avis)` 
                      : "Non évalué"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Informations supplémentaires */}
        <View className="bg-white mt-2 p-4 shadow-sm mb-6">
          <Text className="text-neutral-800 text-lg font-quicksand-bold mb-3">
            Informations de gestion
          </Text>
          
          <View className="flex-row justify-between py-3 border-b border-neutral-100">
            <Text className="text-neutral-500 font-quicksand-regular">Date de création</Text>
            <Text className="text-neutral-700 font-quicksand-medium">
              {formatDate(product.createdAt)}
            </Text>
          </View>

          <View className="flex-row justify-between py-3 border-b border-neutral-100">
            <Text className="text-neutral-500 font-quicksand-regular">Dernière modification</Text>
            <Text className="text-neutral-700 font-quicksand-medium">
              {formatDate(product.updatedAt)}
            </Text>
          </View>
          
          <View className="flex-row justify-between py-3 border-b border-neutral-100">
            <Text className="text-neutral-500 font-quicksand-regular">Chiffre d&apos;affaires</Text>
            <Text className="text-primary-500 font-quicksand-semibold">
              {product.stats?.totalSales ? formatPrice(product.stats.totalSales) : '0 FCFA'}
            </Text>
          </View>

          <View className="flex-row justify-between py-3 border-b border-neutral-100">
            <Text className="text-neutral-500 font-quicksand-regular">Total des vues</Text>
            <Text className="text-neutral-700 font-quicksand-medium">
              {product.stats?.views?.toLocaleString('fr-FR') || '0'}
            </Text>
          </View>

          <View className="flex-row justify-between py-3">
            <Text className="text-neutral-500 font-quicksand-regular">Évaluations clients</Text>
            <View className="flex-row items-center">
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text className="text-neutral-700 font-quicksand-medium ml-1">
                {product.stats?.averageRating?.toFixed(1) || '0.0'} ({product.stats?.totalReviews || 0} avis)
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Boutons d'action fixes en bas */}
      <View className="bg-white p-4 border-t border-neutral-200 shadow-lg">
        <View className="flex-row">
          <View className="flex-1 mr-2">
            <TouchableOpacity
              onPress={handleToggleStatus}
              className={`${product.isActive ? 'bg-warning-500' : 'bg-success-500'} py-3 rounded-2xl flex-row items-center justify-center`}
            >
              <Ionicons 
                name={product.isActive ? "power" : "checkmark-circle"} 
                size={20} 
                color="white"
                style={{ marginRight: 8 }} 
              />
              <Text className="text-white font-quicksand-semibold">
                {product.isActive ? 'Désactiver' : 'Activer'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View className="flex-1 mr-2">
            <TouchableOpacity
              onPress={handleEditProduct}
              className="bg-primary-500 py-3 rounded-2xl flex-row items-center justify-center"
            >
              <Ionicons name="pencil" size={18} color="white" style={{ marginRight: 8 }} />
              <Text className="text-white font-quicksand-semibold">
                Modifier
              </Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            onPress={handleDeleteProduct}
            className="bg-error-500 py-3 px-3 rounded-2xl items-center justify-center"
          >
            <Ionicons name="trash" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
