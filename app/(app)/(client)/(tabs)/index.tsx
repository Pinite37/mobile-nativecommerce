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
    Dimensions,
    FlatList,
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
import StatusService, { StatusGroup, StatusItem } from "../../../../services/api/StatusService";
import MessagingService from "../../../../services/api/MessagingService";
import { StatusBar as StatusBarComponent } from "../../../../components/ui/StatusBar";
import { StatusViewer } from "../../../../components/ui/StatusViewer";
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
            {/* Header Skeleton — flat */}
            <View style={{
                backgroundColor: colors.surface,
                paddingTop: insets.top + 12,
                paddingHorizontal: isSmallScreen ? 16 : 20,
                paddingBottom: 14,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderLight,
            }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <View>
                        <Shimmer style={{ height: 13, borderRadius: 7, width: 80, marginBottom: 8 }} />
                        <Shimmer style={{ height: 22, borderRadius: 11, width: 130 }} />
                    </View>
                    <Shimmer style={{ width: 42, height: 42, borderRadius: 14 }} />
                </View>
                <Shimmer style={{ height: 48, borderRadius: 15, width: '100%' }} />
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
                            <Text className="text-white text-[10px] font-jakarta-bold">{i18n.t('client.home.badges.top')}</Text>
                        </View>
                    )}
                    {(item as any).promotion && (
                        <View className="bg-red-500/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
                            <Text className="text-white text-[10px] font-jakarta-bold">{i18n.t('client.home.badges.promo')}</Text>
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
                <Text numberOfLines={1} style={{ color: colors.textSecondary }} className="text-xs font-jakarta-medium mb-0.5">
                    {(item.category as any)?.name || 'Divers'}
                </Text>
                <Text numberOfLines={2} style={{ color: colors.textPrimary }} className="text-sm font-jakarta-bold leading-5 h-10 mb-1">
                    {item.name}
                </Text>

                <View className="flex-row items-center justify-between mt-1">
                    <Text className="text-base font-jakarta-bold text-emerald-600">
                        {formatPrice(item.price)}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderHeader = () => (
        <View style={{
            backgroundColor: colors.surface,
            paddingTop: insets.top + 12,
            paddingHorizontal: isSmallScreen ? 16 : 20,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
            zIndex: 50,
        }}>
            {/* Ligne greeting + notification */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <View>
                    {isAuthenticated ? (
                        <>
                            <Text style={{ fontFamily: 'PlusJakartaSans-Regular', fontSize: 13, color: colors.textSecondary }}>
                                {`${greetUser()},`}
                            </Text>
                            <Text style={{ fontFamily: 'PlusJakartaSans-Bold', fontSize: 22, color: colors.textPrimary }}>
                                {user?.firstName || "Utilisateur"}
                            </Text>
                        </>
                    ) : (
                        <Text style={{ fontFamily: 'PlusJakartaSans-Bold', fontSize: 20, color: colors.textPrimary }}>
                            Bienvenue sur Aximarketplace
                        </Text>
                    )}
                </View>
                {isAuthenticated && (
                    <TouchableOpacity
                        style={{ backgroundColor: colors.tertiary, borderRadius: 14, padding: 10, position: 'relative' }}
                        onPress={() => router.push({ pathname: '/(app)/(client)/notifications', params: { from: 'home' } })}
                    >
                        <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
                        {unreadCount > 0 && (
                            <View style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, backgroundColor: '#EF4444', borderRadius: 4 }} />
                        )}
                    </TouchableOpacity>
                )}
            </View>

            {/* Barre de recherche — intégrée dans le header */}
            <View style={{ position: 'relative' }}>
                <View style={{
                    backgroundColor: colors.tertiary,
                    borderRadius: 15, flexDirection: 'row', alignItems: 'center',
                    height: 48, overflow: 'hidden',
                }}>
                    {/* Toute la zone gauche est tactile, loupe et marge comprises :
                        l'icône placée hors du touchable ne réagissait pas, alors que
                        c'est précisément là qu'on appuie pour chercher.
                        Le champ n'est plus saisissable ici, il ouvre l'écran de
                        recherche — qui a la place d'afficher suggestions, historique
                        et résultats sans les empiler par-dessus l'accueil. Le
                        périmètre courant (ville, quartier, tri) part avec, sinon la
                        recherche ne porterait pas sur ce que l'utilisateur voit. */}
                    <TouchableOpacity
                        activeOpacity={0.7}
                        accessibilityRole="search"
                        accessibilityLabel={i18n.t('client.home.search.placeholder')}
                        onPress={() => router.push({
                            pathname: '/(app)/(client)/search',
                            params: {
                                city: selectedCity || '',
                                district: selectedNeighborhood || '',
                                sort: mapSelectedSortToApi(selectedSort) || '',
                            },
                        })}
                        style={{
                            flex: 1, height: '100%', flexDirection: 'row',
                            alignItems: 'center', paddingLeft: 14, paddingRight: 8,
                        }}
                    >
                        <Ionicons name="search" size={20} color="#10B981" />
                        <Text
                            numberOfLines={1}
                            style={{
                                marginLeft: 10, flex: 1,
                                color: colors.textSecondary,
                                fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 15,
                            }}
                        >
                            {i18n.t('client.home.search.placeholder')}
                        </Text>
                    </TouchableOpacity>
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
                            marginLeft: 5, fontSize: 13, fontFamily: 'PlusJakartaSans-SemiBold',
                            color: selectedCity ? '#059669' : colors.textSecondary,
                            maxWidth: 70,
                        }}>
                            {selectedCity || 'Lieu'}
                        </Text>
                    </TouchableOpacity>
                </View>

            </View>
        </View>
    );

    const renderSearchSection = () => null; // Search is now integrated in Header

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
                        className="text-white font-jakarta-bold text-base mb-1"
                    >
                        {item.title}
                    </Text>
                    <Text
                        numberOfLines={1}
                        className="text-white/90 font-jakarta-medium text-xs"
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
                                    <Text className="text-base font-jakarta-bold text-neutral-800 text-center mb-2">
                                        {i18n.t('client.home.ads.noAds')}
                                    </Text>
                                    <Text style={{ color: colors.textSecondary }} className="text-sm font-jakarta text-center">
                                        {i18n.t('client.home.ads.comeBackSoon')}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Categories - Horizontal Scroll */}
                        <View className="py-6">
                            <View className="px-6 mb-4 flex-row justify-between items-end">
                                <View>
                                    <Text style={{ color: colors.textPrimary }} className="text-xl font-jakarta-bold">
                                        {i18n.t('client.home.categories.title')}
                                    </Text>
                                    <Text style={{ color: colors.textSecondary }} className="text-xs font-jakarta">
                                        {i18n.t('client.home.categories.subtitle')}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => router.push('/(app)/(client)/categories')}
                                    style={{ backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5" }}
                                    className="flex-row items-center rounded-xl px-3 py-2 ml-2"
                                >
                                    <Text style={{ color: colors.brandPrimary }} className="font-jakarta-semibold text-sm mr-1">
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
                                                onPress={() => category._id && router.push({ pathname: '/(app)/(client)/category/[categoryId]', params: { categoryId: category._id } })}
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
                                                <Text style={{ color: colors.textPrimary }} className="text-xs font-jakarta-semibold text-center w-16 leading-4" numberOfLines={2}>
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
                                <Text style={{ color: colors.textPrimary }} className="text-xl font-jakarta-bold">
                                    {i18n.t('client.home.featuredProducts.title')}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => router.push('/(app)/(client)/marketplace')}
                                    style={{ backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5" }}
                                    className="flex-row items-center rounded-xl px-3 py-2 ml-2"
                                >
                                    <Text style={{ color: colors.brandPrimary }} className="font-jakarta-semibold text-sm mr-1">
                                        {i18n.t('client.home.featuredProducts.viewAll')}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={14} color={colors.brandPrimary} />
                                </TouchableOpacity>
                            </View>
                            {loadingProducts ? (
                                <View className="flex-1 justify-center items-center py-8">
                                    <ActivityIndicator size="large" color="#10B981" />
                                    <Text style={{ color: colors.textSecondary }} className="mt-2 font-jakarta-medium">
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
                                            <Text style={{ color: colors.textSecondary }} className="text-xs mt-2 font-jakarta-medium">
                                                Chargement de plus de produits...
                                            </Text>
                                        </View>
                                    )}
                                    {/* Indicateurs de développement */}
                                    {__DEV__ && hasNextPage && !loadingMoreProducts && (
                                        <View className="py-2 items-center">
                                            <Text style={{ color: colors.textTertiary }} className="text-xs font-jakarta-medium">
                                                {featuredProducts.length} produits • Faites défiler pour plus
                                            </Text>
                                        </View>
                                    )}
                                    {__DEV__ && !hasNextPage && featuredProducts.length > 6 && (
                                        <View className="py-2 items-center">
                                            <Text style={{ color: colors.textTertiary }} className="text-xs font-jakarta-medium">
                                                Tous les produits affichés • {featuredProducts.length} au total
                                            </Text>
                                        </View>
                                    )}
                                </>
                            ) : (
                                <View className="flex-1 justify-center items-center py-8">
                                    <Text style={{ color: colors.textSecondary }} className="font-jakarta-medium">
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
                                    <Text style={{ flex: 1, color: colors.textPrimary, fontFamily: 'PlusJakartaSans-Bold', fontSize: 17 }}>
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
                                        style={{ flex: 1, color: colors.textPrimary, fontFamily: 'PlusJakartaSans-Medium', fontSize: 14 }}
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
                                                <Text style={{ flex: 1, color: selected ? '#10B981' : colors.textPrimary, fontFamily: selected ? 'PlusJakartaSans-Bold' : 'PlusJakartaSans-Medium', fontSize: 15 }}>
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
                                    <Text style={{ flex: 1, color: colors.textPrimary, fontFamily: 'PlusJakartaSans-Bold', fontSize: 17 }}>
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
                                        style={{ flex: 1, paddingVertical: 11, color: colors.textPrimary, fontFamily: 'PlusJakartaSans-Medium', fontSize: 14 }}
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
                                                <Text style={{ flex: 1, color: selected ? '#10B981' : colors.textPrimary, fontFamily: selected ? 'PlusJakartaSans-Bold' : 'PlusJakartaSans-Medium', fontSize: 15 }}>
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
