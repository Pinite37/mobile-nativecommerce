import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from '../../../../contexts/AuthContext';
import { useSearchCache } from '../../../../hooks/useSearchCache';
import CategoryService from '../../../../services/api/CategoryService';
import EnterpriseService, { EnterpriseProfile } from '../../../../services/api/EnterpriseService';
import ProductService from '../../../../services/api/ProductService';
import SearchService from '../../../../services/api/SearchService';
import { AuthDebugger } from '../../../../services/AuthDebugger';
import SearchCacheService, { RecentSearch } from '../../../../services/SearchCacheService';
import { Category, Product } from '../../../../types/product';

// Données des villes et quartiers du Bénin
const beninCities = [
  { id: 1, name: "Cotonou" },
  { id: 2, name: "Porto-Novo" },
  { id: 3, name: "Parakou" },
  { id: 4, name: "Abomey-Calavi" },
  { id: 5, name: "Bohicon" },
  { id: 6, name: "Natitingou" },
  { id: 7, name: "Ouidah" },
  { id: 8, name: "Djougou" },
];

const neighborhoodsByCity: { [key: string]: string[] } = {
  "Cotonou": [
    "Akpakpa", "Cadjehoun", "Fidjrossè", "Gbégamey", "Houéyiho", 
    "Jéricho", "Menontin", "Patte d'Oie", "Ste Rita", "Vedoko", "Zongo"
  ],
  "Porto-Novo": [
    "Adjarra", "Adjohoun", "Aguégué", "Akpro-Missérété", "Avrankou", "Dangbo"
  ],
  "Parakou": [
    "Albarika", "Banikanni", "Ladjifarani", "Titirou", "Zongo"
  ],
  "Abomey-Calavi": [
    "Akassato", "Arconville", "Godomey", "Tankpè", "Togoudo", "Zinvié"
  ],
  "Bohicon": [
    "Agongointo", "Avogbanna", "Lissèzoun", "Ouassaho", "Passagon", "Sodohomè"
  ],
  "Natitingou": [
    "Boriyouré", "Kouaba", "Péporiyakou", "Takonta", "Yarikou"
  ],
  "Ouidah": [
    "Avlékété", "Djègbadji", "Houakpè", "Pahou", "Savi"
  ],
  "Djougou": [
    "Bariénou", "Bougou", "Kolokondé", "Partago", "Sérou"
  ],
};

// Catégories orientées entreprise (fallback)
const staticCategories = [
  { id: 1, name: "Business", icon: "briefcase", color: "#FF6B35" },
  { id: 2, name: "Marketing", icon: "megaphone", color: "#3B82F6" },
  { id: 3, name: "Finance", icon: "card", color: "#8B5CF6" },
  { id: 4, name: "Tech", icon: "laptop", color: "#EC4899" },
  { id: 5, name: "Formation", icon: "school", color: "#10B981" },
  { id: 6, name: "Consultation", icon: "people", color: "#6366F1" },
  { id: 7, name: "Services", icon: "construct", color: "#EF4444" },
  { id: 8, name: "Logistique", icon: "car", color: "#F59E0B" },
  { id: 9, name: "Partenaires", icon: "handshake", color: "#0EA5E9" },
];

const partnerEnterprises = [
  {
    id: 1,
    name: "LogisCorp Bénin",
    category: "Logistique",
    rating: 4.8,
    image: "https://via.placeholder.com/80x80/3B82F6/FFFFFF?text=LC",
    verified: true,
    services: "Transport & Livraison"
  },
  {
    id: 2,
    name: "FinanceHub",
    category: "Services Financiers",
    rating: 4.6,
    image: "https://via.placeholder.com/80x80/8B5CF6/FFFFFF?text=FH",
    verified: true,
    services: "Micro-crédit & Comptabilité"
  },
  {
    id: 3,
    name: "TechSolutions",
    category: "IT & Digital",
    rating: 4.9,
    image: "https://via.placeholder.com/80x80/10B981/FFFFFF?text=TS",
    verified: false,
    services: "Développement & Marketing"
  },
];

// Données fictives pour les tendances (à remplacer par de vraies données plus tard)
const growthData = {
  monthlyGrowth: 12.5,
  orderGrowth: 8.3,
  ratingGrowth: 5.2,
  reviewGrowth: 6.7,
};

