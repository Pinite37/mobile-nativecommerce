// Service publicités
import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    BackHandler,
    Dimensions,
    Easing,
    FlatList,
    Image,
    Keyboard,
    Modal,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from "../../../../contexts/AuthContext";
import AdvertisementService, { Advertisement } from '../../../../services/api/AdvertisementService';
import CategoryService from "../../../../services/api/CategoryService";
// import { useSearchCache } from "../../../../hooks/useSearchCache"; // retiré (non utilisé)
import { useLocale } from "../../../../contexts/LocaleContext";
import i18n from "../../../../i18n/i18n";
import { Enterprise } from "../../../../services/api/EnterpriseService";
import ProductService from "../../../../services/api/ProductService";
import SearchService from "../../../../services/api/SearchService";
import SearchCacheService, { RecentSearch } from "../../../../services/SearchCacheService";
import { Category, Product } from "../../../../types/product";

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
    { id: 1, name: i18n.t('client.home.categories.trends'), icon: "flame", color: "#FF6B35" },
    { id: 2, name: i18n.t('client.home.categories.vehicles'), icon: "car-sport", color: "#3B82F6" },
    { id: 3, name: i18n.t('client.home.categories.realEstate'), icon: "home", color: "#8B5CF6" },
    { id: 4, name: i18n.t('client.home.categories.phones'), icon: "phone-portrait", color: "#EC4899" },
    { id: 5, name: i18n.t('client.home.categories.electronics'), icon: "laptop", color: "#10B981" },
    { id: 6, name: i18n.t('client.home.categories.furniture'), icon: "bed", color: "#6366F1" },
    { id: 7, name: i18n.t('client.home.categories.fashion'), icon: "shirt", color: "#EF4444" },
    { id: 8, name: i18n.t('client.home.categories.services'), icon: "construct", color: "#F59E0B" },
    { id: 9, name: i18n.t('client.home.categories.jobs'), icon: "briefcase", color: "#0EA5E9" },
];

// popularStores retiré (non utilisé)

