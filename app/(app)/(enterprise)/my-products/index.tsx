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
import { useLocale } from '../../../../contexts/LocaleContext';
import { useTheme } from '../../../../contexts/ThemeContext';
import i18n from '../../../../i18n/i18n';
import ProductService from '../../../../services/api/ProductService';
import { Product } from '../../../../types/product';

export default function MyProductsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locale } = useLocale();
  const { colors, isDark } = useTheme();
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
    return new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US').format(price) + ' FCFA';
  };

  // Rendu d'un produit
  const renderProduct = (item: Product) => (
    <TouchableOpacity
      key={item._id}
      style={{
        backgroundColor: colors.card,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 12,
        marginBottom: 16,
        overflow: 'hidden'
      }}
      onPress={() => {
        try {
          router.push(`/(app)/(enterprise)/product/${item._id}`);
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
          <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: '#10B981', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#FFFFFF', fontFamily: 'Quicksand-Bold', fontSize: 12 }}>
              {i18n.t('enterprise.myProducts.popular')}
            </Text>
          </View>
        )}
        {/* Badge pour le statut */}
        <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: item.isActive ? '#10B981' : '#EF4444', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ color: '#FFFFFF', fontFamily: 'Quicksand-Bold', fontSize: 12 }}>
            {item.isActive ? i18n.t('enterprise.myProducts.active') : i18n.t('enterprise.myProducts.inactive')}
          </Text>
        </View>
      </View>
      <View style={{ padding: 12 }}>
        <Text numberOfLines={2} style={{ color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold', fontSize: 16, marginBottom: 8 }}>
          {item.name}
        </Text>
        <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Regular', fontSize: 14, marginBottom: 8 }} numberOfLines={2}>
          {item.description}
        </Text>
        <View className="flex-row items-center justify-between">
          <Text style={{ color: '#10B981', fontFamily: 'Quicksand-Bold', fontSize: 18 }}>
            {formatPrice(item.price)}
          </Text>
          <View className="flex-row items-center">
            <Ionicons name="star" size={14} color="#FFD700" />
            <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Regular', fontSize: 14, marginLeft: 4 }}>
              {item.stats?.averageRating?.toFixed(1) || '0.0'}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center justify-between mt-2">
          <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Regular', fontSize: 12 }}>
            {item.stats?.totalSales || 0} {i18n.t((item.stats?.totalSales || 0) > 1 ? 'enterprise.myProducts.sales.plural' : 'enterprise.myProducts.sales.singular')}
          </Text>
          <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Regular', fontSize: 12 }}>
            {typeof item.category === 'object' ? item.category.name : item.category || i18n.t('enterprise.myProducts.noCategory')}
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
      <View style={[{ backgroundColor: colors.border, overflow: 'hidden' }, style]}>
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
    <View style={{ backgroundColor: colors.card, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, borderWidth: 1, borderColor: colors.border, padding: 12, marginBottom: 16, overflow: 'hidden' }}>
      <ShimmerBlock style={{ height: 160, borderRadius: 12, width: '100%' }} />
      <View style={{ padding: 12 }}>
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
      <View style={{ flex: 1, backgroundColor: colors.secondary }}>
        <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />
        {/* Header */}
        <LinearGradient
          colors={['#047857', '#10B981']}
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
              {i18n.t('enterprise.myProducts.title')}
            </Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        {renderSkeleton()}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />
      {/* Header */}
      <LinearGradient
        colors={['#047857', '#10B981']}
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
              {i18n.t('enterprise.myProducts.title')}
            </Text>
            <Text style={{ fontFamily: 'Quicksand-Medium' }} className="text-sm text-white/80">
              {i18n.t('enterprise.myProducts.subtitle')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              // TODO: Navigate to create product page
              Alert.alert(i18n.t('enterprise.myProducts.createComingSoon'), i18n.t('enterprise.myProducts.createComingSoonMessage'));
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
          <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, borderWidth: 1, borderColor: colors.border }}>
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold', fontSize: 14 }}>
                {i18n.t('enterprise.myProducts.stats.overview')}
              </Text>
              <Ionicons name="stats-chart" size={16} color="#10B981" />
            </View>
            <View className="flex-row justify-between">
              <View className="items-center flex-1">
                <Text style={{ color: '#10B981', fontFamily: 'Quicksand-Bold', fontSize: 18 }}>
                  {products.filter(p => p.isActive).length}
                </Text>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Regular', fontSize: 12 }}>{i18n.t('enterprise.myProducts.stats.active')}</Text>
              </View>
              <View className="items-center flex-1">
                <Text style={{ color: '#F59E0B', fontFamily: 'Quicksand-Bold', fontSize: 18 }}>
                  {products.filter(p => !p.isActive).length}
                </Text>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Regular', fontSize: 12 }}>{i18n.t('enterprise.myProducts.stats.inactive')}</Text>
              </View>
              <View className="items-center flex-1">
                <Text style={{ color: '#10B981', fontFamily: 'Quicksand-Bold', fontSize: 18 }}>
                  {products.reduce((sum, p) => sum + (p.stats?.totalSales || 0), 0)}
                </Text>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Regular', fontSize: 12 }}>{i18n.t('enterprise.myProducts.stats.sales')}</Text>
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
                  <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Regular', fontSize: 14, marginTop: 8 }}>{i18n.t('enterprise.myProducts.loading')}</Text>
                </View>
              )}
            </>
          ) : (
            <View className="items-center justify-center py-12">
              <Ionicons name="storefront-outline" size={48} color={colors.textSecondary} />
              <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold', fontSize: 18, marginTop: 16 }}>
                {i18n.t('enterprise.myProducts.empty.title')}
              </Text>
              <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Regular', fontSize: 14, textAlign: 'center', marginTop: 8 }}>
                {i18n.t('enterprise.myProducts.empty.message')}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  router.push('/(app)/(enterprise)/(tabs)/products/create');
                }}
                style={{ backgroundColor: '#10B981', marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
              >
                <Text style={{ color: '#FFFFFF', fontFamily: 'Quicksand-SemiBold' }}>{i18n.t('enterprise.myProducts.empty.addButton')}</Text>
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