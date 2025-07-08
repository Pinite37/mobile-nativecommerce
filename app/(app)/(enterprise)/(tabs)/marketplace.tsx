import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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

import CategoryService from "../../../../services/api/CategoryService";
import ProductService from "../../../../services/api/ProductService";
import { Category, Product } from "../../../../types/product";

const sortOptions = [
  { id: "newest", name: "Plus récents", field: "createdAt" },
  { id: "price_asc", name: "Prix croissant", field: "price" },
  { id: "price_desc", name: "Prix décroissant", field: "price" },
  { id: "rating", name: "Mieux notés", field: "rating" },
  { id: "popular", name: "Plus populaires", field: "popularity" },
];

export default function EnterpriseMarketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSort, setSelectedSort] = useState("newest");
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  
  // Filters
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000000 });
  const [selectedRating, setSelectedRating] = useState(0);
  
  // Errors
  const [error, setError] = useState<string | null>(null);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load categories and products in parallel
      const [categoriesData, productsData] = await Promise.all([
        CategoryService.getActiveCategories(),
        ProductService.getAllProducts(1, 12, {
          sort: selectedSort as any,
          isActive: true // Only active products
        })
      ]);

      setCategories(categoriesData);
      setProducts(productsData.products);
      setCurrentPage(productsData.pagination.page);
      setTotalPages(productsData.pagination.pages);
      setHasMoreProducts(productsData.pagination.page < productsData.pagination.pages);
      
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données');
      console.error('Error loading marketplace data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSort]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load data when search or filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!loading) {
        setCurrentPage(1);
        // Reload products with new filters
        loadProducts(true);
      }
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory]);

  const loadProducts = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setCurrentPage(1);
      }
      
      const page = reset ? 1 : currentPage;
      
      const filters: any = {
        sort: selectedSort as any,
        isActive: true, // Only active products
        minPrice: priceRange.min > 0 ? priceRange.min : undefined,
        maxPrice: priceRange.max < 10000000 ? priceRange.max : undefined,
      };

      if (selectedCategory !== 'all') {
        filters.category = selectedCategory;
      }

      let response;
      if (searchQuery.trim()) {
        response = await ProductService.searchProducts(searchQuery.trim(), page, 12, filters);
      } else if (selectedCategory !== 'all') {
        response = await ProductService.getProductsByCategory(selectedCategory, page, 12, filters);
      } else {
        response = await ProductService.getAllProducts(page, 12, filters);
      }
      
      if (reset) {
        setProducts(response.products);
      } else {
        setProducts(prev => [...prev, ...response.products]);
      }
      
      setCurrentPage(response.pagination.page);
      setTotalPages(response.pagination.pages);
      setHasMoreProducts(response.pagination.page < response.pagination.pages);
      
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des produits');
      console.error('Error loading products:', err);
    }
  }, [searchQuery, selectedCategory, selectedSort, currentPage, priceRange]);

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

  const handleAddToCart = async (product: Product) => {
    Alert.alert(
      "Quantité",
      "Combien d'unités voulez-vous ajouter au panier ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "1",
          onPress: () => addToCart(product._id, 1)
        },
        {
          text: "5",
          onPress: () => addToCart(product._id, 5)
        },
        {
          text: "10",
          onPress: () => addToCart(product._id, 10)
        }
      ]
    );
  };

  const addToCart = async (productId: string, quantity: number) => {
    try {
      const { cartService } = await import("../../../../services/api/CartService");
      await cartService.addToCart({ productId, quantity });
      Alert.alert("Succès", "Produit ajouté au panier avec succès !");
    } catch (err: any) {
      Alert.alert("Erreur", err.message || "Impossible d'ajouter le produit au panier");
    }
  };

  const handleContactEnterprise = async (product: Product) => {
    Alert.alert(
      "Contacter l'entreprise",
      `Voulez-vous contacter ${product.enterprise.companyName} pour ce produit ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Contacter",
          onPress: () => {
            // TODO: Implement contact functionality
            Alert.alert("Contact", "Demande de contact envoyée !");
          }
        }
      ]
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={12}
          color="#FE8C00"
        />
      );
    }
    return stars;
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

  const renderProduct = ({ item }: { item: Product }) => (
    <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-neutral-100 mx-2 flex-1">
      <TouchableOpacity
        onPress={() => {
          // TODO: Navigate to product detail
          console.log('Navigate to product detail:', item._id);
        }}
      >
        <Image
          source={{ uri: item.images[0] || 'https://via.placeholder.com/150x150/E5E7EB/9CA3AF?text=No+Image' }}
          className="w-full h-40 rounded-xl mb-3"
          resizeMode="cover"
        />
        
        <View className="mb-2">
          <Text className="text-base font-quicksand-semibold text-neutral-800 mb-1" numberOfLines={2}>
            {item.name}
          </Text>
          <Text className="text-sm text-neutral-600 mb-1">
            {item.category.name}
          </Text>
          <Text className="text-xs text-neutral-500 mb-2">
            par {item.enterprise.companyName}
          </Text>
          
          <View className="flex-row items-center mb-2">
            <View className="flex-row items-center mr-2">
              {renderStars(Math.floor(item.stats.averageRating))}
            </View>
            <Text className="text-xs text-neutral-600">
              {item.stats.averageRating.toFixed(1)} ({item.stats.totalReviews})
            </Text>
          </View>
          
          <Text className="text-lg font-quicksand-bold text-primary-500 mb-3">
            {formatPrice(item.price)}
          </Text>
        </View>
      </TouchableOpacity>
      
      <View className="flex-row items-center justify-between space-x-2">
        <TouchableOpacity
          className="flex-1 bg-primary-500 rounded-xl py-2 px-3"
          onPress={() => handleAddToCart(item)}
        >
          <Text className="text-white font-quicksand-semibold text-center text-sm">
            Ajouter
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          className="flex-1 bg-background-secondary rounded-xl py-2 px-3"
          onPress={() => handleContactEnterprise(item)}
        >
          <Text className="text-neutral-700 font-quicksand-semibold text-center text-sm">
            Contact
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFiltersModal = () => (
    <Modal
      visible={showFilters}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilters(false)}
    >
      <View className="flex-1 bg-black/50">
        <View className="flex-1 bg-white mt-16 rounded-t-3xl p-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-quicksand-bold text-neutral-800">
              Filtres
            </Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          {/* Price Range */}
          <View className="mb-6">
            <Text className="text-lg font-quicksand-semibold text-neutral-800 mb-4">
              Prix (FCFA)
            </Text>
            <View className="flex-row items-center space-x-4">
              <View className="flex-1">
                <Text className="text-sm text-neutral-600 mb-2">Min</Text>
                <TextInput
                  className="border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800"
                  placeholder="0"
                  value={priceRange.min > 0 ? priceRange.min.toString() : ''}
                  onChangeText={(text) => setPriceRange(prev => ({ ...prev, min: parseInt(text) || 0 }))}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm text-neutral-600 mb-2">Max</Text>
                <TextInput
                  className="border border-neutral-200 rounded-xl px-4 py-3 text-neutral-800"
                  placeholder="10000000"
                  value={priceRange.max < 10000000 ? priceRange.max.toString() : ''}
                  onChangeText={(text) => setPriceRange(prev => ({ ...prev, max: parseInt(text) || 10000000 }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>
          
          {/* Rating Filter */}
          <View className="mb-6">
            <Text className="text-lg font-quicksand-semibold text-neutral-800 mb-4">
              Note minimum
            </Text>
            <View className="flex-row items-center space-x-4">
              {[1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  className={`px-4 py-2 rounded-xl ${
                    selectedRating >= rating ? 'bg-primary-500' : 'bg-neutral-100'
                  }`}
                  onPress={() => setSelectedRating(rating)}
                >
                  <Text className={`font-quicksand-medium ${
                    selectedRating >= rating ? 'text-white' : 'text-neutral-700'
                  }`}>
                    {rating}★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Apply Filters Button */}
          <TouchableOpacity
            className="bg-primary-500 rounded-xl py-4 mt-4"
            onPress={() => {
              setShowFilters(false);
              loadProducts(true);
            }}
          >
            <Text className="text-white font-quicksand-semibold text-center">
              Appliquer les filtres
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center px-6">
      <Ionicons name="storefront-outline" size={80} color="#D1D5DB" />
      <Text className="text-xl font-quicksand-bold text-neutral-800 mt-4 mb-2">
        Aucun produit trouvé
      </Text>
      <Text className="text-center text-neutral-600 font-quicksand-medium mb-6">
        Essayez de modifier vos filtres ou votre recherche
      </Text>
      <TouchableOpacity 
        className="bg-primary-500 rounded-xl py-4 px-8"
        onPress={() => {
          setSearchQuery('');
          setSelectedCategory('all');
          setPriceRange({ min: 0, max: 10000000 });
          setSelectedRating(0);
          loadProducts(true);
        }}
      >
        <Text className="text-white font-quicksand-semibold">
          Réinitialiser les filtres
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background-secondary">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#6366F1" />
          <Text className="mt-4 text-neutral-600 font-quicksand-medium">
            Chargement du marketplace...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background-secondary">
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="alert-circle-outline" size={80} color="#EF4444" />
          <Text className="text-xl font-quicksand-bold text-neutral-800 mt-4 mb-2">
            Erreur
          </Text>
          <Text className="text-center text-neutral-600 font-quicksand-medium mb-6">
            {error}
          </Text>
          <TouchableOpacity 
            className="bg-primary-500 rounded-xl py-4 px-8"
            onPress={loadInitialData}
          >
            <Text className="text-white font-quicksand-semibold">
              Réessayer
            </Text>
          </TouchableOpacity>
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
            Marketplace
          </Text>
          <View className="flex-row items-center space-x-3">
            <TouchableOpacity
              onPress={() => setShowFilters(true)}
              className="bg-primary-500 rounded-xl p-2"
            >
              <Ionicons name="filter" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                // Navigate to cart using router
                router.push('/(app)/(enterprise)/(tabs)/cart');
              }}
              className="bg-background-secondary rounded-xl p-2"
            >
              <Ionicons name="cart" size={20} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View className="px-6 py-4">
        <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 shadow-sm border border-neutral-100">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            className="ml-3 flex-1 text-neutral-800 font-quicksand-medium"
            placeholder="Rechercher des produits..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Categories */}
      <View className="px-6 mb-4">
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
      </View>

      {/* Sort and Filter Info */}
      <View className="px-6 flex-row items-center justify-between mb-4">
        <Text className="text-sm font-quicksand-medium text-neutral-600">
          {products.length} produits
        </Text>
        
        <TouchableOpacity 
          className="flex-row items-center bg-white rounded-xl px-3 py-2 shadow-sm border border-neutral-100"
          onPress={() => setShowSortModal(true)}
        >
          <Text className="text-sm font-quicksand-medium text-neutral-700 mr-1">
            {sortOptions.find(o => o.id === selectedSort)?.name}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Products Grid */}
      {products.length > 0 ? (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: 16 }}
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
        renderEmptyState()
      )}

      {/* Modals */}
      {renderSortModal()}
      {renderFiltersModal()}
    </SafeAreaView>
  );
}
