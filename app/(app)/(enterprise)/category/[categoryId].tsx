import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import CategoryService from '../../../../services/api/CategoryService';
import { Category, Product } from '../../../../types/product';

// Types pour les filtres et le tri
type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'name' | 'popular';
type ViewMode = 'grid' | 'list';

export default function CategoryProductsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();

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
      <View style={[{ backgroundColor: '#E5E7EB', overflow: 'hidden' }, style]}>
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
    <View className="bg-white rounded-2xl shadow-md border border-neutral-100 p-2 mb-3 w-[48%]">
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
        className="bg-white rounded-2xl shadow-md border border-neutral-100 p-2 mb-3 w-[48%]"
        onPress={() => router.push(`/(app)/(enterprise)/(tabs)/product/${item._id}`)}
      >
        <View className="relative">
          <Image
            source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }}
            className="w-full h-32 rounded-xl"
            resizeMode="cover"
          />
          <TouchableOpacity
            className="absolute top-2 right-2 bg-white/90 rounded-full p-1.5"
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
              <Text className="text-white text-xs font-quicksand-bold">Épuisé</Text>
            </View>
          )}
        </View>
        <View className="mt-2">
          <Text className="text-sm font-quicksand-semibold text-neutral-800" numberOfLines={2}>
            {item.name}
          </Text>
          <Text className="text-lg font-quicksand-bold text-[#10b981] mt-1">
            {formatPrice(item.price)}
          </Text>
          {enterprise && (
            <Text className="text-xs font-quicksand-medium text-neutral-500 mt-1" numberOfLines={1}>
              {enterprise.companyName}
            </Text>
          )}
          <View className="flex-row items-center mt-1">
            <Ionicons name="star" size={14} color="#FBBF24" />
            <Text className="text-xs font-quicksand-medium text-neutral-600 ml-1">
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
        className="bg-white rounded-2xl shadow-md border border-neutral-100 p-3 mb-3 flex-row"
        onPress={() => router.push(`/(app)/(enterprise)/(tabs)/product/${item._id}`)}
      >
        <View className="relative mr-3">
          <Image
            source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }}
            className="w-24 h-24 rounded-xl"
            resizeMode="cover"
          />
          {item.stock === 0 && (
            <View className="absolute inset-0 bg-black/50 rounded-xl items-center justify-center">
              <Text className="text-white text-xs font-quicksand-bold">Épuisé</Text>
            </View>
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between items-start">
            <Text className="text-sm font-quicksand-semibold text-neutral-800 flex-1" numberOfLines={2}>
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
          <Text className="text-lg font-quicksand-bold text-[#10b981] mt-1">
            {formatPrice(item.price)}
          </Text>
          {enterprise && (
            <Text className="text-xs font-quicksand-medium text-neutral-500 mt-1" numberOfLines={1}>
              {enterprise.companyName}
            </Text>
          )}
          <View className="flex-row items-center mt-1">
            <Ionicons name="star" size={14} color="#FBBF24" />
            <Text className="text-xs font-quicksand-medium text-neutral-600 ml-1">
              {item.stats?.averageRating?.toFixed(1) || '0.0'} ({item.stats?.totalReviews || 0})
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-neutral-50">
      <ExpoStatusBar style="light" translucent />
      
      {/* Header vert conventionnel avec gradient */}
      <LinearGradient
        colors={['#10B981', '#34D399']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="px-6 pb-4 rounded-b-3xl shadow-md"
        style={{ paddingTop: insets.top + 16 }}
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
              {loading && !category ? 'Chargement...' : category?.name || 'Catégorie'}
            </Text>
            {!loading && (
              <Text className="text-white/80 text-xs font-quicksand-medium">
                {totalProducts} produit{totalProducts > 1 ? 's' : ''}
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
                {(minPrice || maxPrice || inStockOnly || searchQuery) && (
                  <View className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Barre de recherche */}
        <View className="flex-row items-center bg-white rounded-xl px-3 py-2 mb-3">
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            className="flex-1 ml-2 text-neutral-800 font-quicksand-medium"
            placeholder="Rechercher dans cette catégorie..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <>
              <TouchableOpacity 
                onPress={handleSearch}
                className="mr-2 bg-[#10b981] rounded-lg px-3 py-1"
              >
                <Text className="text-white text-xs font-quicksand-semibold">OK</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                // Recharger les produits sans recherche
                setTimeout(() => {
                  loadCategoryProducts(1, false);
                }, 0);
              }}>
                <Ionicons name="close-circle" size={20} color="#6B7280" />
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
            { value: 'newest', label: 'Plus récents', icon: 'time' },
            { value: 'popular', label: 'Populaires', icon: 'trending-up' },
            { value: 'price_asc', label: 'Prix croissant', icon: 'arrow-up' },
            { value: 'price_desc', label: 'Prix décroissant', icon: 'arrow-down' },
          ].map((sort) => (
            <TouchableOpacity
              key={sort.value}
              onPress={() => setSortBy(sort.value as SortOption)}
              className={`flex-row items-center px-3 py-1.5 rounded-lg ${
                sortBy === sort.value ? 'bg-white' : 'bg-white/20'
              }`}
            >
              <Ionicons
                name={sort.icon as any}
                size={14}
                color={sortBy === sort.value ? '#10b981' : 'white'}
              />
              <Text
                className={`ml-1 text-xs font-quicksand-semibold ${
                  sortBy === sort.value ? 'text-[#10b981]' : 'text-white'
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
          <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
          <Text className="text-neutral-600 text-lg font-quicksand-bold mt-4">
            Aucun produit trouvé
          </Text>
          <Text className="text-neutral-500 font-quicksand-medium text-center mt-2">
            Essayez de modifier vos filtres ou votre recherche
          </Text>
          {(minPrice || maxPrice || inStockOnly || searchQuery) && (
            <TouchableOpacity
              onPress={handleResetFilters}
              className="mt-4 bg-[#10b981] px-6 py-3 rounded-xl"
            >
              <Text className="text-white font-quicksand-semibold">Réinitialiser les filtres</Text>
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
            <Text className="text-center text-neutral-500 font-quicksand-medium text-sm mt-4">
              Page {currentPage} sur {totalPages}
            </Text>
          )}
        </ScrollView>
      )}

      {/* Modal de filtres */}
      {showFilters && (
        <View className="absolute inset-0 bg-black/50" style={{ paddingTop: insets.top }}>
          <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 max-h-[80%]">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-quicksand-bold text-neutral-800">Filtres</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Filtre de prix */}
              <View className="mb-4">
                <Text className="text-sm font-quicksand-semibold text-neutral-700 mb-2">Prix (FCFA)</Text>
                <View className="flex-row items-center">
                  <TextInput
                    className="flex-1 bg-neutral-100 rounded-xl px-4 py-3 text-neutral-800 font-quicksand-medium"
                    placeholder="Min"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={minPrice}
                    onChangeText={setMinPrice}
                  />
                  <Text className="mx-3 text-neutral-600 font-quicksand-medium">-</Text>
                  <TextInput
                    className="flex-1 bg-neutral-100 rounded-xl px-4 py-3 text-neutral-800 font-quicksand-medium"
                    placeholder="Max"
                    placeholderTextColor="#9CA3AF"
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
                <Text className="text-sm font-quicksand-semibold text-neutral-700">
                  Produits en stock uniquement
                </Text>
                <View
                  className={`w-12 h-6 rounded-full ${
                    inStockOnly ? 'bg-[#10b981]' : 'bg-neutral-300'
                  } justify-center`}
                >
                  <View
                    className={`w-5 h-5 bg-white rounded-full ${
                      inStockOnly ? 'ml-6' : 'ml-1'
                    }`}
                  />
                </View>
              </TouchableOpacity>

              {/* Boutons d'action */}
              <View className="flex-row mt-4 gap-3">
                <TouchableOpacity
                  onPress={handleResetFilters}
                  className="flex-1 bg-neutral-200 py-3 rounded-xl items-center"
                >
                  <Text className="text-neutral-700 font-quicksand-semibold">Réinitialiser</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleApplyFilters}
                  className="flex-1 bg-[#10b981] py-3 rounded-xl items-center"
                >
                  <Text className="text-white font-quicksand-semibold">Appliquer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}
