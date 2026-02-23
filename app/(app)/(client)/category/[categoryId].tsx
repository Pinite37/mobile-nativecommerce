import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  Alert,
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
import { useAuth } from '../../../../contexts/AuthContext';
import { useTheme } from '../../../../contexts/ThemeContext';
import i18n from '../../../../i18n/i18n';
import CategoryService from '../../../../services/api/CategoryService';
import { Category, Product } from '../../../../types/product';

// Types pour les filtres et le tri
type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'name' | 'popular';
type ViewMode = 'grid' | 'list';

export default function CategoryProductsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const { colors, isDark } = useTheme();

  // États principaux
  const [category, setCategory] = useState<Category | null>(null);
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
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Favoris (simulé)
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Charger les données initiales
  useEffect(() => {
    loadCategoryProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, sortBy, inStockOnly]);

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

  const loadCategoryProducts = async (page: number = 1, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Construction des filtres selon l'API
      const filters: any = {};

      // Tri (toujours inclus)
      if (sortBy) {
        filters.sortBy = sortBy;
      }

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
          console.log('💰 Prix min:', filters.minPrice);
        }
      }

      if (maxPrice && maxPrice.trim()) {
        const parsedMax = parseFloat(maxPrice);
        if (!isNaN(parsedMax) && parsedMax > 0) {
          filters.maxPrice = parsedMax;
          console.log('💰 Prix max:', filters.maxPrice);
        }
      }

      // Filtre de disponibilité
      if (inStockOnly) {
        filters.inStock = true;
        console.log('📦 En stock uniquement');
      }

      console.log('🚀 Chargement produits - Page:', page, 'Filtres:', filters);

      const response = await CategoryService.getCategoryProducts(
        categoryId!,
        page,
        20,
        filters
      );

      setCategory(response.category);

      if (append) {
        setProducts(prev => [...prev, ...response.products]);
      } else {
        setProducts(response.products);
      }

      setCurrentPage(response.pagination.currentPage);
      setTotalPages(response.pagination.totalPages);
      setTotalProducts(response.pagination.totalProducts);
      setHasNextPage(response.pagination.hasNextPage);

      console.log('✅ Produits chargés:', response.products.length, '/', response.pagination.totalProducts);
    } catch (error) {
      console.error('❌ Erreur chargement produits:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    loadCategoryProducts(1, false);
  };

  const handleLoadMore = () => {
    if (hasNextPage && !loadingMore) {
      loadCategoryProducts(currentPage + 1, true);
    }
  };

  const handleSearch = () => {
    console.log('🔍 Déclenchement recherche:', searchQuery);
    Keyboard.dismiss();
    setCurrentPage(1);
    loadCategoryProducts(1, false);
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
    loadCategoryProducts(1, false);
  };

  const handleResetFilters = () => {
    console.log('🔄 Réinitialisation des filtres');
    Keyboard.dismiss();
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setSortBy('newest');
    setShowFilters(false);
    setCurrentPage(1);
    loadCategoryProducts(1, false);
  };

  const toggleFavorite = (productId: string) => {
    if (!isAuthenticated) {
      Alert.alert(
        "Connexion requise",
        "Connectez-vous pour ajouter des produits en favoris.",
        [
          { text: "Plus tard", style: "cancel" },
          { text: "Se connecter", onPress: () => router.push("/(auth)/signin") },
        ],
      );
      return;
    }

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
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.35)',
            transform: [{ translateX }],
          }}
        />
      </View>
    );
  };

  const SkeletonProduct = () => (
    <View className="rounded-2xl overflow-hidden p-2 mb-3 w-[48%]" style={{
      backgroundColor: colors.card,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.border,
    }}>
      <ShimmerBlock style={{ height: 128, borderRadius: 16, width: '100%' }} />
      <View className="mt-2">
        <ShimmerBlock style={{ height: 16, borderRadius: 8, width: '80%', marginBottom: 8 }} />
        <ShimmerBlock style={{ height: 14, borderRadius: 8, width: '60%' }} />
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
        className="rounded-2xl overflow-hidden p-2 mb-3 w-[48%]"
        style={{
          backgroundColor: colors.card,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          borderWidth: 1,
          borderColor: colors.border,
        }}
        onPress={() => router.push(`/(app)/(client)/product/${item._id}`)}
      >
        <View className="relative">
          <Image
            source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }}
            className="w-full h-32 rounded-xl"
            resizeMode="cover"
          />
          {isAuthenticated && (
            <TouchableOpacity
              className="absolute top-2 right-2 rounded-full p-1.5"
              style={{ backgroundColor: colors.card + 'E6' }}
              onPress={() => toggleFavorite(item._id)}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={20}
                color={isFavorite ? '#EF4444' : '#6B7280'}
              />
            </TouchableOpacity>
          )}
          {item.stock === 0 && (
            <View className="absolute top-2 left-2 bg-red-500 px-2 py-1 rounded-lg">
              <Text className="text-white text-xs font-quicksand-bold">{i18n.t("client.category.product.outOfStock")}</Text>
            </View>
          )}
        </View>
        <View className="mt-2">
          <Text className="text-sm font-quicksand-semibold" style={{ color: colors.textPrimary }} numberOfLines={2}>
            {item.name}
          </Text>
          <Text className="text-lg font-quicksand-bold mt-1" style={{ color: colors.brandPrimary }}>
            {formatPrice(item.price)}
          </Text>
          {enterprise && (
            <Text className="text-xs font-quicksand-medium mt-1" style={{ color: colors.textSecondary }} numberOfLines={1}>
              {enterprise.companyName}
            </Text>
          )}
          <View className="flex-row items-center mt-1">
            <Ionicons name="star" size={14} color="#FBBF24" />
            <Text className="text-xs font-quicksand-medium ml-1" style={{ color: colors.textSecondary }}>
              {item.stats?.averageRating?.toFixed(1) || '0.0'} ({item.stats?.totalReviews || 0})
            </Text>
          </View>
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
        className="rounded-2xl overflow-hidden p-3 mb-3 flex-row"
        style={{
          backgroundColor: colors.card,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          borderWidth: 1,
          borderColor: colors.border,
        }}
        onPress={() => router.push(`/(app)/(client)/product/${item._id}`)}
      >
        <View className="relative mr-3">
          <Image
            source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }}
            className="w-24 h-24 rounded-xl"
            resizeMode="cover"
          />
          {item.stock === 0 && (
            <View className="absolute inset-0 bg-black/50 rounded-xl items-center justify-center">
              <Text className="text-white text-xs font-quicksand-bold">{i18n.t("client.category.product.outOfStock")}</Text>
            </View>
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between items-start">
            <Text className="text-sm font-quicksand-semibold flex-1" style={{ color: colors.textPrimary }} numberOfLines={2}>
              {item.name}
            </Text>
            {isAuthenticated && (
              <TouchableOpacity onPress={() => toggleFavorite(item._id)} className="ml-2">
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isFavorite ? '#EF4444' : colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>
          <Text className="text-lg font-quicksand-bold mt-1" style={{ color: colors.brandPrimary }}>
            {formatPrice(item.price)}
          </Text>
          {enterprise && (
            <Text className="text-xs font-quicksand-medium mt-1" style={{ color: colors.textSecondary }} numberOfLines={1}>
              {enterprise.companyName}
            </Text>
          )}
          <View className="flex-row items-center mt-1">
            <Ionicons name="star" size={14} color="#FBBF24" />
            <Text className="text-xs font-quicksand-medium ml-1" style={{ color: colors.textSecondary }}>
              {item.stats?.averageRating?.toFixed(1) || '0.0'} ({item.stats?.totalReviews || 0})
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.secondary }}>
      <ExpoStatusBar style="light" translucent />

      {/* Header vert conventionnel avec gradient */}
      <LinearGradient
        colors={['#059669', '#10B981']}
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
              {loading && !category ? i18n.t("client.category.loading") : category?.name || i18n.t("client.category.defaultTitle")}
            </Text>
            {!loading && (
              <Text className="text-white/80 text-xs font-quicksand-medium">
                {totalProducts} {totalProducts > 1 ? i18n.t("client.category.productCount.plural") : i18n.t("client.category.productCount.singular")}
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
              <View className="relative">
                <Ionicons name="options" size={22} color="white" />
                {(minPrice || maxPrice || inStockOnly) && (
                  <View className="absolute -top-1 -right-1 bg-red-500 w-3 h-3 rounded-full" />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Barre de recherche */}
        <View className="flex-row items-center rounded-xl px-3 py-2 mb-3" style={{ backgroundColor: colors.card }}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            className="flex-1 ml-2 font-quicksand-medium"
            style={{ color: colors.textPrimary }}
            placeholder={i18n.t("client.category.search.placeholder")}
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
                className="mr-2 rounded-lg px-3 py-1"
                style={{ backgroundColor: colors.brandPrimary }}
              >
                <Text className="text-white text-xs font-quicksand-semibold">{i18n.t("client.category.search.button")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                setCurrentPage(1);
                loadCategoryProducts(1, false);
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
            { value: 'newest', label: i18n.t("client.category.sort.newest"), icon: 'time' },
            { value: 'popular', label: i18n.t("client.category.sort.popular"), icon: 'trending-up' },
            { value: 'price_asc', label: i18n.t("client.category.sort.priceAsc"), icon: 'arrow-up' },
            { value: 'price_desc', label: i18n.t("client.category.sort.priceDesc"), icon: 'arrow-down' },
          ].map((sort) => (
            <TouchableOpacity
              key={sort.value}
              onPress={() => setSortBy(sort.value as SortOption)}
              className="flex-row items-center px-3 py-1.5 rounded-lg"
              style={{
                backgroundColor: sortBy === sort.value ? colors.card : 'rgba(255, 255, 255, 0.2)'
              }}
            >
              <Ionicons
                name={sort.icon as any}
                size={14}
                color={sortBy === sort.value ? colors.brandPrimary : 'white'}
              />
              <Text
                className="ml-1 text-xs font-quicksand-semibold"
                style={{
                  color: sortBy === sort.value ? colors.brandPrimary : 'white'
                }}
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
          <Text className="text-lg font-quicksand-bold mt-4" style={{ color: colors.textPrimary }}>
            {i18n.t("client.category.empty.title")}
          </Text>
          <Text className="font-quicksand-medium text-center mt-2" style={{ color: colors.textSecondary }}>
            {i18n.t("client.category.empty.message")}
          </Text>
          {(minPrice || maxPrice || inStockOnly || searchQuery) && (
            <TouchableOpacity
              onPress={handleResetFilters}
              className="mt-4 bg-[#10b981] px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-quicksand-semibold">{i18n.t("client.category.empty.resetFilters")}</Text>
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
            <Text className="text-center font-quicksand-medium text-sm mt-4" style={{ color: colors.textSecondary }}>
              {i18n.t("client.category.pagination", { current: currentPage, total: totalPages })}
            </Text>
          )}
        </ScrollView>
      )}

      {/* Modal de filtres */}
      {showFilters && (
        <View className="absolute inset-0 bg-black/50" style={{ paddingTop: insets.top }}>
          <View className="absolute bottom-0 left-0 right-0 rounded-t-3xl p-6 max-h-[80%]" style={{ backgroundColor: colors.card }}>
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-quicksand-bold" style={{ color: colors.textPrimary }}>{i18n.t("client.category.filters.title")}</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Filtre de prix */}
              <View className="mb-4">
                <Text className="text-sm font-quicksand-semibold mb-2" style={{ color: colors.textPrimary }}>{i18n.t("client.category.filters.price.label")}</Text>
                <View className="flex-row items-center">
                  <TextInput
                    className="flex-1 rounded-xl px-4 py-3 font-quicksand-medium"
                    style={{ backgroundColor: colors.secondary, color: colors.textPrimary }}
                    placeholder={i18n.t("client.category.filters.price.min")}
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={minPrice}
                    onChangeText={setMinPrice}
                  />
                  <Text className="mx-2 font-quicksand-medium" style={{ color: colors.textSecondary }}>-</Text>
                  <TextInput
                    className="flex-1 rounded-xl px-4 py-3 font-quicksand-medium"
                    style={{ backgroundColor: colors.secondary, color: colors.textPrimary }}
                    placeholder={i18n.t("client.category.filters.price.max")}
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
                <Text className="text-sm font-quicksand-semibold" style={{ color: colors.textPrimary }}>
                  {i18n.t("client.category.filters.stock")}
                </Text>
                <View
                  className="w-12 h-6 rounded-full justify-center"
                  style={{ backgroundColor: inStockOnly ? colors.brandPrimary : colors.border }}
                >
                  <View
                    className="w-5 h-5 rounded-full"
                    style={{
                      backgroundColor: colors.card,
                      marginLeft: inStockOnly ? 22 : 2
                    }}
                  />
                </View>
              </TouchableOpacity>

              {/* Boutons d'action */}
              <View className="flex-row mt-4 gap-3">
                <TouchableOpacity
                  onPress={handleResetFilters}
                  className="flex-1 py-3 rounded-xl"
                  style={{ backgroundColor: colors.secondary }}
                >
                  <Text className="font-quicksand-semibold text-center" style={{ color: colors.textPrimary }}>
                    {i18n.t("client.category.filters.reset")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleApplyFilters}
                  className="flex-1 py-3 rounded-xl"
                  style={{ backgroundColor: colors.brandPrimary }}
                >
                  <Text className="text-white font-quicksand-semibold text-center">
                    {i18n.t("client.category.filters.apply")}
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
