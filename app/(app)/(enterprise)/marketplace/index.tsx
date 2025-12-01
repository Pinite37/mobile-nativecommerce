import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Image,
  Keyboard,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale } from '../../../../contexts/LocaleContext';
import { useTheme } from '../../../../contexts/ThemeContext';
import i18n from '../../../../i18n/i18n';
import ProductService from '../../../../services/api/ProductService';
import { Product } from '../../../../types/product';

// Types pour les filtres et le tri
type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'name' | 'popular';
type ViewMode = 'grid' | 'list';

export default function MarketplacePage() {
  const insets = useSafeAreaInsets();
  const { locale } = useLocale();
  const { colors, isDark } = useTheme();

  // États principaux
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);

  // Filtres et recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Favoris (simulé)
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Charger les données initiales
  useEffect(() => {
    loadMarketplaceProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, inStockOnly]);

  // Gérer le bouton retour Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showFilters) {
        setShowFilters(false);
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [showFilters]);

  const loadMarketplaceProducts = async (page: number = 1, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Construction des filtres
      const filters: any = {
        page,
        limit: 20,
        sort: sortBy
      };

      // Recherche
      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
        console.log('🔍 Recherche:', filters.search);
      }

      // Filtres de prix
      if (minPrice && minPrice.trim()) {
        const parsedMin = parseFloat(minPrice);
        if (!isNaN(parsedMin) && parsedMin > 0) {
          filters.minPrice = parsedMin;
        }
      }

      if (maxPrice && maxPrice.trim()) {
        const parsedMax = parseFloat(maxPrice);
        if (!isNaN(parsedMax) && parsedMax > 0) {
          filters.maxPrice = parsedMax;
        }
      }

      // Filtre de disponibilité
      if (inStockOnly) {
        filters.inStock = true;
      }

      console.log('🚀 Chargement marketplace - Page:', page, 'Filtres:', filters);

      const response = await ProductService.getAllPublicProducts(filters);

      if (append) {
        setProducts(prev => [...prev, ...response.products]);
      } else {
        setProducts(response.products);
      }

      setCurrentPage(response.pagination?.page || page);
      setTotalPages(response.pagination?.pages || 1);
      setTotalProducts(response.pagination?.total || response.products.length);
      setHasNextPage((response.products || []).length === 20);

      console.log('✅ Produits marketplace chargés:', response.products.length);
    } catch (error) {
      console.error('❌ Erreur chargement marketplace:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    loadMarketplaceProducts(1, false);
  };

  const handleLoadMore = () => {
    if (hasNextPage && !loadingMore) {
      loadMarketplaceProducts(currentPage + 1, true);
    }
  };

  const handleSearch = () => {
    console.log('🔍 Déclenchement recherche:', searchQuery);
    Keyboard.dismiss();
    setCurrentPage(1);
    loadMarketplaceProducts(1, false);
  };

  const handleApplyFilters = () => {
    console.log('✅ Application des filtres', {
      minPrice,
      maxPrice,
      inStockOnly,
      sortBy
    });
    Keyboard.dismiss();
    setShowFilters(false);
    setCurrentPage(1);
    loadMarketplaceProducts(1, false);
  };

  const handleResetFilters = () => {
    console.log('🔄 Réinitialisation des filtres');
    Keyboard.dismiss();
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setSortBy('popular');
    setShowFilters(false);
    setCurrentPage(1);
    loadMarketplaceProducts(1, false);
  };

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(productId)) {
        newFavorites.delete(productId);
      } else {
        newFavorites.add(productId);
      }
      return newFavorites;
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  // Composant Skeleton pour le chargement
  const ShimmerBlock = ({ style }: { style?: any }) => {
    const shimmer = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true }),
          Animated.timing(shimmer, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const translateX = shimmer.interpolate({
      inputRange: [0, 1],
      outputRange: [-150, 150],
    });

    return (
      <View style={[{ backgroundColor: colors.border, overflow: 'hidden' }, style]}>
        <Animated.View
          style={{
            width: 150,
            height: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            transform: [{ translateX }],
          }}
        />
      </View>
    );
  };

  const SkeletonProduct = () => (
    <View style={{ backgroundColor: colors.card, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, marginBottom: 12, width: '48%', overflow: 'hidden' }}>
      <ShimmerBlock style={{ height: 144, borderRadius: 12, width: '100%' }} />
      <View style={{ padding: 8 }}>
        <ShimmerBlock style={{ height: 16, borderRadius: 8, width: '80%', marginBottom: 8 }} />
        <View className="flex-row justify-between items-center">
          <ShimmerBlock style={{ height: 14, borderRadius: 8, width: '40%' }} />
          <ShimmerBlock style={{ height: 14, borderRadius: 8, width: '20%' }} />
        </View>
      </View>
    </View>
  );

  // Rendu d'un produit en mode grille
  const renderProductGrid = (item: Product) => {
    const isFavorite = favorites.has(item._id);
    const enterprise = typeof item.enterprise === 'object' ? item.enterprise : null;

    return (
      <TouchableOpacity
        key={item._id}
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          marginBottom: 12,
          width: '48%',
          overflow: 'hidden',
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          borderWidth: 1,
          borderColor: colors.border
        }}
        onPress={() => router.push(`/(app)/(enterprise)/product/${item._id}`)}
      >
        <View className="relative">
          <Image
            source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }}
            className="w-full h-36 rounded-xl"
            resizeMode="cover"
          />
          <TouchableOpacity
            className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-sm"
            onPress={() => toggleFavorite(item._id)}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite ? '#EF4444' : '#6B7280'}
            />
          </TouchableOpacity>
          {item.stock === 0 && (
            <View className="absolute top-2 left-2 bg-red-500 px-2 py-1 rounded-lg">
              <Text className="text-white text-xs font-quicksand-bold">{i18n.t('enterprise.marketplace.product.outOfStock')}</Text>
            </View>
          )}
        </View>
        <View style={{ padding: 8 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 14, fontFamily: 'Quicksand-Bold' }} numberOfLines={2}>
            {item.name}
          </Text>
          <View className="flex-row items-center justify-between mt-1">
            <Text style={{ color: '#10B981', fontSize: 16, fontFamily: 'Quicksand-Bold' }}>
              {formatPrice(item.price)}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF9C4', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Ionicons name="star" size={10} color="#FBBF24" />
              <Text style={{ color: '#F59E0B', fontSize: 10, fontFamily: 'Quicksand-Bold', marginLeft: 2 }}>
                {item.stats?.averageRating?.toFixed(1) || '0.0'}
              </Text>
            </View>
          </View>
          {enterprise && (
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'Quicksand-Medium', marginTop: 4 }} numberOfLines={1}>
              {enterprise.companyName}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Rendu d'un produit en mode liste
  const renderProductList = (item: Product) => {
    const isFavorite = favorites.has(item._id);
    const enterprise = typeof item.enterprise === 'object' ? item.enterprise : null;

    return (
      <TouchableOpacity
        key={item._id}
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          marginBottom: 12,
          flexDirection: 'row',
          overflow: 'hidden',
          padding: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          borderWidth: 1,
          borderColor: colors.border
        }}
        onPress={() => router.push(`/(app)/(enterprise)/product/${item._id}`)}
      >
        <View className="relative mr-3">
          <Image
            source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }}
            className="w-24 h-24 rounded-xl"
            resizeMode="cover"
          />
          {item.stock === 0 && (
            <View className="absolute inset-0 bg-black/50 rounded-xl items-center justify-center">
              <Text className="text-white text-xs font-quicksand-bold">{i18n.t('enterprise.marketplace.product.outOfStock')}</Text>
            </View>
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between items-start">
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontFamily: 'Quicksand-SemiBold', flex: 1 }} numberOfLines={2}>
              {item.name}
            </Text>
            <TouchableOpacity onPress={() => toggleFavorite(item._id)} className="ml-2">
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={20}
                color={isFavorite ? '#EF4444' : '#6B7280'}
              />
            </TouchableOpacity>
          </View>
          <Text style={{ color: '#10B981', fontSize: 18, fontFamily: 'Quicksand-Bold', marginTop: 4 }}>
            {formatPrice(item.price)}
          </Text>
          {enterprise && (
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'Quicksand-Medium', marginTop: 4 }} numberOfLines={1}>
              {enterprise.companyName}
            </Text>
          )}
          <View className="flex-row items-center mt-1">
            <Ionicons name="star" size={14} color="#FBBF24" />
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'Quicksand-Medium', marginLeft: 4 }}>
              {item.stats?.averageRating?.toFixed(1) || '0.0'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />

      {/* Header vert conventionnel avec gradient */}
      <LinearGradient
        colors={['#047857', '#10B981']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-b-3xl shadow-md"
        style={{
          paddingTop: insets.top + 16,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
          paddingBottom: 16
        }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-lg font-quicksand-bold" numberOfLines={1}>
              {i18n.t('enterprise.marketplace.title')}
            </Text>
            {!loading && (
              <Text className="text-white/80 text-sm font-quicksand-medium">
                {totalProducts} {totalProducts === 1 ? i18n.t('enterprise.marketplace.subtitle.singular') : i18n.t('enterprise.marketplace.subtitle.plural')}
              </Text>
            )}
          </View>
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="mr-3"
            >
              <Ionicons
                name={viewMode === 'grid' ? 'list' : 'grid'}
                size={22}
                color="white"
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowFilters(true)}>
              <Ionicons name="options" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Barre de recherche */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 }}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={{ flex: 1, marginLeft: 8, color: colors.textPrimary, fontFamily: 'Quicksand-Medium' }}
            placeholder={i18n.t('enterprise.marketplace.search.placeholder')}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <>
              <TouchableOpacity
                onPress={handleSearch}
                style={{ marginRight: 8, backgroundColor: '#10B981', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 }}
              >
                <Ionicons name="search" size={16} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                setCurrentPage(1);
                loadMarketplaceProducts(1, false);
              }}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </>
          ) : null}
        </View>

        {/* Tri rapide */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {[
            { value: 'popular', label: i18n.t('enterprise.marketplace.sort.popular'), icon: 'trending-up' },
            { value: 'newest', label: i18n.t('enterprise.marketplace.sort.newest'), icon: 'time' },
            { value: 'price_asc', label: i18n.t('enterprise.marketplace.sort.priceAsc'), icon: 'arrow-up' },
            { value: 'price_desc', label: i18n.t('enterprise.marketplace.sort.priceDesc'), icon: 'arrow-down' },
          ].map((sort) => (
            <TouchableOpacity
              key={sort.value}
              onPress={() => setSortBy(sort.value as SortOption)}
              className={`flex-row items-center px-3 py-1.5 rounded-lg ${sortBy === sort.value ? 'bg-white' : 'bg-white/20'
                }`}
            >
              <Ionicons
                name={sort.icon as any}
                size={14}
                color={sortBy === sort.value ? '#10b981' : 'white'}
              />
              <Text
                className={`ml-1 text-xs font-quicksand-semibold ${sortBy === sort.value ? 'text-[#10b981]' : 'text-white'
                  }`}
              >
                {sort.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Contenu */}
      {loading ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16 }}
        >
          <View className="flex-row flex-wrap justify-between">
            {[...Array(6)].map((_, index) => (
              <SkeletonProduct key={index} />
            ))}
          </View>
        </ScrollView>
      ) : products.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontFamily: 'Quicksand-Bold', marginTop: 16 }}>
            {i18n.t('enterprise.marketplace.empty.title')}
          </Text>
          <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Medium', textAlign: 'center', marginTop: 8 }}>
            {i18n.t('enterprise.marketplace.empty.message')}
          </Text>
          {(minPrice || maxPrice || inStockOnly || searchQuery) && (
            <TouchableOpacity
              onPress={handleResetFilters}
              style={{ marginTop: 16, backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
            >
              <Text style={{ color: '#FFFFFF', fontFamily: 'Quicksand-SemiBold' }}>{i18n.t('enterprise.marketplace.empty.resetFilters')}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const isCloseToBottom =
              layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
            if (isCloseToBottom) {
              handleLoadMore();
            }
          }}
          scrollEventThrottle={400}
        >
          <View className={viewMode === 'grid' ? 'flex-row flex-wrap justify-between' : ''}>
            {products.map((product) =>
              viewMode === 'grid' ? renderProductGrid(product) : renderProductList(product)
            )}
          </View>

          {/* Indicateur de chargement supplémentaire */}
          {loadingMore && (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color="#10b981" />
            </View>
          )}

          {/* Pagination info */}
          {!loadingMore && products.length > 0 && (
            <Text style={{ textAlign: 'center', color: colors.textSecondary, fontFamily: 'Quicksand-Medium', fontSize: 14, marginTop: 16 }}>
              {i18n.t('enterprise.marketplace.pagination', { current: currentPage, total: totalPages })}
            </Text>
          )}
        </ScrollView>
      )}

      {/* Modal de filtres */}
      {showFilters && (
        <View className="absolute inset-0 bg-black/50" style={{ paddingTop: insets.top }}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text style={{ color: colors.textPrimary, fontSize: 20, fontFamily: 'Quicksand-Bold' }}>{i18n.t('enterprise.marketplace.filters.title')}</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Filtre de prix */}
              <View className="mb-4">
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontFamily: 'Quicksand-SemiBold', marginBottom: 8 }}>{i18n.t('enterprise.marketplace.filters.price.label')}</Text>
                <View className="flex-row items-center">
                  <TextInput
                    style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: colors.textPrimary, fontFamily: 'Quicksand-Medium' }}
                    placeholder={i18n.t('enterprise.marketplace.filters.price.min')}
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={minPrice}
                    onChangeText={setMinPrice}
                  />
                  <Text style={{ marginHorizontal: 8, color: colors.textSecondary }}>-</Text>
                  <TextInput
                    style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: colors.textPrimary, fontFamily: 'Quicksand-Medium' }}
                    placeholder={i18n.t('enterprise.marketplace.filters.price.max')}
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                  />
                </View>
              </View>

              {/* Disponibilité */}
              <TouchableOpacity
                onPress={() => setInStockOnly(!inStockOnly)}
                className="flex-row items-center justify-between py-3 mb-4"
              >
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontFamily: 'Quicksand-SemiBold' }}>
                  {i18n.t('enterprise.marketplace.filters.stock')}
                </Text>
                <View
                  style={{
                    width: 48,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: inStockOnly ? '#10B981' : colors.border,
                    justifyContent: 'center'
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: 'white',
                      marginLeft: inStockOnly ? 24 : 2
                    }}
                  />
                </View>
              </TouchableOpacity>

              {/* Boutons d'action */}
              <View className="flex-row mt-4 gap-3">
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: colors.secondary, paddingVertical: 12, borderRadius: 12 }}
                  onPress={handleResetFilters}
                >
                  <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold', textAlign: 'center' }}>
                    {i18n.t('enterprise.marketplace.filters.reset')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 12 }}
                  onPress={handleApplyFilters}
                >
                  <Text style={{ color: '#FFFFFF', fontFamily: 'Quicksand-SemiBold', textAlign: 'center' }}>
                    {i18n.t('enterprise.marketplace.filters.apply')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}
