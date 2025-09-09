// Service publicités
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Image,
    Keyboard,
    Modal,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useAuth } from "../../../../contexts/AuthContext";
import AdvertisementService, { Advertisement } from '../../../../services/api/AdvertisementService';
// import { useSearchCache } from "../../../../hooks/useSearchCache"; // retiré (non utilisé)
import ProductService from "../../../../services/api/ProductService";
import SearchService from "../../../../services/api/SearchService";
import SearchCacheService, { RecentSearch } from "../../../../services/SearchCacheService";
import { Product } from "../../../../types/product";

// Polyfill Buffer pour React Native (utilisé par le cache)
import { Buffer } from "buffer";
if (typeof globalThis !== "undefined" && !(globalThis as any).Buffer) {
    (globalThis as any).Buffer = Buffer;
}

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

// Données fictives
const categories = [
    { id: 1, name: "Tendances", icon: "flame", color: "#FF6B35" },
    { id: 2, name: "Véhicules", icon: "car-sport", color: "#3B82F6" },
    { id: 3, name: "Immobilier", icon: "home", color: "#8B5CF6" },
    { id: 4, name: "Téléphones", icon: "phone-portrait", color: "#EC4899" },
    { id: 5, name: "Électronique", icon: "laptop", color: "#10B981" },
    { id: 6, name: "Meubles", icon: "bed", color: "#6366F1" },
    { id: 7, name: "Mode", icon: "shirt", color: "#EF4444" },
    { id: 8, name: "Services", icon: "construct", color: "#F59E0B" },
    { id: 9, name: "Emplois", icon: "briefcase", color: "#0EA5E9" },
];

// popularStores retiré (non utilisé)

