import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../../contexts/AuthContext';
import CategoryService from '../../../../services/api/CategoryService';
import EnterpriseService from '../../../../services/api/EnterpriseService';
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

// partnerEnterprises sample data removed (not used) to avoid unused variable warnings

// Données fictives pour les tendances (à remplacer par de vraies données plus tard)
// const growthData = { monthlyGrowth: 0, orderGrowth: 0, ratingGrowth: 0, reviewGrowth: 0 }; // désactivé (non utilisé)

export default function EnterpriseDashboard() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, userRole } = useAuth();
  const router = useRouter();
  // const { getCacheStats } = useSearchCache(); // Hook pour gérer le cache automatiquement (usage futur)
  
  // const [loading, setLoading] = useState(false); // non utilisé pour l'instant
  const [loading, setLoading] = useState(true); // État de chargement global pour le skeleton loader
  const [refreshing, setRefreshing] = useState(false);
  // const [profileData, setProfileData] = useState<EnterpriseProfile | null>(null); // non utilisé pour l'instant
  
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
  
  // Références
  const flatListRef = useRef(null);
  
  // États pour la recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  
  // États pour les favoris
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [searchTimeout, setSearchTimeout] = useState<any>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchInfo, setSearchInfo] = useState<any>(null);
  
  // États pour l'historique des recherches
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [searchInputFocused, setSearchInputFocused] = useState(false);
  const [resultsView, setResultsView] = useState<'grid' | 'list'>('grid');
  const [selectedSort, setSelectedSort] = useState<'relevance' | 'priceLow' | 'priceHigh' | 'newest'>('relevance');
  
  // Données pour le carrousel d'annonces boostées orientées entreprise
  const boostedAds = [
    {
      id: 1,
      title: "Boostez vos ventes",
      subtitle: "avec nos outils",
      description: "Augmentez votre visibilité et vos revenus",
      type: "main",
      bgColor: "#10B981",
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
    loadFavorites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Réinitialiser le quartier si la ville change
    setSelectedNeighborhood("");
  }, [selectedCity]);

  const loadProfileData = async () => {
    try {
      await AuthDebugger.debugTokenStatus();
      await EnterpriseService.getProfile(); // appelé seulement pour vérifier auth; données non stockées ici
    } catch (error) {
      console.error('❌ Erreur chargement profil dashboard:', error);
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

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadProfileData(),
        loadFeaturedProducts(),
        loadCategories(),
        loadPopularProducts(),
        loadRecentSearches(),
        loadFavorites()
      ]);
    } catch (error) {
      console.error('❌ Erreur chargement données initiales:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // loadInitialData retiré des dépendances pour éviter la boucle infinie

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

  const SkeletonCard = ({ style }: { style?: any }) => (
    <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden" style={style}>
      <ShimmerBlock style={{ height: 120, borderRadius: 16, width: '100%' }} />
    </View>
  );

  const SkeletonProduct = () => (
    <View className="bg-white rounded-2xl shadow-md border border-neutral-100 p-2 mb-3 w-[48%] overflow-hidden">
      <ShimmerBlock style={{ height: 128, borderRadius: 16, width: '100%' }} />
      <View className="p-2">
        <ShimmerBlock style={{ height: 14, borderRadius: 7, width: '80%', marginBottom: 8 }} />
        <ShimmerBlock style={{ height: 16, borderRadius: 8, width: '60%', marginBottom: 8 }} />
        <ShimmerBlock style={{ height: 12, borderRadius: 6, width: '40%' }} />
      </View>
    </View>
  );

  const renderSkeletonHome = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 90 }}
    >
      {/* Header Skeleton */}
      <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="py-6 pt-16 rounded-b-3xl shadow-md">
        <View className="px-6 pb-4">
          <View className="flex-row items-center justify-between">
            <ShimmerBlock style={{ height: 20, borderRadius: 10, width: '40%' }} />
            <ShimmerBlock style={{ width: 24, height: 24, borderRadius: 12 }} />
          </View>
        </View>

        <View className="flex-row justify-between px-6 mb-4">
          <ShimmerBlock style={{ width: '45%', height: 40, borderRadius: 16 }} />
          <ShimmerBlock style={{ width: '45%', height: 40, borderRadius: 16 }} />
        </View>

        <View className="px-6">
          <ShimmerBlock style={{ height: 44, borderRadius: 16, width: '100%' }} />
        </View>
      </LinearGradient>

      {/* Categories Skeleton */}
      <View className="py-4">
        <View className="flex-row flex-wrap justify-center px-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <View key={index} className="w-[22%] items-center mb-4">
              <ShimmerBlock style={{ width: 60, height: 60, borderRadius: 30, marginBottom: 8 }} />
              <ShimmerBlock style={{ height: 12, borderRadius: 6, width: 50 }} />
            </View>
          ))}
        </View>
      </View>

      {/* Ads Skeleton */}
      <View className="py-4">
        <View className="px-6 mb-4">
          <ShimmerBlock style={{ height: 20, borderRadius: 10, width: '50%' }} />
        </View>
        <View className="px-4">
          <ShimmerBlock style={{ height: 150, borderRadius: 16, width: '100%' }} />
        </View>
      </View>

      {/* Featured Products Skeleton */}
      <View className="py-4 px-4">
        <View className="mb-4 flex-row justify-between items-center">
          <ShimmerBlock style={{ height: 18, borderRadius: 9, width: '40%' }} />
          <ShimmerBlock style={{ width: 80, height: 32, borderRadius: 16 }} />
        </View>
        <View className="flex-row flex-wrap justify-between">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonProduct key={index} />
          ))}
        </View>
      </View>
    </ScrollView>
  );

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

  // Fonctions pour les favoris
  const loadFavorites = async () => {
    try {
      const favs = await ProductService.getFavoriteProducts();
      setFavorites(new Set(favs.map(f => f.product._id)));
    } catch (error) {
      console.error('❌ Erreur chargement favoris:', error);
    }
  };

  const toggleFavorite = async (productId: string) => {
    const isFavorite = favorites.has(productId);
    try {
      if (isFavorite) {
        await ProductService.removeProductFromFavorites(productId);
      } else {
        await ProductService.addProductToFavorites(productId);
      }
      setFavorites(prev => {
        const newFavorites = new Set(prev);
        if (isFavorite) {
          newFavorites.delete(productId);
        } else {
          newFavorites.add(productId);
        }
        return newFavorites;
      });
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour des favoris:', error);
    }
  };

  // Mappe la valeur de tri UI vers la valeur attendue par l'API
  const mapSelectedSortToApi = (
    uiSort: 'relevance' | 'priceLow' | 'priceHigh' | 'newest' | 'oldest' | 'rating' | 'popular' | string
  ):
    'newest' | 'rating' | 'popular' | 'price_asc' | 'price_desc' => {
    switch (uiSort) {
      case 'priceLow':
        return 'price_asc';
      case 'priceHigh':
        return 'price_desc';
      case 'newest':
      case 'oldest':
        return 'newest';
      case 'rating':
        return 'rating';
      case 'popular':
      case 'relevance':
      default:
        return 'popular';
    }
  };

  // Fonctions de recherche améliorées avec cache
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (text !== searchQuery) {
      setShowSearchResults(false);
      setSearchResults([]);
      setSearchInfo(null);
    }

    if (text.length === 0 && searchInputFocused) {
      setShowRecentSearches(true);
      setShowSuggestions(false);
    } else {
      setShowRecentSearches(false);
    }

    if (text.length >= 2) {
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

      const searchFilters = {
        city: selectedCity,
        district: selectedNeighborhood || undefined,
        sort: mapSelectedSortToApi(selectedSort),
        page: 1,
        limit: 20
      };

      let cachedResults: any = null;
      try {
        cachedResults = await SearchCacheService.getCachedSearchResults(searchTerm, searchFilters);
      } catch (e) {
        console.warn('⚠️ Cache indisponible (lecture):', e);
      }

      if (cachedResults) {
        console.log('⚡ Résultats trouvés en cache');
        setSearchResults(cachedResults.results || []);
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

      const response = await ProductService.searchPublicProducts(searchTerm, searchFilters);

      console.log('✅ Résultats de recherche reçus:', response);

      // Normaliser la réponse (certains services renvoient { products, pagination }, d'autres { data, searchInfo })
      const results: Product[] = Array.isArray((response as any)?.data)
        ? (response as any).data
        : Array.isArray((response as any)?.products)
            ? (response as any).products
            : Array.isArray(response)
                ? (response as any)
                : [];

      const normalizedInfo =
        (response as any)?.searchInfo
        || ((response as any)?.pagination
            ? { totalResults: (response as any).pagination?.total }
            : null);

      setSearchResults(results);
      setSearchInfo(normalizedInfo);
      setShowSearchResults(true);

      // Opérations de cache: ne doivent pas faire échouer l'UI
      try {
        await SearchCacheService.cacheSearchResults(searchTerm, results, normalizedInfo, searchFilters);
        await SearchCacheService.addToRecentSearches(searchTerm, results.length);
        await loadRecentSearches();
      } catch (e) {
        console.warn('⚠️ Cache indisponible (écriture):', e);
      }

      console.log(`📊 ${results.length} résultats trouvés pour "${searchTerm}"`);
      console.log(`📍 Dans la zone: ${selectedCity}${selectedNeighborhood ? ` - ${selectedNeighborhood}` : ''}`);

      if (normalizedInfo?.searchTime) {
        console.log(`⏱️ Recherche effectuée en ${normalizedInfo.searchTime}ms`);
      }
      if (normalizedInfo?.totalResults != null) {
        console.log(`🎯 ${normalizedInfo.totalResults} résultats au total`);
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
    const text = suggestion?.text ?? '';
    setSearchQuery(text);
    setShowSuggestions(false);
    setShowRecentSearches(false);

    // Fermer le clavier pour éviter les conflits de tap
    // Keyboard.dismiss();

    // Si c'est un produit identifiable, on navigue directement
    if (suggestion?.type === 'product') {
      const productId = suggestion?.id || suggestion?.productId || suggestion?._id;
      if (productId) {
        router.push(`/(app)/(enterprise)/(tabs)/product/${productId}`);
        return;
      }
    }

    // Sinon, lancer la recherche
    setTimeout(() => {
      if (text && text.trim()) {
        performSearch(text);
      }
    }, 0);
  };

  // Fonction de test pour le refresh token
  // const testRefreshToken = async () => { /* debug tool désactivé */ };

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
      key={item._id}
      className="bg-white rounded-2xl shadow-md border border-neutral-100 p-2 mb-3 w-[48%] overflow-hidden"
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
          className="w-full h-32 rounded-t-2xl"
          resizeMode="cover"
        />
        {/* Badge pour les produits avec beaucoup de ventes */}
        {item.stats?.totalSales > 10 && (
          <View className="absolute top-2 left-2 bg-success-500 rounded-full px-2 py-1">
            <Text className="text-white text-xs font-quicksand-bold">
              Populaire
            </Text>
          </View>
        )}
        <TouchableOpacity
          className="absolute bottom-2 right-2 bg-white/80 rounded-full p-1"
          onPress={() => toggleFavorite(item._id)}
        >
          <Ionicons
            name={favorites.has(item._id) ? "heart" : "heart-outline"}
            size={20}
            color={favorites.has(item._id) ? "#EF4444" : "#6B7280"}
          />
        </TouchableOpacity>
      </View>
      <View className="p-2">
        <Text numberOfLines={2} className="text-sm font-quicksand-semibold text-neutral-800 mb-1">
          {item.name}
        </Text>
        <Text className="text-base font-quicksand-bold text-primary-600 mb-1">
          {formatPrice(item.price)}
        </Text>
        {item.stats && (
          <View className="flex-row items-center">
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text className="text-xs text-neutral-600 ml-1">
              {item.stats.averageRating?.toFixed(1) || '0.0'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      {loading ? (
        renderSkeletonHome()
      ) : (
        <ScrollView 
          className="flex-1" 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 90 + insets.bottom }}
          refreshControl={
              <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshData}
              colors={['#10B981']}
              tintColor="#10B981"
            />
          }
        >
        {/* Header avec fond orange et recherche par localisation */}
        <LinearGradient
          colors={['#10B981', '#34D399']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="py-6 pt-16 rounded-b-3xl shadow-md"
        >
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
                <Text className="text-xs font-quicksand text-white/80 mt-1">
                  Tableau de bord entreprise
                </Text>
              </View>
              <TouchableOpacity className="relative">
                <Ionicons name="notifications-outline" size={24} color="white" />
                <View className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Location Selection */}
          <View className="flex-row justify-between px-6 mb-4">
            <TouchableOpacity
              onPress={() => setCityModalVisible(true)}
              className="bg-white/20 backdrop-blur-sm flex-1 rounded-2xl py-3 px-4 mr-2 border border-white/20"
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
              className="bg-white/20 backdrop-blur-sm flex-1 rounded-2xl py-3 px-4 ml-2 border border-white/20"
              disabled={!selectedCity}
            >
              <View className="flex-row items-center justify-between">
                <Text className={`font-quicksand-medium ${selectedNeighborhood ? "text-white" : "text-white/70"}`}>
                  {selectedNeighborhood || "Tous les quartiers"}
                </Text>
                <Ionicons name="chevron-down-outline" size={16} color="white" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View className="px-6">
            <View className="bg-white rounded-2xl shadow-lg border border-white/20">
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
                    <Ionicons name="search" size={20} color="#10B981" />
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
                  {recentSearches.slice(0, 5).map((recentSearch) => (
                    <TouchableOpacity
                      key={recentSearch.query}
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
                      key={suggestion.id ?? suggestion.text ?? index}
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
        </LinearGradient>

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
            
            {/* Toggle vue et tri */}
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
              <View className="flex-row items-center bg-neutral-100 rounded-full p-1">
                <TouchableOpacity
                  onPress={() => setResultsView('grid')}
                  className={`px-3 py-1.5 rounded-full ${resultsView === 'grid' ? 'bg-white' : ''}`}
                >
                  <Ionicons name="grid-outline" size={16} color={resultsView === 'grid' ? '#10B981' : '#6B7280'} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setResultsView('list')}
                  className={`px-3 py-1.5 rounded-full ${resultsView === 'list' ? 'bg-white' : ''}`}
                >
                    <Ionicons name="list-outline" size={16} color={resultsView === 'list' ? '#10B981' : '#6B7280'} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity className="flex-row items-center">
                <Ionicons name="funnel-outline" size={16} color="#6B7280" />
                <Text className="ml-1 text-sm font-quicksand-medium text-neutral-600">
                  Trier
                </Text>
              </TouchableOpacity>
            </View>

            {/* Chips de localisation */}
            <View className="flex-row px-4 py-2">
              <TouchableOpacity
                onPress={() => setCityModalVisible(true)}
                className="flex-row items-center px-3 py-1.5 rounded-full border mr-2"
                style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}
              >
                <Ionicons name="location-outline" size={14} color="#6B7280" />
                <Text className="ml-1 text-xs font-quicksand-medium text-neutral-700">
                  {selectedCity}
                </Text>
              </TouchableOpacity>
              {!!selectedNeighborhood && (
                <TouchableOpacity
                  onPress={() => setNeighborhoodModalVisible(true)}
                  className="flex-row items-center px-3 py-1.5 rounded-full border"
                  style={{ backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}
                >
                  <Ionicons name="navigate-outline" size={14} color="#6B7280" />
                  <Text className="ml-1 text-xs font-quicksand-medium text-neutral-700">
                    {selectedNeighborhood}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Chips de tri */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}>
              <TouchableOpacity
                onPress={() => setSelectedSort('relevance')}
                className="px-3 py-1.5 rounded-full border mr-2"
                style={{ backgroundColor: selectedSort === 'relevance' ? '#FFF1E6' : '#F3F4F6', borderColor: selectedSort === 'relevance' ? '#FED7AA' : '#E5E7EB' }}
              >
                <Text className={`text-xs font-quicksand-semibold ${selectedSort === 'relevance' ? 'text-primary-600' : 'text-neutral-700'}`}>
                  Pertinence
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedSort('priceLow')}
                className="px-3 py-1.5 rounded-full border mr-2"
                style={{ backgroundColor: selectedSort === 'priceLow' ? '#FFF1E6' : '#F3F4F6', borderColor: selectedSort === 'priceLow' ? '#FED7AA' : '#E5E7EB' }}
              >
                <Text className={`text-xs font-quicksand-semibold ${selectedSort === 'priceLow' ? 'text-primary-600' : 'text-neutral-700'}`}>
                  Moins cher
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedSort('priceHigh')}
                className="px-3 py-1.5 rounded-full border mr-2"
                style={{ backgroundColor: selectedSort === 'priceHigh' ? '#FFF1E6' : '#F3F4F6', borderColor: selectedSort === 'priceHigh' ? '#FED7AA' : '#E5E7EB' }}
              >
                <Text className={`text-xs font-quicksand-semibold ${selectedSort === 'priceHigh' ? 'text-primary-600' : 'text-neutral-700'}`}>
                  Plus cher
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedSort('newest')}
                className="px-3 py-1.5 rounded-full border"
                style={{ backgroundColor: selectedSort === 'newest' ? '#FFF1E6' : '#F3F4F6', borderColor: selectedSort === 'newest' ? '#FED7AA' : '#E5E7EB' }}
              >
                <Text className={`text-xs font-quicksand-semibold ${selectedSort === 'newest' ? 'text-primary-600' : 'text-neutral-700'}`}>
                  Nouveaux
                </Text>
              </TouchableOpacity>
            </ScrollView>
            
            {/* Liste des résultats */}
            <View className="p-4">
              {searchResults.length > 0 ? (
                resultsView === 'grid' ? (
                  <View className="flex-row flex-wrap justify-between">
                    {searchResults.map((item) => renderProduct({ item }))}
                  </View>
                ) : (
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
                )
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
          <View className="flex-row items-center justify-between mb-6 px-6">
            <View>
              <Text className="text-xl font-quicksand-bold text-neutral-800">
                Services Pro
              </Text>
              <Text className="text-sm font-quicksand text-neutral-600 mt-1">
                Boostez votre visibilité avec nos services premium
              </Text>
            </View>
            <TouchableOpacity className="flex-row items-center bg-primary-50 rounded-xl px-3 py-2">
              <Text className="text-primary-600 font-quicksand-semibold text-sm mr-1">
                Voir tout
              </Text>
              <Ionicons name="chevron-forward" size={14} color="#10B981" />
            </TouchableOpacity>
          </View>
          
          <View className="relative">
            <FlatList
              ref={flatListRef}
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
              {boostedAds.map((ad) => (
                <View
                  key={ad.id}
                  className={`w-2 h-2 rounded-full mx-1 ${
                    ad.id - 1 === currentAdIndex ? 'bg-primary-500' : 'bg-neutral-300'
                  }`}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Categories Business Grid */}
        <View className="py-6 bg-background-secondary">
          <View className="px-6 mb-6">
            <Text className="text-xl font-quicksand-bold text-neutral-800">
              Services Business
            </Text>
            <Text className="text-sm font-quicksand text-neutral-600 mt-1">
              Découvrez nos catégories de services professionnels
            </Text>
          </View>
          {loadingCategories ? (
            <View className="flex-1 justify-center items-center py-8">
              <ActivityIndicator size="large" color="#10B981" />
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
                  <View key={categoryId} style={{ width: '25%', paddingHorizontal: 5, marginBottom: 16 }}>
                    <TouchableOpacity className="items-center">
                      <View
                        className="w-16 h-16 rounded-2xl justify-center items-center mb-3 shadow-md"
                        style={{
                          backgroundColor: categoryColor + '15',
                          borderWidth: 1,
                          borderColor: categoryColor + '30'
                        }}
                      >
                        <Ionicons name={categoryIcon as any} size={24} color={categoryColor} />
                      </View>
                      <Text className="text-xs font-quicksand-semibold text-neutral-700 text-center leading-4">
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
        <View className="pt-6 pb-4">
          <View className="px-6 mb-6">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xl font-quicksand-bold text-neutral-800">
                  Mes Produits en Vedette
                </Text>
                <Text className="text-sm font-quicksand text-neutral-600 mt-1">
                  Vos produits les plus populaires
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  try {
                    router.push('/(app)/(enterprise)/(tabs)/products');
                  } catch (error) {
                    console.warn('Erreur navigation produits:', error);
                  }
                }}
                className="flex-row items-center bg-primary-50 rounded-xl px-3 py-2"
              >
                <Text className="text-primary-600 font-quicksand-semibold text-sm mr-1">
                  Voir tout
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#10B981" />
              </TouchableOpacity>
            </View>
          </View>
          {loadingProducts ? (
            <View className="flex-1 justify-center items-center py-8">
              <ActivityIndicator size="large" color="#10B981" />
               <Text className="mt-2 text-neutral-600 font-quicksand-medium">
                 Chargement des produits...
               </Text>
            </View>
          ) : featuredProducts.length > 0 ? (
            <View className="flex-row flex-wrap justify-between px-4">
              {featuredProducts.map((item) => renderProduct({ item }))}
            </View>
          ) : (
            <View className="flex-1 justify-center items-center py-8">
              <Text className="text-neutral-600 font-quicksand-medium">
                Aucun produit disponible
              </Text>
            </View>
          )}
        </View>

        {/* Produits Populaires du Marketplace */}
        <View className="pt-6 pb-4">
          <View className="px-6 mb-6">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xl font-quicksand-bold text-neutral-800">
                  Tendances du Marketplace
                </Text>
                <Text className="text-sm font-quicksand text-neutral-600 mt-1">
                  Découvrez les produits populaires
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  try {
                    router.push('/(app)/(enterprise)/(tabs)/products');
                  } catch (error) {
                    console.warn('Erreur navigation marketplace:', error);
                  }
                }}
                className="flex-row items-center bg-primary-50 rounded-xl px-3 py-2"
              >
                <Text className="text-primary-600 font-quicksand-semibold text-sm mr-1">
                  Voir tout
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#10B981" />
              </TouchableOpacity>
            </View>
          </View>
          {loadingPopular ? (
            <View className="flex-1 justify-center items-center py-8">
              <ActivityIndicator size="large" color="#10B981" />
               <Text className="mt-2 text-neutral-600 font-quicksand-medium">
                 Chargement des tendances...
               </Text>
            </View>
          ) : popularProducts.length > 0 ? (
            <View className="flex-row flex-wrap justify-between px-4">
              {popularProducts.map((item) => renderProduct({ item }))}
            </View>
          ) : (
            <View className="flex-1 justify-center items-center py-8">
              <Text className="text-neutral-600 font-quicksand-medium">
                Aucune tendance disponible
              </Text>
            </View>
          )}
        </View>

        {/* Partenaires Business */}
        

        {/* Bannière Promotion Entreprise */}
       

        

        
      </ScrollView>

      )}

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
