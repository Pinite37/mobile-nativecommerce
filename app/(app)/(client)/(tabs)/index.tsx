// Service publicités
import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useEffect, useState } from "react";
import { Image } from "expo-image";
import {
    Alert,
    ActivityIndicator,
    BackHandler,
    Dimensions,
    FlatList,
    Keyboard,
    Animated,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { Shimmer } from "../../../../components/ui/Shimmer";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from "../../../../contexts/AuthContext";
import AdvertisementService, { Advertisement } from '../../../../services/api/AdvertisementService';
import CategoryService from "../../../../services/api/CategoryService";
// import { useSearchCache } from "../../../../hooks/useSearchCache"; // retiré (non utilisé)
import CarouselComponent from "../../../../components/ui/CarouselComponent";
import { getCategoryIcon } from "../../../../constants/CategoryIcons";
import { useLocale } from "../../../../contexts/LocaleContext";
import i18n from "../../../../i18n/i18n";
import { useUnreadNotifications } from "../../../../hooks/useUnreadNotifications";
import ProductService from "../../../../services/api/ProductService";
import SearchService from "../../../../services/api/SearchService";
import StatusService, { StatusGroup, StatusItem } from "../../../../services/api/StatusService";
import MessagingService from "../../../../services/api/MessagingService";
import { StatusBar as StatusBarComponent } from "../../../../components/ui/StatusBar";
import { StatusViewer } from "../../../../components/ui/StatusViewer";
import SearchCacheService, { RecentSearch } from "../../../../services/SearchCacheService";
import { Category, Product } from "../../../../types/product";
import { beninCities, neighborhoodsByCity } from "../../../../constants/LocationData";

// Polyfill Buffer pour React Native (utilisé par le cache)
import { Buffer } from "buffer";
if (typeof globalThis !== "undefined" && !(globalThis as any).Buffer) {
    (globalThis as any).Buffer = Buffer;
}

// Données fictives
const categories = [
    { id: 1, name: i18n.t('client.home.categories.trends'), color: "#FF6B35" },
    { id: 2, name: i18n.t('client.home.categories.vehicles'), color: "#3B82F6" },
    { id: 3, name: i18n.t('client.home.categories.realEstate'), color: "#8B5CF6" },
    { id: 4, name: i18n.t('client.home.categories.phones'), color: "#EC4899" },
    { id: 5, name: i18n.t('client.home.categories.electronics'), color: "#10B981" },
    { id: 6, name: i18n.t('client.home.categories.furniture'), color: "#6366F1" },
    { id: 7, name: i18n.t('client.home.categories.fashion'), color: "#EF4444" },
    { id: 8, name: i18n.t('client.home.categories.services'), color: "#F59E0B" },
    { id: 9, name: i18n.t('client.home.categories.jobs'), color: "#0EA5E9" },
];

// popularStores retiré (non utilisé)

export default function ClientHome() {
    const { user, isAuthenticated } = useAuth();
    const { locale } = useLocale();
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const FIXED_HEADER_HEIGHT = 120 + insets.top;
    const { unreadCount, loadUnreadCount } = useUnreadNotifications();

    useFocusEffect(
        useCallback(() => {
            if (isAuthenticated) loadUnreadCount();
        }, [isAuthenticated, loadUnreadCount])
    );

    const loadStatuses = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const result = await StatusService.getAll();
            console.log('[ClientHome] Statuts chargés:', JSON.stringify({ groupCount: result.groups?.length, currentUserId: result.currentUserId }));
            setStatusGroups(result.groups);
            setStatusCurrentUserId(result.currentUserId);
        } catch (error) {
            console.error('[ClientHome] Erreur lors du chargement des statuts:', error);
        }
    }, [isAuthenticated]);

    useFocusEffect(useCallback(() => { loadStatuses(); }, [loadStatuses]));
    // const { getCacheStats } = useSearchCache(); // (non utilisé pour l'instant)

    // Calcul responsive pour la largeur des produits
    const screenWidth = Dimensions.get('window').width;
    const isSmallScreen = screenWidth < 380;
    const isTablet = screenWidth >= 768;
    const productWidth = isTablet ? '31%' : '48%'; // 3 colonnes sur tablette, 2 sur mobile

    const [selectedCity, setSelectedCity] = useState(() => {
        const address = (user as any)?.location?.address as string | undefined;
        if (!address) return beninCities[0].name;
        const cityPart = address.split(",")[0].trim();
        const match = beninCities.find(c => c.name.toLowerCase() === cityPart.toLowerCase());
        return match ? match.name : beninCities[0].name;
    });
    const [selectedNeighborhood, setSelectedNeighborhood] = useState("");
    const [cityModalVisible, setCityModalVisible] = useState(false);
    const [neighborhoodModalVisible, setNeighborhoodModalVisible] = useState(false);
    const [neighborhoodSearch, setNeighborhoodSearch] = useState('');
    const [citySearch, setCitySearch] = useState('');
    // const [currentAdIndex, setCurrentAdIndex] = useState(0); // Removed unused
    const [refreshing, setRefreshing] = useState(false);
    const [imageRefreshKey, setImageRefreshKey] = useState(0); // Clé pour forcer le rechargement des images

    // États pour la recherche
    const [searchQuery, setSearchQuery] = useState('');
    const [searchSuggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [dropdownAnim] = useState(() => new Animated.Value(0));
    const [resultsAnim] = useState(() => new Animated.Value(0));
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState<any>(null);
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [searchInfo, setSearchInfo] = useState<any>(null);
    const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
    const [showRecentSearches, setShowRecentSearches] = useState(false);
    const [searchInputFocused, setSearchInputFocused] = useState(false);
    const [resultsView, setResultsView] = useState<'grid' | 'list'>('grid');
    const [selectedSort, setSelectedSort] = useState<'relevance' | 'priceLow' | 'priceHigh' | 'newest'>('relevance');

    // Statuts
    const [statusGroups, setStatusGroups] = useState<StatusGroup[]>([]);
    const [statusCurrentUserId, setStatusCurrentUserId] = useState<string>('');
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerGroupIndex, setViewerGroupIndex] = useState(0);

    useEffect(() => {
        if (!isAuthenticated) {
            setStatusGroups([]);
            setStatusCurrentUserId('');
            setViewerVisible(false);
        }
    }, [isAuthenticated]);

    const queryClient = useQueryClient();

    const { data: categoriesData = [], isLoading: loadingCategories } = useQuery({
        queryKey: ['categories', 'active'],
        queryFn: async () => { const r = await CategoryService.getActiveCategories(); return (r || []).slice(0, 9); },
        staleTime: 1000 * 60 * 10,
    });

    const { data: ads = [], isLoading: loadingAds } = useQuery({
        queryKey: ['ads', 'active'],
        queryFn: async () => { const d = await AdvertisementService.getActive(10); return Array.isArray(d) ? d : []; },
        staleTime: 60_000,
    });

    const {
        data: productsData, isLoading: loadingProducts,
        isFetchingNextPage: loadingMoreProducts, fetchNextPage, hasNextPage,
    } = useInfiniteQuery({
        queryKey: ['products', 'featured', selectedCity, selectedNeighborhood],
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

    const featuredProducts = productsData?.pages.flatMap((p: any) => p.products || []) ?? [];

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

    const loading = loadingCategories || loadingProducts;

    const handleAdPress = async (ad: Advertisement) => {
        try {
            AdvertisementService.incrementClick(ad._id).catch(() => { });
            router.push({ pathname: '/(app)/(client)/advertisement/[id]', params: { id: ad._id } });
        } catch (e) {
            console.error('⚠️ Erreur clic publicité:', e);
        }
    };

    const refreshData = async () => {
        try {
            setRefreshing(true);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['ads', 'active'] }),
                queryClient.invalidateQueries({ queryKey: ['products', 'featured'] }),
                queryClient.invalidateQueries({ queryKey: ['favorites'] }),
                queryClient.invalidateQueries({ queryKey: ['categories', 'active'] }),
                loadStatuses(),
            ]);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        setSelectedNeighborhood("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCity]);

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

    // Gestion du bouton retour pour masquer les résultats de recherche et suggestions
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (showSearchResults) {
                hideSearchResults();
                return true; // Empêche la navigation arrière par défaut
            }
            if (showSuggestions) {
                setShowSuggestions(false);
                setSuggestions([]);
                return true; // Empêche la navigation arrière par défaut
            }
            return false; // Laisse le comportement par défaut
        });

        return () => backHandler.remove();
    }, [showSearchResults, showSuggestions]);

    useEffect(() => {
        loadRecentSearches();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Forcer le rechargement des images quand on revient sur la page
    useFocusEffect(
        useCallback(() => {
            // Incrémenter la clé pour forcer le rechargement des images
            setImageRefreshKey(prev => prev + 1);
        }, [])
    );


    const SkeletonCard = ({ style }: { style?: any }) => (
        <View style={[{ backgroundColor: colors.card, borderColor: colors.border }, style]} className="rounded-2xl shadow-sm border overflow-hidden">
            <Shimmer style={{ height: 120, borderRadius: 16, width: '100%' }} />
        </View>
    );

    const SkeletonProduct = () => (
        <View style={[{ backgroundColor: colors.card, borderColor: colors.border, width: productWidth }]} className="rounded-2xl shadow-md border p-2 mb-3 overflow-hidden">
            <Shimmer style={{ height: 128, borderRadius: 16, width: '100%' }} />
            <View className="p-2">
                <Shimmer style={{ height: 14, borderRadius: 7, width: '80%', marginBottom: 8 }} />
                <Shimmer style={{ height: 16, borderRadius: 8, width: '60%', marginBottom: 8 }} />
                <Shimmer style={{ height: 12, borderRadius: 6, width: '40%' }} />
            </View>
        </View>
    );

    const SkeletonProductList = () => (
        <View style={[{ backgroundColor: colors.card, borderColor: colors.border, width: '100%' }]} className="rounded-2xl shadow-md border p-2 mb-3 overflow-hidden flex-row">
            <Shimmer style={{ width: 100, height: 100, borderRadius: 16, marginRight: 12 }} />
            <View className="flex-1">
                <Shimmer style={{ height: 14, borderRadius: 7, width: '80%', marginBottom: 8 }} />
                <View className="flex-row items-center mb-2">
                    <Shimmer style={{ height: 12, borderRadius: 6, width: '30%', marginRight: 4 }} />
                    <Shimmer style={{ width: 12, height: 12, borderRadius: 6 }} />
                </View>
                <Shimmer style={{ height: 16, borderRadius: 8, width: '50%', marginBottom: 8 }} />
                <Shimmer style={{ height: 30, borderRadius: 15, width: '70%' }} />
            </View>
        </View>
    );

    const renderSkeletonHome = () => (
        <View style={{ flex: 1, backgroundColor: colors.secondary }}>
            {/* Header Skeleton with Floating Search */}
            <View className="z-50">
                <LinearGradient
                    colors={["#059669", "#10B981"]}
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
                {/* Ads Skeleton - Carousel Style */}
                <View className="py-0">
                    <View className="px-4 mt-1">
                        <Shimmer style={{ height: 200, borderRadius: 24, width: '100%' }} />
                    </View>
                    {/* Indicators */}
                    <View className="flex-row justify-center mt-3 gap-2">
                        {[0, 1, 2].map((i) => (
                            <Shimmer key={i} style={{ width: 8, height: 8, borderRadius: 4 }} />
                        ))}
                    </View>
                </View>

                {/* Categories Skeleton - Horizontal Scroll */}
                <View className="py-6">
                    <View className="px-6 mb-4">
                        <Shimmer style={{ height: 20, borderRadius: 10, width: 140, marginBottom: 4 }} />
                        <Shimmer style={{ height: 14, borderRadius: 7, width: 200 }} />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: isSmallScreen ? 16 : 20, gap: isSmallScreen ? 8 : 12 }}>
                        {Array.from({ length: 6 }).map((_, index) => (
                            <View key={index} className="items-center">
                                <Shimmer style={{ width: 70, height: 70, borderRadius: 20, marginBottom: 8 }} />
                                <Shimmer style={{ width: 60, height: 12, borderRadius: 6 }} />
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Featured Stores Skeleton - Hidden since we don't have stores */}
                {/* Uncomment when featured stores are available */}
                {/* <View className="py-4">
                    <View className="px-6 mb-4">
                        <Shimmer style={{ height: 20, borderRadius: 10, width: 160 }} />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
                        {Array.from({ length: 4 }).map((_, index) => (
                            <View key={index} className="items-center">
                                <Shimmer style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 8 }} />
                                <Shimmer style={{ width: 70, height: 12, borderRadius: 6, marginBottom: 4 }} />
                                <Shimmer style={{ width: 50, height: 10, borderRadius: 5 }} />
                            </View>
                        ))}
                    </ScrollView>
                </View> */}

                {/* Featured Products Skeleton */}
                <View className="px-4 py-4">
                    <View className="mb-4 flex-row justify-between items-center">
                        <Shimmer style={{ height: 20, borderRadius: 10, width: 140 }} />
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

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
    };

    const greetUser = () => {
        const hours = new Date().getHours();
        if (hours < 12) {
            return i18n.t('client.home.greetings.morning');
        } else if (hours < 18) {
            return i18n.t('client.home.greetings.afternoon');
        } else {
            return i18n.t('client.home.greetings.evening');
        }
    };

    // Mappe la valeur de tri UI vers la valeur attendue par l’API
    const mapSelectedSortToApi = (
        uiSort: 'relevance' | 'priceLow' | 'priceHigh' | 'newest' | 'oldest' | 'rating' | 'popular' | string
    ):
        'newest' | 'price_asc' | 'price_desc' | 'rating' | 'popular' => {
        switch (uiSort) {
            case 'priceLow':
                return 'price_asc';
            case 'priceHigh':
                return 'price_desc';
            case 'newest':
                return 'newest';
            case 'oldest':
                return 'newest'; // Map oldest to newest as fallback
            case 'rating':
                return 'rating';
            case 'popular':
            case 'relevance':
            default:
                return 'popular';
        }
    };

    // Fonctions pour le cache et l'historique des recherches
    const loadRecentSearches = async () => {
        try {
            const recent = await SearchCacheService.getRecentSearches();
            setRecentSearches(recent);
        } catch (error) {
            console.error('❌ Erreur chargement recherches récentes:', error);
        }
    };

    const clearSearchHistory = async () => {
        try {
            await SearchCacheService.clearRecentSearches();
            setRecentSearches([]);
        } catch (error) {
            console.error('❌ Erreur vidage historique:', error);
        }
    };

    const removeFromSearchHistory = async (query: string) => {
        try {
            await SearchCacheService.removeFromRecentSearches(query);
            const updatedRecent = await SearchCacheService.getRecentSearches();
            setRecentSearches(updatedRecent);
        } catch (error) {
            console.error('❌ Erreur suppression recherche:', error);
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

    // Fonction pour masquer les résultats de recherche
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
            } catch (e) { /* cache unavailable */ }

            if (cachedResults) {
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

            // Normaliser la réponse (certains services renvoient { products, pagination }, d’autres { data, searchInfo })
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

            // Opérations de cache: ne doivent pas faire échouer l’UI
            try {
                await SearchCacheService.cacheSearchResults(searchTerm, results, normalizedInfo, searchFilters);
                await SearchCacheService.addToRecentSearches(searchTerm, results.length);
                await loadRecentSearches();
            } catch (e) { /* cache unavailable */ }

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
        Keyboard.dismiss();

        // Si c'est un produit identifiable, on navigue directement
        if (suggestion?.type === 'product') {
            const productId = suggestion?.id || suggestion?.productId || suggestion?._id;
            if (productId) {
                router.push(`/(app)/(client)/product/${productId}`);
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

    // Fonction pour sélectionner une ville
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

    // Fonction pour sélectionner un quartier
    const selectNeighborhood = (neighborhoodName: string) => {
        setSelectedNeighborhood(neighborhoodName);
        setNeighborhoodModalVisible(false);
    };

    // Fonction pour toggle favori
    const toggleFavorite = async (productId: string) => {
        if (!isAuthenticated) {
            Alert.alert(
                "Connexion requise",
                "Connectez-vous pour ajouter des produits en favoris.",
                [
                    { text: "Plus tard", style: "cancel" },
                    { text: "Se connecter", onPress: () => router.push("/(auth)/signin") },
                ],
            );
            return;
        }

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
            console.error('❌ Erreur lors de la mise à jour des favoris:', error);
        }
    };

    const renderProduct = (item: Product) => (
        <TouchableOpacity
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="rounded-3xl shadow-sm border mb-4 overflow-hidden"
            onPress={() => router.push(`/(app)/(client)/product/${item._id}`)}
            activeOpacity={0.9}
        >
            <View className="relative">
                <Image
                    key={`image-${item._id}-${imageRefreshKey}`}
                    source={{ uri: item.images[0] || "https://via.placeholder.com/300" }}
                    style={{ width: "100%", height: 160, backgroundColor: "#F3F4F6" }}
                    contentFit="cover"
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.05)']}
                    className="absolute bottom-0 left-0 right-0 h-12"
                />

                {/* Badges */}
                <View className="absolute top-2 left-2 flex-row flex-wrap gap-1">
                    {item.stats && item.stats.totalSales > 10 && (
                        <View className="bg-emerald-500/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
                            <Text className="text-white text-[10px] font-quicksand-bold">{i18n.t('client.home.badges.top')}</Text>
                        </View>
                    )}
                    {(item as any).promotion && (
                        <View className="bg-red-500/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
                            <Text className="text-white text-[10px] font-quicksand-bold">{i18n.t('client.home.badges.promo')}</Text>
                        </View>
                    )}
                </View>

                {/* Favorite Button (connected users only) */}
                {isAuthenticated && (
                    <TouchableOpacity
                        style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)' }}
                        className="absolute top-2 right-2 w-8 h-8 backdrop-blur-md rounded-full items-center justify-center shadow-sm"
                        onPress={(e) => {
                            e.stopPropagation();
                            toggleFavorite(item._id);
                        }}
                    >
                        <Ionicons
                            name={favorites.has(item._id) ? "heart" : "heart-outline"}
                            size={16}
                            color={favorites.has(item._id) ? "#EF4444" : colors.textSecondary}
                        />
                    </TouchableOpacity>
                )}
            </View>

            <View className="p-3">
                <Text numberOfLines={1} style={{ color: colors.textSecondary }} className="text-xs font-quicksand-medium mb-0.5">
                    {(item.category as any)?.name || 'Divers'}
                </Text>
                <Text numberOfLines={2} style={{ color: colors.textPrimary }} className="text-sm font-quicksand-bold leading-5 h-10 mb-1">
                    {item.name}
                </Text>

                <View className="flex-row items-center justify-between mt-1">
                    <Text className="text-base font-quicksand-bold text-emerald-600">
                        {formatPrice(item.price)}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View className="z-50">
            <LinearGradient
                colors={["#059669", "#10B981"]}
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
                        {isAuthenticated ? (
                            <>
                                <Text className="text-emerald-50 text-sm font-quicksand-medium">
                                    {`${greetUser()},`}
                                </Text>
                                <Text className="text-white text-2xl font-quicksand-bold">
                                    {user?.firstName || "Utilisateur"}
                                </Text>
                            </>
                        ) : (
                            <Text className="text-white text-2xl font-quicksand-bold">
                                Bienvenue sur Aximarketplace
                            </Text>
                        )}
                    </View>
                    {isAuthenticated && (
                        <TouchableOpacity
                            className="bg-white/20 p-2 rounded-full backdrop-blur-sm border border-white/30"
                            onPress={() => router.push('/(app)/(client)/profile/notifications')}
                        >
                            <Ionicons name="notifications-outline" size={24} color="white" />
                            {unreadCount > 0 && (
                                <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-emerald-600" />
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </LinearGradient>

            {/* Search Section Floating Over Header */}
            <View className="-mt-14 px-4" style={{ zIndex: 50 }}>
                <View style={{
                    backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1,
                    borderRadius: 20, flexDirection: 'row', alignItems: 'center',
                    paddingLeft: 14, height: 50, overflow: 'hidden',
                }}>
                    <Ionicons name="search" size={20} color="#10B981" />
                    <TextInput
                        style={{ flex: 1, marginLeft: 10, color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold', fontSize: 15 }}
                        placeholder={i18n.t('client.home.search.placeholder')}
                        placeholderTextColor={colors.textSecondary}
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
                                            {i18n.t('client.home.search.recentSearches')}
                                        </Text>
                                        <TouchableOpacity onPress={clearSearchHistory}>
                                            <Text style={{ color: '#10B981', fontSize: 12, fontFamily: 'Quicksand-SemiBold' }}>
                                                {i18n.t('client.home.search.clearHistory')}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                    {recentSearches.slice(0, 5).map((recentSearch, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11 }}
                                            onPress={() => { setSearchQuery(recentSearch.query); performSearch(recentSearch.query); }}
                                        >
                                            <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
                                            <Text style={{ flex: 1, marginLeft: 12, color: colors.textPrimary, fontFamily: 'Quicksand-Medium', fontSize: 14 }} numberOfLines={1}>
                                                {recentSearch.query}
                                            </Text>
                                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); removeFromSearchHistory(recentSearch.query); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                                <Ionicons name="close" size={14} color={colors.textSecondary} />
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                            {showSuggestions && searchSuggestions.length > 0 && (
                                <View style={showRecentSearches ? { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4 } : {}}>
                                    {searchSuggestions.map((suggestion, index) => {
                                        const getColor = (type: string) => type === 'product' ? '#10B981' : type === 'category' ? '#8B5CF6' : type === 'enterprise' ? '#F59E0B' : '#6B7280';
                                        const color = getColor(suggestion.type);
                                        return (
                                            <TouchableOpacity
                                                key={index}
                                                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11 }}
                                                onPress={() => selectSuggestion(suggestion)}
                                                activeOpacity={0.7}
                                            >
                                                <View style={{ width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: color + '18' }}>
                                                    <Ionicons name={suggestion.type === 'product' ? 'cube-outline' : suggestion.type === 'category' ? 'folder-outline' : 'business-outline'} size={15} color={color} />
                                                </View>
                                                <Text style={{ flex: 1, marginLeft: 12, color: colors.textPrimary, fontFamily: 'Quicksand-Medium', fontSize: 14 }} numberOfLines={1}>
                                                    {suggestion.text}
                                                </Text>
                                                <Ionicons name="arrow-forward" size={14} color={colors.textSecondary} />
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                            <View style={{ height: 8 }} />
                        </ScrollView>
                    </Animated.View>
                )}
            </View>
        </View>
    );

    const renderSearchSection = () => null; // Search is now integrated in Header

    const renderProductListItem = (item: Product) => (
        <TouchableOpacity
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="rounded-2xl shadow-md border p-2 mb-3 overflow-hidden flex-row"
            onPress={() => router.push(`/(app)/(client)/product/${item._id}`)}
        >
            <View className="relative mr-3">
                <Image
                    key={`image-list-${item._id}-${imageRefreshKey}`}
                    source={{ uri: item.images[0] || "https://via.placeholder.com/150x150/CCCCCC/FFFFFF?text=No+Image" }}
                    style={{ width: 96, height: 96, borderRadius: 12 }}
                    contentFit="cover"
                />
                {item.stats.totalSales > 10 && (
                    <View className="absolute top-1 left-1 bg-success-500 rounded-full px-2 py-0.5">
                        <Text className="text-white text-[10px] font-quicksand-bold">
                            {i18n.t('client.home.badges.popular')}
                        </Text>
                    </View>
                )}
            </View>
            <View className="flex-1 justify-between">
                <View>
                    <Text numberOfLines={2} style={{ color: colors.textPrimary }} className="text-sm font-quicksand-semibold">
                        {item.name}
                    </Text>
                </View>
                <View className="flex-row items-center justify-between mt-2">
                    <Text className="text-base font-quicksand-bold text-primary-600">
                        {formatPrice(item.price)}
                    </Text>
                    {isAuthenticated && (
                        <TouchableOpacity
                            style={{ backgroundColor: colors.secondary }}
                            className="rounded-full p-2"
                            onPress={() => toggleFavorite(item._id)}
                        >
                            <Ionicons
                                name={favorites.has(item._id) ? "heart" : "heart-outline"}
                                size={18}
                                color={favorites.has(item._id) ? "#EF4444" : colors.textSecondary}
                            />
                        </TouchableOpacity>
                    )}
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

    return (
        <View style={{ flex: 1, backgroundColor: colors.secondary }}>
            <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />
            {loading ? (
                renderSkeletonHome()
            ) : (
                <>
                    {renderHeader()}


                    <ScrollView
                        className="flex-1"
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{
                            paddingTop: 10,
                            paddingBottom: 90 + insets.bottom,
                        }}
                        scrollEventThrottle={16}
                        onScroll={(event) => {
                            const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
                            const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 300;
                            if (isCloseToBottom && !loadingMoreProducts && hasNextPage) {
                                fetchNextPage();
                            }
                        }}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={refreshData}
                                colors={['#10B981']}
                                tintColor="#10B981"
                                progressViewOffset={FIXED_HEADER_HEIGHT}
                            />
                        }
                    >
                        {renderSearchSection()}

                        {/* Résultats de recherche */}
                        {showSearchResults && (
                            <Animated.View style={{
                                backgroundColor: colors.card,
                                borderBottomColor: colors.border,
                                opacity: resultsAnim,
                                transform: [{ translateY: resultsAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
                            }} className="px-4 py-4 border-b">
                                {/* En-tête résultats + toggle vue */}
                                <View className="flex-row items-center justify-between">
                                    <Text style={{ color: colors.textPrimary }} className="text-lg font-quicksand-bold flex-1">
                                        {i18n.t('client.home.searchResults.title', { query: searchQuery })}
                                    </Text>
                                    <View className="flex-row items-center">
                                        <View className="flex-row items-center bg-neutral-100 rounded-full p-1 mr-2">
                                            <TouchableOpacity
                                                onPress={() => setResultsView('grid')}
                                                className={`px-2 py-1 rounded-full ${resultsView === 'grid' ? 'bg-white' : ''}`}
                                            >
                                                <Ionicons name="grid-outline" size={18} color={resultsView === 'grid' ? '#10B981' : '#6B7280'} />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => setResultsView('list')}
                                                className={`px-2 py-1 rounded-full ${resultsView === 'list' ? 'bg-white' : ''}`}
                                            >
                                                <Ionicons name="list-outline" size={18} color={resultsView === 'list' ? '#10B981' : '#6B7280'} />
                                            </TouchableOpacity>
                                        </View>
                                        <TouchableOpacity
                                            onPress={hideSearchResults}
                                            className="p-2 bg-neutral-100 rounded-full"
                                        >
                                            <Ionicons name="close" size={18} color="#6B7280" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Infos supplémentaires */}
                                {searchInfo && (
                                    <View className="flex-row items-center mt-1">
                                        <Text style={{ color: colors.textSecondary }} className="text-xs font-quicksand-medium">
                                            {i18n.t('client.home.searchResults.resultsCount', { count: searchInfo.totalResults || searchResults.length })}
                                        </Text>
                                        {searchInfo.searchTime && (
                                            <Text className="text-xs text-neutral-400 font-quicksand-medium ml-2">
                                                • {i18n.t('client.home.searchResults.searchTime', { time: searchInfo.searchTime })}
                                            </Text>
                                        )}
                                        {searchInfo.fromCache && (
                                            <Text className="text-xs text-green-600 font-quicksand-medium ml-2">
                                                • {i18n.t('client.home.searchResults.fromCache')}
                                            </Text>
                                        )}
                                    </View>
                                )}

                                {/* Chips localisation */}
                                <View className="flex-row mt-3">
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
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
                                    <TouchableOpacity
                                        onPress={() => setSelectedSort('relevance')}
                                        className="px-3 py-1.5 rounded-full border mr-2"
                                        style={{ backgroundColor: selectedSort === 'relevance' ? '#FFF1E6' : '#F3F4F6', borderColor: selectedSort === 'relevance' ? '#FED7AA' : '#E5E7EB' }}
                                    >
                                        <Text className={`text-xs font-quicksand-semibold ${selectedSort === 'relevance' ? 'text-primary-600' : 'text-neutral-700'}`}>
                                            {i18n.t('client.home.searchResults.relevance')}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setSelectedSort('priceLow')}
                                        className="px-3 py-1.5 rounded-full border mr-2"
                                        style={{ backgroundColor: selectedSort === 'priceLow' ? '#FFF1E6' : '#F3F4F6', borderColor: selectedSort === 'priceLow' ? '#FED7AA' : '#E5E7EB' }}
                                    >
                                        <Text className={`text-xs font-quicksand-semibold ${selectedSort === 'priceLow' ? 'text-primary-600' : 'text-neutral-700'}`}>
                                            {i18n.t('client.home.searchResults.priceLowToHigh')}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setSelectedSort('priceHigh')}
                                        className="px-3 py-1.5 rounded-full border mr-2"
                                        style={{ backgroundColor: selectedSort === 'priceHigh' ? '#FFF1E6' : '#F3F4F6', borderColor: selectedSort === 'priceHigh' ? '#FED7AA' : '#E5E7EB' }}
                                    >
                                        <Text className={`text-xs font-quicksand-semibold ${selectedSort === 'priceHigh' ? 'text-primary-600' : 'text-neutral-700'}`}>
                                            {i18n.t('client.home.searchResults.priceHighToLow')}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setSelectedSort('newest')}
                                        className="px-3 py-1.5 rounded-full border"
                                        style={{ backgroundColor: selectedSort === 'newest' ? '#FFF1E6' : '#F3F4F6', borderColor: selectedSort === 'newest' ? '#FED7AA' : '#E5E7EB' }}
                                    >
                                        <Text className={`text-xs font-quicksand-semibold ${selectedSort === 'newest' ? 'text-primary-600' : 'text-neutral-700'}`}>
                                            {i18n.t('client.home.searchResults.newest')}
                                        </Text>
                                    </TouchableOpacity>
                                </ScrollView>

                                {/* Contenu */}
                                {loadingSearch ? (
                                    resultsView === 'grid' ? (
                                        <View className="flex-row flex-wrap justify-between mt-2">
                                            {[0, 1, 2, 3].map((i) => (
                                                <SkeletonProduct key={i} />
                                            ))}
                                        </View>
                                    ) : (
                                        <View className="mt-2">
                                            {[0, 1, 2, 3].map((i) => (
                                                <SkeletonProductList key={i} />
                                            ))}
                                        </View>
                                    )
                                ) : searchResults.length > 0 ? (
                                    resultsView === 'grid' ? (
                                        <View className="flex-row flex-wrap justify-between">
                                            {searchResults.map((item, index) => (
                                                <View key={`search-${item._id}-${index}`} style={{ width: productWidth }}>
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
                                        <Ionicons name="search-outline" size={36} color={colors.textSecondary} />
                                        <Text className="mt-2 text-neutral-600 font-quicksand-medium">
                                            {i18n.t('client.home.empty.noProductsFound')}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => setCityModalVisible(true)}
                                            className="mt-3 px-4 py-2 rounded-full border"
                                            style={{ borderColor: '#FED7AA' }}
                                        >
                                            <Text className="text-primary-600 font-quicksand-semibold">
                                                {i18n.t('client.home.empty.adjustFilters')}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </Animated.View>
                        )}

                        {/* Statuts des entreprises suivies */}
                        {statusGroups.length > 0 && (
                            <StatusBarComponent
                                groups={statusGroups}
                                currentUserId={statusCurrentUserId}
                                onPressGroup={(group) => {
                                    const idx = statusGroups.findIndex(g => String(g.enterprise._id) === String(group.enterprise._id));
                                    setViewerGroupIndex(idx >= 0 ? idx : 0);
                                    setViewerVisible(true);
                                }}
                                onPressAdd={() => {}}
                                isEnterprise={false}
                            />
                        )}

                        {/* Boosted Ads Carousel (amélioré avec images et overlay) */}
                        <View className="py-0">
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
                                    <View className="w-16 h-16 rounded-full bg-neutral-100 items-center justify-center mb-4">
                                        <Ionicons name="megaphone-outline" size={32} color="#9CA3AF" />
                                    </View>
                                    <Text className="text-base font-quicksand-bold text-neutral-800 text-center mb-2">
                                        {i18n.t('client.home.ads.noAds')}
                                    </Text>
                                    <Text style={{ color: colors.textSecondary }} className="text-sm font-quicksand text-center">
                                        {i18n.t('client.home.ads.comeBackSoon')}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Categories - Horizontal Scroll */}
                        <View className="py-6">
                            <View className="px-6 mb-4 flex-row justify-between items-end">
                                <View>
                                    <Text style={{ color: colors.textPrimary }} className="text-xl font-quicksand-bold">
                                        {i18n.t('client.home.categories.title')}
                                    </Text>
                                    <Text style={{ color: colors.textSecondary }} className="text-xs font-quicksand">
                                        {i18n.t('client.home.categories.subtitle')}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => router.push('/(app)/(client)/categories')}
                                    style={{ backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5" }}
                                    className="flex-row items-center rounded-xl px-3 py-2 ml-2"
                                >
                                    <Text style={{ color: colors.brandPrimary }} className="font-quicksand-semibold text-sm mr-1">
                                        {i18n.t('client.home.featuredProducts.viewAll')}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={14} color={colors.brandPrimary} />
                                </TouchableOpacity>
                            </View>

                            {loadingCategories ? (
                                <ActivityIndicator size="small" color="#10B981" />
                            ) : (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 20 }}
                                >
                                    {(categoriesData.length > 0 ? categoriesData : categories).map((category: any, index: number) => {
                                        const categoryId = category._id || category.id || index;
                                        const localIcon = getCategoryIcon(category.name);

                                        return (
                                            <TouchableOpacity
                                                key={categoryId}
                                                onPress={() => category._id && router.push({ pathname: '/(app)/(client)/category/[id]', params: { id: category._id } })}
                                                className="mr-4 items-center"
                                            >
                                                <View className="w-16 h-16 justify-center items-center mb-3">
                                                    {localIcon ? (
                                                        <Image
                                                            source={localIcon}
                                                            style={{ width: 56, height: 56 }}
                                                            contentFit="contain"
                                                        />
                                                    ) : (
                                                        <Ionicons
                                                            name="grid-outline"
                                                            size={32}
                                                            color={colors.textSecondary}
                                                        />
                                                    )}
                                                </View>
                                                <Text style={{ color: colors.textPrimary }} className="text-xs font-quicksand-semibold text-center w-16 leading-4" numberOfLines={2}>
                                                    {category.name}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            )}
                        </View>


                        {/* Featured Products (changé en vertical avec 2 colonnes) */}
                        <View className="py-4 px-6">
                            <View className="mb-4 flex-row justify-between items-center">
                                <Text style={{ color: colors.textPrimary }} className="text-xl font-quicksand-bold">
                                    {i18n.t('client.home.featuredProducts.title')}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => router.push('/(app)/(client)/marketplace')}
                                    style={{ backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5" }}
                                    className="flex-row items-center rounded-xl px-3 py-2 ml-2"
                                >
                                    <Text style={{ color: colors.brandPrimary }} className="font-quicksand-semibold text-sm mr-1">
                                        {i18n.t('client.home.featuredProducts.viewAll')}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={14} color={colors.brandPrimary} />
                                </TouchableOpacity>
                            </View>
                            {loadingProducts ? (
                                <View className="flex-1 justify-center items-center py-8">
                                    <ActivityIndicator size="large" color="#10B981" />
                                    <Text style={{ color: colors.textSecondary }} className="mt-2 font-quicksand-medium">
                                        {i18n.t('client.home.featuredProducts.loading')}
                                    </Text>
                                </View>
                            ) : featuredProducts.length > 0 ? (
                                <>
                                    <View className="flex-row flex-wrap justify-between">
                                        {featuredProducts.map((item, index) => (
                                            <View key={`featured-${item._id}-${index}`} style={{ width: productWidth }}>
                                                {renderProduct(item)}
                                            </View>
                                        ))}
                                    </View>
                                    {/* Indicateur de chargement automatique */}
                                    {loadingMoreProducts && (
                                        <View className="py-4 items-center">
                                            <ActivityIndicator size="small" color="#10B981" />
                                            <Text style={{ color: colors.textSecondary }} className="text-xs mt-2 font-quicksand-medium">
                                                Chargement de plus de produits...
                                            </Text>
                                        </View>
                                    )}
                                    {/* Indicateurs de développement */}
                                    {__DEV__ && hasNextPage && !loadingMoreProducts && (
                                        <View className="py-2 items-center">
                                            <Text style={{ color: colors.textTertiary }} className="text-xs font-quicksand-medium">
                                                {featuredProducts.length} produits • Faites défiler pour plus
                                            </Text>
                                        </View>
                                    )}
                                    {__DEV__ && !hasNextPage && featuredProducts.length > 6 && (
                                        <View className="py-2 items-center">
                                            <Text style={{ color: colors.textTertiary }} className="text-xs font-quicksand-medium">
                                                Tous les produits affichés • {featuredProducts.length} au total
                                            </Text>
                                        </View>
                                    )}
                                </>
                            ) : (
                                <View className="flex-1 justify-center items-center py-8">
                                    <Text style={{ color: colors.textSecondary }} className="font-quicksand-medium">
                                        {i18n.t('client.home.featuredProducts.noProducts')}
                                    </Text>
                                </View>
                            )}
                        </View>

                    </ScrollView>

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
                                        {i18n.t('client.home.modals.city.title')}
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
                                        {i18n.t('client.home.modals.neighborhood.title', { city: selectedCity })}
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
                                    data={(neighborhoodsByCity[selectedCity] || []).filter((n: string) => n.toLowerCase().includes(neighborhoodSearch.toLowerCase()))}
                                    keyExtractor={(item, index) => index.toString()}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
                                    renderItem={({ item }: { item: string }) => {
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
                </>
            )
            }

            {/* Visionneuse de statuts */}
            <StatusViewer
                visible={isAuthenticated && viewerVisible}
                groups={statusGroups}
                initialGroupIndex={viewerGroupIndex}
                currentUserId={statusCurrentUserId}
                onClose={() => setViewerVisible(false)}
                onViewed={(statusId) => StatusService.markViewed(statusId).catch(() => {})}
                onDelete={async (statusId) => {
                    try { await StatusService.remove(statusId); await loadStatuses(); } catch {}
                }}
                onReplyToStatus={async (status, enterpriseUserId, text) => {
                    const preview = status.type === 'TEXT' ? (status.text || '') : 'IMAGE';
                    const result = await MessagingService.replyToStatus(enterpriseUserId, status._id, text, preview);
                    const convId = result.conversation._id;
                    router.push(`/(app)/(client)/conversation/${convId}`);
                    return { conversationId: convId };
                }}
            />
        </View >
    );
}
