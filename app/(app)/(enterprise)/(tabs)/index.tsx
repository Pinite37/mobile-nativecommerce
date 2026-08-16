import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
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
  BackHandler,
  Dimensions,
  FlatList,
  Keyboard,
  Modal,
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
  const { unreadCount, loadUnreadCount } = useUnreadNotifications();

  useFocusEffect(
    useCallback(() => {
      loadUnreadCount();
    }, [loadUnreadCount])
  );
  // const { getCacheStats } = useSearchCache(); // Hook pour gérer le cache automatiquement (usage futur)

  const [refreshing, setRefreshing] = useState(false);
  const { width } = Dimensions.get("window");
  const isSmallScreen = width < 380;

  const FIXED_HEADER_HEIGHT = 120 + insets.top;

  // États pour la recherche par localisation
  const [selectedCity, setSelectedCity] = useState(beninCities[0].name);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("");
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [neighborhoodModalVisible, setNeighborhoodModalVisible] = useState(false);

  // États pour la recherche
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
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
    setShowSearchResults(false);
    setSearchResults([]);
    setSearchInfo(null);
    Keyboard.dismiss();
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
    setCityModalVisible(false);
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
          className="w-full h-32 rounded-t-2xl"
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
        {item.stats && (
          <View className="flex-row items-center">
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={{ color: colors.textSecondary }} className="text-xs ml-1">
              {item.stats.averageRating?.toFixed(1) || "0.0"}
            </Text>
          </View>
        )}
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
          className="w-24 h-24 rounded-xl"
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
          {item.stats && (
            <View className="flex-row items-center mt-1">
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={{ color: colors.textSecondary }} className="text-xs ml-1">
                {item.stats.averageRating?.toFixed(1) || "0.0"}
              </Text>
            </View>
          )}
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
      <View className="-mt-14 px-4">
        <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-3xl shadow-xl shadow-emerald-900/10 border p-2">
          <View style={{ backgroundColor: isDark ? colors.tertiary : "#F9FAFB", borderColor: colors.border }} className="flex-row items-center px-3 py-2 rounded-2xl border">
            <Ionicons name="search" size={22} color={colors.brandPrimary} />
            <TextInput
              style={{ color: colors.textPrimary }}
              className="flex-1 ml-3 font-quicksand-semibold text-base"
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
              <TouchableOpacity onPress={() => setSearchQuery('')} className="mr-2">
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Location Chips inside Search Card */}
          <View className={`flex-row mt-3 ${isSmallScreen ? 'px-0' : 'px-1'} pb-1`}>
            <View
              style={{ backgroundColor: selectedCity ? (isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5") : (isDark ? colors.tertiary : "#F3F4F6") }}
              className={`flex-1 flex-row items-center py-2 px-2 rounded-xl ${isSmallScreen ? 'mr-1' : 'mr-2'}`}
            >
              <TouchableOpacity className="flex-1 flex-row items-center" onPress={() => setCityModalVisible(true)}>
                <Ionicons name="location" size={14} color={selectedCity ? colors.brandSecondary : colors.textSecondary} />
                <Text style={{ color: selectedCity ? colors.brandSecondary : colors.textSecondary }} numberOfLines={1} className="ml-1.5 text-xs font-quicksand-bold flex-1">
                  {selectedCity || 'Toutes les villes'}
                </Text>
              </TouchableOpacity>
              {!!selectedCity && (
                <TouchableOpacity onPress={() => { setSelectedCity(""); setSelectedNeighborhood(""); }} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }} className="ml-1">
                  <Ionicons name="close-circle" size={14} color={colors.brandSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <View
              style={{ backgroundColor: selectedCity ? (isDark ? colors.tertiary : "#F3F4F6") : (isDark ? colors.tertiary : "#F9FAFB"), opacity: selectedCity ? 1 : 0.5 }}
              className={`flex-1 flex-row items-center py-2 px-2 rounded-xl ${isSmallScreen ? 'ml-1' : 'ml-2'}`}
            >
              <TouchableOpacity className="flex-1 flex-row items-center" onPress={() => selectedCity && setNeighborhoodModalVisible(true)} disabled={!selectedCity}>
                <Ionicons name="map" size={14} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary }} numberOfLines={1} className="ml-1.5 text-xs font-quicksand-bold flex-1">
                  {selectedNeighborhood || i18n.t("enterprise.dashboard.search.neighborhoodPlaceholder")}
                </Text>
              </TouchableOpacity>
              {!!selectedNeighborhood && (
                <TouchableOpacity onPress={() => setSelectedNeighborhood("")} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }} className="ml-1">
                  <Ionicons name="close-circle" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
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

          {/* Search Suggestions - Positioned Absolutely Below Search Card */}
          {(showSuggestions || showRecentSearches) && (
            <View
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                // Header: insets.top + 10 + 80 (paddingBottom)
                // Search card: -mt-14 (-56px) 
                // Search card height: ~130px (p-2 + input + chips)
                // Total: insets.top + 90 - 56 + 130 + 10 (spacing) = insets.top + 174
                top: insets.top + 174,
                left: 16,
                right: 16,
                maxHeight: 400
              }}
              className="absolute rounded-b-2xl shadow-lg border-t z-40"
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                {showSuggestions && searchSuggestions.length > 0 && (
                  <View className="py-2">
                    <Text style={{ color: colors.textSecondary }} className="px-4 py-2 text-xs font-quicksand-bold uppercase">
                      Suggestions
                    </Text>
                    {searchSuggestions.map((suggestion: any, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={{ borderColor: colors.border }}
                        className="px-4 py-3 flex-row items-center border-b"
                        onPress={() => selectSuggestion(suggestion)}
                      >
                        <Ionicons name="search" size={18} color={colors.textTertiary} />
                        <Text style={{ color: colors.textPrimary }} className="ml-3 font-quicksand-medium flex-1">
                          {suggestion.text || suggestion.value || suggestion.query || suggestion.name || ''}
                        </Text>
                        <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {showRecentSearches && recentSearches.length > 0 && (
                  <View className="py-2">
                    <View className="px-4 py-2 flex-row justify-between items-center">
                      <Text style={{ color: colors.textSecondary }} className="text-xs font-quicksand-bold uppercase">
                        Recherches récentes
                      </Text>
                      <TouchableOpacity onPress={clearSearchHistory}>
                        <Text style={{ color: colors.brandPrimary }} className="text-xs font-quicksand-semibold">
                          Effacer tout
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {recentSearches.map((search: RecentSearch, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={{ borderColor: colors.border }}
                        className="px-4 py-3 flex-row items-center border-b"
                        onPress={() => {
                          setSearchQuery(search.query);
                          performSearch(search.query);
                        }}
                      >
                        <Ionicons name="time-outline" size={18} color={colors.textTertiary} />
                        <Text style={{ color: colors.textPrimary }} className="ml-3 font-quicksand-medium flex-1">
                          {search.query}
                        </Text>
                        <TouchableOpacity
                          onPress={() => removeFromSearchHistory(search.query)}
                          className="p-1"
                        >
                          <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>
            </View>
          )}

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
            {/* Résultats de recherche */}
            {showSearchResults && (
              <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="px-4 py-4 border-b">
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
              </View>
            )}

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
        onRequestClose={() => setCityModalVisible(false)}
      >
        <View className="flex-1 bg-transparent justify-end">
          <View style={{ backgroundColor: colors.card }} className="rounded-t-3xl pb-10 pt-4 px-4 shadow-xl">
            <View className="flex-row justify-between items-center mb-6">
              <Text style={{ color: colors.textPrimary }} className="text-lg font-quicksand-bold">
                {i18n.t("enterprise.dashboard.modals.city.title")}
              </Text>
              <TouchableOpacity onPress={() => setCityModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={beninCities}
              keyExtractor={(item) => item.id.toString()}
              ListHeaderComponent={
                <TouchableOpacity
                  onPress={() => selectCity("")}
                  style={{ borderColor: colors.border }}
                  className="py-3 border-b"
                >
                  <Text
                    style={{ color: !selectedCity ? colors.brandPrimary : colors.textSecondary }}
                    className="text-base font-quicksand-medium"
                  >
                    Toutes les villes
                  </Text>
                </TouchableOpacity>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => selectCity(item.name)}
                  style={{ borderColor: colors.border }}
                  className="py-3 border-b"
                >
                  <Text
                    style={{ color: selectedCity === item.name ? colors.brandPrimary : colors.textPrimary }}
                    className={`text-base font-quicksand-medium`}
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
          <View style={{ backgroundColor: colors.card }} className="rounded-t-3xl pb-10 pt-4 px-4 shadow-xl">
            <View className="flex-row justify-between items-center mb-6">
              <Text style={{ color: colors.textPrimary }} className="text-lg font-quicksand-bold">
                {i18n.t("enterprise.dashboard.modals.neighborhood.title", { city: selectedCity })}
              </Text>
              <TouchableOpacity
                onPress={() => setNeighborhoodModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
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
                    style={{ color: selectedNeighborhood === item ? colors.brandPrimary : colors.textPrimary }}
                    className={`text-base font-quicksand-medium`}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View >
  );
}
