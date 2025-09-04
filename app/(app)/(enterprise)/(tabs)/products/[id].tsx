import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from "../../../../../components/ui/ToastManager";
import ProductService from "../../../../../services/api/ProductService";
import { Product } from "../../../../../types/product";

const { width: screenWidth } = Dimensions.get('window');

export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Référence et variables pour le carrousel d'images
  const imagesListRef = useRef<FlatList<string>>(null);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'android' ? 0 : 0 }}>
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
              Gestion produit
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
              <Ionicons name="images-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

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
        {/* Images Carousel */}
        <View style={{ marginTop: insets.top }}>
          {product.images && product.images.length > 0 ? (
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
              {product.images.length > 1 && (
                <View className="absolute bottom-4 left-0 right-0 flex-row justify-center">
                  {product.images.map((_, index) => {
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
              <View className="absolute top-3 right-3 bg-black/40 px-3 py-1 rounded-full">
                <Text className="text-white text-xs font-quicksand-medium">
                  {currentImageIndex + 1}/{product.images.length}
                </Text>
              </View>
            </View>
          ) : (
            <View className="w-full h-[320px] bg-neutral-100 items-center justify-center">
              <Ionicons name="image" size={48} color="#9CA3AF" />
              <Text className="mt-2 text-neutral-500 font-quicksand-medium">Aucune image</Text>
            </View>
          )}
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

        {/* Product Main Card */}
        <View className="px-6 py-6">
          <View className="mb-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-2xl font-quicksand-bold text-primary-500 mb-2">
                  {formatPrice(product.price)}
                </Text>
                <Text className="text-xl font-quicksand-bold text-neutral-800 mb-2">
                  {product.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleToggleStatus}
                className={`px-4 py-2 rounded-2xl ${product.isActive ? 'bg-success-100' : 'bg-error-100'}`}
              >
                <Text className={`font-quicksand-semibold text-sm ${product.isActive ? 'text-success-700' : 'text-error-700'}`}>
                  {product.isActive ? 'Actif' : 'Inactif'}
                </Text>
              </TouchableOpacity>
            </View>
            {product.description && (
              <Text className="text-neutral-600 font-quicksand-medium mt-2" numberOfLines={showFullDescription ? undefined : 3}>
                {product.description}
              </Text>
            )}
            {product.description && product.description.length > 150 && (
              <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
                <Text className="text-primary-500 font-quicksand-semibold mt-1">
                  {showFullDescription ? 'Voir moins' : 'Voir plus'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Performance */}
          <View className="mb-6">
            <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3">Performance</Text>
            <View className="flex-row flex-wrap -mx-1">
              <View className="w-1/2 px-1 mb-2">
                <View className="bg-neutral-50 rounded-2xl p-4">
                  <Text className="text-xs text-neutral-500 font-quicksand-regular mb-1">Vues</Text>
                  <Text className="text-lg font-quicksand-bold text-neutral-800">
                    {product.stats?.views?.toLocaleString('fr-FR') || '0'}
                  </Text>
                </View>
              </View>
              <View className="w-1/2 px-1 mb-2">
                <View className="bg-neutral-50 rounded-2xl p-4">
                  <Text className="text-xs text-neutral-500 font-quicksand-regular mb-1">Chiffre d&apos;affaires</Text>
                  <Text className="text-lg font-quicksand-bold text-primary-600">
                    {product.stats?.totalSales ? formatPrice(product.stats.totalSales) : '0 FCFA'}
                  </Text>
                </View>
              </View>
              <View className="w-1/2 px-1 mb-2">
                <View className="bg-neutral-50 rounded-2xl p-4">
                  <Text className="text-xs text-neutral-500 font-quicksand-regular mb-1">Note moyenne</Text>
                  <View className="flex-row items-center">
                    <Ionicons name="star" size={14} color="#F59E0B" />
                    <Text className="ml-1 font-quicksand-bold text-neutral-800">
                      {product.stats?.averageRating?.toFixed(1) || '0.0'}
                    </Text>
                  </View>
                </View>
              </View>
              <View className="w-1/2 px-1 mb-2">
                <View className="bg-neutral-50 rounded-2xl p-4">
                  <Text className="text-xs text-neutral-500 font-quicksand-regular mb-1">Avis</Text>
                  <Text className="text-lg font-quicksand-bold text-neutral-800">
                    {product.stats?.totalReviews || '0'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Détails techniques */}
            <View className="mb-6">
              <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3">Détails</Text>
              <View className="flex-row flex-wrap -mx-1">
                <View className="w-1/2 px-1 mb-3">
                  <View className="bg-neutral-50 rounded-2xl p-4">
                    <Text className="text-xs text-neutral-500 font-quicksand-regular mb-1">Stock</Text>
                    <Text className="text-base font-quicksand-bold text-neutral-800">{product.stock} unités</Text>
                  </View>
                </View>
                {typeof product.category === 'object' && (
                  <View className="w-1/2 px-1 mb-3">
                    <View className="bg-neutral-50 rounded-2xl p-4">
                      <Text className="text-xs text-neutral-500 font-quicksand-regular mb-1">Catégorie</Text>
                      <Text className="text-base font-quicksand-bold text-neutral-800">{product.category.name}</Text>
                    </View>
                  </View>
                )}
                {product.weight && (
                  <View className="w-1/2 px-1 mb-3">
                    <View className="bg-neutral-50 rounded-2xl p-4">
                      <Text className="text-xs text-neutral-500 font-quicksand-regular mb-1">Poids</Text>
                      <Text className="text-base font-quicksand-bold text-neutral-800">{product.weight} kg</Text>
                    </View>
                  </View>
                )}
                <View className="w-1/2 px-1 mb-3">
                  <View className="bg-neutral-50 rounded-2xl p-4">
                    <Text className="text-xs text-neutral-500 font-quicksand-regular mb-1">Créé le</Text>
                    <Text className="text-base font-quicksand-bold text-neutral-800">{formatDate(product.createdAt)}</Text>
                  </View>
                </View>
                <View className="w-1/2 px-1 mb-3">
                  <View className="bg-neutral-50 rounded-2xl p-4">
                    <Text className="text-xs text-neutral-500 font-quicksand-regular mb-1">Mise à jour</Text>
                    <Text className="text-base font-quicksand-bold text-neutral-800">{formatDate(product.updatedAt)}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Spécifications techniques */}
            {product.specifications && product.specifications.length > 0 && (
              <View className="mb-6">
                <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3">Spécifications</Text>
                {product.specifications.map((spec: any, index: number) => (
                  <View key={index} className="flex-row justify-between py-3 border-b border-neutral-100">
                    <Text className="text-neutral-500 font-quicksand-regular flex-1 mr-4">{spec.key}</Text>
                    <Text className="text-neutral-700 font-quicksand-medium flex-1 text-right">{spec.value}</Text>
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

        {/* (Section Informations supplémentaires intégrée plus haut dans Détails / Performance) */}
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