export default function ClientHome() {
    const { user } = useAuth();
    const { locale } = useLocale();
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const FIXED_HEADER_HEIGHT = 120 + insets.top;
    // const { getCacheStats } = useSearchCache(); // (non utilisé pour l'instant)

    // Calcul responsive pour la largeur des produits
    const screenWidth = Dimensions.get('window').width;
    const isSmallScreen = screenWidth < 380;
    const isTablet = screenWidth >= 768;
    const productWidth = isTablet ? '31%' : '48%'; // 3 colonnes sur tablette, 2 sur mobile

    const [selectedCity, setSelectedCity] = useState(beninCities[0].name);
    const [selectedNeighborhood, setSelectedNeighborhood] = useState("");
    const [cityModalVisible, setCityModalVisible] = useState(false);
    const [neighborhoodModalVisible, setNeighborhoodModalVisible] = useState(false);
    const [currentAdIndex, setCurrentAdIndex] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true); // État de chargement global
    const scrollY = useRef(new Animated.Value(0)).current;
    const [imageRefreshKey, setImageRefreshKey] = useState(0); // Clé pour forcer le rechargement des images

    // États pour les produits de l'API
    const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
    const [productsPage, setProductsPage] = useState(1);
    const [hasMoreProducts, setHasMoreProducts] = useState(true);

    // Refs pour accéder aux valeurs dans le listener de scroll
    const loadingMoreProductsRef = useRef(false);
    const hasMoreProductsRef = useRef(true);

    // États pour les catégories
    const [categoriesData, setCategoriesData] = useState<Category[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(false);

    // États pour les boutiques
    const [featuredStores, setFeaturedStores] = useState<Enterprise[]>([]);
    const [loadingStores, setLoadingStores] = useState(false);

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
            console.log("🖱️ Clic sur publicité:", ad._id);

            // Incrémenter le clic en arrière-plan
            AdvertisementService.incrementClick(ad._id).catch(() => { });

            console.log("🧭 Navigation vers la page de la pub...");

            // Naviguer vers la page de détails de la publicité
            router.push(`/(app)/(client)/advertisement/${ad._id}` as any);

            console.log("✅ Navigation lancée");
        } catch (e) {
            console.error('⚠️ Erreur clic publicité:', e);
        }
    };

    // Ne pas utiliser de fallback - afficher un message si pas de publicités
    const adsToDisplay = ads;

    // ================= Fonctions produits & favoris (déclarations hoistées) =================
    async function loadFeaturedProducts(reset = false) {
        try {
            setLoadingProducts(true);
            const pageToLoad = 1; // Toujours commencer par la page 1 pour le chargement initial

            // Utiliser l'API des produits publics pour avoir plus de contrôle sur la pagination
            const response = await ProductService.getAllPublicProducts({
                limit: 6,
                sort: "popular",
                page: pageToLoad,
            });

            // Toujours remplacer les produits lors du chargement initial
            setFeaturedProducts(response.products || []);
            setProductsPage(1);

            // Vérifier s'il y a plus de produits disponibles
            const hasMore = response.pagination
                ? response.pagination.page < response.pagination.pages
                : false;
            setHasMoreProducts(hasMore);
            hasMoreProductsRef.current = hasMore;
            loadingMoreProductsRef.current = false;

            console.log('📊 Pagination produits populaires:', {
                currentPage: response.pagination?.page,
                totalPages: response.pagination?.pages,
                hasMore,
                productsCount: response.products?.length
            });
        } catch (e) {
            console.error('❌ Erreur chargement produits populaires:', e);
        } finally {
            setLoadingProducts(false);
        }
    }

    const loadMoreFeaturedProducts = async () => {
        if (loadingMoreProductsRef.current || !hasMoreProductsRef.current) {
            console.log('🚫 Chargement bloqué:', {
                loading: loadingMoreProductsRef.current,
                hasMore: hasMoreProductsRef.current,
                currentPage: productsPage,
                totalProducts: featuredProducts.length
            });
            return;
        }

        try {
            console.log('🔄 Début chargement page suivante...');
            loadingMoreProductsRef.current = true;
            setLoadingMoreProducts(true);

            const nextPage = productsPage + 1;
            console.log('📄 Chargement page:', nextPage, '| Produits actuels:', featuredProducts.length);

            const response = await ProductService.getAllPublicProducts({
                limit: 6,
                sort: "popular",
                page: nextPage,
            });

            // Ajouter les nouveaux produits aux existants en évitant les doublons
            setFeaturedProducts((prev) => {
                const existingIds = new Set(prev.map(p => p._id));
                const uniqueNewProducts = (response.products || []).filter(p => !existingIds.has(p._id));
                const newProducts = [...prev, ...uniqueNewProducts];
                console.log('📦 Produits après ajout:', newProducts.length, '| Nouveaux uniques:', uniqueNewProducts.length);
                return newProducts;
            });

            setProductsPage(nextPage);

            // Vérifier s'il y a encore plus de produits
            const hasMore = response.pagination
                ? response.pagination.page < response.pagination.pages
                : false;

            setHasMoreProducts(hasMore);
            hasMoreProductsRef.current = hasMore;

            console.log('📊 Chargement page suivante:', {
                page: nextPage,
                currentPage: response.pagination?.page,
                totalPages: response.pagination?.pages,
                hasMore,
                newProductsCount: response.products?.length,
                totalProductsNow: featuredProducts.length + (response.products?.length || 0)
            });
        } catch (error) {
            console.error('❌ Erreur chargement plus de produits populaires:', error);
        } finally {
            loadingMoreProductsRef.current = false;
            setLoadingMoreProducts(false);
        }
    };

    async function loadFeaturedStores() {
        try {
            setLoadingStores(true);
            // Note: Pour l'instant on initialise vide car l'API nécessite un terme de recherche
            // TODO: Implémenter une méthode API dédiée pour obtenir les entreprises en vedette
            setFeaturedStores([]);
        } catch (e) {
            console.error('❌ Erreur chargement boutiques:', e);
        } finally {
            setLoadingStores(false);
        }
    }

    async function loadFavorites() {
        try {
            console.log('🔥 Chargement des favoris...');
            const favResponse = await ProductService.getFavoriteProducts();
            console.log('📦 Réponse favoris:', favResponse);

            if (Array.isArray(favResponse)) {
                const favoriteIds = favResponse.map((f: any) => f.product?._id);
                console.log('❤️ IDs favoris:', favoriteIds);
                setFavorites(new Set(favoriteIds));
            } else if (Array.isArray((favResponse as any)?.data)) {
                const favoriteIds = (favResponse as any).data.map((f: any) => f.product?._id);
                console.log('❤️ IDs favoris (data):', favoriteIds);
                setFavorites(new Set(favoriteIds));
            } else {
                console.warn('⚠️ Structure de réponse favoris inattendue:', favResponse);
            }
        } catch (e) {
            console.error('❌ Erreur chargement favoris:', e);
        }
    }

    async function loadCategories() {
        try {
            setLoadingCategories(true);
            const categoriesResponse = await CategoryService.getActiveCategories();
            setCategoriesData(categoriesResponse.slice(0, 9)); // Prendre les 9 premières catégories
        } catch (error) {
            console.error('❌ Erreur chargement catégories:', error);
            // En cas d'erreur, on garde les catégories statiques vides
            setCategoriesData([]);
        } finally {
            setLoadingCategories(false);
        }
    }

    async function refreshData() {
        try {
            setRefreshing(true);
            setRefreshing(true);
            await Promise.all([loadAds(), loadFeaturedProducts(), loadFavorites(), loadCategories(), loadFeaturedStores()]);
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

    // ================= Chargement initial =================
    const loadInitialData = async () => {
        setLoading(true);
        await Promise.all([
            loadAds(),
            loadFeaturedProducts(),
            loadFavorites(),
            loadCategories(),
            loadFeaturedStores(),
            loadRecentSearches()
        ]);
        setLoading(false);
    };

    useEffect(() => {
        loadInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // loadInitialData retiré des dépendances pour éviter la boucle infinie

    // Forcer le rechargement des images quand on revient sur la page
    useFocusEffect(
        useCallback(() => {
            // Incrémenter la clé pour forcer le rechargement des images
            setImageRefreshKey(prev => prev + 1);
        }, [])
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
            <View style={[{ backgroundColor: colors.border, overflow: 'hidden' }, style]}>
                <Animated.View style={{
                    position: 'absolute', top: 0, bottom: 0, width: 120,
                    transform: [{ translateX }],
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.35)',
                    opacity: 0.7,
                }} />
            </View>
        );
    };

    const SkeletonCard = ({ style }: { style?: any }) => (
        <View style={[{ backgroundColor: colors.card, borderColor: colors.border }, style]} className="rounded-2xl shadow-sm border overflow-hidden">
            <ShimmerBlock style={{ height: 120, borderRadius: 16, width: '100%' }} />
        </View>
    );

    const SkeletonProduct = () => (
        <View style={[{ backgroundColor: colors.card, borderColor: colors.border, width: productWidth }]} className="rounded-2xl shadow-md border p-2 mb-3 overflow-hidden">
            <ShimmerBlock style={{ height: 128, borderRadius: 16, width: '100%' }} />
            <View className="p-2">
                <ShimmerBlock style={{ height: 14, borderRadius: 7, width: '80%', marginBottom: 8 }} />
                <ShimmerBlock style={{ height: 16, borderRadius: 8, width: '60%', marginBottom: 8 }} />
                <ShimmerBlock style={{ height: 12, borderRadius: 6, width: '40%' }} />
            </View>
        </View>
    );

    const SkeletonProductList = () => (
        <View style={[{ backgroundColor: colors.card, borderColor: colors.border, width: '100%' }]} className="rounded-2xl shadow-md border p-2 mb-3 overflow-hidden flex-row">
            <ShimmerBlock style={{ width: 100, height: 100, borderRadius: 16, marginRight: 12 }} />
            <View className="flex-1">
                <ShimmerBlock style={{ height: 14, borderRadius: 7, width: '80%', marginBottom: 8 }} />
                <View className="flex-row items-center mb-2">
                    <ShimmerBlock style={{ height: 12, borderRadius: 6, width: '30%', marginRight: 4 }} />
                    <ShimmerBlock style={{ width: 12, height: 12, borderRadius: 6 }} />
                </View>
                <ShimmerBlock style={{ height: 16, borderRadius: 8, width: '50%', marginBottom: 8 }} />
                <ShimmerBlock style={{ height: 30, borderRadius: 15, width: '70%' }} />
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
                            <ShimmerBlock style={{ height: 16, borderRadius: 8, width: 80, marginBottom: 8 }} />
                            <ShimmerBlock style={{ height: 24, borderRadius: 12, width: 120 }} />
                        </View>
                        <ShimmerBlock style={{ width: 40, height: 40, borderRadius: 20 }} />
                    </View>
                </LinearGradient>

                {/* Floating Search Skeleton */}
                <View className="-mt-14 px-4">
                    <View style={{ backgroundColor: colors.card }} className="rounded-3xl shadow-xl p-2">
                        <ShimmerBlock style={{ height: 44, borderRadius: 16, width: '100%', marginBottom: 12 }} />
                        <View className="flex-row justify-between">
                            <ShimmerBlock style={{ width: '48%', height: 36, borderRadius: 12 }} />
                            <ShimmerBlock style={{ width: '48%', height: 36, borderRadius: 12 }} />
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
                        <ShimmerBlock style={{ height: 200, borderRadius: 24, width: '100%' }} />
                    </View>
                    {/* Indicators */}
                    <View className="flex-row justify-center mt-3 gap-2">
                        {[0, 1, 2].map((i) => (
                            <ShimmerBlock key={i} style={{ width: 8, height: 8, borderRadius: 4 }} />
                        ))}
                    </View>
                </View>

                {/* Categories Skeleton - Horizontal Scroll */}
                <View className="py-6">
                    <View className="px-6 mb-4">
                        <ShimmerBlock style={{ height: 20, borderRadius: 10, width: 140, marginBottom: 4 }} />
                        <ShimmerBlock style={{ height: 14, borderRadius: 7, width: 200 }} />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: isSmallScreen ? 16 : 20, gap: isSmallScreen ? 8 : 12 }}>
                        {Array.from({ length: 6 }).map((_, index) => (
                            <View key={index} className="items-center">
                                <ShimmerBlock style={{ width: 70, height: 70, borderRadius: 20, marginBottom: 8 }} />
                                <ShimmerBlock style={{ width: 60, height: 12, borderRadius: 6 }} />
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Featured Stores Skeleton - Hidden since we don't have stores */}
                {/* Uncomment when featured stores are available */}
                {/* <View className="py-4">
                    <View className="px-6 mb-4">
                        <ShimmerBlock style={{ height: 20, borderRadius: 10, width: 160 }} />
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
                        {Array.from({ length: 4 }).map((_, index) => (
                            <View key={index} className="items-center">
                                <ShimmerBlock style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 8 }} />
                                <ShimmerBlock style={{ width: 70, height: 12, borderRadius: 6, marginBottom: 4 }} />
                                <ShimmerBlock style={{ width: 50, height: 10, borderRadius: 5 }} />
                            </View>
                        ))}
                    </ScrollView>
                </View> */}

                {/* Featured Products Skeleton */}
                <View className="px-4 py-4">
                    <View className="mb-4 flex-row justify-between items-center">
                        <ShimmerBlock style={{ height: 20, borderRadius: 10, width: 140 }} />
                        <ShimmerBlock style={{ width: 80, height: 32, borderRadius: 16 }} />
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

    // Fonction pour masquer les résultats de recherche
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
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="rounded-3xl shadow-sm border mb-4 overflow-hidden"
            onPress={() => router.push(`/(app)/(client)/product/${item._id}`)}
            activeOpacity={0.9}
        >
            <View className="relative">
                <Image
                    key={`image-${item._id}-${imageRefreshKey}`}
                    source={{ uri: item.images[0] || "https://via.placeholder.com/300" }}
                    className="w-full h-40 bg-neutral-100"
                    resizeMode="cover"
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

                {/* Favorite Button */}
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
                    {item.stats && (
                        <View className="flex-row items-center bg-amber-50 px-1.5 py-0.5 rounded-md">
                            <Ionicons name="star" size={10} color="#F59E0B" />
                            <Text className="text-[10px] font-quicksand-bold text-amber-700 ml-1">
                                {item.stats.averageRating?.toFixed(1) || '5.0'}
                            </Text>
                        </View>
                    )}
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
                        <Text className="text-emerald-50 text-sm font-quicksand-medium">
                            {greetUser()},
                        </Text>
                        <Text className="text-white text-2xl font-quicksand-bold">
                            {user ? user.firstName : "Invité"}
                        </Text>
                    </View>
                    {/* <TouchableOpacity
                        className="bg-white/20 p-2 rounded-full backdrop-blur-sm border border-white/30"
                        onPress={() => { }}
                    >
                        <Ionicons name="notifications-outline" size={24} color="white" />
                        <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-emerald-600" />
                    </TouchableOpacity> */}
                </View>
            </LinearGradient>

            {/* Search Section Floating Over Header */}
            <View className="-mt-14 px-4">
                <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-3xl shadow-xl p-2 border">
                    <View style={{ backgroundColor: colors.secondary, borderColor: colors.border }} className="flex-row items-center px-3 py-2 rounded-2xl border">
                        <Ionicons name="search" size={22} color="#10B981" />
                        <TextInput
                            style={{ color: colors.textPrimary }}
                            className="flex-1 ml-3 font-quicksand-semibold text-base"
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
                            <TouchableOpacity onPress={() => setSearchQuery('')} className="mr-2">
                                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Location Chips inside Search Card */}
                    <View className="flex-row mt-3 px-1 pb-1">
                        <TouchableOpacity
                            onPress={() => setCityModalVisible(true)}
                            className={`flex-1 flex-row items-center justify-center py-2 rounded-xl ${isSmallScreen ? 'mr-1' : 'mr-2'}`}
                            style={{ backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5' }}
                        >
                            <Ionicons name="location" size={14} color="#059669" />
                            <Text style={{ color: colors.brandSecondary }} numberOfLines={1} className="ml-1.5 text-xs font-quicksand-bold">
                                {selectedCity}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => selectedCity && setNeighborhoodModalVisible(true)}
                            style={{ backgroundColor: selectedCity ? colors.secondary : colors.border }}
                            className={`flex-1 flex-row items-center justify-center py-2 rounded-xl ${isSmallScreen ? 'ml-1' : 'ml-2'} ${!selectedCity && 'opacity-50'}`}
                            disabled={!selectedCity}
                        >
                            <Ionicons name="map" size={14} color={colors.textSecondary} />
                            <Text numberOfLines={1} style={{ color: colors.textPrimary }} className="ml-1.5 text-xs font-quicksand-bold">
                                {selectedNeighborhood || i18n.t('client.home.location.neighborhood')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
                    className="w-24 h-24 rounded-xl"
                    resizeMode="cover"
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
                    {item.stats && (
                        <View className="flex-row items-center mt-1">
                            <Ionicons name="star" size={12} color="#FFD700" />
                            <Text style={{ color: colors.textSecondary }} className="text-xs ml-1">
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
                </View>
            </View>
        </TouchableOpacity>
    );



    const renderAd = ({ item }: { item: any }) => {
        console.log("🎨 renderAd appelé pour:", item._id);
        return (
            <TouchableOpacity
                onPress={() => {
                    console.log("👆 TouchableOpacity onPress déclenché !");
                    handleAdPress(item);
                }}
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
                    resizeMode="cover"
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

                    {/* Suggestions et Recherches récentes - Position absolute pour éviter l'espace blanc */}
                    {(showSuggestions || showRecentSearches) && (
                        <View
                            className="absolute rounded-b-2xl shadow-lg border-t mx-4 z-40"
                            style={{
                                backgroundColor: colors.card,
                                borderTopColor: colors.border,
                                // Header: insets.top + 10 + 80 (paddingBottom)
                                // Search card: -mt-14 (-56px) 
                                // Search card height: ~130px (p-2 + input + chips)
                                // Total: insets.top + 90 - 56 + 130 + 10 (spacing) = insets.top + 174
                                top: insets.top + 174,
                                left: 0,
                                right: 0,
                                maxHeight: 400
                            }}
                        >
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                            >
                                {/* Recherches récentes */}
                                {showRecentSearches && recentSearches.length > 0 && (
                                    <View>
                                        <View style={{ backgroundColor: colors.secondary }} className="flex-row items-center justify-between px-4 py-2">
                                            <Text style={{ color: colors.textSecondary }} className="text-xs font-quicksand-semibold uppercase">
                                                {i18n.t('client.home.search.recentSearches')}
                                            </Text>
                                            <TouchableOpacity onPress={clearSearchHistory}>
                                                <Text className="text-xs font-quicksand-medium text-primary-500">
                                                    {i18n.t('client.home.search.clearHistory')}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                        {recentSearches.slice(0, 5).map((recentSearch, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={{ borderBottomColor: colors.border }}
                                                className="flex-row items-center justify-between px-4 py-3 border-b"
                                                onPress={() => {
                                                    setSearchQuery(recentSearch.query);
                                                    performSearch(recentSearch.query);
                                                }}
                                            >
                                                <View className="flex-row items-center flex-1">
                                                    <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                                                    <Text style={{ color: colors.textPrimary }} className="ml-3 flex-1 font-quicksand-medium">
                                                        {recentSearch.query}
                                                    </Text>
                                                    <Text style={{ color: colors.textSecondary }} className="text-xs font-quicksand-medium mr-2">
                                                        {i18n.t('client.home.searchResults.resultsCount', { count: recentSearch.resultCount })}
                                                    </Text>
                                                </View>
                                                <TouchableOpacity
                                                    onPress={(e) => {
                                                        e.stopPropagation();
                                                        removeFromSearchHistory(recentSearch.query);
                                                    }}
                                                    className="p-1"
                                                >
                                                    <Ionicons name="close" size={14} color={colors.textSecondary} />
                                                </TouchableOpacity>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                {/* Suggestions */}
                                {showSuggestions && searchSuggestions.length > 0 && (
                                    <View style={{ borderTopColor: colors.border }} className="border-t rounded-b-2xl overflow-hidden">
                                        <View style={{ backgroundColor: colors.secondary }} className="px-4 py-3">
                                            <Text style={{ color: colors.brandPrimary }} className="text-xs font-quicksand-bold uppercase tracking-wide">
                                                {i18n.t('client.home.search.suggestions')}
                                            </Text>
                                        </View>
                                        {searchSuggestions.map((suggestion, index) => {
                                            const isLast = index === searchSuggestions.length - 1;
                                            const getIconColor = (type: string) => {
                                                switch (type) {
                                                    case 'product': return '#10B981';
                                                    case 'category': return '#8B5CF6';
                                                    case 'enterprise': return '#F59E0B';
                                                    default: return '#6B7280';
                                                }
                                            };
                                            const getTypeColor = (type: string) => {
                                                switch (type) {
                                                    case 'product': return '#10B981';
                                                    case 'category': return '#8B5CF6';
                                                    case 'enterprise': return '#F59E0B';
                                                    default: return '#9CA3AF';
                                                }
                                            };

                                            return (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={{ borderBottomColor: colors.border }}
                                                    className={`flex-row items-center px-4 py-3.5 ${!isLast ? 'border-b' : ''}`}
                                                    onPress={() => selectSuggestion(suggestion)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: getIconColor(suggestion.type) + '15' }}>
                                                        <Ionicons
                                                            name={suggestion.type === 'product' ? 'cube-outline' :
                                                                suggestion.type === 'category' ? 'folder-outline' : 'business-outline'}
                                                            size={16}
                                                            color={getIconColor(suggestion.type)}
                                                        />
                                                    </View>
                                                    <View className="ml-3 flex-1">
                                                        <Text style={{ color: colors.textPrimary }} className="text-sm font-quicksand-medium" numberOfLines={1}>
                                                            {suggestion.text}
                                                        </Text>
                                                    </View>
                                                    <View style={{ backgroundColor: colors.secondary }} className="px-2 py-1 rounded-full">
                                                        <Text className="text-xs font-quicksand-semibold uppercase" style={{ color: getTypeColor(suggestion.type) }}>
                                                            {i18n.t(`client.home.search.types.${suggestion.type}`)}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    )}

                    <Animated.ScrollView
                        className="flex-1"
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{
                            paddingTop: 10,
                            paddingBottom: 90 + insets.bottom,
                        }}
                        scrollEventThrottle={16}
                        onScroll={Animated.event(
                            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                            {
                                useNativeDriver: false,
                                listener: (event: any) => {
                                    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
                                    const paddingToBottom = 300; // Déclenche 300px avant la fin
                                    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

                                    // Charger plus de produits si on est proche du bas
                                    if (isCloseToBottom && !loadingMoreProductsRef.current && hasMoreProductsRef.current) {
                                        console.log('🎯 Déclenchement chargement automatique produits');
                                        loadMoreFeaturedProducts();
                                    }
                                }
                            }
                        )}
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
                            <View style={{ backgroundColor: colors.card, borderBottomColor: colors.border }} className="px-4 py-4 border-b">
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
                            </View>
                        )}

                        {/* Boosted Ads Carousel (amélioré avec images et overlay) */}
                        <View className="py-0">
                            {adsToDisplay.length > 0 ? (
                                <>
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
                                </>
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
                                    onPress={() => router.push('/(app)/(client)/categories' as any)}
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
                                        const categoryColors = ["#FF6B35", "#3B82F6", "#8B5CF6", "#EC4899", "#10B981", "#6366F1", "#EF4444", "#F59E0B"];
                                        const icons = ["flame", "car-sport", "home", "phone-portrait", "laptop", "bed", "shirt", "construct"];
                                        const categoryColor = category.color || categoryColors[index % categoryColors.length];
                                        const categoryIcon = category.icon || icons[index % icons.length];
                                        const categoryId = category._id || category.id || index;
                                        // Détecte tous les types d'emojis (pas seulement les visages)
                                        const isEmoji = (str: string) => {
                                            const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;
                                            return emojiRegex.test(str);
                                        };

                                        return (
                                            <TouchableOpacity
                                                key={categoryId}
                                                onPress={() => category._id && router.push(`/(app)/(client)/category/${category._id}` as any)}
                                                className="mr-4 items-center"
                                            >
                                                <View
                                                    className="w-16 h-16 rounded-2xl justify-center items-center mb-3 shadow-md"
                                                    style={{
                                                        backgroundColor: categoryColor + "15",
                                                        borderWidth: 1,
                                                        borderColor: categoryColor + "30",
                                                    }}
                                                >
                                                    {isEmoji(categoryIcon) ? (
                                                        <Text style={{ fontSize: 24 }}>
                                                            {categoryIcon}
                                                        </Text>
                                                    ) : (
                                                        <Ionicons
                                                            name={categoryIcon as any}
                                                            size={24}
                                                            color={categoryColor}
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
                                    onPress={() => router.push('/(app)/(client)/marketplace' as any)}
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
                                    {__DEV__ && hasMoreProducts && !loadingMoreProducts && (
                                        <View className="py-2 items-center">
                                            <Text style={{ color: colors.textTertiary }} className="text-xs font-quicksand-medium">
                                                Page {productsPage} • {featuredProducts.length} produits • Faites défiler pour plus
                                            </Text>
                                        </View>
                                    )}
                                    {__DEV__ && !hasMoreProducts && featuredProducts.length > 6 && (
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

                    </Animated.ScrollView>

                    {/* Modal de sélection de ville */}
                    <Modal
                        animationType="slide"
                        transparent={true}
                        visible={cityModalVisible}
                        onRequestClose={() => setCityModalVisible(false)}
                    >
                        <View className="flex-1 bg-transparent justify-end">
                            <View style={{ backgroundColor: colors.card }} className="rounded-t-3xl pb-10 pt-4 px-4">
                                <View className="flex-row justify-between items-center mb-6">
                                    <Text style={{ color: colors.textPrimary }} className="text-lg font-quicksand-bold">
                                        {i18n.t('client.home.modals.city.title')}
                                    </Text>
                                    <TouchableOpacity onPress={() => setCityModalVisible(false)}>
                                        <Ionicons name="close" size={24} color={colors.textPrimary} />
                                    </TouchableOpacity>
                                </View>

                                <FlatList
                                    data={beninCities}
                                    keyExtractor={(item) => item.id.toString()}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            onPress={() => selectCity(item.name)}
                                            style={{ borderBottomColor: colors.border }}
                                            className="py-3 border-b"
                                        >
                                            <Text
                                                className={`text-base font-quicksand-medium ${selectedCity === item.name ? 'text-primary' : 'text-neutral-700'
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
                            <View style={{ backgroundColor: colors.card }} className="rounded-t-3xl pb-10 pt-4 px-4">
                                <View className="flex-row justify-between items-center mb-6">
                                    <Text className="text-lg font-quicksand-bold text-neutral-800">
                                        {i18n.t('client.home.modals.neighborhood.title', { city: selectedCity })}
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
                                            style={{ borderBottomColor: colors.border }}
                                            className="py-3 border-b"
                                        >
                                            <Text
                                                className={`text-base font-quicksand-medium ${selectedNeighborhood === item ? 'text-primary' : 'text-neutral-700'
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
                </>
            )
            }
        </View >
    );
}