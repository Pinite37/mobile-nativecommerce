import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
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
  View
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import NotificationModal, { useNotification } from "../../../../../components/ui/NotificationModal";
import { useToast } from "../../../../../components/ui/ToastManager";
import ProductService from "../../../../../services/api/ProductService";
import { Product } from "../../../../../types/product";

const { width: screenWidth } = Dimensions.get('window');

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
  <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
    <ExpoStatusBar style="light" translucent backgroundColor="transparent" />
    
    {/* Header Skeleton */}
    <LinearGradient
      colors={['rgba(0,0,0,0.6)', 'transparent']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      className="absolute top-0 left-0 right-0 z-10"
      style={{ paddingTop: Platform.OS === 'ios' ? 50 : 30 }}
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
      <View style={{ marginTop: Platform.OS === 'ios' ? 100 : 80 }}>
        <ShimmerBlock style={{ width: '100%', height: 350 }} />
        
        {/* Indicators Skeleton */}
        <View className="absolute bottom-4 left-0 right-0 flex-row justify-center">
          {[1, 2, 3].map((i) => (
            <ShimmerBlock key={i} style={{ width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 }} />
          ))}
        </View>
        
        {/* Counter Skeleton */}
        <View className="absolute top-3 right-3">
          <ShimmerBlock style={{ width: 60, height: 24, borderRadius: 12 }} />
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

      {/* Product Info Skeleton */}
      <View className="px-6 py-6">
        {/* Price and Name */}
        <View className="mb-4">
          <ShimmerBlock style={{ width: '30%', height: 32, borderRadius: 16, marginBottom: 12 }} />
          <ShimmerBlock style={{ width: '80%', height: 28, borderRadius: 14, marginBottom: 8 }} />
          <ShimmerBlock style={{ width: '100%', height: 16, borderRadius: 8, marginBottom: 4 }} />
          <ShimmerBlock style={{ width: '60%', height: 16, borderRadius: 8 }} />
        </View>

        {/* Status Button Skeleton */}
        <View className="mb-6">
          <ShimmerBlock style={{ width: 80, height: 32, borderRadius: 16, alignSelf: 'flex-start' }} />
        </View>

        {/* Informations Section Skeleton */}
        <View className="mb-6">
          <View className="flex-row items-center mb-4">
            <ShimmerBlock style={{ width: 6, height: 24, borderRadius: 3, marginRight: 12 }} />
            <ShimmerBlock style={{ width: '30%', height: 24, borderRadius: 12 }} />
          </View>
          
          <View className="bg-gradient-to-br from-primary-50 to-white border border-primary-100 rounded-3xl p-5 mb-4">
            <View className="flex-row items-center mb-4">
              <ShimmerBlock style={{ width: 48, height: 48, borderRadius: 24, marginRight: 16 }} />
              <View className="flex-1">
                <ShimmerBlock style={{ width: '60%', height: 20, borderRadius: 10, marginBottom: 8 }} />
                <ShimmerBlock style={{ width: '40%', height: 16, borderRadius: 8 }} />
              </View>
              <ShimmerBlock style={{ width: 60, height: 24, borderRadius: 12 }} />
            </View>
            
            <View className="border-t border-primary-100 pt-4">
              <View className="flex-row flex-wrap -mx-2">
                {[1, 2, 3, 4].map((i) => (
                  <View key={i} className="w-1/2 px-2 mb-3">
                    <View className="flex-row items-center">
                      <ShimmerBlock style={{ width: 16, height: 16, borderRadius: 8, marginRight: 8 }} />
                      <ShimmerBlock style={{ width: '60%', height: 12, borderRadius: 6 }} />
                    </View>
                    <ShimmerBlock style={{ width: '80%', height: 14, borderRadius: 7, marginTop: 4 }} />
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Specifications Skeleton */}
        <View className="mb-6">
          <View className="flex-row items-center mb-4">
            <ShimmerBlock style={{ width: 6, height: 24, borderRadius: 3, marginRight: 12 }} />
            <ShimmerBlock style={{ width: '35%', height: 24, borderRadius: 12 }} />
          </View>
          
          <View className="bg-white border border-neutral-200 rounded-3xl overflow-hidden">
            {[1, 2, 3].map((i) => (
              <View 
                key={i} 
                className={`flex-row items-center py-4 px-5 ${i !== 3 ? 'border-b border-neutral-100' : ''}`}
              >
                <ShimmerBlock style={{ width: 8, height: 8, borderRadius: 4, marginRight: 12 }} />
                <ShimmerBlock style={{ width: '40%', height: 16, borderRadius: 8, marginRight: 16 }} />
                <ShimmerBlock style={{ width: '30%', height: 16, borderRadius: 8 }} />
              </View>
            ))}
          </View>
        </View>

        {/* Enterprise Section Skeleton */}
        <View className="px-6 mb-6">
          <View className="flex-row items-center mb-4">
            <ShimmerBlock style={{ width: 6, height: 24, borderRadius: 3, marginRight: 12 }} />
            <ShimmerBlock style={{ width: '40%', height: 24, borderRadius: 12 }} />
          </View>
          
          <View className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-3xl p-5">
            <View className="flex-row items-center mb-5">
              <ShimmerBlock style={{ width: 64, height: 64, borderRadius: 16, marginRight: 16 }} />
              <View className="flex-1">
                <ShimmerBlock style={{ width: '70%', height: 20, borderRadius: 10, marginBottom: 8 }} />
                <ShimmerBlock style={{ width: '50%', height: 16, borderRadius: 8 }} />
              </View>
            </View>

            <View className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <View key={i} className="flex-row items-center py-3">
                  <ShimmerBlock style={{ width: 40, height: 40, borderRadius: 12, marginRight: 12 }} />
                  <View className="flex-1">
                    <ShimmerBlock style={{ width: '30%', height: 12, borderRadius: 6, marginBottom: 6 }} />
                    <ShimmerBlock style={{ width: '60%', height: 14, borderRadius: 7 }} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>

    {/* Bottom Actions Skeleton */}
    <View className="bg-white px-6 py-4 border-t border-neutral-100">
      <View className="flex-row space-x-3">
        <ShimmerBlock style={{ width: '40%', height: 56, borderRadius: 16 }} />
        <ShimmerBlock style={{ width: '40%', height: 56, borderRadius: 16 }} />
        <ShimmerBlock style={{ width: 56, height: 56, borderRadius: 16 }} />
      </View>
    </View>
  </SafeAreaView>
);

export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { notification, hideNotification } = useNotification();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    type: 'toggle_status' | 'delete';
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
    onConfirm: () => void;
  } | null>(null);
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

  // Fonctions de confirmation modal
  const showConfirmation = (type: 'toggle_status' | 'delete', onConfirm: () => void) => {
    if (!product) return;
    
    let title = '';
    let message = '';
    let confirmText = '';
    let confirmColor = '';

    switch (type) {
      case 'toggle_status':
        const action = product.isActive ? 'désactiver' : 'activer';
        title = `${action.charAt(0).toUpperCase() + action.slice(1)} le produit`;
        message = `Voulez-vous vraiment ${action} ce produit ?`;
        confirmText = action.charAt(0).toUpperCase() + action.slice(1);
        confirmColor = product.isActive ? '#F59E0B' : '#10B981';
        break;
      case 'delete':
        title = 'Supprimer le produit';
        message = 'Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.';
        confirmText = 'Supprimer';
        confirmColor = '#EF4444';
        break;
    }

    setConfirmationAction({ type, title, message, confirmText, confirmColor, onConfirm });
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
    showConfirmation('toggle_status', async () => {
      try {
        console.log('🔄 Changement de statut:', product!._id, !product!.isActive);
        await ProductService.toggleProductStatus(product!._id, !product!.isActive);
        setProduct(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
        showSuccess(`Produit ${product!.isActive ? 'désactivé' : 'activé'} avec succès`);
      } catch (error: any) {
        console.error('❌ Erreur changement statut:', error);
        showError('Erreur', error.message || 'Une erreur est survenue');
      }
    });
  };

  const handleDeleteProduct = async () => {
    showConfirmation('delete', async () => {
      try {
        console.log('🗑️ Suppression du produit:', product!._id);
        await ProductService.deleteProduct(product!._id);
        showSuccess("Produit supprimé avec succès");
        router.back();
      } catch (error: any) {
        console.error('❌ Erreur suppression:', error);
        showError('Erreur', error.message || 'Une erreur est survenue');
      }
    });
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
    return <SkeletonProduct />;
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

          {/* Informations du produit - Temporairement commenté pour debug */}
          {/* <View className="mb-6">
            <View className="flex-row items-center mb-4">
              <View className="w-1 h-6 bg-primary-500 rounded-full mr-3" />
              <Text className="text-xl font-quicksand-bold text-neutral-800">Informations</Text>
            </View>
            
            <View className="bg-gradient-to-br from-primary-50 to-white border border-primary-100 rounded-3xl p-5 mb-4">
              <View className="flex-row items-center mb-4">
                <View className="w-12 h-12 bg-primary-500 rounded-2xl items-center justify-center mr-4">
                  <Ionicons name="cube-outline" size={24} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-quicksand-medium text-neutral-500 mb-1">Stock disponible</Text>
                  <Text className="text-2xl font-quicksand-bold text-neutral-800">
                    {String(product.stock || 0)} <Text className="text-base font-quicksand-semibold text-neutral-500">unités</Text>
                  </Text>
                </View>
                <View className={`px-3 py-1 rounded-full ${product.stock > 10 ? 'bg-success-100' : product.stock > 0 ? 'bg-warning-100' : 'bg-error-100'}`}>
                  <Text className={`text-xs font-quicksand-bold ${product.stock > 10 ? 'text-success-700' : product.stock > 0 ? 'text-warning-700' : 'text-error-700'}`}>
                    {product.stock > 10 ? 'En stock' : product.stock > 0 ? 'Stock faible' : 'Épuisé'}
                  </Text>
                </View>
              </View>
              
              <View className="border-t border-primary-100 pt-4">
                <View className="flex-row flex-wrap -mx-2">
                  {typeof product.category === 'object' && product.category?.name && (
                    <View className="w-1/2 px-2 mb-3">
                      <View className="flex-row items-center">
                        <Ionicons name="pricetag" size={16} color="#FE8C00" />
                        <Text className="ml-2 text-xs font-quicksand-medium text-neutral-500">Catégorie</Text>
                      </View>
                      <Text className="mt-1 text-sm font-quicksand-semibold text-neutral-800">{String(product.category.name)}</Text>
                    </View>
                  )}
                  
                  {product.weight && (
                    <View className="w-1/2 px-2 mb-3">
                      <View className="flex-row items-center">
                        <Ionicons name="barbell" size={16} color="#FE8C00" />
                        <Text className="ml-2 text-xs font-quicksand-medium text-neutral-500">Poids</Text>
                      </View>
                      <Text className="mt-1 text-sm font-quicksand-semibold text-neutral-800">{`${product.weight} kg`}</Text>
                    </View>
                  )}
                  
                  <View className="w-1/2 px-2 mb-3">
                    <View className="flex-row items-center">
                      <Ionicons name="calendar" size={16} color="#FE8C00" />
                      <Text className="ml-2 text-xs font-quicksand-medium text-neutral-500">Créé le</Text>
                    </View>
                    <Text className="mt-1 text-sm font-quicksand-semibold text-neutral-800">{formatDate(product.createdAt)}</Text>
                  </View>
                  
                  <View className="w-1/2 px-2 mb-3">
                    <View className="flex-row items-center">
                      <Ionicons name="sync" size={16} color="#FE8C00" />
                      <Text className="ml-2 text-xs font-quicksand-medium text-neutral-500">Mis à jour</Text>
                    </View>
                    <Text className="mt-1 text-sm font-quicksand-semibold text-neutral-800">{formatDate(product.updatedAt)}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View> */}

          {/* Spécifications techniques */}
          {product.specifications && product.specifications.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center mb-4">
                <View className="w-1 h-6 bg-primary-500 rounded-full mr-3" />
                <Text className="text-xl font-quicksand-bold text-neutral-800">Spécifications</Text>
              </View>
              
              <View className="bg-white border border-neutral-200 rounded-3xl overflow-hidden">
                {product.specifications.map((spec: any, index: number) => (
                  <View 
                    key={index} 
                    className={`flex-row items-center py-4 px-5 ${index !== product.specifications.length - 1 ? 'border-b border-neutral-100' : ''}`}
                  >
                    <View className="w-2 h-2 bg-primary-500 rounded-full mr-3" />
                    <Text className="flex-1 font-quicksand-semibold text-neutral-600">{String(spec.key)}</Text>
                    <Text className="font-quicksand-bold text-neutral-800">{String(spec.value)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Informations sur l'entreprise */}
        <View className="px-6 mb-6">
          <View className="flex-row items-center mb-4">
            <View className="w-1 h-6 bg-primary-500 rounded-full mr-3" />
            <Text className="text-xl font-quicksand-bold text-neutral-800">Votre Entreprise</Text>
          </View>
          
          <View className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-3xl p-5">
            <View className="flex-row items-center mb-5">
              {typeof product.enterprise === 'object' && product.enterprise.logo ? (
                <Image 
                  source={{ uri: product.enterprise.logo }}
                  className="w-16 h-16 rounded-2xl mr-4"
                  style={{ borderWidth: 2, borderColor: '#FE8C00' }}
                />
              ) : (
                <View className="w-16 h-16 rounded-2xl bg-primary-500 items-center justify-center mr-4" style={{ borderWidth: 2, borderColor: '#FE8C00' }}>
                  <Text className="text-white font-quicksand-bold text-2xl">
                    {typeof product.enterprise === 'object' && product.enterprise.companyName
                      ? product.enterprise.companyName.charAt(0)
                      : "E"}
                  </Text>
                </View>
              )}
              <View className="flex-1">
                <Text className="text-neutral-800 font-quicksand-bold text-lg mb-1">
                  {typeof product.enterprise === 'object' && product.enterprise.companyName 
                    ? product.enterprise.companyName 
                    : "Votre Entreprise"}
                </Text>
                <View className={`flex-row items-center px-3 py-1 rounded-full self-start ${typeof product.enterprise === 'object' && product.enterprise.isActive ? 'bg-success-100' : 'bg-neutral-100'}`}>
                  <Ionicons name="shield-checkmark" size={14} color={typeof product.enterprise === 'object' && product.enterprise.isActive ? '#10B981' : '#64748B'} />
                  <Text className={`font-quicksand-bold ml-1 text-xs ${typeof product.enterprise === 'object' && product.enterprise.isActive ? 'text-success-700' : 'text-neutral-600'}`}>
                    {typeof product.enterprise === 'object' && product.enterprise.isActive ? 'Entreprise active' : 'Inactive'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Statistiques de l'entreprise */}
            <View className="space-y-3">
              <View className="flex-row items-center py-3">
                <View className="w-10 h-10 bg-amber-100 rounded-xl items-center justify-center mr-3">
                  <Ionicons name="location" size={18} color="#F59E0B" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-quicksand-medium text-neutral-500 mb-1">Localisation</Text>
                  <Text className="text-sm font-quicksand-bold text-neutral-800">
                    {typeof product.enterprise === 'object' && product.enterprise.location 
                      ? `${product.enterprise.location.district}, ${product.enterprise.location.city}` 
                      : "Non spécifiée"}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center py-3">
                <View className="w-10 h-10 bg-blue-100 rounded-xl items-center justify-center mr-3">
                  <Ionicons name="calendar" size={18} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-quicksand-medium text-neutral-500 mb-1">Membre depuis</Text>
                  <Text className="text-sm font-quicksand-bold text-neutral-800">
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
              </View>
              
              <View className="flex-row items-center py-3">
                <View className="w-10 h-10 bg-green-100 rounded-xl items-center justify-center mr-3">
                  <Ionicons name="cart" size={18} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-quicksand-medium text-neutral-500 mb-1">Commandes traitées</Text>
                  <Text className="text-sm font-quicksand-bold text-neutral-800">
                    {typeof product.enterprise === 'object' && product.enterprise.stats?.totalOrders 
                      ? `${String(product.enterprise.stats.totalOrders)} commandes` 
                      : "Aucune commande"}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center py-3">
                <View className="w-10 h-10 bg-yellow-100 rounded-xl items-center justify-center mr-3">
                  <Ionicons name="star" size={18} color="#F59E0B" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-quicksand-medium text-neutral-500 mb-1">Note moyenne</Text>
                  <Text className="text-sm font-quicksand-bold text-neutral-800">
                    {typeof product.enterprise === 'object' && product.enterprise.stats?.averageRating 
                      ? `${product.enterprise.stats?.averageRating?.toFixed(1)} ⭐ (${product.enterprise.stats?.totalReviews ? String(product.enterprise.stats.totalReviews) : '0'} avis)` 
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
                {`${currentImageIndex + 1}/${product.images.length}`}
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
      <View className="bg-white px-6 py-4 border-t border-neutral-100">
        <View className="flex-row space-x-3">
          <TouchableOpacity
            onPress={handleToggleStatus}
            className={`flex-1 py-4 rounded-2xl flex-row items-center justify-center ${product.isActive ? 'bg-warning-500' : 'bg-success-500'}`}
            style={{ 
              shadowColor: product.isActive ? '#F59E0B' : '#10B981',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5
            }}
          >
            <Ionicons 
              name={product.isActive ? "power" : "checkmark-circle"} 
              size={22} 
              color="white"
            />
            <Text className="text-white font-quicksand-bold ml-2 text-base">
              {product.isActive ? 'Désactiver' : 'Activer'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleEditProduct}
            className="flex-1 bg-primary-500 py-4 rounded-2xl flex-row items-center justify-center"
            style={{ 
              shadowColor: '#FE8C00',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5
            }}
          >
            <Ionicons name="pencil" size={20} color="white" />
            <Text className="text-white font-quicksand-bold ml-2 text-base">
              Modifier
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleDeleteProduct}
            className="bg-error-500 w-14 h-14 rounded-2xl items-center justify-center"
            style={{ 
              shadowColor: '#EF4444',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5
            }}
          >
            <Ionicons name="trash" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de confirmation */}
      <Modal
        visible={confirmationVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeConfirmation}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <View className="items-center mb-4">
              <View 
                className="w-16 h-16 rounded-full items-center justify-center mb-3"
                style={{ backgroundColor: confirmationAction?.confirmColor + '20' }}
              >
                <Ionicons 
                  name={confirmationAction?.type === 'delete' ? 'trash' : 'power'} 
                  size={28} 
                  color={confirmationAction?.confirmColor} 
                />
              </View>
              <Text className="text-xl font-quicksand-bold text-neutral-800 text-center">
                {confirmationAction?.title}
              </Text>
            </View>
            
            <Text className="text-base text-neutral-600 font-quicksand-medium mb-6 text-center">
              {confirmationAction?.message}
            </Text>
            
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-neutral-100 rounded-2xl py-4"
                onPress={closeConfirmation}
              >
                <Text className="text-neutral-700 font-quicksand-bold text-center text-base">Annuler</Text>
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
        type={notification?.type || 'info'}
        title={notification?.title || ''}
        message={notification?.message || ''}
        onClose={hideNotification}
      />
    </SafeAreaView>
  );
}
