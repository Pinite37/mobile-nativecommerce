import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Image,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../../contexts/ThemeContext';
import { Shimmer } from '../../../../components/ui/Shimmer';
import CategoryService from '../../../../services/api/CategoryService';
import { Category, Product } from '../../../../types/product';

// Types pour les filtres et le tri
type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'name' | 'popular';
type ViewMode = 'grid' | 'list';

export default function CategoryProductsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
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
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(500)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const openFilters = useCallback(() => {
    setFilterModalVisible(true);
    setShowFilters(true);
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, damping: 22, stiffness: 200, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [slideAnim, backdropAnim]);

  const closeFilters = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 500, duration: 260, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setFilterModalVisible(false);
      setShowFilters(false);
    });
  }, [slideAnim, backdropAnim]);

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
        closeFilters();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [showFilters, closeFilters]);

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
    closeFilters();
    setCurrentPage(1);
    loadCategoryProducts(1, false);
  };

  const handleResetFilters = () => {
    Keyboard.dismiss();
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setSortBy('newest');
    closeFilters();
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

  const SkeletonProduct = () => (
    <View style={{ backgroundColor: colors.card, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2, marginBottom: 12, width: '48%', overflow: 'hidden' }}>
      <Shimmer style={{ height: 144, borderRadius: 12, width: '100%' }} />
      <View style={{ padding: 8 }}>
        <Shimmer style={{ height: 16, borderRadius: 8, width: '80%', marginBottom: 8 }} />
        <View className="flex-row justify-between items-center">
          <Shimmer style={{ height: 14, borderRadius: 8, width: '40%' }} />
          <Shimmer style={{ height: 14, borderRadius: 8, width: '20%' }} />
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
              <Text className="text-white text-xs font-poppins-bold">Épuisé</Text>
            </View>
          )}
        </View>
        <View style={{ padding: 8 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 14, fontFamily: 'Poppins-Bold' }} numberOfLines={2}>
            {item.name}
          </Text>
          <View className="flex-row items-center justify-between mt-1">
            <Text style={{ color: '#10B981', fontSize: 16, fontFamily: 'Poppins-Bold' }}>
              {formatPrice(item.price)}
            </Text>
          </View>
          {enterprise && (
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'Poppins-Medium', marginTop: 4 }} numberOfLines={1}>
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
              <Text className="text-white text-xs font-poppins-bold">Épuisé</Text>
            </View>
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between items-start">
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontFamily: 'Poppins-SemiBold', flex: 1 }} numberOfLines={2}>
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
          <Text style={{ color: '#10B981', fontSize: 18, fontFamily: 'Poppins-Bold', marginTop: 4 }}>
            {formatPrice(item.price)}
          </Text>
          {enterprise && (
            <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'Poppins-Medium', marginTop: 4 }} numberOfLines={1}>
              {enterprise.companyName}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />

      {/* Header */}
      <View style={{ backgroundColor: colors.surface, paddingTop: insets.top + 8, paddingLeft: insets.left + 16, paddingRight: insets.right + 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
        <View className="flex-row items-center justify-between mb-4">
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.tertiary, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontFamily: 'Poppins-Bold', color: colors.text }} numberOfLines={1}>
              {loading && !category ? 'Chargement...' : category?.name || 'Catégorie'}
            </Text>
            {!loading && (
              <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: 'Poppins-Medium' }}>
                {totalProducts} produit{totalProducts > 1 ? 's' : ''}
              </Text>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.tertiary, justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons
                name={viewMode === 'grid' ? 'list' : 'grid'}
                size={20}
                color={colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={openFilters}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.tertiary, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="options" size={20} color={colors.text} />
                {(minPrice || maxPrice || inStockOnly || searchQuery) && (
                  <View style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' }} />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Barre de recherche */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.tertiary, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, marginTop: 10 }}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={{ flex: 1, marginLeft: 8, color: colors.textPrimary, fontFamily: 'Poppins-Medium' }}
            placeholder="Rechercher dans cette catégorie..."
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
                style={{ marginRight: 8, backgroundColor: colors.brandPrimary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 }}
              >
                <Ionicons name="search" size={16} color="white" />
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
            { value: 'newest', label: 'Plus récents', icon: 'time' },
            { value: 'popular', label: 'Populaires', icon: 'trending-up' },
            { value: 'price_asc', label: 'Prix croissant', icon: 'arrow-up' },
            { value: 'price_desc', label: 'Prix décroissant', icon: 'arrow-down' },
          ].map((sort) => (
            <TouchableOpacity
              key={sort.value}
              onPress={() => setSortBy(sort.value as SortOption)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: sortBy === sort.value ? colors.brandPrimary : colors.tertiary }}
            >
              <Ionicons
                name={sort.icon as any}
                size={14}
                color={sortBy === sort.value ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={{ marginLeft: 4, fontSize: 12, fontFamily: 'Poppins-SemiBold', color: sortBy === sort.value ? '#FFFFFF' : colors.textSecondary }}
              >
                {sort.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

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
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontFamily: 'Poppins-Bold', marginTop: 16 }}>
            Aucun produit trouvé
          </Text>
          <Text style={{ color: colors.textSecondary, fontFamily: 'Poppins-Medium', textAlign: 'center', marginTop: 8 }}>
            Essayez de modifier vos filtres ou votre recherche
          </Text>
          {(minPrice || maxPrice || inStockOnly || searchQuery) && (
            <TouchableOpacity
              onPress={handleResetFilters}
              style={{ marginTop: 16, backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
            >
              <Text style={{ color: '#FFFFFF', fontFamily: 'Poppins-SemiBold' }}>Réinitialiser les filtres</Text>
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
            <Text style={{ textAlign: 'center', color: colors.textSecondary, fontFamily: 'Poppins-Medium', fontSize: 14, marginTop: 16 }}>
              Page {currentPage} sur {totalPages}
            </Text>
          )}
        </ScrollView>
      )}

      {/* Modal de filtres — slide-up animé */}
      {filterModalVisible && (
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} pointerEvents="box-none">
          <Animated.View
            style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, opacity: backdropAnim }}
            pointerEvents="auto"
          >
            <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} onPress={closeFilters} />
          </Animated.View>

          <Animated.View
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              backgroundColor: colors.card,
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
              paddingHorizontal: 24, paddingTop: 20,
              paddingBottom: insets.bottom + 24,
              maxHeight: '82%',
              transform: [{ translateY: slideAnim }],
            }}
          >
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.borderLight }} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 20, fontFamily: 'Poppins-Bold' }}>Filtres</Text>
              <TouchableOpacity
                onPress={closeFilters}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'Poppins-Bold', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  Prix (FCFA)
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <TextInput
                    style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: colors.textPrimary, fontFamily: 'Poppins-Medium', fontSize: 14 }}
                    placeholder="Min"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={minPrice}
                    onChangeText={setMinPrice}
                  />
                  <Text style={{ color: colors.textSecondary, fontSize: 16 }}>–</Text>
                  <TextInput
                    style={{ flex: 1, backgroundColor: colors.secondary, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: colors.textPrimary, fontFamily: 'Poppins-Medium', fontSize: 14 }}
                    placeholder="Max"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setInStockOnly(!inStockOnly)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, marginBottom: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.borderLight }}
              >
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontFamily: 'Poppins-SemiBold' }}>
                  Produits en stock uniquement
                </Text>
                <View style={{ width: 48, height: 26, borderRadius: 13, backgroundColor: inStockOnly ? '#10B981' : colors.borderLight, justifyContent: 'center' }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', marginLeft: inStockOnly ? 24 : 4 }} />
                </View>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.secondary, alignItems: 'center' }}
                  onPress={handleResetFilters}
                >
                  <Text style={{ color: colors.textPrimary, fontFamily: 'Poppins-SemiBold' }}>Réinitialiser</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#10B981', alignItems: 'center' }}
                  onPress={handleApplyFilters}
                >
                  <Text style={{ color: '#fff', fontFamily: 'Poppins-Bold' }}>Appliquer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </View>
  );
}
