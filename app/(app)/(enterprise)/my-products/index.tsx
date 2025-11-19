import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProductService from '../../../../services/api/ProductService';
import { Product } from '../../../../types/product';

export default function MyProductsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Charger les produits de l'entreprise
  const loadProducts = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const response = await ProductService.getEnterpriseProducts(pageNum, 20);

      if (isRefresh) {
        setProducts(response.products || []);
      } else {
        setProducts(prev => pageNum === 1 ? (response.products || []) : [...prev, ...(response.products || [])]);
      }

      setHasMore((response.products || []).length === 20);
      setPage(pageNum);
    } catch (error: any) {
      console.error('❌ Erreur chargement produits:', error);
      Alert.alert('Erreur', error.message || 'Impossible de charger les produits');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  // Rafraîchir les données
  const refreshProducts = async () => {
    setRefreshing(true);
    await loadProducts(1, true);
  };

  // Charger plus de produits
  const loadMoreProducts = async () => {
    if (!loadingMore && hasMore) {
      await loadProducts(page + 1);
    }
  };

  // Charger les données au montage
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Formater le prix
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  // Rendu d'un produit
  const renderProduct = (item: Product) => (
    <TouchableOpacity
      key={item._id}
      className="bg-white rounded-2xl shadow-md border border-neutral-100 p-3 mb-4 overflow-hidden"
      onPress={() => {
        try {
          router.push(`/(app)/(enterprise)/(tabs)/product/${item._id}`);
        } catch (error) {
          console.warn('Erreur navigation produit:', error);
        }
      }}
    >
      <View className="relative">
        <Image
          source={{ uri: item.images[0] || "https://via.placeholder.com/150x150/CCCCCC/FFFFFF?text=No+Image" }}
          className="w-full h-40 rounded-xl"
          resizeMode="cover"
        />
        {/* Badge pour les produits avec beaucoup de ventes */}
        {item.stats?.totalSales > 10 && (
          <View className="absolute top-2 left-2 bg-success-500 rounded-full px-2 py-1">
            <Text style={{ fontFamily: 'Quicksand-Bold' }} className="text-white text-xs">
              Populaire
            </Text>
          </View>
        )}
        {/* Badge pour le statut */}
        <View className="absolute top-2 right-2 bg-primary-500 rounded-full px-2 py-1">
          <Text style={{ fontFamily: 'Quicksand-Bold' }} className="text-white text-xs">
            {item.isActive ? 'Actif' : 'Inactif'}
          </Text>
        </View>
      </View>
      <View className="p-3">
        <Text numberOfLines={2} style={{ fontFamily: 'Quicksand-SemiBold' }} className="text-base text-neutral-800 mb-2">
          {item.name}
        </Text>
        <Text style={{ fontFamily: 'Quicksand-Regular' }} className="text-sm text-neutral-600 mb-2" numberOfLines={2}>
          {item.description}
        </Text>
        <View className="flex-row items-center justify-between">
          <Text style={{ fontFamily: 'Quicksand-Bold' }} className="text-lg text-primary-600">
            {formatPrice(item.price)}
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={{ fontFamily: 'Quicksand-Regular' }} className="text-sm text-neutral-600 ml-1">
              {item.stats?.averageRating?.toFixed(1) || '0.0'}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center justify-between mt-2">
          <Text style={{ fontFamily: 'Quicksand-Regular' }} className="text-xs text-neutral-500">
            {item.stats?.totalSales || 0} vente{(item.stats?.totalSales || 0) > 1 ? 's' : ''}
          </Text>
          <Text style={{ fontFamily: 'Quicksand-Regular' }} className="text-xs text-neutral-500">
            {typeof item.category === 'object' ? item.category.name : item.category || 'Sans catégorie'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
    <View className="bg-white rounded-2xl shadow-md border border-neutral-100 p-3 mb-4 overflow-hidden">
      <ShimmerBlock style={{ height: 160, borderRadius: 12, width: '100%' }} />
      <View className="p-3">
        <ShimmerBlock style={{ height: 16, borderRadius: 8, width: '80%', marginBottom: 8 }} />
        <ShimmerBlock style={{ height: 12, borderRadius: 6, width: '60%', marginBottom: 8 }} />
        <ShimmerBlock style={{ height: 18, borderRadius: 9, width: '40%' }} />
      </View>
    </View>
  );

  const renderSkeleton = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View className="px-4 py-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonProduct key={index} />
        ))}
      </View>
    </ScrollView>
  );

  if (loading && products.length === 0) {
    return (
      <View className="flex-1 bg-background-secondary">
        <ExpoStatusBar style="light" translucent />
        {/* Header */}
        <LinearGradient
          colors={['#10B981', '#34D399']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="px-6"
          style={{ 
            paddingTop: insets.top + 16, 
            paddingLeft: insets.left + 24,
            paddingRight: insets.right + 24,
            paddingBottom: 16 
          }}
        >
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={{ fontFamily: 'Quicksand-Bold' }} className="text-xl text-white flex-1 text-center">
              Mes Produits
            </Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        {renderSkeleton()}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-secondary">
      <ExpoStatusBar style="light" translucent />
      {/* Header */}
      <LinearGradient
        colors={['#10B981', '#34D399']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="px-6"
        style={{ 
          paddingTop: insets.top + 16, 
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
          paddingBottom: 16 
        }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <Text style={{ fontFamily: 'Quicksand-Bold' }} className="text-xl text-white">
              Mes Produits
            </Text>
            <Text style={{ fontFamily: 'Quicksand-Medium' }} className="text-sm text-white/80">
              Gérez votre catalogue
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              // TODO: Navigate to create product page
              Alert.alert('Fonctionnalité à venir', 'La création de produit sera disponible prochainement');
            }}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Contenu */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshProducts}
            colors={['#10B981']}
            tintColor="#10B981"
          />
        }
        onMomentumScrollEnd={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
          if (isCloseToBottom) {
            loadMoreProducts();
          }
        }}
      >
        {/* Statistiques rapides */}
        <View className="px-4 py-4">
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100">
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ fontFamily: 'Quicksand-SemiBold' }} className="text-sm text-neutral-700">
                Aperçu rapide
              </Text>
              <Ionicons name="stats-chart" size={16} color="#10B981" />
            </View>
            <View className="flex-row justify-between">
              <View className="items-center flex-1">
                <Text style={{ fontFamily: 'Quicksand-Bold' }} className="text-lg text-primary-600">
                  {products.filter(p => p.isActive).length}
                </Text>
                <Text style={{ fontFamily: 'Quicksand-Regular' }} className="text-xs text-neutral-600">Actifs</Text>
              </View>
              <View className="items-center flex-1">
                <Text style={{ fontFamily: 'Quicksand-Bold' }} className="text-lg text-warning-600">
                  {products.filter(p => !p.isActive).length}
                </Text>
                <Text style={{ fontFamily: 'Quicksand-Regular' }} className="text-xs text-neutral-600">Inactifs</Text>
              </View>
              <View className="items-center flex-1">
                <Text style={{ fontFamily: 'Quicksand-Bold' }} className="text-lg text-success-600">
                  {products.reduce((sum, p) => sum + (p.stats?.totalSales || 0), 0)}
                </Text>
                <Text style={{ fontFamily: 'Quicksand-Regular' }} className="text-xs text-neutral-600">Ventes</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Liste des produits */}
        <View className="px-4 pb-4">
          {products.length > 0 ? (
            <>
              {products.map(renderProduct)}
              {loadingMore && (
                <View className="items-center py-4">
                  <ActivityIndicator size="small" color="#10B981" />
                  <Text style={{ fontFamily: 'Quicksand-Regular' }} className="text-sm text-neutral-600 mt-2">Chargement...</Text>
                </View>
              )}
            </>
          ) : (
            <View className="items-center justify-center py-12">
              <Ionicons name="storefront-outline" size={48} color="#9CA3AF" />
              <Text style={{ fontFamily: 'Quicksand-SemiBold' }} className="text-lg text-neutral-800 mt-4">
                Aucun produit
              </Text>
              <Text style={{ fontFamily: 'Quicksand-Regular' }} className="text-sm text-neutral-600 text-center mt-2">
                Vous n&apos;avez pas encore ajouté de produits à votre catalogue.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  router.push('/(app)/(enterprise)/(tabs)/products/create');
                }}
                className="mt-6 bg-primary-500 px-6 py-3 rounded-xl"
              >
                <Text style={{ fontFamily: 'Quicksand-SemiBold' }} className="text-white">Ajouter un produit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Espace pour la navbar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}