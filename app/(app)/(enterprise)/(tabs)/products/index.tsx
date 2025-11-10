import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated, Easing,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import NotificationModal, { useNotification } from "../../../../../components/ui/NotificationModal";
import CategoryService from "../../../../../services/api/CategoryService";
import ProductService from "../../../../../services/api/ProductService";
import { Category, Product, ProductsResponse } from "../../../../../types/product";

const sortOptions = [
  { id: "name", name: "Nom", field: "name" },
  { id: "price", name: "Prix", field: "price" },
  { id: "stock", name: "Stock", field: "stock" },
  { id: "createdAt", name: "Date de création", field: "createdAt" },
];

export default function EnterpriseProducts() {
  const params = useLocalSearchParams();
  const { notification, showNotification, hideNotification } = useNotification();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSort, setSelectedSort] = useState("createdAt");
  
  const [showSortModal, setShowSortModal] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  
  // Errors
  const [error, setError] = useState<string | null>(null);

  // Confirmation modal
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    type: 'delete' | 'status_change';
    product: Product;
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
  } | null>(null);

  // Menu modal pour les actions produit en mode grid
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [selectedProductForMenu, setSelectedProductForMenu] = useState<Product | null>(null);

  // Load products function
  const loadProducts = useCallback(async (reset = false, pageToLoad?: number) => {
    try {
      if (reset) {
        setCurrentPage(1);
        setError(null);
      }
      
      const page = pageToLoad || (reset ? 1 : currentPage);
      
      const filters: any = {
        sort: selectedSort === 'createdAt' ? 'newest' : selectedSort === 'price' ? 'price_desc' : 'newest'
      };

      if (selectedCategory !== 'all') {
        filters.category = selectedCategory;
      }

      let response: ProductsResponse;
      if (searchQuery.trim()) {
        response = await ProductService.searchProducts(searchQuery.trim(), page, 10, filters);
      } else {
        response = await ProductService.getEnterpriseProducts(page, 10, filters);
      }
      
      if (reset) {
        setProducts(response.products || []);
      } else {
        setProducts(prev => [...prev, ...(response.products || [])]);
      }
      
      const pagination = response.pagination || { page: 1, pages: 1 };
      setCurrentPage(pagination.page);
      setHasMoreProducts(pagination.page < pagination.pages);
      
    } catch (err: any) {
      const errorMessage = err.message || 'Erreur lors du chargement des produits';
      if (reset) {
        setError(errorMessage);
      }
      console.error('Error loading products:', err);
    }
  }, [searchQuery, selectedCategory, selectedSort, currentPage]);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      setError(null);
      
      // Load products and categories separately to handle errors independently
      let productsData: ProductsResponse | null = null;
      let categoriesData: Category[] = [];
      
      // Load products (this is critical)
      try {
        productsData = await ProductService.getEnterpriseProducts(1, 10, {
          sort: selectedSort === 'createdAt' ? 'newest' : selectedSort === 'price' ? 'price_desc' : 'newest'
        });
      } catch (err: any) {
        console.error('Error loading products:', err);
        setError(err.message || 'Erreur lors du chargement des produits');
        return;
      }
      
      // Load categories (this is optional, failures should not block the UI)
      try {
        categoriesData = await CategoryService.getActiveCategories();
      } catch (err: any) {
        console.warn('Error loading categories:', err);
        // Don't set error, just log it and continue with empty categories
      }

      // Set the data
      setCategories(categoriesData);
      if (productsData) {
        setProducts(productsData.products || []);
        setCurrentPage(productsData.pagination?.page || 1);
        setHasMoreProducts((productsData.pagination?.page || 1) < (productsData.pagination?.pages || 1));
      }
      
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données');
      console.error('Error loading initial data:', err);
    } finally {
      setInitialLoading(false);
    }
  }, [selectedSort]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Auto-refresh when coming from create page
  useEffect(() => {
    if (params.refresh === 'true') {
      // Remove the refresh param and reload data
      router.replace('/(app)/(enterprise)/(tabs)/products');
      loadInitialData();
    }
  }, [params.refresh, loadInitialData]);

  // Reload products when search/filter changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadProducts(true);
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory, selectedSort, loadProducts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitialData();
    setRefreshing(false);
  }, [loadInitialData]);

  const loadMoreProducts = useCallback(async () => {
    if (loadingMore || !hasMoreProducts) return;
    
    setLoadingMore(true);
    setCurrentPage(prev => prev + 1);
    await loadProducts(false);
    setLoadingMore(false);
  }, [loadingMore, hasMoreProducts, loadProducts]);

  const handleStatusChange = (product: Product) => {
    showConfirmation('status_change', product);
  };

  const handleDeleteProduct = (product: Product) => {
    showConfirmation('delete', product);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? { color: '#10B981', bg: '#D1FAE5' }
      : { color: '#EF4444', bg: '#FEE2E2' };
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { color: '#EF4444', text: 'Rupture' };
    if (stock < 10) return { color: '#F59E0B', text: 'Faible' };
    return { color: '#10B981', text: 'Disponible' };
  };

  const showConfirmation = (type: 'delete' | 'status_change', product: Product) => {
    let title = '';
    let message = '';
    let confirmText = '';
    let confirmColor = '';

    switch (type) {
      case 'delete':
        title = 'Supprimer le produit';
        message = 'Êtes-vous sûr de vouloir supprimer ce produit ?';
        confirmText = 'Supprimer';
        confirmColor = '#EF4444';
        break;
      case 'status_change':
        title = product.isActive ? 'Désactiver le produit' : 'Activer le produit';
        message = product.isActive
          ? 'Le produit ne sera plus visible par les clients.'
          : 'Le produit sera visible par les clients.';
        confirmText = product.isActive ? 'Désactiver' : 'Activer';
        confirmColor = product.isActive ? '#F59E0B' : '#10B981';
        break;
    }

    setConfirmationAction({ type, product, title, message, confirmText, confirmColor });
    setConfirmationVisible(true);
  };

  const closeConfirmation = () => {
    setConfirmationVisible(false);
    setConfirmationAction(null);
  };

  const executeConfirmedAction = async () => {
    if (!confirmationAction) return;

    const { type, product } = confirmationAction;
    closeConfirmation();

    try {
      switch (type) {
        case 'delete':
          await ProductService.deleteProduct(product._id);
          setProducts(prev => prev.filter(p => p._id !== product._id));
          showNotification('success', 'Produit supprimé', 'Le produit a été supprimé avec succès.');
          break;
        case 'status_change':
          await ProductService.updateProduct(product._id, { isActive: !product.isActive });
          setProducts(prev => prev.map(p =>
            p._id === product._id ? { ...p, isActive: !p.isActive } : p
          ));
          showNotification('success', 'Statut modifié', `Le produit a été ${!product.isActive ? 'activé' : 'désactivé'}.`);
          break;
      }
    } catch (err: any) {
      showNotification('error', 'Erreur', err.message || `Impossible de ${type === 'delete' ? 'supprimer' : 'modifier'} le produit`);
    }
  };  

  const renderProduct = ({ item }: { item: Product }) => {
    const statusStyle = getStatusColor(item.isActive);
    const stockStatus = getStockStatus(item.stock);
    const isGrid = viewMode === 'grid';

    if (isGrid) {
      return (
        <View className="bg-white rounded-2xl p-3 mb-4 mx-2 flex-1 border border-neutral-100 relative">
          <TouchableOpacity
            className="absolute top-2 right-2 z-10 bg-white/90 rounded-full w-7 h-7 items-center justify-center shadow-sm"
            style={{ elevation: 2 }}
            onPress={() => {
              setSelectedProductForMenu(item);
              setMenuModalVisible(true);
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color="#6B7280" />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => {
              (global as any).__CURRENT_PRODUCT_ID__ = item._id;
              router.push(`/(app)/(enterprise)/(tabs)/products/${item._id}`);
            }}
          >
            <Image
              source={{ uri: item.images[0] || 'https://via.placeholder.com/160x160/E5E7EB/9CA3AF?text=No+Image' }}
              className="w-full h-32 rounded-xl"
              resizeMode="cover"
            />
            <View className="mt-3">
              <Text className="text-sm font-quicksand-semibold text-neutral-800" numberOfLines={1}>{item.name}</Text>
              <Text className="text-xs font-quicksand-medium text-primary-500 mt-1">{formatPrice(item.price)}</Text>
              <View className="flex-row items-center mt-1">
                <Ionicons name="star" size={12} color="#10B981" />
                <Text className="text-[10px] text-neutral-600 ml-1">
                  {item.stats.averageRating.toFixed(1)} ({item.stats.totalReviews})
                </Text>
              </View>
              <View className="flex-row items-center mt-1 justify-between">
                <Text className="text-[10px] font-quicksand-medium" style={{ color: stockStatus.color }}>{stockStatus.text}</Text>
                <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: statusStyle.bg }}>
                  <Text className="text-[10px] font-quicksand-semibold" style={{ color: statusStyle.color }}>{item.isActive ? 'Actif' : 'Inactif'}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity 
        className="bg-white rounded-2xl p-4 mx-4 mb-4 shadow-sm border border-neutral-100"
        onPress={() => {
          (global as any).__CURRENT_PRODUCT_ID__ = item._id;
          router.push(`/(app)/(enterprise)/(tabs)/products/${item._id}`);
        }}
      >
        <View className="flex-row">
          <Image
            source={{ uri: item.images[0] || 'https://via.placeholder.com/80x80/E5E7EB/9CA3AF?text=No+Image' }}
            className="w-20 h-20 rounded-xl"
            resizeMode="cover"
          />
          <View className="ml-4 flex-1">
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1 pr-2">
                <Text className="text-base font-quicksand-semibold text-neutral-800">
                  {item.name}
                </Text>
                {typeof item.category === 'object' && (
                  <Text className="text-sm text-neutral-600 font-quicksand-medium">
                    {item.category.name}
                  </Text>
                )}
              </View>
              <View className="flex-row items-center gap-3">
                <View className="px-3 py-1 rounded-full" style={{ backgroundColor: statusStyle.bg }}>
                  <Text className="text-xs font-quicksand-semibold" style={{ color: statusStyle.color }}>
                    {item.isActive ? 'Actif' : 'Inactif'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    handleStatusChange(item);
                  }}
                  className="p-1"
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
            <View className="flex-row items-center mb-3">
              <Ionicons name="star" size={14} color="#10B981" />
              <Text className="text-xs text-neutral-600 ml-1 font-quicksand-light">
                {item.stats.averageRating.toFixed(1)} ({item.stats.totalReviews} avis)
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-quicksand-bold text-primary-500">{formatPrice(item.price)}</Text>
              <View className="px-3 py-1.5 rounded-full" style={{ backgroundColor: stockStatus.color + '15' }}>
                <Text className="text-xs font-quicksand-semibold" style={{ color: stockStatus.color }}>
                  {stockStatus.text}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View className="mt-4 pt-4 border-t border-neutral-100">
          <TouchableOpacity 
            className="bg-red-50 rounded-xl py-3.5 flex-row items-center justify-center" 
            onPress={() => {
              handleDeleteProduct(item);
            }}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
            <Text className="text-red-600 font-quicksand-semibold ml-2">Supprimer</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (error) {
      return (
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="alert-circle-outline" size={80} color="#EF4444" />
          <Text className="text-xl font-quicksand-bold text-neutral-800 mt-4 mb-2">
            Erreur
          </Text>
          <Text className="text-center text-neutral-600 font-quicksand-medium mb-6">
            {error}
          </Text>
          <View className="flex-row space-x-3">
            <TouchableOpacity 
              className="bg-primary-500 rounded-xl py-4 px-6"
              onPress={loadInitialData}
            >
              <Text className="text-white font-quicksand-semibold">
                Réessayer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="bg-neutral-200 rounded-xl py-4 px-6"
              onPress={() => {
                router.push('/(app)/(enterprise)/(tabs)/products/create');
              }}
            >
              <Text className="text-neutral-700 font-quicksand-semibold">
                Ajouter un produit
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // No error, just empty state
    return (
      <View className="flex-1 justify-center items-center px-6">
        <Ionicons name="cube-outline" size={80} color="#D1D5DB" />
        <Text className="text-xl font-quicksand-bold text-neutral-800 mt-4 mb-2">
          {searchQuery.trim() || selectedCategory !== 'all' ? 'Aucun produit trouvé' : 'Aucun produit'}
        </Text>
        <Text className="text-center text-neutral-600 font-quicksand-medium mb-6">
          {searchQuery.trim() || selectedCategory !== 'all' 
            ? 'Aucun produit ne correspond à vos critères de recherche' 
            : 'Commencez par ajouter vos premiers produits à votre catalogue'
          }
        </Text>
        <TouchableOpacity 
          className="bg-primary-500 rounded-xl py-4 px-8"
          onPress={() => {
            router.push('/(app)/(enterprise)/(tabs)/products/create');
          }}
        >
          <Text className="text-white font-quicksand-semibold">
            Ajouter un produit
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSortModal(false)}
    >
      <TouchableOpacity
        className="flex-1 bg-black/50"
        activeOpacity={1}
        onPress={() => setShowSortModal(false)}
      >
        <View className="flex-1 justify-center items-center px-6">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <Text className="text-lg font-quicksand-bold text-neutral-800 mb-4">
              Trier par
            </Text>
            
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                className={`py-3 px-4 rounded-xl mb-2 ${
                  selectedSort === option.id ? 'bg-primary-500' : 'bg-neutral-50'
                }`}
                onPress={() => {
                  setSelectedSort(option.id);
                  setShowSortModal(false);
                }}
              >
                <Text className={`font-quicksand-medium ${
                  selectedSort === option.id ? 'text-white' : 'text-neutral-700'
                }`}>
                  {option.name}
                </Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              className="mt-4 py-3 px-4 rounded-xl bg-neutral-100"
              onPress={() => setShowSortModal(false)}
            >
              <Text className="text-neutral-700 font-quicksand-medium text-center">
                Annuler
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
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

  const SkeletonCard = ({ grid = false }: { grid?: boolean }) => (
    <View className={`${grid ? 'w-1/2 px-2' : 'w-full px-4'} mb-4`}>
      <View className="rounded-2xl bg-white p-4 border border-neutral-100 overflow-hidden">
        <ShimmerBlock style={{ height: grid ? 110 : 80, borderRadius: 16, width: '100%' }} />
        <View className="mt-4">
          <ShimmerBlock style={{ height: 16, borderRadius: 8, width: '75%', marginBottom: 8 }} />
          <ShimmerBlock style={{ height: 12, borderRadius: 8, width: '50%', marginBottom: 8 }} />
          <ShimmerBlock style={{ height: 16, borderRadius: 8, width: '35%' }} />
        </View>
      </View>
    </View>
  );

  const renderSkeletons = () => {
    const count = viewMode === 'grid' ? 8 : 6;
    return (
      <FlatList
        data={Array.from({ length: count }).map((_, i) => i.toString())}
        key={viewMode === 'grid' ? 'grid-skeleton' : 'list-skeleton'}
        numColumns={viewMode === 'grid' ? 2 : 1}
        renderItem={() => <SkeletonCard grid={viewMode === 'grid'} />}
        keyExtractor={(item) => item}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const Header = () => (
    <LinearGradient
      colors={['#10B981', '#34D399']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      className="pt-16 pb-6 rounded-b-[32px] shadow-lg"
    >
      {/* Title and Actions Row */}
      <View className="px-6 mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-1">
            <Text className="text-2xl font-quicksand-bold text-white">Mes Produits</Text>
            <Text className="text-white/80 font-quicksand-medium mt-1 text-sm">
              {products.length} produit{products.length !== 1 ? 's' : ''} au catalogue
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => setViewMode(prev => prev === 'list' ? 'grid' : 'list')}
              className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 border border-white/30"
            >
              <Ionicons name={viewMode === 'list' ? 'grid' : 'list'} size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/(app)/(enterprise)/(tabs)/products/create')}
              className="bg-white rounded-2xl px-5 py-3 flex-row items-center shadow-md"
              style={{ elevation: 3 }}
            >
              <Ionicons name="add-circle" size={20} color="#10B981" />
              <Text className="text-primary-600 font-quicksand-bold ml-2 text-sm">Ajouter</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View className="relative">
          <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10" style={{ transform: [{ translateY: -10 }] }}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
          </View>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Rechercher un produit..."
            className="bg-white rounded-2xl pl-12 pr-12 py-3.5 text-neutral-800 font-quicksand-medium shadow-sm"
            placeholderTextColor="#9CA3AF"
            style={{ elevation: 2 }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-neutral-100 rounded-full p-1"
              style={{ transform: [{ translateY: -10 }] }}
              onPress={() => setSearchQuery('')}
            >
              <Ionicons name="close" size={16} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Pills */}
      <View className="mb-4">
        <FlatList
          data={[{ _id: 'all', name: 'Tous' }, ...categories] as any}
          horizontal
          keyExtractor={(item: any) => item._id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24 }}
          renderItem={({ item }: any) => (
            <TouchableOpacity
              className={`px-5 py-2.5 mr-2 rounded-full ${
                selectedCategory === item._id 
                  ? 'bg-white shadow-md' 
                  : 'bg-white/20 backdrop-blur-sm border border-white/30'
              }`}
              style={selectedCategory === item._id ? { elevation: 3 } : {}}
              onPress={() => setSelectedCategory(item._id)}
            >
              <Text className={`text-sm font-quicksand-bold ${
                selectedCategory === item._id ? 'text-primary-600' : 'text-white'
              }`}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Sort and Filter Row */}
      <View className="flex-row items-center justify-between px-6 pt-2">
        <TouchableOpacity
          onPress={() => setShowSortModal(true)}
          className="flex-row items-center bg-white/95 backdrop-blur-sm rounded-full px-4 py-2.5 shadow-sm"
          style={{ elevation: 2 }}
        >
          <Ionicons name="swap-vertical" size={16} color="#10B981" />
          <Text className="text-neutral-700 font-quicksand-semibold ml-2 text-sm">
            {sortOptions.find(o => o.id === selectedSort)?.name}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#6B7280" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
        {searchQuery.trim().length > 0 && (
          <View className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30">
            <Text className="text-white font-quicksand-semibold text-sm">
              {products.length} résultat{products.length !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
    </LinearGradient>
  );

  if (initialLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background-secondary">
        <StatusBar backgroundColor="#10B981" barStyle="light-content" />
        <Header />
        <View className="flex-1 bg-white">
          {renderSkeletons()}
        </View>
        {renderSortModal()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      <StatusBar backgroundColor="#10B981" barStyle="light-content" />
      <Header />
      <View className="flex-1 bg-white">
        {products.length > 0 ? (
          <FlatList
            data={products}
            renderItem={(info) => renderProduct(info)}
            keyExtractor={(item) => item._id}
            key={viewMode === 'grid' ? 'grid' : 'list'}
            numColumns={viewMode === 'grid' ? 2 : 1}
            columnWrapperStyle={viewMode === 'grid' ? { paddingHorizontal: 8 } : undefined}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 28, paddingBottom: 28 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#10B981']}
                tintColor="#10B981"
              />
            }
            onEndReached={loadMoreProducts}
            onEndReachedThreshold={0.1}
            ListFooterComponent={
              loadingMore ? (
                <View className="py-4">
                  <ActivityIndicator size="small" color="#10B981" />
                </View>
              ) : null
            }
          />
        ) : (
          <View className="flex-1">
            {renderEmptyState()}
          </View>
        )}
      </View>
      {renderSortModal()}

      {/* Modern Confirmation Modal */}
      <Modal
        visible={confirmationVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeConfirmation}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={closeConfirmation}
        >
          <View className="flex-1 justify-center items-center px-6">
            <TouchableOpacity
              className="bg-white rounded-3xl w-full max-w-sm"
              activeOpacity={1}
              onPress={() => {}}
            >
              {/* Icon */}
              <View className="items-center pt-8 pb-4">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center"
                  style={{ backgroundColor: confirmationAction?.confirmColor + '20' }}
                >
                  <Ionicons
                    name={
                      confirmationAction?.type === 'delete' ? 'trash' :
                      confirmationAction?.type === 'status_change' ? (confirmationAction.product.isActive ? 'pause' : 'play') : 'help'
                    }
                    size={28}
                    color={confirmationAction?.confirmColor}
                  />
                </View>
              </View>

              {/* Content */}
              <View className="px-6 pb-6">
                <Text className="text-xl font-quicksand-bold text-neutral-800 text-center mb-2">
                  {confirmationAction?.title}
                </Text>
                <Text className="text-base text-neutral-600 font-quicksand-medium text-center leading-5">
                  {confirmationAction?.message}
                </Text>
              </View>

              {/* Actions */}
              <View className="flex-row px-6 pb-6 gap-3">
                <TouchableOpacity
                  onPress={closeConfirmation}
                  className="flex-1 bg-neutral-100 py-4 rounded-2xl items-center"
                >
                  <Text className="text-base font-quicksand-semibold text-neutral-700">
                    Annuler
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={executeConfirmedAction}
                  className="flex-1 py-4 rounded-2xl items-center"
                  style={{ backgroundColor: confirmationAction?.confirmColor }}
                >
                  <Text className="text-base font-quicksand-semibold text-white">
                    {confirmationAction?.confirmText}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Menu Modal pour les actions en mode grid */}
      <Modal
        visible={menuModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setMenuModalVisible(false);
          setSelectedProductForMenu(null);
        }}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => {
            setMenuModalVisible(false);
            setSelectedProductForMenu(null);
          }}
        >
          <View className="flex-1 justify-center items-center px-6">
            <TouchableOpacity
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden"
              activeOpacity={1}
              onPress={() => {}}
            >
              {/* Header du produit */}
              {selectedProductForMenu && (
                <View className="p-5 border-b border-neutral-100">
                  <View className="flex-row items-center">
                    <Image
                      source={{ uri: selectedProductForMenu.images[0] || 'https://via.placeholder.com/60x60/E5E7EB/9CA3AF?text=No+Image' }}
                      className="w-14 h-14 rounded-xl mr-3"
                      resizeMode="cover"
                    />
                    <View className="flex-1">
                      <Text className="text-base font-quicksand-bold text-neutral-800" numberOfLines={2}>
                        {selectedProductForMenu.name}
                      </Text>
                      <Text className="text-sm font-quicksand-medium text-primary-500 mt-1">
                        {formatPrice(selectedProductForMenu.price)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Options */}
              <View className="p-3">
                {/* Voir les détails */}
                <TouchableOpacity
                  className="flex-row items-center py-4 px-4 rounded-2xl mb-2 bg-neutral-50"
                  onPress={() => {
                    setMenuModalVisible(false);
                    if (selectedProductForMenu) {
                      (global as any).__CURRENT_PRODUCT_ID__ = selectedProductForMenu._id;
                      router.push(`/(app)/(enterprise)/(tabs)/products/${selectedProductForMenu._id}`);
                    }
                    setSelectedProductForMenu(null);
                  }}
                >
                  <View className="w-10 h-10 bg-primary-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="eye" size={20} color="#10B981" />
                  </View>
                  <Text className="text-base font-quicksand-semibold text-neutral-800 flex-1">
                    Voir les détails
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>

                {/* Changer le statut */}
                {selectedProductForMenu && (
                  <TouchableOpacity
                    className="flex-row items-center py-4 px-4 rounded-2xl mb-2 bg-neutral-50"
                    onPress={() => {
                      setMenuModalVisible(false);
                      if (selectedProductForMenu) {
                        handleStatusChange(selectedProductForMenu);
                      }
                      setSelectedProductForMenu(null);
                    }}
                  >
                    <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${selectedProductForMenu.isActive ? 'bg-warning-100' : 'bg-success-100'}`}>
                      <Ionicons 
                        name={selectedProductForMenu.isActive ? "pause" : "play"} 
                        size={20} 
                        color={selectedProductForMenu.isActive ? "#F59E0B" : "#10B981"} 
                      />
                    </View>
                    <Text className="text-base font-quicksand-semibold text-neutral-800 flex-1">
                      {selectedProductForMenu.isActive ? 'Désactiver' : 'Activer'}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                )}

                {/* Supprimer */}
                <TouchableOpacity
                  className="flex-row items-center py-4 px-4 rounded-2xl bg-red-50"
                  onPress={() => {
                    setMenuModalVisible(false);
                    if (selectedProductForMenu) {
                      handleDeleteProduct(selectedProductForMenu);
                    }
                    setSelectedProductForMenu(null);
                  }}
                >
                  <View className="w-10 h-10 bg-red-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </View>
                  <Text className="text-base font-quicksand-semibold text-red-600 flex-1">
                    Supprimer
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>

              {/* Bouton Annuler */}
              <View className="p-3 pt-0">
                <TouchableOpacity
                  className="bg-neutral-100 py-4 rounded-2xl items-center"
                  onPress={() => {
                    setMenuModalVisible(false);
                    setSelectedProductForMenu(null);
                  }}
                >
                  <Text className="text-base font-quicksand-semibold text-neutral-700">
                    Annuler
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Notification Modal */}
      {notification && (
        <NotificationModal
          visible={notification.visible}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={hideNotification}
        />
      )}
    </SafeAreaView>
  );
}
