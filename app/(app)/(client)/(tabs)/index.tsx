import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { useAuth } from "../../../../contexts/AuthContext";
import { useSearchCache } from "../../../../hooks/useSearchCache";
import ProductService from "../../../../services/api/ProductService";
import SearchService from "../../../../services/api/SearchService";
import SearchCacheService, { RecentSearch } from "../../../../services/SearchCacheService";
import { Product } from "../../../../types/product";

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

const popularStores = [
    {
        id: 1,
        name: "TechStore Cotonou",
        category: "Électronique",
        rating: 4.7,
        image: "https://via.placeholder.com/80x80/3B82F6/FFFFFF?text=TS",
        verified: true,
    },
    {
        id: 2,
        name: "Fashion Plus",
        category: "Mode",
        rating: 4.5,
        image: "https://via.placeholder.com/80x80/EF4444/FFFFFF?text=FP",
        verified: true,
    },
    {
        id: 3,
        name: "Home Decor",
        category: "Maison",
        rating: 4.8,
        image: "https://via.placeholder.com/80x80/10B981/FFFFFF?text=HD",
        verified: false,
    },
];

export default function ClientHome() {
    const { user } = useAuth();
    const router = useRouter();
    const { getCacheStats } = useSearchCache();
    const [selectedCity, setSelectedCity] = useState(beninCities[0].name);
    const [selectedNeighborhood, setSelectedNeighborhood] = useState("");
    const [cityModalVisible, setCityModalVisible] = useState(false);
    const [neighborhoodModalVisible, setNeighborhoodModalVisible] = useState(false);
    const [currentAdIndex, setCurrentAdIndex] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

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

    // État pour les favoris
    const [favorites, setFavorites] = useState<Set<string>>(new Set());

    // Données pour le carrousel d'annonces boostées (amélioré avec images placeholders et styles plus attractifs)
    const boostedAds = [
        {
            id: 1,
            title: "Votre entreprise",
            subtitle: "est visible",
            description: "Augmentez votre visibilité avec nos services",
            type: "main",
            bgColor: "#FE8C00",
            textColor: "#FFFFFF",
            image: "https://via.placeholder.com/300x150/FE8C00/FFFFFF?text=Pub+1"
        },
        {
            id: 2,
            title: "Correcteur de posture",
            subtitle: "Soulage les douleurs dorsales",
            price: "15.000 FCFA",
            badge: "PROMO",
            type: "product",
            bgColor: "#FFFFFF",
            textColor: "#374151",
            image: "https://via.placeholder.com/300x150/FFFFFF/374151?text=Correcteur"
        },
        {
            id: 3,
            title: "Robe d'été",
            subtitle: "Collection été 2025",
            price: "25.000 FCFA",
            badge: "FLASH",
            type: "product",
            bgColor: "#FFFFFF",
            textColor: "#374151",
            image: "https://via.placeholder.com/300x150/FFFFFF/374151?text=Robe"
        },
        {
            id: 4,
            title: "Smartphone Samsung",
            subtitle: "Galaxy A54 - Neuf",
            price: "320.000 FCFA",
            badge: "NOUVEAU",
            type: "product",
            bgColor: "#FFFFFF",
            textColor: "#374151",
            image: "https://via.placeholder.com/300x150/FFFFFF/374151?text=Samsung"
        }
    ];

    useEffect(() => {
        // Réinitialiser le quartier si la ville change
        setSelectedNeighborhood("");
    }, [selectedCity]);

    useEffect(() => {
        loadFeaturedProducts();
        loadRecentSearches();
        loadFavorites();
    }, []);

    const loadFeaturedProducts = async () => {
        try {
            setLoadingProducts(true);
            const response = await ProductService.getPopularProducts(6);
            setFeaturedProducts(response.products);
        } catch (error) {
            console.error('❌ Erreur chargement produits populaires:', error);
        } finally {
            setLoadingProducts(false);
        }
    };

    const loadFavorites = async () => {
        try {
            const favs = await ProductService.getFavoriteProducts();
            setFavorites(new Set(favs.map(f => f.product._id)));
        } catch (error) {
            console.error('❌ Erreur chargement favoris:', error);
        }
    };

    const refreshData = async () => {
        try {
            setRefreshing(true);
            await loadFeaturedProducts();
            await loadFavorites();
        } catch (error) {
            console.error('❌ Erreur refresh:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
    };

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
                sort: 'relevance',
                page: 1,
                limit: 20
            };

            const cachedResults = await SearchCacheService.getCachedSearchResults(searchTerm, searchFilters);

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

            if (response.success) {
                const results = response.data || [];
                const searchInfo = response.searchInfo || null;

                setSearchResults(results);
                setSearchInfo(searchInfo);
                setShowSearchResults(true);

                await SearchCacheService.cacheSearchResults(searchTerm, results, searchInfo, searchFilters);

                await SearchCacheService.addToRecentSearches(searchTerm, results.length);
                await loadRecentSearches();

                console.log(`📊 ${results.length} résultats trouvés pour "${searchTerm}"`);
                console.log(`📍 Dans la zone: ${selectedCity}${selectedNeighborhood ? ` - ${selectedNeighborhood}` : ''}`);

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
            className="bg-white rounded-xl shadow-sm border border-neutral-100 p-2 mb-3 w-[48%]"
            onPress={() => router.push(`/(app)/(client)/product/${item._id}`)}
        >
            <View className="relative">
                <Image
                    source={{ uri: item.images[0] || "https://via.placeholder.com/150x150/CCCCCC/FFFFFF?text=No+Image" }}
                    className="w-full h-32 rounded-t-xl"
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

    const renderStore = (item: any) => (
        <TouchableOpacity 
            key={item.id}
            className="bg-white rounded-xl shadow-sm border border-neutral-100 p-2 mb-3 w-[48%]"
            onPress={() => router.push(`/(app)/(client)/enterprise/${item.id}`)}
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
            className="rounded-2xl overflow-hidden mx-3 shadow-md"
            style={{ backgroundColor: item.bgColor, width: Dimensions.get('window').width - 48 }}
        >
            <Image
                source={{ uri: item.image }}
                className="w-full h-40"
                resizeMode="cover"
            />
            <View className="p-4 absolute bottom-0 left-0 right-0 bg-black/50">
                <Text 
                    className="text-base font-quicksand-bold mb-1"
                    style={{ color: item.textColor }}
                >
                    {item.title}
                </Text>
                <Text 
                    className="text-sm font-quicksand-medium mb-2"
                    style={{ color: item.textColor }}
                >
                    {item.subtitle}
                </Text>
                {item.type === "main" ? (
                    <Text 
                        className="text-xs font-quicksand-medium"
                        style={{ color: item.textColor + '90' }}
                    >
                        {item.description}
                    </Text>
                ) : (
                    <>
                        <Text 
                            className="text-sm font-quicksand-bold mb-1"
                            style={{ color: item.textColor }}
                        >
                            {item.price}
                        </Text>
                        <View className="bg-primary-500 rounded-full px-2 py-1 self-start">
                            <Text className="text-white text-xs font-quicksand-bold">
                                {item.badge}
                            </Text>
                        </View>
                    </>
                )}
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
                {/* Header with Location */}
                <View className="bg-primary py-6 pt-16">
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
                    <View className="px-4">
                        <View className="bg-white rounded-xl shadow-md">
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
                    <View className="bg-white px-4 py-4 border-b border-neutral-100">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-lg font-quicksand-bold text-neutral-800">
                                Résultats pour "{searchQuery}"
                            </Text>
                            {searchInfo && (
                                <View className="flex-row items-center">
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
                        </View>
                        {loadingSearch ? (
                            <ActivityIndicator size="large" color="#FE8C00" />
                        ) : searchResults.length > 0 ? (
                            <View className="flex-row flex-wrap justify-between">
                                {searchResults.map(renderProduct)}
                            </View>
                        ) : (
                            <Text className="text-neutral-600 font-quicksand-medium">
                                Aucun produit trouvé
                            </Text>
                        )}
                    </View>
                )}

                {/* Categories */}
                <View className="py-4">
                    <FlatList
                        data={categories}
                        renderItem={({ item }) => (
                            <TouchableOpacity className="items-center mx-2">
                                <View className="w-16 h-16 rounded-full justify-center items-center mb-2" style={{ backgroundColor: item.color + '20' }}>
                                    <Ionicons name={item.icon} size={28} color={item.color} />
                                </View>
                                <Text className="text-xs font-quicksand-medium text-neutral-700 text-center" numberOfLines={2}>
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
                        data={boostedAds}
                        renderItem={renderAd}
                        keyExtractor={(item) => item.id.toString()}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(event) => {
                            const newIndex = Math.round(event.nativeEvent.contentOffset.x / (Dimensions.get('window').width - 48));
                            setCurrentAdIndex(newIndex);
                        }}
                        contentContainerStyle={{ paddingHorizontal: 16 }}
                    />
                    {/* Indicators */}
                    <View className="flex-row justify-center mt-3">
                        {boostedAds.map((_, index) => (
                            <View
                                key={index}
                                className={`w-2 h-2 rounded-full mx-1 ${index === currentAdIndex ? "bg-primary-500" : "bg-neutral-300"}`}
                            />
                        ))}
                    </View>
                </View>

                {/* Featured Products (changé en vertical avec 2 colonnes) */}
                <View className="py-4 px-4">
                    <View className="mb-4 flex-row justify-between items-center">
                        <Text className="text-base font-quicksand-bold text-neutral-800">
                            Produits populaires
                        </Text>
                        <TouchableOpacity>
                            <Text className="text-primary-500 text-sm font-quicksand-medium">
                                Voir tout
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {loadingProducts ? (
                        <View className="flex-1 justify-center items-center py-8">
                            <ActivityIndicator size="large" color="#FE8C00" />
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