export default function EnterpriseDashboard() {
  const { user, isAuthenticated, userRole } = useAuth();
  const router = useRouter();
  const { getCacheStats } = useSearchCache(); // Hook pour gérer le cache automatiquement
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<EnterpriseProfile | null>(null);
  
  // États pour la recherche par localisation
  const [selectedCity, setSelectedCity] = useState(beninCities[0].name);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("");
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [neighborhoodModalVisible, setNeighborhoodModalVisible] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  
  // États pour les produits de l'entreprise
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // États pour les catégories et produits populaires
  const [categories, setCategories] = useState<Category[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingPopular, setLoadingPopular] = useState(false);
  
  // États pour la recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchInfo, setSearchInfo] = useState<any>(null);
  
  // États pour l'historique des recherches
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [searchInputFocused, setSearchInputFocused] = useState(false);
  
  // Données pour le carrousel d'annonces boostées orientées entreprise
  const boostedAds = [
    {
      id: 1,
      title: "Boostez vos ventes",
      subtitle: "avec nos outils",
      description: "Augmentez votre visibilité et vos revenus",
      type: "main",
      bgColor: "#FE8C00",
      textColor: "#FFFFFF"
    },
    {
      id: 2,
      title: "Formation Marketing",
      subtitle: "Digital & Réseaux sociaux",
      price: "25.000 FCFA",
      badge: "NOUVEAU",
      type: "service",
      bgColor: "#FFFFFF",
      textColor: "#374151"
    },
    {
      id: 3,
      title: "Service Comptabilité",
      subtitle: "Gestion financière pro",
      price: "50.000 FCFA/mois",
      badge: "POPULAIRE",
      type: "service",
      bgColor: "#FFFFFF",
      textColor: "#374151"
    },
    {
      id: 4,
      title: "Publicité Premium",
      subtitle: "Mise en avant produits",
      price: "15.000 FCFA",
      badge: "PROMO",
      type: "service",
      bgColor: "#FFFFFF",
      textColor: "#374151"
    }
  ];

  // Charger les données du profil au montage
  useEffect(() => {
    console.log('🔍 Dashboard Enterprise - Vérification authentification');
    console.log('🔍 User:', user ? 'EXISTS' : 'NULL');
    console.log('🔍 IsAuthenticated:', isAuthenticated);
    console.log('🔍 UserRole:', userRole);
    
    if (!isAuthenticated || !user) {
      console.log('❌ Utilisateur non authentifié - redirection nécessaire');
      return;
    }
    
    loadProfileData();
    loadFeaturedProducts();
    loadCategories();
    loadPopularProducts();
    loadRecentSearches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Réinitialiser le quartier si la ville change
    setSelectedNeighborhood("");
  }, [selectedCity]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      // Debug des tokens avant l'appel API
      const tokenStatus = await AuthDebugger.debugTokenStatus();
      if (!tokenStatus) {
        console.error('❌ Pas de tokens valides - impossible de charger le profil');
        return;
      }
      
      const data = await EnterpriseService.getProfile();
      setProfileData(data);
    } catch (error) {
      console.error('❌ Erreur chargement profil dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeaturedProducts = async () => {
    try {
      setLoadingProducts(true);
      // Charger les produits de l'entreprise connectée
      const response = await ProductService.getEnterpriseProducts(1, 6);
      setFeaturedProducts(response.products || []);
    } catch (error) {
      console.error('❌ Erreur chargement produits entreprise:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const categoriesData = await CategoryService.getActiveCategories();
      setCategories(categoriesData.slice(0, 8)); // Prendre les 8 premières catégories
    } catch (error) {
      console.error('❌ Erreur chargement catégories:', error);
      // En cas d'erreur, on garde les catégories statiques
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadPopularProducts = async () => {
    try {
      setLoadingPopular(true);
      // Récupérer tous les produits publics pour que les entreprises voient tout le marketplace
      const response = await ProductService.getAllPublicProducts({ 
        limit: 6, 
        sort: 'popular',
        page: 1
      });
      setPopularProducts(response.products || []);
    } catch (error) {
      console.error('❌ Erreur chargement produits populaires:', error);
    } finally {
      setLoadingPopular(false);
    }
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        loadProfileData(),
        loadFeaturedProducts(),
        loadCategories(),
        loadPopularProducts()
      ]);
    } catch (error) {
      console.error('❌ Erreur refresh dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  // Fonctions pour le cache et l'historique des recherches
  const loadRecentSearches = async () => {
    try {
      const recent = await SearchCacheService.getRecentSearches();
      setRecentSearches(recent);
      console.log(`📚 ${recent.length} recherches récentes chargées`);
    } catch (error) {
      console.error('❌ Erreur chargement recherches récentes:', error);
    }
  };

  const clearSearchHistory = async () => {
    try {
      await SearchCacheService.clearRecentSearches();
      setRecentSearches([]);
      console.log('🧹 Historique des recherches vidé');
    } catch (error) {
      console.error('❌ Erreur vidage historique:', error);
    }
  };

  const removeFromSearchHistory = async (query: string) => {
    try {
      await SearchCacheService.removeFromRecentSearches(query);
      const updatedRecent = await SearchCacheService.getRecentSearches();
      setRecentSearches(updatedRecent);
      console.log('🗑️ Recherche supprimée:', query);
    } catch (error) {
      console.error('❌ Erreur suppression recherche:', error);
    }
  };

  // Fonctions de recherche améliorées avec cache
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Effacer les anciens résultats quand on change la recherche
    if (text !== searchQuery) {
      setShowSearchResults(false);
      setSearchResults([]);
      setSearchInfo(null);
    }
    
    // Gérer l'affichage des recherches récentes
    if (text.length === 0 && searchInputFocused) {
      setShowRecentSearches(true);
      setShowSuggestions(false);
    } else {
      setShowRecentSearches(false);
    }
    
    if (text.length >= 2) {
      // Set timeout for suggestions
      const timeout = setTimeout(() => {
        getSuggestions(text);
      }, 300);
      setSearchTimeout(timeout);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSearchInputFocus = () => {
    setSearchInputFocused(true);
    if (searchQuery.length === 0) {
      setShowRecentSearches(true);
    }
  };

  const handleSearchInputBlur = () => {
    setSearchInputFocused(false);
    // Délai pour permettre les clics sur les suggestions/historique
    setTimeout(() => {
      setShowRecentSearches(false);
      setShowSuggestions(false);
    }, 200);
  };

  const getSuggestions = async (query: string) => {
    try {
      setLoadingSearch(true);
      const suggestions = await SearchService.getSuggestions(query, 6);
      setSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error('❌ Erreur suggestions:', error);
    } finally {
      setLoadingSearch(false);
    }
  };

  const performSearch = async (query?: string) => {
    const searchTerm = query || searchQuery;
    if (!searchTerm.trim()) return;

    try {
      setLoadingSearch(true);
      setShowSuggestions(false);
      setShowRecentSearches(false);
      
      console.log('🔍 Recherche en cours pour:', searchTerm);
      console.log('📍 Localisation:', { city: selectedCity, district: selectedNeighborhood });
      
      // Construire les filtres basés sur la localisation sélectionnée
      const searchFilters = {
        city: selectedCity,
        district: selectedNeighborhood || undefined,
        sort: 'relevance',
        page: 1,
        limit: 20
      };

      // Vérifier d'abord le cache
      const cachedResults = await SearchCacheService.getCachedSearchResults(searchTerm, searchFilters);
      
      if (cachedResults) {
        console.log('⚡ Résultats trouvés en cache');
        setSearchResults(cachedResults.results || []);
        // Marquer les résultats comme venant du cache
        const searchInfoWithCache = {
          ...cachedResults.searchInfo,
          fromCache: true,
          query: searchTerm
        };
        setSearchInfo(searchInfoWithCache);
        setShowSearchResults(true);
        setLoadingSearch(false);
        return;
      }

      // Si pas en cache, faire l'appel API
      const response = await SearchService.searchProducts(searchTerm, searchFilters);
      
      console.log('✅ Résultats de recherche reçus:', response);
      
      // Traiter la réponse selon la structure fournie
      if (response.success) {
        const results = response.data || [];
        const searchInfo = response.searchInfo || null;
        
        setSearchResults(results);
        setSearchInfo(searchInfo);
        setShowSearchResults(true);
        
        // Mettre en cache les résultats
        await SearchCacheService.cacheSearchResults(searchTerm, results, searchInfo, searchFilters);
        
        // Ajouter à l'historique des recherches
        await SearchCacheService.addToRecentSearches(searchTerm, results.length);
        await loadRecentSearches(); // Recharger l'historique
        
        console.log(`📊 ${results.length} résultats trouvés pour "${searchTerm}"`);
        console.log(`📍 Dans la zone: ${selectedCity}${selectedNeighborhood ? ` - ${selectedNeighborhood}` : ''}`);
        
        // Mettre à jour les statistiques de recherche
        if (searchInfo) {
          console.log(`⏱️ Recherche effectuée en ${searchInfo.searchTime}ms`);
          console.log(`🎯 ${searchInfo.totalResults} résultats au total`);
        }
      } else {
        console.warn('❌ Recherche échouée:', response.message);
        setSearchResults([]);
        setSearchInfo(null);
        setShowSearchResults(false);
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la recherche:', error);
      setSearchResults([]);
      setSearchInfo(null);
      setShowSearchResults(false);
    } finally {
      setLoadingSearch(false);
    }
  };

  const selectSuggestion = (suggestion: any) => {
    setSearchQuery(suggestion.text);
    setShowSuggestions(false);
    setShowRecentSearches(false);
    performSearch(suggestion.text);
  };

  // Fonction de test pour le refresh token
  const testRefreshToken = async () => {
    console.log('🔧 Test du système de refresh token...');
    
    // D'abord vérifier l'état actuel
    await AuthDebugger.debugTokenStatus();
    
    // Simuler un token expiré
    await AuthDebugger.simulateExpiredToken();
    
    // Tenter un appel API qui devrait déclencher le refresh
    console.log('🔄 Test d\'un appel API avec token expiré...');
    try {
      await EnterpriseService.getProfile();
      console.log('✅ Appel API réussi après refresh automatique');
    } catch (error) {
      console.error('❌ Échec de l\'appel API après simulation:', error);
    }
  };

  // Fonction pour saluer l'utilisateur en fonction de l'heure
  const greetUser = () => {
    const hours = new Date().getHours();
    if (hours < 12) {
      return "Bonjour";
    } else if (hours < 18) {
      return "Bon après-midi";
    } else {
      return "Bonsoir";
    }
  };

  // Fonctions pour les modales de sélection
  const selectCity = (cityName: string) => {
    setSelectedCity(cityName);
    setCityModalVisible(false);
  };
  
  const selectNeighborhood = (neighborhoodName: string) => {
    setSelectedNeighborhood(neighborhoodName);
    setNeighborhoodModalVisible(false);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      className="bg-white rounded-xl mr-3 shadow-sm border border-neutral-100"
      onPress={() => {
        try {
          router.push(`/(app)/(enterprise)/(tabs)/product/${item._id}`);
        } catch (error) {
          console.warn('Erreur navigation vers produit:', error);
        }
      }}
    >
      <View className="relative">
        <Image
          source={{ uri: item.images[0] || "https://via.placeholder.com/150x150/CCCCCC/FFFFFF?text=No+Image" }}
          className="w-36 h-28 rounded-t-xl"
          resizeMode="cover"
        />
        {/* Badge pour les produits avec beaucoup de ventes */}
        {item.stats?.totalSales > 10 && (
          <View className="absolute top-2 right-2 bg-success-500 rounded-full px-2 py-1">
            <Text className="text-white text-xs font-quicksand-bold">
              Top Ventes
            </Text>
          </View>
        )}
      </View>
      <View className="p-2">
        <Text numberOfLines={1} className="text-xs font-quicksand-semibold text-neutral-800">
          {item.name}
        </Text>
        <View className="flex-row items-center my-1">
          <Ionicons name="star" size={12} color="#FE8C00" />
          <Text className="text-xs text-neutral-500 ml-1">
            {item.stats?.averageRating?.toFixed(1) || '0.0'}
          </Text>
        </View>
        <Text className="text-sm font-quicksand-bold text-primary-600">
          {formatPrice(item.price)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderPartner = ({ item }: { item: typeof partnerEnterprises[0] }) => (
    <TouchableOpacity className="bg-white rounded-2xl p-4 mr-4 shadow-sm border border-neutral-100">
      <View className="flex-row items-center">
        <Image
          source={{ uri: item.image }}
          className="w-12 h-12 rounded-xl"
          resizeMode="cover"
        />
        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Text className="text-sm font-quicksand-semibold text-neutral-800">
              {item.name}
            </Text>
            {item.verified && (
              <Ionicons name="checkmark-circle" size={16} color="#10B981" className="ml-1" />
            )}
          </View>
          <Text className="text-xs text-neutral-600 mt-1">
            {item.category}
          </Text>
          <Text className="text-xs text-neutral-500 mt-1">
            {item.services}
          </Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="star" size={12} color="#FE8C00" />
            <Text className="text-xs text-neutral-600 ml-1">
              {item.rating}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshData}
            colors={['#FE8C00']}
            tintColor="#FE8C00"
          />
        }
      >
        {/* Header avec fond orange et recherche par localisation */}
        <View className="bg-primary py-6 pt-16">
          {/* Header avec salutation et icône notification */}
          <View className="px-6 pb-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-quicksand-medium text-white opacity-90">
                  {greetUser()},
                </Text>
                <Text className="text-lg font-quicksand-bold text-white">
                  {user ? `${user.firstName} ${user.lastName}` : 'Entreprise'}
                </Text>
              </View>
              <TouchableOpacity className="relative">
                <Ionicons name="notifications-outline" size={24} color="white" />
                <View className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Location Selection */}
          <View className="flex-row justify-between px-6 mb-4">
            <TouchableOpacity 
              onPress={() => setCityModalVisible(true)}
              className="bg-primary-700 flex-1 rounded-2xl py-3 px-4 mr-2"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-white font-quicksand-medium">
                  {selectedCity || "Toutes les villes"}
                </Text>
                <Ionicons name="chevron-down-outline" size={16} color="white" />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => selectedCity && setNeighborhoodModalVisible(true)}
              className="bg-primary-700 flex-1 rounded-2xl py-3 px-4 ml-2"
              disabled={!selectedCity}
            >
              <View className="flex-row items-center justify-between">
                <Text className={`font-quicksand-medium ${selectedNeighborhood ? "text-white" : "text-gray-300"}`}>
                  {selectedNeighborhood || "Tous les quartiers"}
                </Text>
                <Ionicons name="chevron-down-outline" size={16} color="white" />
              </View>
            </TouchableOpacity>
          </View>
          
          {/* Search Bar */}
          <View className="px-6">
            <View className="bg-white rounded-xl shadow-md">
              <View className="flex-row items-center px-4 py-3">
                <Ionicons name="search" size={20} color="#9CA3AF" />
                <TextInput
                  className="ml-3 flex-1 text-neutral-700 font-quicksand-medium"
                  placeholder="Rechercher des services, produits..."
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  onFocus={handleSearchInputFocus}
                  onBlur={handleSearchInputBlur}
                  onSubmitEditing={() => performSearch()}
                  returnKeyType="search"
                />
                {loadingSearch ? (
                  <ActivityIndicator size="small" color="#9CA3AF" />
                ) : (
                  <TouchableOpacity onPress={() => {
                    if (searchQuery.trim()) {
                      performSearch();
                    } else {
                      router.push('/(app)/(enterprise)/(tabs)/products');
                    }
                  }}>
                    <Ionicons name="search" size={20} color="#FE8C00" />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Recherches récentes */}
              {showRecentSearches && recentSearches.length > 0 && (
                <View className="border-t border-gray-100">
                  <View className="flex-row items-center justify-between px-4 py-2 bg-gray-50">
                    <Text className="text-xs font-quicksand-semibold text-neutral-600 uppercase">
                      Recherches récentes
                    </Text>
                    <TouchableOpacity onPress={clearSearchHistory}>
                      <Text className="text-xs font-quicksand-medium text-primary-500">
                        Effacer
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {recentSearches.slice(0, 5).map((recentSearch, index) => (
                    <TouchableOpacity
                      key={index}
                      className="flex-row items-center justify-between px-4 py-3 border-b border-gray-50"
                      onPress={() => {
                        setSearchQuery(recentSearch.query);
                        performSearch(recentSearch.query);
                      }}
                    >
                      <View className="flex-row items-center flex-1">
                        <Ionicons name="time-outline" size={16} color="#9CA3AF" />
                        <Text className="ml-3 flex-1 text-neutral-700 font-quicksand-medium">
                          {recentSearch.query}
                        </Text>
                        <Text className="text-xs text-neutral-400 font-quicksand-medium mr-2">
                          {recentSearch.resultCount} résultat{recentSearch.resultCount > 1 ? 's' : ''}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          removeFromSearchHistory(recentSearch.query);
                        }}
                        className="p-1"
                      >
                        <Ionicons name="close" size={14} color="#9CA3AF" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              {/* Suggestions */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <View className="border-t border-gray-100">
                  <View className="px-4 py-2 bg-gray-50">
                    <Text className="text-xs font-quicksand-semibold text-neutral-600 uppercase">
                      Suggestions
                    </Text>
                  </View>
                  {searchSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      className="flex-row items-center px-4 py-3 border-b border-gray-50"
                      onPress={() => selectSuggestion(suggestion)}
                    >
                      <Ionicons 
                        name={suggestion.type === 'product' ? 'cube-outline' : 
                              suggestion.type === 'category' ? 'folder-outline' : 'business-outline'} 
                        size={16} 
                        color="#9CA3AF" 
                      />
                      <Text className="ml-3 flex-1 text-neutral-700 font-quicksand-medium">
                        {suggestion.text}
                      </Text>
                      <Text className="text-xs text-neutral-400 uppercase font-quicksand-medium">
                        {suggestion.type === 'product' ? 'Produit' : 
                         suggestion.type === 'category' ? 'Catégorie' : 'Entreprise'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Résultats de recherche */}
        {showSearchResults && (
          <View className="bg-white mx-4 rounded-2xl shadow-sm border border-neutral-100 mb-4">
            {/* Header des résultats */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-100">
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-lg font-quicksand-bold text-neutral-800">
                    Résultats de recherche
                  </Text>
                  {searchInfo?.fromCache && (
                    <View className="ml-2 bg-green-100 rounded-full px-2 py-1">
                      <Text className="text-xs font-quicksand-bold text-green-600">
                        ⚡ Cache
                      </Text>
                    </View>
                  )}
                </View>
                {searchInfo && (
                  <View className="flex-row items-center mt-1">
                    <Text className="text-sm text-neutral-600 font-quicksand-medium">
                      {searchInfo.totalResults} résultat{searchInfo.totalResults > 1 ? 's' : ''} pour &quot;{searchInfo.query}&quot;
                    </Text>
                    {searchInfo.searchTime && (
                      <Text className="text-xs text-neutral-400 font-quicksand-medium ml-2">
                        • {searchInfo.searchTime}ms
                      </Text>
                    )}
                  </View>
                )}
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setShowSearchResults(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>
            
            {/* Liste des résultats */}
            <View className="p-4">
              {searchResults.length > 0 ? (
                <FlatList
                  data={searchResults}
                  renderItem={({ item }: { item: Product }) => (
                    <TouchableOpacity 
                      className="flex-row bg-gray-50 rounded-xl p-3 mb-3"
                      onPress={() => {
                        try {
                          router.push(`/(app)/(enterprise)/(tabs)/product/${item._id}`);
                        } catch (error) {
                          console.warn('Erreur navigation produit recherche:', error);
                        }
                      }}
                    >
                      {/* Image du produit */}
                      <View className="w-16 h-16 rounded-xl overflow-hidden mr-3">
                        {item.images && item.images.length > 0 ? (
                          <Image
                            source={{ uri: item.images[0] }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="w-full h-full bg-gray-200 items-center justify-center">
                            <Ionicons name="image-outline" size={24} color="#ccc" />
                          </View>
                        )}
                      </View>
                      
                      {/* Informations du produit */}
                      <View className="flex-1">
                        <Text className="text-sm font-quicksand-semibold text-neutral-800 mb-1" numberOfLines={2}>
                          {item.name}
                        </Text>
                        
                        <Text className="text-lg font-quicksand-bold text-primary-600 mb-1">
                          {formatPrice(item.price)}
                        </Text>
                        
                        {/* Entreprise */}
                        {(item as any).enterpriseInfo && (
                          <Text className="text-xs text-neutral-500 mb-1" numberOfLines={1}>
                            {(item as any).enterpriseInfo.companyName}
                          </Text>
                        )}
                        
                        {/* Catégorie */}
                        {(item as any).categoryInfo && (
                          <Text className="text-xs text-neutral-400" numberOfLines={1}>
                            {(item as any).categoryInfo.name}
                          </Text>
                        )}
                        
                        {/* Stats */}
                        {item.stats && (
                          <View className="flex-row items-center mt-1">
                            <Ionicons name="star" size={12} color="#FFD700" />
                            <Text className="text-xs text-neutral-600 ml-1">
                              {item.stats.averageRating?.toFixed(1) || '0.0'}
                            </Text>
                            <Text className="text-xs text-neutral-400 ml-2">
                              • {item.stats.totalSales || 0} ventes
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {/* Flèche */}
                      <View className="justify-center">
                        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                      </View>
                    </TouchableOpacity>
                  )}
                  keyExtractor={(item) => item._id}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={false}
                />
              ) : (
                <View className="items-center py-8">
                  <Ionicons name="search" size={48} color="#ccc" />
                  <Text className="text-neutral-500 font-quicksand-medium mt-2">
                    Aucun résultat trouvé
                  </Text>
                </View>
              )}
              
              {/* Voir tous les résultats */}
              {searchResults.length > 0 && (
                <View className="border-t border-gray-100 p-4">
                  <TouchableOpacity 
                    className="bg-primary-500 rounded-xl py-3 items-center"
                    onPress={() => {
                      // Ici on peut naviguer vers une page de résultats dédiée
                      // ou garder cette interface inline
                      router.push('/(app)/(enterprise)/(tabs)/products');
                    }}
                  >
                    <Text className="text-white font-quicksand-semibold">
                      Voir tous les résultats ({searchInfo?.totalResults || searchResults.length})
                    </Text>
                  </TouchableOpacity>
                  
                  {/* Statistiques de performance */}
                  {searchInfo && (
                    <View className="flex-row items-center justify-center mt-3 opacity-60">
                      <Ionicons name="flash" size={12} color="#9CA3AF" />
                      <Text className="text-xs text-neutral-500 font-quicksand-medium ml-1">
                        Recherche en {searchInfo.searchTime || 0}ms
                      </Text>
                      {searchInfo.fromCache && (
                        <>
                          <Text className="text-xs text-neutral-400 mx-1">•</Text>
                          <Text className="text-xs text-green-600 font-quicksand-medium">
                            Résultats en cache
                          </Text>
                        </>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Annonces Boostées / Services Pro - Carrousel */}
        <View className="py-4">
          <View className="flex-row items-center justify-between mb-4 px-4">
            <Text className="text-lg font-quicksand-bold text-neutral-800">
              Services Pro
            </Text>
            <TouchableOpacity className="flex-row items-center">
              <Text className="text-primary-500 font-quicksand-medium text-sm mr-1">
                Voir tout
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#FE8C00" />
            </TouchableOpacity>
          </View>
          
          <View className="relative">
            <FlatList
              ref={useRef(null)}
              data={boostedAds}
              renderItem={({ item }) => {
                const screenWidth = Dimensions.get('window').width;
                const cardWidth = screenWidth - 32;
                
                if (item.type === "main") {
                  return (
                    <View style={{ width: screenWidth, paddingHorizontal: 16 }}>
                      <TouchableOpacity 
                        className="rounded-2xl p-6 shadow-md"
                        style={{ 
                          backgroundColor: item.bgColor,
                          width: cardWidth,
                          minHeight: 140
                        }}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1">
                            <Text 
                              className="font-quicksand-bold text-xl mb-2"
                              style={{ color: item.textColor }}
                            >
                              {item.title}
                            </Text>
                            <Text 
                              className="font-quicksand-bold text-2xl mb-1"
                              style={{ color: item.textColor }}
                            >
                              {item.subtitle}
                            </Text>
                            <Text 
                              className="font-quicksand-medium text-sm mb-4 opacity-90"
                              style={{ color: item.textColor }}
                            >
                              {item.description}
                            </Text>
                            <View className="bg-white rounded-full px-4 py-2 self-start">
                              <Text className="text-primary-500 font-quicksand-bold text-sm">
                                Découvrir
                              </Text>
                            </View>
                          </View>
                          <View className="ml-4 items-center">
                            <View className="bg-white/20 rounded-full p-3 mb-2">
                              <Ionicons name="trending-up" size={32} color="white" />
                            </View>
                            <View className="bg-success-500 rounded-full px-3 py-1">
                              <Text className="text-white font-quicksand-bold text-xs">
                                PRO
                              </Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                } else {
                  return (
                    <View style={{ width: screenWidth, paddingHorizontal: 16 }}>
                      <TouchableOpacity 
                        className="rounded-2xl p-4 shadow-sm border border-neutral-100"
                        style={{ 
                          backgroundColor: item.bgColor,
                          width: cardWidth,
                          minHeight: 140
                        }}
                      >
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="bg-primary-100 rounded-full px-2 py-1">
                            <Text className="text-primary-600 font-quicksand-bold text-xs">
                              {item.badge}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                        </View>
                        <Text 
                          className="font-quicksand-bold text-sm mb-1"
                          style={{ color: item.textColor }}
                        >
                          {item.title}
                        </Text>
                        <Text 
                          className="font-quicksand-medium text-xs mb-2 opacity-75"
                          style={{ color: item.textColor }}
                        >
                          {item.subtitle}
                        </Text>
                        <Text className="text-primary-500 font-quicksand-bold text-sm">
                          {item.price}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                }
              }}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const newIndex = Math.round(event.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                setCurrentAdIndex(newIndex);
              }}
            />
            
            {/* Indicateurs de pagination */}
            <View className="flex-row justify-center mt-4">
              {boostedAds.map((_, index) => (
                <View
                  key={index}
                  className={`w-2 h-2 rounded-full mx-1 ${
                    index === currentAdIndex ? 'bg-primary-500' : 'bg-neutral-300'
                  }`}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Categories Business Grid */}
        <View className="py-4 bg-background-secondary">
          <Text className="text-lg font-quicksand-bold text-neutral-800 px-6 mb-4">
            Services Business
          </Text>
          {loadingCategories ? (
            <View className="flex-1 justify-center items-center py-8">
              <ActivityIndicator size="large" color="#FE8C00" />
              <Text className="mt-2 text-neutral-600 font-quicksand-medium">
                Chargement des catégories...
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-center px-3">
              {(categories.length > 0 ? categories : staticCategories).slice(0, 8).map((category: any, index: number) => {
                // Couleurs par défaut pour les vraies catégories
                const colors = ["#FF6B35", "#3B82F6", "#8B5CF6", "#EC4899", "#10B981", "#6366F1", "#EF4444", "#F59E0B"];
                const icons = ["briefcase", "megaphone", "card", "laptop", "school", "people", "construct", "car"];
                
                const categoryColor = category.color || colors[index % colors.length];
                const categoryIcon = category.icon || icons[index % icons.length];
                const categoryId = category._id || category.id || index;
                
                return (
                  <View key={categoryId} style={{ width: '25%', paddingHorizontal: 5, marginBottom: 14 }}>
                    <TouchableOpacity className="items-center">
                      <View
                        className="w-14 h-14 rounded-xl justify-center items-center mb-2"
                        style={{ backgroundColor: categoryColor + '15' }}
                      >
                        <Ionicons name={categoryIcon as any} size={22} color={categoryColor} />
                      </View>
                      <Text className="text-xs font-quicksand-medium text-neutral-700 text-center">
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Mes Produits en Vedette */}
        <View className="pt-4 pb-2">
          <View className="px-4 mb-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-quicksand-bold text-neutral-800">
                Mes Produits en Vedette
              </Text>
              <TouchableOpacity onPress={() => {
                try {
                  router.push('/(app)/(enterprise)/(tabs)/products');
                } catch (error) {
                  console.warn('Erreur navigation produits:', error);
                }
              }}>
                <Text className="text-primary-500 font-quicksand-medium text-sm">
                  Voir tout
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <FlatList
            data={featuredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item._id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            ListEmptyComponent={
              loadingProducts ? (
                <View className="flex-1 justify-center items-center py-8">
                  <ActivityIndicator size="large" color="#FE8C00" />
                  <Text className="mt-2 text-neutral-600 font-quicksand-medium">
                    Chargement des produits...
                  </Text>
                </View>
              ) : (
                <View className="flex-1 justify-center items-center py-8">
                  <Text className="text-neutral-600 font-quicksand-medium">
                    Aucun produit disponible
                  </Text>
                </View>
              )
            }
          />
        </View>

        {/* Produits Populaires du Marketplace */}
        <View className="pt-4 pb-2">
          <View className="px-4 mb-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-quicksand-bold text-neutral-800">
                Tendances du Marketplace
              </Text>
              <TouchableOpacity onPress={() => {
                try {
                  router.push('/(app)/(enterprise)/(tabs)/products');
                } catch (error) {
                  console.warn('Erreur navigation marketplace:', error);
                }
              }}>
                <Text className="text-primary-500 font-quicksand-medium text-sm">
                  Voir tout
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <FlatList
            data={popularProducts}
            renderItem={({ item }: { item: Product }) => (
              <TouchableOpacity 
                className="bg-white rounded-xl mr-3 shadow-sm border border-neutral-100"
                onPress={() => {
                  try {
                    router.push(`/(app)/(enterprise)/(tabs)/product/${item._id}`);
                  } catch (error) {
                    console.warn('Erreur navigation produit marketplace:', error);
                  }
                }}
              >
                <View className="relative">
                  <Image
                    source={{ uri: item.images[0] || "https://via.placeholder.com/150x150/CCCCCC/FFFFFF?text=No+Image" }}
                    className="w-36 h-28 rounded-t-xl"
                    resizeMode="cover"
                  />
                  <View className="absolute top-2 right-2 bg-warning-500 rounded-full px-2 py-1">
                    <Text className="text-white text-xs font-quicksand-bold">
                      Tendance
                    </Text>
                  </View>
                </View>
                <View className="p-2">
                  <Text numberOfLines={1} className="text-xs font-quicksand-semibold text-neutral-800">
                    {item.name}
                  </Text>
                  <View className="flex-row items-center my-1">
                    <Ionicons name="star" size={12} color="#FE8C00" />
                    <Text className="text-xs text-neutral-500 ml-1">
                      {item.stats?.averageRating?.toFixed(1) || '0.0'}
                    </Text>
                  </View>
                  <Text className="text-sm font-quicksand-bold text-primary-600">
                    {formatPrice(item.price)}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item._id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            ListEmptyComponent={
              loadingPopular ? (
                <View className="flex-1 justify-center items-center py-8">
                  <ActivityIndicator size="large" color="#FE8C00" />
                  <Text className="mt-2 text-neutral-600 font-quicksand-medium">
                    Chargement des tendances...
                  </Text>
                </View>
              ) : (
                <View className="flex-1 justify-center items-center py-8">
                  <Text className="text-neutral-600 font-quicksand-medium">
                    Aucune tendance disponible
                  </Text>
                </View>
              )
            }
          />
        </View>

        {/* Partenaires Business */}
        

        {/* Bannière Promotion Entreprise */}
       

        {/* Section Statistiques Rapides */}
        <View className="px-6 py-4">
          {loading ? (
            <View className="flex-1 justify-center items-center py-8">
              <ActivityIndicator size="large" color="#FE8C00" />
              <Text className="mt-4 text-neutral-600 font-quicksand-medium">Chargement...</Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              <View className="w-[48%] bg-white rounded-2xl p-4 mb-3 shadow-sm border border-neutral-100">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="w-10 h-10 bg-primary-100 rounded-full justify-center items-center">
                    <Ionicons name="trending-up" size={20} color="#FE8C00" />
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="trending-up" size={16} color="#10B981" />
                    <Text className="text-xs font-quicksand-medium ml-1 text-success-500">
                      {growthData.monthlyGrowth}%
                    </Text>
                  </View>
                </View>
                <Text className="text-lg font-quicksand-bold text-neutral-800 mb-1">
                  {formatPrice(profileData?.enterprise?.stats?.totalSales || 0)}
                </Text>
                <Text className="text-sm font-quicksand-medium text-neutral-600">
                  Ventes totales
                </Text>
              </View>
              
              <View className="w-[48%] bg-white rounded-2xl p-4 mb-3 shadow-sm border border-neutral-100">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="w-10 h-10 bg-success-100 rounded-full justify-center items-center">
                    <Ionicons name="receipt" size={20} color="#10B981" />
                  </View>
                  <View className="flex-row items-center">
                    <Ionicons name="trending-up" size={16} color="#10B981" />
                    <Text className="text-xs font-quicksand-medium ml-1 text-success-500">
                      {growthData.orderGrowth}%
                    </Text>
                  </View>
                </View>
                <Text className="text-lg font-quicksand-bold text-neutral-800 mb-1">
                  {profileData?.enterprise?.stats?.totalOrders || 0}
                </Text>
                <Text className="text-sm font-quicksand-medium text-neutral-600">
                  Commandes
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Section Business Tips */}
        <View className="px-4 pb-8">
          <TouchableOpacity 
            className="bg-primary-50 rounded-2xl p-4 border border-primary-200"
            onPress={async () => {
              const stats = await getCacheStats();
              console.log('📊 Statistiques du cache:', stats);
              // Optionnel: afficher les stats dans une alerte
            }}
            onLongPress={() => {
              console.log('🔧 Test manuel du refresh token déclenché');
              testRefreshToken();
            }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="bg-primary-500 rounded-full p-2 mr-3">
                  <Ionicons name="bulb" size={16} color="white" />
                </View>
                <Text className="text-primary-700 font-quicksand-bold text-sm">
                  Conseil Business
                </Text>
              </View>
              <Text className="text-primary-600 font-quicksand-medium text-xs">
                Nouveau
              </Text>
            </View>
            <Text className="text-primary-600 font-quicksand-medium text-xs">
              Optimisez vos ventes en utilisant nos outils d&apos;analytics et boostez votre visibilité !
            </Text>
            <Text className="text-primary-400 font-quicksand-medium text-xs mt-2 opacity-50">
              (Tap: Stats cache • Long press: Test refresh token)
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Modal de sélection de ville */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={cityModalVisible}
        onRequestClose={() => setCityModalVisible(false)}
      >
        <View className="flex-1 bg-transparent justify-end">
          <View className="bg-white rounded-t-3xl pb-10 pt-4 px-4">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-lg font-quicksand-bold text-neutral-800">
                Choisir une ville
              </Text>
              <TouchableOpacity onPress={() => setCityModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={beninCities}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => selectCity(item.name)}
                  className="py-3 border-b border-gray-100"
                >
                  <Text 
                    className={`text-base font-quicksand-medium ${
                      selectedCity === item.name ? 'text-primary' : 'text-neutral-700'
                    }`}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
      
      {/* Modal de sélection de quartier */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={neighborhoodModalVisible}
        onRequestClose={() => setNeighborhoodModalVisible(false)}
      >
        <View className="flex-1 bg-transparent justify-end">
          <View className="bg-white rounded-t-3xl pb-10 pt-4 px-4">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-lg font-quicksand-bold text-neutral-800">
                Choisir un quartier à {selectedCity}
              </Text>
              <TouchableOpacity onPress={() => setNeighborhoodModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={neighborhoodsByCity[selectedCity] || []}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => selectNeighborhood(item)}
                  className="py-3 border-b border-gray-100"
                >
                  <Text 
                    className={`text-base font-quicksand-medium ${
                      selectedNeighborhood === item ? 'text-primary' : 'text-neutral-700'
                    }`}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
