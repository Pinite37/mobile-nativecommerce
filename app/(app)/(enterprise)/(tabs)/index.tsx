import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useTheme } from "@/contexts/ThemeContext";
import i18n from "@/i18n/i18n";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useEffect, useState } from "react";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CarouselComponent from "../../../../components/ui/CarouselComponent";
import { Shimmer } from "../../../../components/ui/Shimmer";
import AdvertisementService, {
  Advertisement,
} from "../../../../services/api/AdvertisementService";
import { getCategoryIcon } from "../../../../constants/CategoryIcons";
import CategoryService from "../../../../services/api/CategoryService";
import EnterpriseService from "../../../../services/api/EnterpriseService";
import ProductService from "../../../../services/api/ProductService";
import SearchService from "../../../../services/api/SearchService";
import { AuthDebugger } from "../../../../services/AuthDebugger";
import { useUnreadNotifications } from "../../../../hooks/useUnreadNotifications";
import SearchCacheService, {
  RecentSearch,
} from "../../../../services/SearchCacheService";
import { Category, Product } from "../../../../types/product";
import { beninCities, neighborhoodsByCity } from "../../../../constants/LocationData";
import { StatusBar as StatusBarComponent } from "../../../../components/ui/StatusBar";
import { StatusViewer } from "../../../../components/ui/StatusViewer";
import { StatusCreator } from "../../../../components/ui/StatusCreator";
import StatusService, { StatusGroup } from "../../../../services/api/StatusService";
import MessagingService from "../../../../services/api/MessagingService";

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { locale } = useLocale();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, userRole } = useAuth();
  const router = useRouter();
  const { subscription } = useSubscription();
  const { unreadCount, loadUnreadCount } = useUnreadNotifications();

  const handleOpenStatusCreator = () => {
    const hasActiveSubscription = subscription?.isActive && subscription?.endDate && new Date(subscription.endDate) > new Date();
    if (!hasActiveSubscription) {
      router.push('/(app)/(enterprise)/subscriptions/index');
      return;
    }
    setCreatorVisible(true);
  };

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) loadUnreadCount();
    }, [isAuthenticated, loadUnreadCount])
  );
  // const { getCacheStats } = useSearchCache(); // Hook pour gérer le cache automatiquement (usage futur)

  const [refreshing, setRefreshing] = useState(false);
  const { width } = Dimensions.get("window");
  const isSmallScreen = width < 380;

  const FIXED_HEADER_HEIGHT = 120 + insets.top;

  // États statuts
  const [statusGroups, setStatusGroups] = useState<StatusGroup[]>([]);
  const [statusCurrentUserId, setStatusCurrentUserId] = useState('');
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState(0);
  const [creatorVisible, setCreatorVisible] = useState(false);

  const loadStatuses = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await StatusService.getAll();
      setStatusGroups(res.groups);
      setStatusCurrentUserId(res.currentUserId);
    } catch (e: any) {
      console.error('[Home] ❌ loadStatuses failed:', e?.message);
    }
  }, [isAuthenticated]);

  useFocusEffect(useCallback(() => { loadStatuses(); }, [loadStatuses]));

  const handlePressStatusGroup = (group: StatusGroup) => {
    const idx = statusGroups.findIndex(g => g.enterprise._id === group.enterprise._id);
    setViewerGroupIndex(idx >= 0 ? idx : 0);
    setViewerVisible(true);
  };

  const handleStatusViewed = async (statusId: string) => {
    try { await StatusService.markViewed(statusId); } catch {}
    setStatusGroups(prev => prev.map(g => ({
      ...g,
      statuses: g.statuses.map(s => s._id === statusId ? { ...s, viewed: true } : s),
      hasUnviewed: g.statuses.some(s => s._id !== statusId && !s.viewed),
    })));
  };

  const handleDeleteStatus = async (statusId: string) => {
    try { await StatusService.remove(statusId); await loadStatuses(); } catch {}
  };

  // États pour la recherche par localisation
  const [selectedCity, setSelectedCity] = useState(beninCities[0].name);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("");
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [neighborhoodModalVisible, setNeighborhoodModalVisible] = useState(false);
  const [neighborhoodSearch, setNeighborhoodSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');

  // États pour la recherche
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownAnim] = useState(() => new Animated.Value(0));
  const [resultsAnim] = useState(() => new Animated.Value(0));
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchTimeout, setSearchTimeout] = useState<any>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchInfo, setSearchInfo] = useState<any>(null);

  // États pour l'historique des recherches
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [searchInputFocused, setSearchInputFocused] = useState(false);
  const [resultsView, setResultsView] = useState<"grid" | "list">("grid");
  const [selectedSort, setSelectedSort] = useState<
    "relevance" | "priceLow" | "priceHigh" | "newest"
  >("relevance");

  const queryClient = useQueryClient();

  const { data: enterpriseProfile } = useQuery({
    queryKey: ['enterprise', 'profile'],
    queryFn: async () => {
      await AuthDebugger.debugTokenStatus();
      return EnterpriseService.getProfile();
    },
    enabled: !!isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });
  const companyName = enterpriseProfile?.enterprise?.companyName ?? "";

  const { data: categories = [] as Category[], isLoading: loadingCategories } = useQuery({
    queryKey: ['categories', 'active'],
    queryFn: async () => { const r = await CategoryService.getActiveCategories(); return (r || []).slice(0, 8) as Category[]; },
    staleTime: 1000 * 60 * 10,
  });

  const { data: ads = [] as Advertisement[] } = useQuery({
    queryKey: ['ads', 'active'],
    queryFn: async () => { const d = await AdvertisementService.getActive(10); return Array.isArray(d) ? d as Advertisement[] : []; },
    staleTime: 60_000,
  });

  const { data: featuredProducts = [] as Product[], isLoading: loadingProducts } = useQuery({
    queryKey: ['products', 'enterprise', 'featured'],
    queryFn: async () => { const r = await ProductService.getEnterpriseProducts(1, 6); return (r.products || []) as Product[]; },
    enabled: !!isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });

  const {
    data: popularData, isLoading: loadingPopular,
    isFetchingNextPage: loadingMorePopular, fetchNextPage, hasNextPage,
  } = useInfiniteQuery({
    queryKey: ['products', 'popular', selectedCity, selectedNeighborhood],
    queryFn: ({ pageParam }) => ProductService.getAllPublicProducts({
      limit: 6, sort: 'newest', page: pageParam as number,
      city: selectedCity || undefined, district: selectedNeighborhood || undefined,
    }),
    getNextPageParam: (lastPage: any) => {
      const p = lastPage?.pagination;
      return p && p.page < p.pages ? p.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 2,
  });
  const popularProducts = popularData?.pages.flatMap((p: any) => p.products || []) ?? [];

  const { data: favorites = new Set<string>() } = useQuery({
    queryKey: ['favorites'],
    enabled: !!isAuthenticated,
    queryFn: async () => {
      const data = await ProductService.getFavoriteProducts();
      if (Array.isArray(data)) return new Set<string>(data.map((f: any) => f.product?._id).filter(Boolean));
      if (Array.isArray((data as any)?.data)) return new Set<string>((data as any).data.map((f: any) => f.product?._id).filter(Boolean));
      return new Set<string>();
    },
    staleTime: 1000 * 60 * 5,
  });

  const loading = loadingCategories || loadingPopular;

  const handleAdPress = async (ad: Advertisement) => {
    try {
      AdvertisementService.incrementClick(ad._id).catch(() => { });
      router.push({ pathname: '/(app)/(enterprise)/advertisement/[id]', params: { id: ad._id } });
    } catch (e) {
      console.error("⚠️ Erreur clic publicité:", e);
    }
  };

  useEffect(() => {
    loadRecentSearches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animation dropdown recherche
  useEffect(() => {
    if (showSuggestions || showRecentSearches) {
      dropdownAnim.setValue(0);
      Animated.spring(dropdownAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    }
  }, [showSuggestions, showRecentSearches]);

  // Animation résultats de recherche
  useEffect(() => {
    if (showSearchResults) {
      resultsAnim.setValue(0);
      Animated.spring(resultsAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 70,
        friction: 11,
      }).start();
    }
  }, [showSearchResults]);

  useEffect(() => {
    setSelectedNeighborhood("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity]);

  // Gestion du bouton retour matériel
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // Si on affiche les résultats de recherche, les masquer
        if (showSearchResults) {
          hideSearchResults();
          return true; // Empêche la navigation arrière par défaut
        }
        // Si on affiche les suggestions, les masquer
        if (showSuggestions) {
          setShowSuggestions(false);
          setSuggestions([]);
          return true; // Empêche la navigation arrière par défaut
        }
        // Sinon, laisser le comportement par défaut (qui quittera l'app car c'est la page racine)
        return false;
      }
    );

    return () => backHandler.remove();
  }, [showSearchResults, showSuggestions]);

  const refreshData = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['enterprise', 'profile'] }),
        queryClient.invalidateQueries({ queryKey: ['ads', 'active'] }),
        queryClient.invalidateQueries({ queryKey: ['products', 'enterprise', 'featured'] }),
        queryClient.invalidateQueries({ queryKey: ['products', 'popular'] }),
        queryClient.invalidateQueries({ queryKey: ['favorites'] }),
        queryClient.invalidateQueries({ queryKey: ['categories', 'active'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  const SkeletonProduct = () => (
    <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-2xl shadow-md border p-2 mb-3 w-[48%] overflow-hidden">
      <Shimmer style={{ height: 128, borderRadius: 16, width: "100%" }} />
      <View className="p-2">
        <Shimmer
          style={{ height: 14, borderRadius: 7, width: "80%", marginBottom: 8 }}
        />
        <Shimmer
          style={{ height: 16, borderRadius: 8, width: "60%", marginBottom: 8 }}
        />
        <Shimmer style={{ height: 12, borderRadius: 6, width: "40%" }} />
      </View>
    </View>
  );

  const renderSkeletonHome = () => (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      {/* Header Skeleton with Floating Search */}
      <View className="z-50">
        <LinearGradient
          colors={[colors.brandGradientStart, colors.brandGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 10,
            paddingBottom: 80,
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
          }}
          className="shadow-lg"
        >
          <View className={`${isSmallScreen ? 'px-4' : 'px-6'} flex-row justify-between items-center mb-4`}>
            <View>
              <Shimmer style={{ height: 16, borderRadius: 8, width: 80, marginBottom: 8 }} />
              <Shimmer style={{ height: 24, borderRadius: 12, width: 120 }} />
            </View>
            <Shimmer style={{ width: 40, height: 40, borderRadius: 20 }} />
          </View>
        </LinearGradient>

        {/* Floating Search Skeleton */}
        <View className="-mt-14 px-4">
          <View style={{ backgroundColor: colors.card }} className="rounded-3xl shadow-xl p-2">
            <Shimmer style={{ height: 44, borderRadius: 16, width: '100%', marginBottom: 12 }} />
            <View className="flex-row justify-between">
              <Shimmer style={{ width: '48%', height: 36, borderRadius: 12 }} />
              <Shimmer style={{ width: '48%', height: 36, borderRadius: 12 }} />
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
      >
        {/* Categories Skeleton - Horizontal Scroll */}
        <View className="py-6">
          <View className="px-6 mb-4">
            <Shimmer style={{ height: 20, borderRadius: 10, width: 140, marginBottom: 4 }} />
            <Shimmer style={{ height: 14, borderRadius: 7, width: 200 }} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: isSmallScreen ? 16 : 20, gap: isSmallScreen ? 8 : 12 }}>
            {Array.from({ length: 6 }).map((_, index) => (
              <View key={index} className="items-center">
                <Shimmer style={{ width: 64, height: 64, borderRadius: 16, marginBottom: 8 }} />
                <Shimmer style={{ width: 60, height: 12, borderRadius: 6 }} />
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Featured Products Skeleton */}
        <View className="py-4 px-4">
          <View className="mb-4 flex-row justify-between items-center">
            <Shimmer style={{ height: 18, borderRadius: 9, width: '40%' }} />
            <Shimmer style={{ width: 80, height: 32, borderRadius: 16 }} />
          </View>
          <View className="flex-row flex-wrap justify-between">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonProduct key={index} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );

  // Fonctions pour le cache et l'historique des recherches
  const loadRecentSearches = async () => {
    try {
      const recent = await SearchCacheService.getRecentSearches();
      setRecentSearches(recent);
    } catch (error) {
      console.error("❌ Erreur chargement recherches récentes:", error);
    }
  };

  const clearSearchHistory = async () => {
    try {
      await SearchCacheService.clearRecentSearches();
      setRecentSearches([]);
    } catch (error) {
      console.error("❌ Erreur vidage historique:", error);
    }
  };

  const removeFromSearchHistory = async (query: string) => {
    try {
      await SearchCacheService.removeFromRecentSearches(query);
      const updatedRecent = await SearchCacheService.getRecentSearches();
      setRecentSearches(updatedRecent);
    } catch (error) {
      console.error("❌ Erreur suppression recherche:", error);
    }
  };

  const toggleFavorite = async (productId: string) => {
    const isFavorite = (favorites as Set<string>).has(productId);
    try {
      if (isFavorite) {
        await ProductService.removeProductFromFavorites(productId);
      } else {
        await ProductService.addProductToFavorites(productId);
      }
      queryClient.setQueryData(['favorites'], (prev: Set<string> = new Set()) => {
        const next = new Set(prev);
        if (isFavorite) next.delete(productId); else next.add(productId);
        return next;
      });
    } catch (error) {
      console.error("❌ Erreur lors de la mise à jour des favoris:", error);
    }
  };

  // Mappe la valeur de tri UI vers la valeur attendue par l'API
  const mapSelectedSortToApi = (
    uiSort:
      | "relevance"
      | "priceLow"
      | "priceHigh"
      | "newest"
      | "oldest"
      | "rating"
      | "popular"
      | string
  ): "newest" | "rating" | "popular" | "price_asc" | "price_desc" => {
    switch (uiSort) {
      case "priceLow":
        return "price_asc";
      case "priceHigh":
        return "price_desc";
      case "newest":
      case "oldest":
        return "newest";
      case "rating":
        return "rating";
      case "popular":
      case "relevance":
      default:
        return "popular";
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

  // Fonction pour masquer les résultats de recherche (parité client)
  const hideSearchResults = () => {
    Keyboard.dismiss();
    Animated.timing(resultsAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setShowSearchResults(false);
      setSearchResults([]);
      setSearchInfo(null);
    });
  };

  const getSuggestions = async (query: string) => {
    try {
      setLoadingSearch(true);
      const suggestions = await SearchService.getSuggestions(query, 6);
      setSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } catch (error) {
      console.error("❌ Erreur suggestions:", error);
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

      const searchFilters = {
        city: selectedCity,
        district: selectedNeighborhood || undefined,
        sort: mapSelectedSortToApi(selectedSort),
        page: 1,
        limit: 20,
      };

      let cachedResults: any = null;
      try {
        cachedResults = await SearchCacheService.getCachedSearchResults(
          searchTerm,
          searchFilters
        );
      } catch (e) { /* cache unavailable */ }

      if (cachedResults) {
        setSearchResults(cachedResults.results || []);
        const searchInfoWithCache = {
          ...cachedResults.searchInfo,
          fromCache: true,
          query: searchTerm,
        };
        setSearchInfo(searchInfoWithCache);
        setShowSearchResults(true);
        setLoadingSearch(false);
        return;
      }

      const response = await ProductService.searchPublicProducts(
        searchTerm,
        searchFilters
      );

      // Normaliser la réponse (certains services renvoient { products, pagination }, d'autres { data, searchInfo })
      const results: Product[] = Array.isArray((response as any)?.data)
        ? (response as any).data
        : Array.isArray((response as any)?.products)
          ? (response as any).products
          : Array.isArray(response)
            ? (response as any)
            : [];

      const normalizedInfo =
        (response as any)?.searchInfo ||
        ((response as any)?.pagination
          ? { totalResults: (response as any).pagination?.total }
          : null);

      setSearchResults(results);
      setSearchInfo(normalizedInfo);
      setShowSearchResults(true);

      // Opérations de cache: ne doivent pas faire échouer l'UI
      try {
        await SearchCacheService.cacheSearchResults(
          searchTerm,
          results,
          normalizedInfo,
          searchFilters
        );
        await SearchCacheService.addToRecentSearches(
          searchTerm,
          results.length
        );
        await loadRecentSearches();
      } catch (e) { /* cache unavailable */ }
    } catch (error) {
      console.error("❌ Erreur lors de la recherche:", error);
      setSearchResults([]);
      setSearchInfo(null);
      setShowSearchResults(false);
    } finally {
      setLoadingSearch(false);
    }
  };

  const selectSuggestion = (suggestion: any) => {
    const text = suggestion?.text ?? "";
    setSearchQuery(text);
    setShowSuggestions(false);
    setShowRecentSearches(false);

    // Fermer le clavier pour éviter les conflits de tap
    Keyboard.dismiss();

    // Si c'est un produit identifiable, on navigue directement
    if (suggestion?.type === "product") {
      const productId =
        suggestion?.id || suggestion?.productId || suggestion?._id;
      if (productId) {
        router.push(`/(app)/(enterprise)/product/${productId}`);
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
      return i18n.t("enterprise.dashboard.greetings.morning");
    } else if (hours < 18) {
      return i18n.t("enterprise.dashboard.greetings.afternoon");
    } else {
      return i18n.t("enterprise.dashboard.greetings.evening");
    }
  };

  // Fonctions pour les modales de sélection
  const selectCity = (cityName: string) => {
    setSelectedCity(cityName);
    setCitySearch('');
    setCityModalVisible(false);
    if (cityName) {
      setTimeout(() => setNeighborhoodModalVisible(true), 350);
    } else {
      setSelectedNeighborhood('');
    }
  };

  const selectNeighborhood = (neighborhoodName: string) => {
    setSelectedNeighborhood(neighborhoodName);
    setNeighborhoodModalVisible(false);
  };

  const renderProduct = (item: Product) => (
    <TouchableOpacity
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
      className="rounded-2xl p-2 mb-3 overflow-hidden border"
      onPress={() => {
        try {
          router.push(`/(app)/(enterprise)/product/${item._id}`);
        } catch (error) {
          console.warn("Erreur navigation vers produit:", error);
        }
      }}
    >
      <View className="relative">
        <Image
          source={{
            uri:
              item.images[0] ||
              "https://via.placeholder.com/150x150/CCCCCC/FFFFFF?text=No+Image",
          }}
          style={{ width: "100%", height: 128, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
          contentFit="cover"
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
        <Text
          numberOfLines={2}
          style={{ color: colors.textPrimary }}
          className="text-sm font-quicksand-semibold mb-1"
        >
          {item.name}
        </Text>
        <Text style={{ color: colors.brandPrimary }} className="text-base font-quicksand-bold mb-1">
          {formatPrice(item.price)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderProductListItem = (item: Product) => (
    <TouchableOpacity
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
      }}
      className="rounded-2xl p-2 mb-3 w-full overflow-hidden flex-row border"
      onPress={() => {
        try {
          router.push(`/(app)/(enterprise)/product/${item._id}`);
        } catch (error) {
          console.warn("Erreur navigation produit liste:", error);
        }
      }}
    >
      <View className="relative mr-3">
        <Image
          source={{
            uri:
              item.images[0] ||
              "https://via.placeholder.com/150x150/CCCCCC/FFFFFF?text=No+Image",
          }}
          style={{ width: 96, height: 96, borderRadius: 12 }}
          contentFit="cover"
        />
        {item.stats?.totalSales > 10 && (
          <View className="absolute top-1 left-1 bg-success-500 rounded-full px-2 py-0.5">
            <Text className="text-white text-[10px] font-quicksand-bold">
              Populaire
            </Text>
          </View>
        )}
      </View>
      <View className="flex-1 justify-between">
        <View>
          <Text
            numberOfLines={2}
            style={{ color: colors.textPrimary }}
            className="text-sm font-quicksand-semibold"
          >
            {item.name}
          </Text>
        </View>
        <View className="flex-row items-center justify-between mt-2">
          <Text style={{ color: colors.brandPrimary }} className="text-base font-quicksand-bold">
            {formatPrice(item.price)}
          </Text>
          <TouchableOpacity
            className="bg-neutral-100 rounded-full p-2"
            onPress={() => toggleFavorite(item._id)}
          >
            <Ionicons
              name={favorites.has(item._id) ? "heart" : "heart-outline"}
              size={18}
              color={favorites.has(item._id) ? "#EF4444" : "#6B7280"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderAd = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        onPress={() => handleAdPress(item)}
        activeOpacity={0.9}
        className="rounded-2xl overflow-hidden mx-3 shadow-md"
        style={{
          width: Dimensions.get("window").width - 48,
          height: 180,
          position: "relative",
        }}
        accessibilityRole="imagebutton"
        accessibilityLabel={item.title || "Publicité"}
      >
        <Image
          source={{
            uri:
              item.images && item.images.length > 0
                ? item.images[0]
                : "https://via.placeholder.com/150x150/CCCCCC/FFFFFF?text=No+Image",
          }}
          style={{ width: "100%", height: 180, position: "absolute" }}
          contentFit="cover"
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.7)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            justifyContent: "flex-end",
            padding: 16,
          }}
          pointerEvents="none"
        >
          <Text
            numberOfLines={2}
            className="text-white font-quicksand-bold text-base mb-1"
          >
            {item.title}
          </Text>
          <Text
            numberOfLines={1}
            className="text-white/90 font-quicksand-medium text-xs"
          >
            {new Date(item.endDate).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "short",
            })}{" "}
            • {item.type}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View className="z-50">
      <LinearGradient
        colors={[colors.brandGradientStart, colors.brandGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 10,
          paddingBottom: 80,
          borderBottomLeftRadius: 30,
          borderBottomRightRadius: 30,
        }}
        className="shadow-lg"
      >
        <View className={`${isSmallScreen ? 'px-4' : 'px-6'} flex-row justify-between items-center mb-4`}>
          <View>
            <Text className="text-emerald-50 text-sm font-quicksand-medium">
              {greetUser()},
            </Text>
            <Text className="text-white text-2xl font-quicksand-bold">
              {companyName || user?.firstName || "Entreprise"}
            </Text>
          </View>
          <TouchableOpacity
            className="bg-white/20 p-2 rounded-full backdrop-blur-sm border border-white/30"
            onPress={() => router.push('/(app)/(enterprise)/profile/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color="white" />
            {unreadCount > 0 && (
              <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-emerald-600" />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search Section Floating Over Header */}
      <View className="-mt-14 px-4" style={{ zIndex: 50 }}>
        <View style={{
          backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
          borderRadius: 20, flexDirection: 'row', alignItems: 'center',
          paddingLeft: 14, height: 50, overflow: 'hidden',
        }}>
          <Ionicons name="search" size={20} color={colors.brandPrimary} />
          <TextInput
            style={{ flex: 1, marginLeft: 10, color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold', fontSize: 15 }}
            placeholder={i18n.t("enterprise.dashboard.search.placeholder")}
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={handleSearchInputFocus}
            onBlur={handleSearchInputBlur}
            onSubmitEditing={() => performSearch()}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ paddingRight: 8 }}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
          <View style={{ width: 1, height: 26, backgroundColor: colors.border }} />
          <TouchableOpacity
            onPress={() => setCityModalVisible(true)}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 12, height: 50,
              backgroundColor: selectedCity ? (isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5') : 'transparent',
            }}
          >
            <Ionicons
              name={selectedCity ? "location" : "location-outline"}
              size={16}
              color={selectedCity ? '#10B981' : colors.textSecondary}
            />
            <Text numberOfLines={1} style={{
              marginLeft: 5, fontSize: 13, fontFamily: 'Quicksand-SemiBold',
              color: selectedCity ? '#059669' : colors.textSecondary,
              maxWidth: 70,
            }}>
              {selectedCity || 'Lieu'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dropdown — position absolute, animé, par-dessus le contenu */}
        {(showSuggestions || showRecentSearches) && (
          <Animated.View style={{
            position: 'absolute',
            top: 56, left: 0, right: 0,
            backgroundColor: colors.card,
            borderRadius: 16, maxHeight: 360,
            borderWidth: 1, borderColor: colors.border,
            zIndex: 100,
            opacity: dropdownAnim,
            transform: [{
              translateY: dropdownAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0],
              })
            }]
          }}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {showRecentSearches && recentSearches.length > 0 && (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: 'Quicksand-SemiBold' }}>
                      Recherches récentes
                    </Text>
                    <TouchableOpacity onPress={clearSearchHistory}>
                      <Text style={{ color: '#10B981', fontSize: 12, fontFamily: 'Quicksand-SemiBold' }}>
                        Effacer tout
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {recentSearches.map((search: RecentSearch, index: number) => (
                    <TouchableOpacity
                      key={index}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11 }}
                      onPress={() => { setSearchQuery(search.query); performSearch(search.query); }}
                    >
                      <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
                      <Text style={{ flex: 1, marginLeft: 12, color: colors.textPrimary, fontFamily: 'Quicksand-Medium', fontSize: 14 }} numberOfLines={1}>
                        {search.query}
                      </Text>
                      <TouchableOpacity onPress={() => removeFromSearchHistory(search.query)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {showSuggestions && searchSuggestions.length > 0 && (
                <View style={showRecentSearches ? { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4 } : {}}>
                  {searchSuggestions.map((suggestion: any, index: number) => (
                    <TouchableOpacity
                      key={index}
                      style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11 }}
                      onPress={() => selectSuggestion(suggestion)}
                    >
                      <View style={{ width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.secondary }}>
                        <Ionicons name="search" size={14} color={colors.textSecondary} />
                      </View>
                      <Text style={{ flex: 1, marginLeft: 12, color: colors.textPrimary, fontFamily: 'Quicksand-Medium', fontSize: 14 }} numberOfLines={1}>
                        {suggestion.text || suggestion.value || suggestion.query || suggestion.name || ''}
                      </Text>
                      <Ionicons name="arrow-forward" size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={{ height: 8 }} />
            </ScrollView>
          </Animated.View>
        )}
      </View>
    </View>
  );

  const renderSearchSection = () => (
    <View className="mb-4 mt-2">
      {/* La recherche est maintenant intégrée dans le header - cette section est conservée pour compatibilité */}
      <View />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      <ExpoStatusBar style="light" translucent />

      {loading ? (
        renderSkeletonHome()
      ) : (
        <>
          {renderHeader()}


          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: 10,
              paddingBottom: 90 + insets.bottom,
            }}
            onScroll={(event) => {
              const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
              const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 300;
              if (isCloseToBottom && !loadingMorePopular && hasNextPage) {
                fetchNextPage();
              }
            }}
            scrollEventThrottle={400}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refreshData}
                colors={[colors.brandPrimary]}
                tintColor={colors.brandPrimary}
                progressViewOffset={FIXED_HEADER_HEIGHT}
              />
            }
          >
            {renderSearchSection()}

            {/* Résultats de recherche — avant les statuts */}
            {showSearchResults && (
              <Animated.View style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                opacity: resultsAnim,
                transform: [{ translateY: resultsAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
              }} className="px-4 py-4 border-b">
                {/* En-tête résultats + toggle vue */}
                <View className="flex-row items-center justify-between">
                  <Text style={{ color: colors.textPrimary }} className="text-lg font-quicksand-bold flex-1">
                    Résultats pour &quot;{searchQuery}&quot;
                  </Text>
                  <View className="flex-row items-center">
                    <View style={{ backgroundColor: isDark ? colors.tertiary : "#F3F4F6" }} className="flex-row items-center rounded-full p-1 mr-2">
                      <TouchableOpacity
                        onPress={() => setResultsView("grid")}
                        style={{ backgroundColor: resultsView === "grid" ? colors.card : "transparent" }}
                        className={`px-2 py-1 rounded-full`}
                      >
                        <Ionicons
                          name="grid-outline"
                          size={18}
                          color={resultsView === "grid" ? colors.brandPrimary : colors.textSecondary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setResultsView("list")}
                        style={{ backgroundColor: resultsView === "list" ? colors.card : "transparent" }}
                        className={`px-2 py-1 rounded-full`}
                      >
                        <Ionicons
                          name="list-outline"
                          size={18}
                          color={resultsView === "list" ? colors.brandPrimary : colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      onPress={hideSearchResults}
                      style={{ backgroundColor: isDark ? colors.tertiary : "#F3F4F6" }}
                      className="p-2 rounded-full"
                    >
                      <Ionicons name="close" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Infos supplémentaires */}
                {searchInfo && (
                  <View className="flex-row items-center mt-1">
                    <Text style={{ color: colors.textTertiary }} className="text-xs font-quicksand-medium">
                      {searchInfo.totalResults || searchResults.length} résultat
                      {searchInfo.totalResults > 1 ? "s" : ""}
                    </Text>
                    {searchInfo.searchTime && (
                      <Text style={{ color: colors.textTertiary }} className="text-xs font-quicksand-medium ml-2">
                        • {searchInfo.searchTime}ms
                      </Text>
                    )}
                    {searchInfo.fromCache && (
                      <Text className="text-xs text-green-600 font-quicksand-medium ml-2">
                        • En cache
                      </Text>
                    )}
                  </View>
                )}

                {/* Chips localisation */}
                <View className="flex-row mt-3">
                  <TouchableOpacity
                    onPress={() => setCityModalVisible(true)}
                    className="flex-row items-center px-3 py-1.5 rounded-full border mr-2"
                    style={{ backgroundColor: isDark ? colors.tertiary : "#F9FAFB", borderColor: colors.border }}
                  >
                    <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary }} className="ml-1 text-xs font-quicksand-medium">
                      {selectedCity}
                    </Text>
                  </TouchableOpacity>
                  {!!selectedNeighborhood && (
                    <TouchableOpacity
                      onPress={() => setNeighborhoodModalVisible(true)}
                      className="flex-row items-center px-3 py-1.5 rounded-full border"
                      style={{
                        backgroundColor: isDark ? colors.tertiary : "#F9FAFB",
                        borderColor: colors.border,
                      }}
                    >
                      <Ionicons
                        name="navigate-outline"
                        size={14}
                        color={colors.textSecondary}
                      />
                      <Text style={{ color: colors.textSecondary }} className="ml-1 text-xs font-quicksand-medium">
                        {selectedNeighborhood}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Chips de tri */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 8 }}
                >
                  <TouchableOpacity
                    onPress={() => setSelectedSort("relevance")}
                    className="px-3 py-1.5 rounded-full border mr-2"
                    style={{
                      backgroundColor:
                        selectedSort === "relevance" ? "#FFF1E6" : "#F3F4F6",
                      borderColor:
                        selectedSort === "relevance" ? "#FED7AA" : "#E5E7EB",
                    }}
                  >
                    <Text
                      style={{ color: selectedSort === "relevance" ? colors.brandPrimary : colors.textPrimary }}
                      className={`text-xs font-quicksand-semibold`}
                    >
                      Pertinence
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSelectedSort("priceLow")}
                    className="px-3 py-1.5 rounded-full border mr-2"
                    style={{
                      backgroundColor:
                        selectedSort === "priceLow" ? "#FFF1E6" : "#F3F4F6",
                      borderColor:
                        selectedSort === "priceLow" ? "#FED7AA" : "#E5E7EB",
                    }}
                  >
                    <Text
                      style={{ color: selectedSort === "priceLow" ? colors.brandPrimary : colors.textPrimary }}
                      className={`text-xs font-quicksand-semibold`}
                    >
                      Moins cher
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSelectedSort("priceHigh")}
                    className="px-3 py-1.5 rounded-full border mr-2"
                    style={{
                      backgroundColor:
                        selectedSort === "priceHigh" ? "#FFF1E6" : "#F3F4F6",
                      borderColor:
                        selectedSort === "priceHigh" ? "#FED7AA" : "#E5E7EB",
                    }}
                  >
                    <Text
                      style={{ color: selectedSort === "priceHigh" ? colors.brandPrimary : colors.textPrimary }}
                      className={`text-xs font-quicksand-semibold`}
                    >
                      Plus cher
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSelectedSort("newest")}
                    className="px-3 py-1.5 rounded-full border"
                    style={{
                      backgroundColor:
                        selectedSort === "newest" ? "#FFF1E6" : "#F3F4F6",
                      borderColor:
                        selectedSort === "newest" ? "#FED7AA" : "#E5E7EB",
                    }}
                  >
                    <Text
                      style={{ color: selectedSort === "newest" ? colors.brandPrimary : colors.textPrimary }}
                      className={`text-xs font-quicksand-semibold`}
                    >
                      Nouveaux
                    </Text>
                  </TouchableOpacity>
                </ScrollView>

                {/* Contenu */}
                {loadingSearch ? (
                  resultsView === "grid" ? (
                    <View className="flex-row flex-wrap justify-between mt-2">
                      {[0, 1, 2, 3].map((i) => (
                        <View
                          key={i}
                          className="w-[48%] h-40 bg-neutral-100 rounded-2xl mb-3"
                        />
                      ))}
                    </View>
                  ) : (
                    <View className="mt-2">
                      {[0, 1, 2, 3].map((i) => (
                        <View
                          key={i}
                          className="w-full h-28 bg-neutral-100 rounded-2xl mb-3"
                        />
                      ))}
                    </View>
                  )
                ) : searchResults.length > 0 ? (
                  resultsView === "grid" ? (
                    <View className="flex-row flex-wrap justify-between">
                      {searchResults.map((item, index) => (
                        <View key={`search-${item._id}-${index}`} className="w-[48%]">
                          {renderProduct(item)}
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View>
                      {searchResults.map((item, index) => (
                        <View key={`search-list-${item._id}-${index}`} className="w-full">
                          {renderProductListItem(item)}
                        </View>
                      ))}
                    </View>
                  )
                ) : (
                  <View className="items-center justify-center py-8">
                    <Ionicons name="search-outline" size={36} color={colors.textTertiary} />
                    <Text style={{ color: colors.textSecondary }} className="mt-2 font-quicksand-medium">
                      {i18n.t("enterprise.dashboard.empty.noProductsFound")}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setCityModalVisible(true)}
                      className="mt-3 px-4 py-2 rounded-full border"
                      style={{ borderColor: colors.brandSecondary }}
                    >
                      <Text style={{ color: colors.brandPrimary }} className="font-quicksand-semibold">
                        Ajuster les filtres
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>
            )}

            {/* Statuts */}
            {statusGroups.length > 0 || userRole === 'ENTERPRISE' ? (
              <StatusBarComponent
                groups={statusGroups}
                currentUserId={statusCurrentUserId}
                isEnterprise={userRole === 'ENTERPRISE'}
                onPressGroup={handlePressStatusGroup}
                onPressAdd={handleOpenStatusCreator}
              />
            ) : null}

            {/* Boosted Ads Carousel (amélioré avec images et overlay) */}
            <View className="py-4">
              {ads.length > 0 ? (
                <CarouselComponent
                  data={ads}
                  renderItem={renderAd}
                  height={180}
                  autoPlayInterval={3000}
                  containerStyle={{ marginTop: 10 }}
                />
              ) : (
                <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="mx-4 rounded-2xl p-6 items-center border">
                  <View style={{ backgroundColor: isDark ? colors.tertiary : "#F5F5F5" }} className="w-16 h-16 rounded-full items-center justify-center mb-4">
                    <Ionicons
                      name="megaphone-outline"
                      size={32}
                      color={colors.textTertiary}
                    />
                  </View>
                  <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-bold text-center mb-2">
                    {i18n.t("enterprise.dashboard.ads.noAds")}
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="text-sm font-quicksand text-center">
                    {i18n.t("enterprise.dashboard.ads.comeBack")}
                  </Text>
                </View>
              )}
            </View>

            {/* Categories Business Grid */}
            <View style={{ backgroundColor: colors.secondary }} className="py-6">
              <View className="px-6 mb-6 flex-row items-center justify-between">
                <View className="flex-1">
                  <Text style={{ color: colors.textPrimary }} className="text-xl font-quicksand-bold">
                    {i18n.t("enterprise.dashboard.categories.title")}
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="text-sm font-quicksand mt-1">
                    {i18n.t("enterprise.dashboard.categories.subtitle")}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    try {
                      router.push("/(app)/(enterprise)/categories");
                    } catch (error) {
                      console.warn("Erreur navigation catégories:", error);
                    }
                  }}
                  style={{ backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5" }}
                  className="flex-row items-center rounded-xl px-3 py-2 ml-2"
                >
                  <Text style={{ color: colors.brandPrimary }} className="font-quicksand-semibold text-sm mr-1">
                    {i18n.t("enterprise.dashboard.categories.viewAll")}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.brandPrimary} />
                </TouchableOpacity>
              </View>
              {loadingCategories ? (
                <View className="flex-1 justify-center items-center py-8">
                  <ActivityIndicator size="large" color={colors.brandPrimary} />
                  <Text style={{ color: colors.textSecondary }} className="mt-2 font-quicksand-medium">
                    {i18n.t("enterprise.dashboard.categories.loading")}
                  </Text>
                </View>
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20 }}
                >
                  {(categories.length > 0 ? categories : staticCategories)
                    .slice(0, 9)
                    .map((category: any, index: number) => {
                      // Couleurs par défaut pour les vraies catégories
                      const categoryId = category._id || category.id || index;
                      const localIcon = getCategoryIcon(category.name);

                      return (
                        <TouchableOpacity
                          key={categoryId}
                          className="mr-4 items-center"
                          onPress={() => {
                            if (category._id) {
                              router.push(
                                `/(app)/(enterprise)/category/${category._id}`
                              );
                            }
                          }}
                        >
                          <View className="w-16 h-16 justify-center items-center mb-3">
                            {localIcon ? (
                              <Image
                                source={localIcon}
                                style={{ width: 56, height: 56 }}
                                contentFit="contain"
                              />
                            ) : (
                              <Ionicons name="grid-outline" size={32} color={colors.textSecondary} />
                            )}
                          </View>
                          <Text style={{ color: colors.textSecondary }} className="text-xs font-quicksand-semibold text-center w-16 leading-4" numberOfLines={2}>
                            {category.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              )}
            </View>

            {/* Mes Produits en Vedette */}
            <View className="pt-6 pb-4">
              <View className="px-6 mb-6">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text style={{ color: colors.textPrimary }} className="text-xl font-quicksand-bold">
                      {i18n.t("enterprise.dashboard.featuredProducts.title")}
                    </Text>
                    <Text style={{ color: colors.textSecondary }} className="text-sm font-quicksand mt-1">
                      {i18n.t("enterprise.dashboard.featuredProducts.subtitle")}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      try {
                        router.push("/(app)/(enterprise)/my-products");
                      } catch (error) {
                        console.warn("Erreur navigation mes produits:", error);
                      }
                    }}
                    style={{ backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5" }}
                    className="flex-row items-center rounded-xl px-3 py-2"
                  >
                    <Text style={{ color: colors.brandPrimary }} className="font-quicksand-semibold text-sm mr-1">
                      {i18n.t("enterprise.dashboard.featuredProducts.viewAll")}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.brandPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
              {loadingProducts ? (
                <View className="flex-1 justify-center items-center py-8">
                  <ActivityIndicator size="large" color={colors.brandPrimary} />
                  <Text style={{ color: colors.textSecondary }} className="mt-2 font-quicksand-medium">
                    {i18n.t("enterprise.dashboard.featuredProducts.loading")}
                  </Text>
                </View>
              ) : featuredProducts.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                >
                  {featuredProducts.map((item, index) => (
                    <View key={`featured-${item._id}-${index}`} style={{ width: 180 }}>
                      {renderProduct(item)}
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View className="flex-1 justify-center items-center py-8">
                  <Text style={{ color: colors.textSecondary }} className="font-quicksand-medium">
                    {i18n.t("enterprise.dashboard.featuredProducts.noProducts")}
                  </Text>
                </View>
              )}
            </View>

            {/* Produits Populaires du Marketplace */}
            <View className="pt-6 pb-4">
              <View className="px-6 mb-6">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text style={{ color: colors.textPrimary }} className="text-xl font-quicksand-bold">
                      {i18n.t("enterprise.dashboard.popularProducts.title")}
                    </Text>
                    <Text style={{ color: colors.textSecondary }} className="text-sm font-quicksand mt-1">
                      {i18n.t("enterprise.dashboard.popularProducts.subtitle")}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      try {
                        router.push("/(app)/(enterprise)/marketplace");
                      } catch (error) {
                        console.warn("Erreur navigation marketplace:", error);
                      }
                    }}
                    style={{ backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5" }}
                    className="flex-row items-center rounded-xl px-3 py-2"
                  >
                    <Text style={{ color: colors.brandPrimary }} className="font-quicksand-semibold text-sm mr-1">
                      {i18n.t("enterprise.dashboard.popularProducts.viewAll")}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.brandPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
              {loadingPopular ? (
                <View className="flex-1 justify-center items-center py-8">
                  <ActivityIndicator size="large" color={colors.brandPrimary} />
                  <Text style={{ color: colors.textSecondary }} className="mt-2 font-quicksand-medium">
                    {i18n.t("enterprise.dashboard.popularProducts.loading")}
                  </Text>
                </View>
              ) : popularProducts.length > 0 ? (
                <>
                  <View className="flex-row flex-wrap justify-between px-4">
                    {popularProducts.map((item, index) => (
                      <View key={`${item._id}-${index}`} className="w-[48%]">
                        {renderProduct(item)}
                      </View>
                    ))}
                  </View>
                  {/* Indicateur de chargement automatique */}
                  {loadingMorePopular && (
                    <View className="py-4 items-center">
                      <ActivityIndicator size="small" color={colors.brandPrimary} />
                      <Text style={{ color: colors.textSecondary }} className="mt-2 text-sm font-quicksand-medium">
                        Chargement de plus de tendances...
                      </Text>
                    </View>
                  )}
                  {/* Informations de pagination en mode développement */}
                  {__DEV__ && hasNextPage && !loadingMorePopular && (
                    <View className="px-4 py-2">
                      <Text style={{ color: colors.textTertiary }} className="text-xs text-center font-quicksand-light">
                        {popularProducts.length} produits • Faites défiler pour plus
                      </Text>
                    </View>
                  )}
                  {__DEV__ && !hasNextPage && popularProducts.length > 6 && (
                    <View className="px-4 py-2">
                      <Text style={{ color: colors.textTertiary }} className="text-xs text-center font-quicksand-light">
                        Toutes les tendances affichées ({popularProducts.length} produits)
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View className="flex-1 justify-center items-center py-8">
                  <Text style={{ color: colors.textSecondary }} className="font-quicksand-medium">
                    Aucune tendance disponible
                  </Text>
                </View>
              )}
            </View>

            {/* Partenaires Business */}

            {/* Bannière Promotion Entreprise */}
          </ScrollView>
        </>
      )
      }

      {/* Modal de sélection de ville */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={cityModalVisible}
        onRequestClose={() => { setCityModalVisible(false); setCitySearch(''); }}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => { setCityModalVisible(false); setCitySearch(''); }} />
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '80%' }}>
            {/* Handle */}
            <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </View>

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name="earth" size={18} color="#10B981" />
              </View>
              <Text style={{ flex: 1, color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 17 }}>
                {i18n.t("enterprise.dashboard.modals.city.title")}
              </Text>
              <TouchableOpacity
                onPress={() => { setCityModalVisible(false); setCitySearch(''); }}
                style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 12, height: 42, borderRadius: 12, backgroundColor: colors.secondary }}>
              <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                value={citySearch}
                onChangeText={setCitySearch}
                placeholder="Rechercher une ville..."
                placeholderTextColor={colors.textSecondary}
                style={{ flex: 1, color: colors.textPrimary, fontFamily: 'Quicksand-Medium', fontSize: 14 }}
              />
              {citySearch.length > 0 && (
                <TouchableOpacity onPress={() => setCitySearch('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={[{ id: 0, name: '' }, ...beninCities].filter(c =>
                c.name === '' || c.name.toLowerCase().includes(citySearch.toLowerCase())
              )}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
              renderItem={({ item }) => {
                const isAll = item.name === '';
                const selected = isAll ? !selectedCity : selectedCity === item.name;
                return (
                  <TouchableOpacity
                    onPress={() => { selectCity(item.name); setCitySearch(''); }}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingVertical: 13, paddingHorizontal: 12,
                      marginBottom: 4, borderRadius: 12,
                      backgroundColor: selected ? (isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5') : 'transparent',
                    }}
                  >
                    <Text style={{ flex: 1, color: selected ? '#10B981' : colors.textPrimary, fontFamily: selected ? 'Quicksand-Bold' : 'Quicksand-Medium', fontSize: 15 }}>
                      {isAll ? 'Toutes les villes' : item.name}
                    </Text>
                    {selected && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Modal de sélection de quartier */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={neighborhoodModalVisible}
        onRequestClose={() => { setNeighborhoodModalVisible(false); setNeighborhoodSearch(''); }}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => { setNeighborhoodModalVisible(false); setNeighborhoodSearch(''); }} />
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '80%' }}>
            {/* Handle */}
            <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </View>

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14 }}>
              <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name="location" size={18} color="#10B981" />
              </View>
              <Text style={{ flex: 1, color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 17 }}>
                {i18n.t("enterprise.dashboard.modals.neighborhood.title", { city: selectedCity })}
              </Text>
              <TouchableOpacity
                onPress={() => { setNeighborhoodModalVisible(false); setNeighborhoodSearch(''); }}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.secondary, alignItems: 'center', justifyContent: 'center' }}
              >
                <Ionicons name="close" size={17} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Recherche */}
            <View style={{ marginHorizontal: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                value={neighborhoodSearch}
                onChangeText={setNeighborhoodSearch}
                placeholder="Rechercher un quartier..."
                placeholderTextColor={colors.textSecondary}
                style={{ flex: 1, paddingVertical: 11, color: colors.textPrimary, fontFamily: 'Quicksand-Medium', fontSize: 14 }}
              />
              {neighborhoodSearch.length > 0 && (
                <TouchableOpacity onPress={() => setNeighborhoodSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={(neighborhoodsByCity[selectedCity] || []).filter(n => n.toLowerCase().includes(neighborhoodSearch.toLowerCase()))}
              keyExtractor={(item, index) => index.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
              renderItem={({ item }) => {
                const selected = selectedNeighborhood === item;
                return (
                  <TouchableOpacity
                    onPress={() => { selectNeighborhood(item); setNeighborhoodSearch(''); }}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingVertical: 13, paddingHorizontal: 12,
                      marginBottom: 4, borderRadius: 12,
                      backgroundColor: selected ? (isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5') : 'transparent',
                    }}
                  >
                    <Text style={{ flex: 1, color: selected ? '#10B981' : colors.textPrimary, fontFamily: selected ? 'Quicksand-Bold' : 'Quicksand-Medium', fontSize: 15 }}>
                      {item}
                    </Text>
                    {selected && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Status Viewer */}
      <StatusViewer
        visible={viewerVisible}
        groups={statusGroups}
        initialGroupIndex={viewerGroupIndex}
        currentUserId={statusCurrentUserId}
        onClose={() => setViewerVisible(false)}
        onViewed={handleStatusViewed}
        onDelete={handleDeleteStatus}
        onReplyToStatus={async (status, enterpriseUserId, text) => {
          const preview = status.type === 'TEXT' ? (status.text || '') : 'IMAGE';
          const result = await MessagingService.replyToStatus(enterpriseUserId, status._id, text, preview);
          const convId = result.conversation._id;
          router.push(`/(app)/(enterprise)/conversation/${convId}`);
          return { conversationId: convId };
        }}
      />

      {/* Status Creator (enterprise only) */}
      <StatusCreator
        visible={creatorVisible}
        onClose={() => setCreatorVisible(false)}
        onCreated={() => { setCreatorVisible(false); loadStatuses(); }}
      />
    </View >
  );
}
