import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    SafeAreaView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSort, setSelectedSort] = useState("createdAt");
  const [showFilters, setShowFilters] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  
  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  
  // Errors
  const [error, setError] = useState<string | null>(null);

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
      setLoading(true);
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
      setLoading(false);
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

  const handleDeleteProduct = async (productId: string) => {
    Alert.alert(
      "Supprimer le produit",
      "Êtes-vous sûr de vouloir supprimer ce produit ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await ProductService.deleteProduct(productId);
              setProducts(prev => prev.filter(p => p._id !== productId));
            } catch (err: any) {
              Alert.alert("Erreur", err.message || "Impossible de supprimer le produit");
            }
          }
        }
      ]
    );
  };

  const toggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      // Update the product status locally first for better UX
      setProducts(prev => 
        prev.map(p => 
          p._id === productId ? { ...p, isActive: !currentStatus } : p
        )
      );
      
      // We'll need to implement this method in ProductService
      // For now, we'll update the product with the new status
      await ProductService.updateProduct(productId, { isActive: !currentStatus });
    } catch (err: any) {
      // Revert the change if the API call fails
      setProducts(prev => 
        prev.map(p => 
          p._id === productId ? { ...p, isActive: currentStatus } : p
        )
      );
      Alert.alert("Erreur", err.message || "Impossible de modifier le statut du produit");
    }
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
    if (stock <= 5) return { color: '#F59E0B', text: 'Stock faible' };
    return { color: '#10B981', text: 'En stock' };
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      className={`mr-3 px-4 py-2 rounded-full ${
        selectedCategory === item._id
          ? "bg-primary-500"
          : "bg-white border border-neutral-200"
      }`}
      onPress={() => setSelectedCategory(item._id)}
    >
      <Text
        className={`text-sm font-quicksand-medium ${
          selectedCategory === item._id ? "text-white" : "text-neutral-700"
        }`}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderProduct = ({ item }: { item: Product }) => {
    const statusStyle = getStatusColor(item.isActive);
    const stockStatus = getStockStatus(item.stock);

    return (
      <TouchableOpacity 
        className="bg-white rounded-2xl p-4 mx-4 mb-4 shadow-sm border border-neutral-100"
        onPress={() => {
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
              <View className="flex-1">
                <Text className="text-base font-quicksand-semibold text-neutral-800">
                  {item.name}
                </Text>
                {typeof item.category === 'object' && (
                  <Text className="text-sm text-neutral-600">
                    {item.category.name}
                  </Text>
                )}
              </View>
              
              <View className="flex-row items-center space-x-2">
                <View
                  className="px-2 py-1 rounded-full"
                  style={{ backgroundColor: statusStyle.bg }}
                >
                  <Text
                    className="text-xs font-quicksand-semibold"
                    style={{ color: statusStyle.color }}
                  >
                    {item.isActive ? 'Actif' : 'Inactif'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      "Actions sur le produit",
                      "Que souhaitez-vous faire ?",
                      [
                        { text: "Annuler", style: "cancel" },
                        {
                          text: item.isActive ? "Désactiver" : "Activer",
                          onPress: () => toggleProductStatus(item._id, item.isActive)
                        },
                        {
                          text: "Supprimer",
                          style: "destructive",
                          onPress: () => handleDeleteProduct(item._id)
                        }
                      ]
                    );
                  }}
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View className="flex-row items-center mb-2">
              <Ionicons name="star" size={14} color="#FE8C00" />
              <Text className="text-xs text-neutral-600 ml-1">
                {item.stats.averageRating.toFixed(1)} ({item.stats.totalReviews} avis)
              </Text>
            </View>
            
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-quicksand-bold text-primary-500">
                {formatPrice(item.price)}
              </Text>
              
              <View className="flex-row items-center space-x-4">
                <View className="items-center">
                  <Text className="text-sm font-quicksand-bold text-neutral-800">
                    {item.stock}
                  </Text>
                  <Text
                    className="text-xs font-quicksand-medium"
                    style={{ color: stockStatus.color }}
                  >
                    {stockStatus.text}
                  </Text>
                </View>
                
                <View className="items-center">
                  <Text className="text-sm font-quicksand-bold text-neutral-800">
                    {item.stats.totalSales}
                  </Text>
                  <Text className="text-xs font-quicksand-medium text-neutral-600">
                    Vendus
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        
        <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-neutral-100">
          <TouchableOpacity 
            className="flex-1 bg-primary-500 rounded-xl py-3 mr-2"
            onPress={() => {
              // TODO: Navigate to edit product when route is created
              console.log('Navigate to edit product:', item._id);
            }}
          >
            <Text className="text-white font-quicksand-semibold text-center">
              Modifier
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="flex-1 bg-background-secondary rounded-xl py-3 ml-2"
            onPress={() => {
              Alert.alert(
                "Dupliquer le produit",
                "Voulez-vous créer une copie de ce produit ?",
                [
                  { text: "Annuler", style: "cancel" },
                  {
                    text: "Dupliquer",
                    onPress: () => {
                      // TODO: Navigate to create product with duplicate data
                      console.log('Duplicate product:', item._id);
                    }
                  }
                ]
              );
            }}
          >
            <Text className="text-neutral-700 font-quicksand-semibold text-center">
              Dupliquer
            </Text>
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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background-secondary">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#6366F1" />
          <Text className="mt-4 text-neutral-600 font-quicksand-medium">
            Chargement des produits...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      {/* Header */}
      <View className="bg-white px-6 py-4 pt-16">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-quicksand-bold text-neutral-800">
            Produits
          </Text>
          <TouchableOpacity 
            className="bg-primary-500 rounded-xl py-2 px-4"
            onPress={() => {
              router.push('/(app)/(enterprise)/(tabs)/products/create');
            }}
          >
            <View className="flex-row items-center">
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text className="text-white font-quicksand-semibold ml-1">
                Ajouter
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filters */}
      <View className="px-6 py-4 space-y-4">
        <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 shadow-sm border border-neutral-100">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            className="ml-3 flex-1 text-neutral-800 font-quicksand-medium"
            placeholder="Rechercher un produit..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
            <Ionicons name="options-outline" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View className="flex-row items-center">
          <TouchableOpacity
            className={`mr-3 px-4 py-2 rounded-full ${
              selectedCategory === 'all'
                ? "bg-primary-500"
                : "bg-white border border-neutral-200"
            }`}
            onPress={() => setSelectedCategory('all')}
          >
            <Text
              className={`text-sm font-quicksand-medium ${
                selectedCategory === 'all' ? "text-white" : "text-neutral-700"
              }`}
            >
              Tous
            </Text>
          </TouchableOpacity>
          
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item._id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 0 }}
          />
        </View>

        {/* Sort and Filter Bar */}
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-quicksand-medium text-neutral-600">
            {products.length} produits
          </Text>
          
          <TouchableOpacity 
            className="flex-row items-center bg-white rounded-xl px-3 py-2 shadow-sm border border-neutral-100"
            onPress={() => setShowSortModal(true)}
          >
            <Text className="text-sm font-quicksand-medium text-neutral-700 mr-1">
              Trier par {sortOptions.find(o => o.id === selectedSort)?.name}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Products List */}
      {products.length > 0 ? (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#6366F1']}
            />
          }
          onEndReached={loadMoreProducts}
          onEndReachedThreshold={0.1}
          ListFooterComponent={
            loadingMore ? (
              <View className="py-4">
                <ActivityIndicator size="small" color="#6366F1" />
              </View>
            ) : null
          }
        />
      ) : (
        <View className="flex-1">
          {renderEmptyState()}
        </View>
      )}

      {/* Sort Modal */}
      {renderSortModal()}
    </SafeAreaView>
  );
}