export default function ClientHome() {
    const { user } = useAuth();
    // const { getCacheStats } = useSearchCache(); // (non utilisé pour l'instant)

    const navigateTo = (path: string) => {
        try {
            const url = Linking.createURL(path);
            Linking.openURL(url);
        } catch (e) {
            console.warn('Navigation indisponible:', e);
        }
    };

    const [selectedCity, setSelectedCity] = useState(beninCities[0].name);
    const [selectedNeighborhood, setSelectedNeighborhood] = useState("");
    const [cityModalVisible, setCityModalVisible] = useState(false);
    const [neighborhoodModalVisible, setNeighborhoodModalVisible] = useState(false);
    const [currentAdIndex, setCurrentAdIndex] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true); // État de chargement global

    // États pour les produits de l'API
    const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    // États pour la recherche
    const [searchQuery, setSearchQuery] = useState('');
    const [searchSuggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
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

    // État pour les favoris
    const [favorites, setFavorites] = useState<Set<string>>(new Set());

    // ================= Publicités dynamiques =================
    const [ads, setAds] = useState<Advertisement[]>([]);
    const [loadingAds, setLoadingAds] = useState(false);
    const viewedAdsRef = useRef<Set<string>>(new Set());
    const lastAdsFetchRef = useRef<number>(0);

    const fallbackAds: Advertisement[] = [
        {
            _id: 'placeholder-1',
            title: 'Votre entreprise',
            description: 'Augmentez votre visibilité avec nos services',
            image: 'https://via.placeholder.com/600x300/10B981/FFFFFF?text=Publicite',
            type: 'BANNER' as any,
            targetAudience: 'CLIENTS' as any,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 86400000).toISOString(),
            isActive: true,
            views: 0,
            clicks: 0,
            createdAt: new Date().toISOString(),
        }
    ];

    const loadAds = async () => {
        const now = Date.now();
        if (now - lastAdsFetchRef.current < 60_000 && ads.length) return; // throttle 60s
        try {
            setLoadingAds(true);
            const data = await AdvertisementService.getActive(10);
            setAds(Array.isArray(data) ? data : []);
            lastAdsFetchRef.current = now;
        } catch (e) {
            console.warn('⚠️ Erreur récupération publicités (fallback) :', e);
        } finally {
            setLoadingAds(false);
        }
    };

    const onAdViewableItemsChanged = useRef(({ viewableItems }: any) => {
        viewableItems.forEach((vi: any) => {
            const ad: Advertisement = vi.item;
            if (!ad?._id) return;
            if (!viewedAdsRef.current.has(ad._id)) {
                viewedAdsRef.current.add(ad._id);
                (AdvertisementService as any).incrementView?.(ad._id)
                    ?.catch((err: any) => console.warn('view track fail', err));
            }
        });
    }).current;
    const adViewabilityConfig = { itemVisiblePercentThreshold: 60 };

    const handleAdPress = async (ad: Advertisement) => {
        try {
            await AdvertisementService.incrementClick(ad._id).catch(() => { });
            if ((ad as any).productId) {
                navigateTo(`/(app)/(client)/product/${(ad as any).productId}`);
            }
        } catch (e) {
            console.warn('⚠️ clic publicité échoué', e);
        }
    };

    const adsToDisplay = ads.length ? ads : fallbackAds;

    // ================= Fonctions produits & favoris (déclarations hoistées) =================
    async function loadFeaturedProducts() {
        try {
            setLoadingProducts(true);
            const response = await (ProductService as any).getPopularProducts?.(10);
            const data = Array.isArray(response?.data)
                ? response.data
                : Array.isArray(response?.products)
                    ? response.products
                    : Array.isArray(response)
                        ? response
                        : [];
            setFeaturedProducts(data);
        } catch (e) {
            console.error('❌ Erreur chargement produits populaires:', e);
        } finally {
            setLoadingProducts(false);
        }
    }

    async function loadFavorites() {
        try {
            const favResponse = await (ProductService as any).getFavoriteProducts?.();
            if (Array.isArray(favResponse)) {
                setFavorites(new Set(favResponse.map((p: any) => p._id)));
            } else if (Array.isArray(favResponse?.data)) {
                setFavorites(new Set(favResponse.data.map((p: any) => p._id)));
            }
        } catch (e) {
            // silencieux
        }
    }

    async function refreshData() {
        try {
            setRefreshing(true);
            await Promise.all([loadAds(), loadFeaturedProducts(), loadFavorites()]);
        } catch (e) {
            console.error('❌ Erreur refresh:', e);
        } finally {
            setRefreshing(false);
        }
    }

    useEffect(() => {
        // Réinitialiser le quartier si la ville change
        setSelectedNeighborhood("");
    }, [selectedCity]);

    // ================= Chargement initial =================
    useEffect(() => {
        (async () => {
            try {
                await Promise.all([loadAds(), loadFeaturedProducts()]);
                await loadRecentSearches();
                await loadFavorites();
            } catch (e) {
                console.warn('⚠️ Erreur chargement initial:', e);
            } finally {
                setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
    };

    const greetUser = () => {
        const hours = new Date().getHours();
        if (hours < 12) {
            return "Bonjour";
        } else if (hours < 18) {
            return "Bon après-midii";
        } else {
            return "Bonsoirrrrrrrrrrrrrrrrrrrrrrrrrrrrr";
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
        Keyboard.dismiss();

        // Si c'est un produit identifiable, on navigue directement
        if (suggestion?.type === 'product') {
            const productId = suggestion?.id || suggestion?.productId || suggestion?._id;
            if (productId) {
                navigateTo(`/(app)/(client)/product/${productId}`);
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
        setCityModalVisible(false);
    };

    // Fonction pour sélectionner un quartier
    const selectNeighborhood = (neighborhoodName: string) => {
        setSelectedNeighborhood(neighborhoodName);
        setNeighborhoodModalVisible(false);
    };

    // Fonction pour toggle favori
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

    const renderProduct = (item: Product) => (
        <TouchableOpacity
            key={item._id}
            className="bg-white rounded-2xl shadow-md border border-neutral-100 p-2 mb-3 w-[48%] overflow-hidden"
            onPress={() => navigateTo(`/(app)/(client)/product/${item._id}`)}
        >
            <View className="relative">
                <Image
                    source={{ uri: item.images[0] || "https://via.placeholder.com/150x150/CCCCCC/FFFFFF?text=No+Image" }}
                    className="w-full h-32 rounded-t-2xl"
                    resizeMode="cover"
                />
                {item.stats.totalSales > 10 && (
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

    const renderProductListItem = (item: Product) => (
        <TouchableOpacity
            key={item._id}
            className="bg-white rounded-2xl shadow-md border border-neutral-100 p-2 mb-3 w-full overflow-hidden flex-row"
            onPress={() => navigateTo(`/(app)/(client)/product/${item._id}`)}
        >
            <View className="relative mr-3">
                <Image
                    source={{ uri: item.images[0] || "https://via.placeholder.com/150x150/CCCCCC/FFFFFF?text=No+Image" }}
                    className="w-24 h-24 rounded-xl"
                    resizeMode="cover"
                />
                {item.stats.totalSales > 10 && (
                    <View className="absolute top-1 left-1 bg-success-500 rounded-full px-2 py-0.5">
                        <Text className="text-white text-[10px] font-quicksand-bold">
                            Populaire
                        </Text>
                    </View>
                )}
            </View>
            <View className="flex-1 justify-between">
                <View>
                    <Text numberOfLines={2} className="text-sm font-quicksand-semibold text-neutral-800">
                        {item.name}
                    </Text>
                    {item.stats && (
                        <View className="flex-row items-center mt-1">
                            <Ionicons name="star" size={12} color="#FFD700" />
                            <Text className="text-xs text-neutral-600 ml-1">
                                {item.stats.averageRating?.toFixed(1) || '0.0'}
                            </Text>
                        </View>
                    )}
                </View>
                <View className="flex-row items-center justify-between mt-2">
                    <Text className="text-base font-quicksand-bold text-primary-600">
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

    const renderStore = (item: any) => (
        <TouchableOpacity 
            key={item.id}
            className="bg-white rounded-xl shadow-sm border border-neutral-100 p-2 mb-3 w-[48%]"
            onPress={() => navigateTo(`/(app)/(client)/enterprise/${item.id}`)}
        >
            <Image
                source={{ uri: item.image }}
                className="w-full h-32 rounded-t-xl mb-2"
                resizeMode="cover"
            />
            <Text numberOfLines={1} className="text-sm font-quicksand-semibold text-neutral-800 mb-1 text-center">
                {item.name}
            </Text>
            <Text className="text-xs text-neutral-600 mb-1 text-center">
                {item.category}
            </Text>
            <View className="flex-row items-center justify-center">
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text className="text-xs text-neutral-600 ml-1">
                    {item.rating}
                </Text>
                {item.verified && (
                    <Ionicons name="checkmark-circle" size={12} color="#10B981" className="ml-1" />
                )}
            </View>
        </TouchableOpacity>
    );

    const renderAd = ({ item }: { item: any }) => (
        <TouchableOpacity
            onPress={() => handleAdPress(item)}
            activeOpacity={0.9}
            className="rounded-2xl overflow-hidden mx-3 shadow-md bg-white"
            style={{ width: Dimensions.get('window').width - 48 }}
            accessibilityRole="imagebutton"
            accessibilityLabel={item.title || 'Publicité'}
        >
            <Image
                source={{ uri: item.image }}
                className="w-full h-40"
                resizeMode="cover"
            />
            <LinearGradient
                colors={['rgba(0,0,0,0.0)','rgba(0,0,0,0.55)']}
                start={{ x:0, y:0 }} end={{ x:0, y:1 }}
                className="absolute inset-0 justify-end p-4"
            >
                <Text numberOfLines={2} className="text-white font-quicksand-bold text-base mb-1">{item.title}</Text>
                <Text numberOfLines={1} className="text-white/80 font-quicksand-medium text-xs">{new Date(item.endDate).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' })} • {item.type}</Text>
            </LinearGradient>
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
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 90 }}
                    refreshControl={
                            <RefreshControl
                            refreshing={refreshing}
                            onRefresh={refreshData}
                            colors={['#10B981']}
                            tintColor="#10B981"
                        />
                    }
                >
                {/* Header with Location */}
                <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="py-6 pt-16 rounded-b-3xl shadow-md">
                    {/* Header avec salutation et icône notification */}
                    <View className="px-4 pb-4">
                        <View className="flex-row items-center justify-between">
                            <View>
                                <Text className="text-sm font-quicksand-medium text-white opacity-90">
                                    {greetUser()},
                                </Text>
                                <Text className="text-lg font-quicksand-bold text-white">
                                    {user ? `${user.firstName} ${user.lastName}` : 'Client'}
                                </Text>
                            </View>
                            <TouchableOpacity className="relative">
                                <Ionicons name="notifications-outline" size={24} color="white" />
                                <View className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Location Selection */}
                    <View className="flex-row justify-between px-4 mb-4">
                        <TouchableOpacity 
                            onPress={() => setCityModalVisible(true)}
                            className="bg-white/15 border border-white/20 flex-1 rounded-2xl py-3 px-4 mr-2"
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
                            className="bg-white/15 border border-white/20 flex-1 rounded-2xl py-3 px-4 ml-2"
                            disabled={!selectedCity}
                        >
                            <View className="flex-row items-center justify-between">
                                <Text className={`font-quicksand-medium ${selectedNeighborhood ? "text-white" : "text-gray-200"}`}>
                                    {selectedNeighborhood || "Tous les quartiers"}
                                </Text>
                                <Ionicons name="chevron-down-outline" size={16} color="white" />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View className="px-4">
                        <View className="bg-white rounded-2xl shadow-lg border border-white/20">
                            <View className="flex-row items-center px-4 py-3">
                                <Ionicons name="search" size={20} color="#9CA3AF" />
                                <TextInput
                                    className="ml-3 flex-1 text-neutral-700 font-quicksand-medium"
                                    placeholder="Rechercher des produits..."
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
                </LinearGradient>

                {/* Résultats de recherche */}
                {showSearchResults && (
                    <View className="bg-white px-4 py-4 border-b border-neutral-100">
                        {/* En-tête résultats + toggle vue */}
                        <View className="flex-row items-center justify-between">
                            <Text className="text-lg font-quicksand-bold text-neutral-800">
                                Résultats pour &quot;{searchQuery}&quot;
                            </Text>
                            <View className="flex-row items-center bg-neutral-100 rounded-full p-1">
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
                        </View>

                        {/* Infos supplémentaires */}
                        {searchInfo && (
                            <View className="flex-row items-center mt-1">
                                <Text className="text-xs text-neutral-400 font-quicksand-medium">
                                    {searchInfo.totalResults || searchResults.length} résultat{searchInfo.totalResults > 1 ? 's' : ''}
                                </Text>
                                {searchInfo.searchTime && (
                                    <Text className="text-xs text-neutral-400 font-quicksand-medium ml-2">
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

                        {/* Contenu */}
                        {loadingSearch ? (
                            resultsView === 'grid' ? (
                                <View className="flex-row flex-wrap justify-between mt-2">
                                    {[0, 1, 2, 3].map((i) => (
                                        <View key={i} className="w-[48%] h-40 bg-neutral-100 rounded-2xl mb-3" />
                                    ))}
                                </View>
                            ) : (
                                <View className="mt-2">
                                    {[0, 1, 2, 3].map((i) => (
                                        <View key={i} className="w-full h-28 bg-neutral-100 rounded-2xl mb-3" />
                                    ))}
                                </View>
                            )
                        ) : searchResults.length > 0 ? (
                            resultsView === 'grid' ? (
                                <View className="flex-row flex-wrap justify-between">
                                    {searchResults.map(renderProduct)}
                                </View>
                            ) : (
                                <View>
                                    {searchResults.map(renderProductListItem)}
                                </View>
                            )
                        ) : (
                            <View className="items-center justify-center py-8">
                                <Ionicons name="search-outline" size={36} color="#9CA3AF" />
                                <Text className="mt-2 text-neutral-600 font-quicksand-medium">
                                    Aucun produit trouvé
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setCityModalVisible(true)}
                                    className="mt-3 px-4 py-2 rounded-full border"
                                    style={{ borderColor: '#FED7AA' }}
                                >
                                    <Text className="text-primary-600 font-quicksand-semibold">
                                        Ajuster les filtres
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {/* Categories */}
                <View className="py-4">
                    <FlatList
                        data={categories}
                        renderItem={({ item }) => (
                            <TouchableOpacity className="items-center mx-2">
                                <View
                                    className="w-16 h-16 rounded-full justify-center items-center mb-2 shadow-sm"
                                    style={{ backgroundColor: item.color + '20', borderWidth: 1, borderColor: item.color + '55' }}
                                >
                                    <Ionicons name={item.icon as any} size={26} color={item.color} />
                                </View>
                                <Text className="text-xs font-quicksand-semibold text-neutral-800 text-center" numberOfLines={2}>
                                    {item.name}
                                </Text>
                            </TouchableOpacity>
                        )}
                        keyExtractor={(item) => item.id.toString()}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 16 }}
                    />
                </View>

                {/* Boosted Ads Carousel (amélioré avec images et overlay) */}
                <View className="py-4">
                    <FlatList
                        data={adsToDisplay}
                        renderItem={renderAd}
                        keyExtractor={(_item: any, index) => (_item && _item._id ? String(_item._id) : `ad-${index}`)}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onViewableItemsChanged={onAdViewableItemsChanged}
                        viewabilityConfig={adViewabilityConfig}
                        onMomentumScrollEnd={(event) => {
                            const newIndex = Math.round(event.nativeEvent.contentOffset.x / (Dimensions.get('window').width - 48));
                            setCurrentAdIndex(newIndex);
                        }}
                        contentContainerStyle={{ paddingHorizontal: 16 }}
                    />
                    {/* Indicators */}
                    <View className="flex-row justify-center mt-3">
                        {adsToDisplay.map((_, index) => {
                            const active = index === currentAdIndex;
                            return (
                                <View
                                    key={index}
                                    style={{
                                        width: active ? 16 : 8,
                                        height: 8,
                                        borderRadius: 9999,
                                        backgroundColor: active ? '#10B981' : '#D1D5DB',
                                        marginHorizontal: 4,
                                        opacity: active ? 1 : 0.7,
                                    }}
                                />
                            );
                        })}
                    </View>
                </View>

                {/* Featured Products (changé en vertical avec 2 colonnes) */}
                <View className="py-4 px-4">
                    <View className="mb-4 flex-row justify-between items-center">
                        <Text className="text-base font-quicksand-bold text-neutral-800">
                            Produits populaires
                        </Text>
                        <TouchableOpacity className="px-3 py-1.5 rounded-full border border-primary-200 bg-white/60">
                            <Text className="text-primary-500 text-sm font-quicksand-semibold">
                                Voir tout
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {loadingProducts ? (
                        <View className="flex-1 justify-center items-center py-8">
                            <ActivityIndicator size="large" color="#10B981" />
                            <Text className="mt-2 text-neutral-600 font-quicksand-medium">
                                Chargement des produits...
                            </Text>
                        </View>
                    ) : featuredProducts.length > 0 ? (
                        <View className="flex-row flex-wrap justify-between">
                            {featuredProducts.map(renderProduct)}
                        </View>
                    ) : (
                        <View className="flex-1 justify-center items-center py-8">
                            <Text className="text-neutral-600 font-quicksand-medium">
                                Aucun produit disponible
                            </Text>
                        </View>
                    )}
                </View>


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