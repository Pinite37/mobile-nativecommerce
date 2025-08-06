import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import SearchService from '../../../../services/api/SearchService';

const { width } = Dimensions.get('window');

interface SearchFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  city?: string;
  district?: string;
  enterprise?: string;
  sort: string;
  inStock: boolean;
}

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Pertinence' },
  { value: 'newest', label: 'Plus récent' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
  { value: 'rating', label: 'Mieux notés' },
  { value: 'popular', label: 'Plus populaires' },
];

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<SearchFilters>({
    sort: 'relevance',
    inStock: true,
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const [searchInfo, setSearchInfo] = useState<any>(null);

  // Fonction de recherche simple avec setTimeout pour debounce
  const [searchTimeout, setSearchTimeout] = useState<any>(null);

  const handleSearchQueryChange = (text: string) => {
    setSearchQuery(text);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for auto-search
    if (text.length >= 2) {
      const timeout = setTimeout(() => {
        performSearch(text);
      }, 500);
      setSearchTimeout(timeout);
    }
  };

  // Effectuer la recherche
  const performSearch = async (query?: string, page: number = 1, resetResults: boolean = true) => {
    const searchTerm = query || searchQuery;
    
    if (!searchTerm.trim()) {
      Alert.alert('Recherche', 'Veuillez saisir un terme de recherche');
      return;
    }

    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const result = await SearchService.searchProducts(searchTerm);
      
      if (result.success) {
        if (resetResults || page === 1) {
          setProducts(result.data || []);
        } else {
          setProducts(prev => [...prev, ...(result.data || [])]);
        }
        
        // Mise à jour des informations de pagination si disponibles
        if (result.pagination) {
          setPagination(result.pagination);
        }
        
        // Mise à jour des informations de recherche si disponibles
        if (result.searchInfo) {
          setSearchInfo(result.searchInfo);
        }
      } else {
        Alert.alert('Erreur', result.message || 'Aucun résultat trouvé');
        setProducts([]);
      }
      
    } catch (error: any) {
      console.error('Erreur recherche:', error);
      Alert.alert('Erreur', error.message || 'Erreur lors de la recherche');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Charger plus de résultats
  const loadMore = () => {
    if (!loadingMore && pagination.page < pagination.pages) {
      performSearch(undefined, pagination.page + 1, false);
    }
  };

  // Appliquer les filtres
  const applyFilters = () => {
    setShowFilters(false);
    if (searchQuery.trim()) {
      performSearch();
    }
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    setFilters({
      sort: 'relevance',
      inStock: true,
    });
  };

  // Naviguer vers les détails du produit
  const navigateToProduct = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  // Composant ProductCard simple
  const ProductCard = ({ product, onPress }: { product: any; onPress: () => void }) => (
    <TouchableOpacity style={styles.productCard} onPress={onPress}>
      {product.images && product.images.length > 0 ? (
        <Image
          source={{ uri: product.images[0] }}
          style={styles.productImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.productImage, styles.placeholderImage]}>
          <Ionicons name="image-outline" size={32} color="#ccc" />
        </View>
      )}
      
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        
        <Text style={styles.productPrice}>
          {product.price?.toLocaleString()} FCFA
        </Text>
        
        {product.enterpriseInfo && (
          <Text style={styles.enterpriseName} numberOfLines={1}>
            {product.enterpriseInfo.companyName}
          </Text>
        )}
        
        {product.stats && (
          <View style={styles.statsRow}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.rating}>
              {product.stats.averageRating?.toFixed(1) || '0.0'}
            </Text>
            <Text style={styles.sales}>
              • {product.stats.totalSales || 0} ventes
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  // Rendu des produits
  const renderProduct = ({ item }: { item: any }) => (
    <ProductCard
      product={item}
      onPress={() => navigateToProduct(item._id)}
    />
  );

  // Rendu des filtres
  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Tri */}
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Trier par</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.filterChip,
                  filters.sort === option.value && styles.filterChipActive
                ]}
                onPress={() => setFilters(prev => ({ ...prev, sort: option.value }))}
              >
                <Text style={[
                  styles.filterChipText,
                  filters.sort === option.value && styles.filterChipTextActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Prix */}
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Prix (FCFA)</Text>
          <View style={styles.priceInputsContainer}>
            <TextInput
              style={styles.priceInput}
              placeholder="Min"
              value={filters.minPrice?.toString() || ''}
              onChangeText={(text) => setFilters(prev => ({ 
                ...prev, 
                minPrice: text ? parseInt(text) : undefined 
              }))}
              keyboardType="numeric"
            />
            <Text style={styles.priceSeparator}>-</Text>
            <TextInput
              style={styles.priceInput}
              placeholder="Max"
              value={filters.maxPrice?.toString() || ''}
              onChangeText={(text) => setFilters(prev => ({ 
                ...prev, 
                maxPrice: text ? parseInt(text) : undefined 
              }))}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Stock */}
        <View style={styles.filterSection}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setFilters(prev => ({ ...prev, inStock: !prev.inStock }))}
          >
            <Ionicons
              name={filters.inStock ? 'checkbox' : 'checkbox-outline'}
              size={24}
              color={filters.inStock ? '#007AFF' : '#666'}
            />
            <Text style={styles.checkboxText}>Produits en stock uniquement</Text>
          </TouchableOpacity>
        </View>

        {/* Boutons d'action */}
        <View style={styles.filterActions}>
          <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
            <Text style={styles.resetButtonText}>Réinitialiser</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
            <Text style={styles.applyButtonText}>Appliquer</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header de recherche moderne */}
      <View style={styles.searchHeader}>
        <View style={styles.searchHeaderGradient}>
          <View style={styles.searchInputContainer}>
            <View style={styles.searchIconContainer}>
              <Ionicons name="search" size={20} color="#6C7293" />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Que recherchez-vous ?"
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={handleSearchQueryChange}
              onSubmitEditing={() => performSearch()}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => {
                  setSearchQuery('');
                  setProducts([]);
                }}
              >
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity
            style={[styles.filterButton, showFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons 
              name="options" 
              size={20} 
              color={showFilters ? "#fff" : "#6366F1"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtres */}
      {showFilters && renderFilters()}

      {/* Résultats */}
      <View style={styles.resultsContainer}>
        {/* Info de recherche */}
        {searchInfo && (
          <View style={styles.searchInfoContainer}>
            <Text style={styles.searchInfoText}>
              {searchInfo.totalResults} résultat{searchInfo.totalResults > 1 ? 's' : ''} pour &quot;{searchInfo.query}&quot;
            </Text>
            <Text style={styles.searchTimeText}>
              en {searchInfo.searchTime}ms
            </Text>
          </View>
        )}

        {/* Liste des produits */}
        {loading && products.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Recherche en cours...</Text>
          </View>
        ) : (
          <FlatList
            data={products}
            renderItem={renderProduct}
            keyExtractor={(item) => item._id}
            numColumns={2}
            columnWrapperStyle={styles.productRow}
            contentContainerStyle={styles.productsList}
            onEndReached={loadMore}
            onEndReachedThreshold={0.1}
            ListFooterComponent={loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingMoreText}>Chargement...</Text>
              </View>
            ) : null}
            ListEmptyComponent={
              !loading && searchQuery.length > 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search" size={64} color="#ccc" />
                  <Text style={styles.emptyTitle}>Aucun résultat</Text>
                  <Text style={styles.emptyMessage}>
                    Essayez avec d&apos;autres mots-clés ou modifiez vos filtres
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    maxHeight: 300,
  },
  filterSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  priceInputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  priceSeparator: {
    marginHorizontal: 12,
    fontSize: 16,
    color: '#666',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxText: {
    marginLeft: 8,
    fontSize: 16,
  },
  filterActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  resetButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    color: '#666',
  },
  applyButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
  },
  searchInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  searchInfoText: {
    fontSize: 14,
    color: '#333',
  },
  searchTimeText: {
    fontSize: 12,
    color: '#666',
  },
  productsList: {
    padding: 8,
  },
  productRow: {
    justifyContent: 'space-around',
  },
  productCard: {
    width: (width - 32) / 2,
    margin: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  placeholderImage: {
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  enterpriseName: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 12,
    color: '#333',
    marginLeft: 2,
  },
  sales: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
});
