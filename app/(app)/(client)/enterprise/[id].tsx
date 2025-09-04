import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Linking,
    RefreshControl,
    SafeAreaView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import EnterpriseService, { Enterprise } from "../../../../services/api/EnterpriseService";
import { Product } from "../../../../types/product";

const { width: screenWidth } = Dimensions.get('window');
export default function EnterpriseDetails() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const navigation = useNavigation();
    const [enterprise, setEnterprise] = useState<Enterprise | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 12,
        total: 0,
        pages: 0
    });

    useLayoutEffect(() => {
        navigation.setOptions({
            headerShown: false,
        });
    }, [navigation]);

    useEffect(() => {
        if (id) {
            loadEnterpriseData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadEnterpriseData = async () => {
        try {
            setLoading(true);

            console.log('🔄 Chargement données entreprise:', id);

            const [enterpriseData, productsData] = await Promise.all([
                EnterpriseService.getPublicEnterpriseById(id!),
                EnterpriseService.getEnterpriseProducts(id!, 1, 12)
            ]);

            console.log('📊 Enterprise data received:', enterpriseData);
            console.log('📦 Products data received:', productsData);

            setEnterprise(enterpriseData);
            setProducts(productsData.products || []);
            setPagination(productsData.pagination || {
                page: 1,
                limit: 12,
                total: 0,
                pages: 0
            });

            console.log("✅ Données entreprise chargées:", enterpriseData.companyName);
            console.log("✅ Produits chargés:", (productsData.products || []).length);
        } catch (error) {
            console.error('❌ Erreur chargement entreprise:', error);
            Alert.alert('Erreur', 'Impossible de charger les informations de l\'entreprise');
        } finally {
            setLoading(false);
        }
    };

    const loadMoreProducts = async () => {
        if (loadingProducts || pagination.page >= pagination.pages) return;

        try {
            setLoadingProducts(true);
            const nextPage = pagination.page + 1;
            const productsData = await EnterpriseService.getEnterpriseProducts(id!, nextPage, 12);

            setProducts(prev => [...prev, ...(productsData.products || [])]);
            setPagination(productsData.pagination || pagination);
        } catch (error) {
            console.error('❌ Erreur chargement produits supplémentaires:', error);
        } finally {
            setLoadingProducts(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadEnterpriseData();
        setRefreshing(false);
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
    };

    const openWhatsApp = (phone: string) => {
        const message = `Bonjour ! Je découvre votre entreprise "${enterprise?.companyName}" sur NativeCommerce. Pouvez-vous me donner plus d'informations sur vos produits ? Merci !`;
        const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;

        Linking.canOpenURL(whatsappUrl)
            .then((supported) => {
                if (supported) {
                    return Linking.openURL(whatsappUrl);
                } else {
                    Alert.alert('WhatsApp non disponible', 'WhatsApp n\'est pas installé sur votre appareil.');
                }
            })
            .catch(() => {
                Alert.alert('Erreur', 'Impossible d\'ouvrir WhatsApp');
            });
    };

    const makePhoneCall = (phone: string) => {
        const phoneUrl = `tel:${phone}`;
        Linking.canOpenURL(phoneUrl)
            .then((supported) => {
                if (supported) {
                    return Linking.openURL(phoneUrl);
                } else {
                    Alert.alert('Erreur', 'Impossible de passer l\'appel');
                }
            })
            .catch(() => {
                Alert.alert('Erreur', 'Impossible de passer l\'appel');
            });
    };

    const openWebsite = (website: string) => {
        let url = website;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `https://${url}`;
        }

        Linking.canOpenURL(url)
            .then((supported) => {
                if (supported) {
                    return Linking.openURL(url);
                } else {
                    Alert.alert('Erreur', 'Impossible d\'ouvrir le site web');
                }
            })
            .catch(() => {
                Alert.alert('Erreur', 'Impossible d\'ouvrir le site web');
            });
    };

    // Composant pour une carte de produit
    const ProductCard = ({ product }: { product: Product }) => (
        <TouchableOpacity
            className="bg-white rounded-2xl shadow-sm border border-neutral-100 mb-3"
            style={{ width: (screenWidth - 48) / 2 }}
            onPress={() => {
                router.push(`/(app)/(enterprise)/(tabs)/product/${product._id}`);
            }}
        >
            <View className="relative">
                <Image
                    source={{
                        uri: product.images[0] || "https://via.placeholder.com/160x120/CCCCCC/FFFFFF?text=No+Image"
                    }}
                    className="w-full h-28 rounded-t-2xl"
                    resizeMode="cover"
                />
                {product.stock <= 5 && product.stock > 0 && (
                    <View className="absolute top-2 right-2 bg-warning-500 rounded-full px-2 py-1">
                        <Text className="text-white text-xs font-quicksand-bold">
                            {product.stock} restants
                        </Text>
                    </View>
                )}
            </View>

            <View className="p-3">
                <Text numberOfLines={2} className="text-sm font-quicksand-semibold text-neutral-800 mb-2 h-10">
                    {product.name}
                </Text>

                <Text className="text-base font-quicksand-bold text-primary-600 mb-2">
                    {formatPrice(product.price)}
                </Text>

                {product.stats && (
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                            <Ionicons name="star" size={12} color="#FFD700" />
                            <Text className="text-xs text-neutral-600 ml-1">
                                {product.stats.averageRating?.toFixed(1) || '0.0'}
                            </Text>
                        </View>
                        <Text className="text-xs text-neutral-400">
                            {product.stats.totalSales || 0} vendus
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-white">
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#FE8C00" />
                    <Text className="mt-4 text-neutral-600 font-quicksand-medium">
                        Chargement de l&apos;entreprise...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!enterprise) {
        return (
            <SafeAreaView className="flex-1 bg-white">
                <View className="flex-1 justify-center items-center">
                    <Ionicons name="business-outline" size={64} color="#EF4444" />
                    <Text className="mt-4 text-xl font-quicksand-bold text-neutral-800">
                        Entreprise introuvable
                    </Text>
                    <Text className="mt-2 text-neutral-600 font-quicksand-medium text-center px-6">
                        L&apos;entreprise que vous recherchez n&apos;existe pas ou n&apos;est plus active.
                    </Text>
                    <TouchableOpacity
                        className="mt-6 bg-primary-500 rounded-2xl px-6 py-3"
                        onPress={() => router.back()}
                    >
                        <Text className="text-white font-quicksand-semibold">Retour</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-neutral-50">
            {/* Header */}
            <View className="flex-row items-center justify-between px-6 py-4 pt-16 bg-white">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-10 h-10 bg-neutral-100 rounded-full justify-center items-center"
                >
                    <Ionicons name="chevron-back" size={20} color="#374151" />
                </TouchableOpacity>
                <Text className="text-lg font-quicksand-bold text-neutral-800">
                    {enterprise.companyName}
                </Text>
                <TouchableOpacity className="w-10 h-10 bg-neutral-100 rounded-full justify-center items-center">
                    <Ionicons name="heart-outline" size={20} color="#374151" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={products}
                renderItem={({ item }) => <ProductCard product={item} />}
                keyExtractor={(item) => item._id}
                numColumns={2}
                columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#FE8C00']}
                        tintColor="#FE8C00"
                    />
                }
                onEndReached={loadMoreProducts}
                onEndReachedThreshold={0.5}
                ListHeaderComponent={
                    <View>
                        {/* Informations de l'entreprise */}
                        <View className="bg-white mx-4 rounded-2xl shadow-sm border border-neutral-100 mb-6">
                            {/* Logo et infos principales */}
                            <View className="p-6">
                                <View className="flex-row items-center mb-4">
                                    {enterprise.logo ? (
                                        <Image
                                            source={{ uri: enterprise.logo }}
                                            className="w-20 h-20 rounded-2xl"
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View className="w-20 h-20 bg-primary-100 rounded-2xl justify-center items-center">
                                            <Ionicons name="business" size={32} color="#FE8C00" />
                                        </View>
                                    )}

                                    <View className="ml-4 flex-1">
                                        <Text className="text-xl font-quicksand-bold text-neutral-800 mb-1">
                                            {enterprise.companyName}
                                        </Text>
                                        <View className="flex-row items-center mb-2">
                                            <Ionicons name="location" size={14} color="#9CA3AF" />
                                            <Text className="text-sm text-neutral-600 ml-1">
                                                {enterprise.location.city}, {enterprise.location.district}
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center">
                                            <View className="w-2 h-2 bg-success-500 rounded-full mr-2" />
                                            <Text className="text-sm text-success-600 font-quicksand-medium">
                                                Entreprise active
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Description */}
                                {enterprise.description && (
                                    <View className="mb-4">
                                        <Text className="text-neutral-700 font-quicksand-medium leading-5">
                                            {enterprise.description}
                                        </Text>
                                    </View>
                                )}

                                {/* Statistiques */}
                                <View className="flex-row justify-between mb-4">
                                    <View className="flex-1 bg-neutral-50 rounded-xl p-3 mr-2">
                                        <View className="flex-row items-center mb-1">
                                            <Ionicons name="star" size={16} color="#FE8C00" />
                                            <Text className="text-base font-quicksand-bold text-neutral-800 ml-1">
                                                {enterprise.stats.averageRating?.toFixed(1) || '0.0'}
                                            </Text>
                                        </View>
                                        <Text className="text-xs text-neutral-600">
                                            {enterprise.stats.totalReviews || 0} avis
                                        </Text>
                                    </View>

                                    <View className="flex-1 bg-neutral-50 rounded-xl p-3 mx-1">
                                        <View className="flex-row items-center mb-1">
                                            <Ionicons name="cube" size={16} color="#10B981" />
                                            <Text className="text-base font-quicksand-bold text-neutral-800 ml-1">
                                                {(enterprise as any).totalActiveProducts || products.length}
                                            </Text>
                                        </View>
                                        <Text className="text-xs text-neutral-600">
                                            produits
                                        </Text>
                                    </View>

                                    <View className="flex-1 bg-neutral-50 rounded-xl p-3 ml-2">
                                        <View className="flex-row items-center mb-1">
                                            <Ionicons name="people" size={16} color="#8B5CF6" />
                                            <Text className="text-base font-quicksand-bold text-neutral-800 ml-1">
                                                {enterprise.stats.totalOrders || 0}
                                            </Text>
                                        </View>
                                        <Text className="text-xs text-neutral-600">
                                            commandes
                                        </Text>
                                    </View>
                                </View>

                                {/* Actions de contact */}
                                <View>
                                    <Text className="text-sm font-quicksand-semibold text-neutral-800 mb-3">
                                        Contacter l&apos;entreprise
                                    </Text>
                                    <View className="flex-row flex-wrap">
                                        {enterprise.contactInfo.phone && (
                                            <>
                                                <TouchableOpacity
                                                    onPress={() => openWhatsApp(enterprise.contactInfo.phone)}
                                                    className="flex-row items-center bg-success-100 rounded-xl px-3 py-2 mr-2 mb-2"
                                                >
                                                    <Ionicons name="logo-whatsapp" size={16} color="#10B981" />
                                                    <Text className="ml-2 text-success-700 font-quicksand-medium text-sm">
                                                        WhatsApp
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => makePhoneCall(enterprise.contactInfo.phone)}
                                                    className="flex-row items-center bg-primary-100 rounded-xl px-3 py-2 mr-2 mb-2"
                                                >
                                                    <Ionicons name="call" size={16} color="#FE8C00" />
                                                    <Text className="ml-2 text-primary-700 font-quicksand-medium text-sm">
                                                        Appeler
                                                    </Text>
                                                </TouchableOpacity>
                                            </>
                                        )}

                                        {enterprise.contactInfo.website && (
                                            <TouchableOpacity
                                                onPress={() => openWebsite(enterprise.contactInfo.website!)}
                                                className="flex-row items-center bg-blue-100 rounded-xl px-3 py-2 mr-2 mb-2"
                                            >
                                                <Ionicons name="globe" size={16} color="#3B82F6" />
                                                <Text className="ml-2 text-blue-700 font-quicksand-medium text-sm">
                                                    Site web
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Header produits */}
                        <View className="px-4 mb-4">
                            <View className="flex-row items-center justify-between">
                                <Text className="text-lg font-quicksand-bold text-neutral-800">
                                    Produits de l&apos;entreprise
                                </Text>
                                <Text className="text-sm text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">
                                    {pagination.total} produits
                                </Text>
                            </View>
                        </View>
                    </View>
                }
                ListFooterComponent={
                    loadingProducts ? (
                        <View className="py-4 items-center">
                            <ActivityIndicator size="small" color="#FE8C00" />
                            <Text className="mt-2 text-neutral-600 font-quicksand-medium text-sm">
                                Chargement...
                            </Text>
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    !loading ? (
                        <View className="flex-1 justify-center items-center py-20">
                            <Ionicons name="cube-outline" size={64} color="#9CA3AF" />
                            <Text className="mt-4 text-lg font-quicksand-bold text-neutral-600">
                                Aucun produit disponible
                            </Text>
                            <Text className="mt-2 text-neutral-500 font-quicksand-medium text-center px-6">
                                Cette entreprise n&apos;a pas encore de produits en ligne.
                            </Text>
                        </View>
                    ) : null
                }
                contentContainerStyle={{ paddingBottom: 20, paddingTop: 20 }}
            />
        </SafeAreaView>
    );
}