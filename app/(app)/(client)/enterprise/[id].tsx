import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Image,
    Linking,
    Modal,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import i18n from "../../../../i18n/i18n";
import { useTheme } from "../../../../contexts/ThemeContext";
import EnterpriseService, { Enterprise } from "../../../../services/api/EnterpriseService";
import { Product } from "../../../../types/product";

const { width: screenWidth } = Dimensions.get('window');
export default function EnterpriseDetails() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
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
    const [imageRefreshKey, setImageRefreshKey] = useState(0); // Clé pour forcer le rechargement des images

    // États pour les modals d'erreur
    const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; message: string }>({
        visible: false,
        title: '',
        message: ''
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

    // Forcer le rechargement des images quand on revient sur la page
    useFocusEffect(
        useCallback(() => {
            // Incrémenter la clé pour forcer le rechargement des images
            setImageRefreshKey(prev => prev + 1);
        }, [])
    );

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
            setErrorModal({
                visible: true,
                title: 'Erreur',
                message: i18n.t("client.enterprise.error.loading")
            });
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
        const message = i18n.t("client.enterprise.whatsapp.message", {
            companyName: enterprise?.companyName
        });
        const whatsappUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;

        Linking.canOpenURL(whatsappUrl)
            .then((supported) => {
                if (supported) {
                    return Linking.openURL(whatsappUrl);
                } else {
                    setErrorModal({
                        visible: true,
                        title: i18n.t("client.enterprise.error.whatsappNotAvailable"),
                        message: i18n.t("client.enterprise.error.whatsappNotAvailableMessage")
                    });
                }
            })
            .catch(() => {
                setErrorModal({
                    visible: true,
                    title: 'Erreur',
                    message: i18n.t("client.enterprise.error.whatsappError")
                });
            });
    };

    const makePhoneCall = (phone: string) => {
        const phoneUrl = `tel:${phone}`;
        Linking.canOpenURL(phoneUrl)
            .then((supported) => {
                if (supported) {
                    return Linking.openURL(phoneUrl);
                } else {
                    setErrorModal({
                        visible: true,
                        title: 'Erreur',
                        message: i18n.t("client.enterprise.error.callError")
                    });
                }
            })
            .catch(() => {
                setErrorModal({
                    visible: true,
                    title: 'Erreur',
                    message: i18n.t("client.enterprise.error.callError")
                });
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
                    setErrorModal({
                        visible: true,
                        title: 'Erreur',
                        message: i18n.t("client.enterprise.error.websiteError")
                    });
                }
            })
            .catch(() => {
                setErrorModal({
                    visible: true,
                    title: 'Erreur',
                    message: i18n.t("client.enterprise.error.websiteError")
                });
            });
    };

    // Composant pour une carte de produit
    const ProductCard = ({ product }: { product: Product }) => (
        <TouchableOpacity
            className="rounded-2xl shadow-sm mb-3"
            style={{
                width: (screenWidth - 48) / 2,
                backgroundColor: colors.card || colors.background,
                borderColor: colors.border,
                borderWidth: 1
            }}
            onPress={() => {
                router.push(`/(app)/(enterprise)/product/${product._id}`);
            }}
        >
            <View className="relative">
                <Image
                    key={`product-image-${product._id}-${imageRefreshKey}`}
                    source={{
                        uri: product.images[0] || "https://via.placeholder.com/160x120/CCCCCC/FFFFFF?text=No+Image"
                    }}
                    className="w-full h-28 rounded-t-2xl"
                    resizeMode="cover"
                />
                {product.stock <= 5 && product.stock > 0 && (
                    <View className="absolute top-2 right-2 bg-warning-500 rounded-full px-2 py-1">
                        <Text className="text-white text-xs font-quicksand-bold">
                            {i18n.t("client.enterprise.stock.remaining", { count: product.stock })}
                        </Text>
                    </View>
                )}
            </View>

            <View className="p-3">
                <Text numberOfLines={2} className="text-sm font-quicksand-semibold mb-2 h-10" style={{color: colors.text}}>
                    {product.name}
                </Text>

                <Text className="text-base font-quicksand-bold mb-2" style={{color: '#FE8C00'}}>
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
                            {i18n.t("client.enterprise.stats.sold", { count: product.stats?.totalSales || 0 })}
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    // Skeleton Loader Components
    const ShimmerBlock = ({ style }: { style?: any }) => {
        const shimmer = React.useRef(new Animated.Value(0)).current;
        React.useEffect(() => {
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
            <View style={[{ backgroundColor: isDark ? '#374151' : '#E5E7EB', overflow: 'hidden' }, style]}>
                <Animated.View style={{
                    position: 'absolute', top: 0, bottom: 0, width: 120,
                    transform: [{ translateX }],
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.35)',
                    opacity: 0.7,
                }} />
            </View>
        );
    };

    const SkeletonProductCard = () => (
        <View className="rounded-2xl shadow-sm mb-3 overflow-hidden" style={{
            width: (screenWidth - 48) / 2,
            backgroundColor: colors.card || colors.background,
            borderColor: colors.border,
            borderWidth: 1
        }}>
            <ShimmerBlock style={{ height: 112, borderRadius: 16, width: '100%' }} />
            <View className="p-3">
                <ShimmerBlock style={{ height: 14, borderRadius: 7, width: '85%', marginBottom: 8 }} />
                <ShimmerBlock style={{ height: 16, borderRadius: 8, width: '60%', marginBottom: 8 }} />
                <View className="flex-row items-center justify-between">
                    <ShimmerBlock style={{ height: 12, borderRadius: 6, width: '30%' }} />
                    <ShimmerBlock style={{ height: 12, borderRadius: 6, width: '25%' }} />
                </View>
            </View>
        </View>
    );

    const SkeletonEnterpriseInfo = () => (
        <View className="mx-4 rounded-2xl shadow-sm mb-6" style={{
            backgroundColor: colors.card || colors.background,
            borderColor: colors.border,
            borderWidth: 1
        }}>
            <View className="p-6">
                <View className="flex-row items-center mb-4">
                    <ShimmerBlock style={{ width: 80, height: 80, borderRadius: 16 }} />
                    <View className="ml-4 flex-1">
                        <ShimmerBlock style={{ height: 20, borderRadius: 10, width: '70%', marginBottom: 8 }} />
                        <ShimmerBlock style={{ height: 14, borderRadius: 7, width: '50%', marginBottom: 4 }} />
                        <ShimmerBlock style={{ height: 12, borderRadius: 6, width: '40%' }} />
                    </View>
                </View>
                <ShimmerBlock style={{ height: 14, borderRadius: 7, width: '90%', marginBottom: 6 }} />
                <ShimmerBlock style={{ height: 14, borderRadius: 7, width: '75%', marginBottom: 16 }} />
                <View className="flex-row justify-between mb-4">
                    <View className="flex-1 rounded-xl p-3 mr-2" style={{backgroundColor: isDark ? colors.surface || '#1f2937' : '#f9fafb'}}>
                        <ShimmerBlock style={{ height: 16, borderRadius: 8, width: '60%', marginBottom: 4 }} />
                        <ShimmerBlock style={{ height: 12, borderRadius: 6, width: '40%' }} />
                    </View>
                    <View className="flex-1 rounded-xl p-3 mx-1" style={{backgroundColor: isDark ? colors.surface || '#1f2937' : '#f9fafb'}}>
                        <ShimmerBlock style={{ height: 16, borderRadius: 8, width: '50%', marginBottom: 4 }} />
                        <ShimmerBlock style={{ height: 12, borderRadius: 6, width: '35%' }} />
                    </View>
                    <View className="flex-1 rounded-xl p-3 ml-2" style={{backgroundColor: isDark ? colors.surface || '#1f2937' : '#f9fafb'}}>
                        <ShimmerBlock style={{ height: 16, borderRadius: 8, width: '55%', marginBottom: 4 }} />
                        <ShimmerBlock style={{ height: 12, borderRadius: 6, width: '45%' }} />
                    </View>
                </View>
                <ShimmerBlock style={{ height: 14, borderRadius: 7, width: '50%', marginBottom: 12 }} />
                <View className="flex-row flex-wrap">
                    <ShimmerBlock style={{ height: 32, borderRadius: 16, width: 80, marginRight: 8, marginBottom: 8 }} />
                    <ShimmerBlock style={{ height: 32, borderRadius: 16, width: 90, marginRight: 8, marginBottom: 8 }} />
                    <ShimmerBlock style={{ height: 32, borderRadius: 16, width: 70, marginRight: 8, marginBottom: 8 }} />
                </View>
            </View>
        </View>
    );

    const renderSkeletonEnterprise = () => (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
            <ExpoStatusBar style="light" translucent />
            {/* Header Skeleton */}
            <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="pb-6 rounded-b-3xl shadow-md" style={{ paddingTop: insets.top + 16, paddingBottom: 16 }}>
                <View className="px-6">
                    <View className="flex-row items-center justify-between">
                        <ShimmerBlock style={{ width: 40, height: 40, borderRadius: 20 }} />
                        <ShimmerBlock style={{ height: 20, borderRadius: 10, width: '50%' }} />
                        <ShimmerBlock style={{ width: 40, height: 40, borderRadius: 20 }} />
                    </View>
                </View>
            </LinearGradient>

            <FlatList
                data={[1, 2, 3, 4, 5, 6]} // 6 éléments de skeleton
                renderItem={() => <SkeletonProductCard />}
                keyExtractor={(item) => `skeleton-${item}`}
                numColumns={2}
                columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View>
                        <SkeletonEnterpriseInfo />
                        <View className="px-4 mb-4">
                            <View className="flex-row items-center justify-between">
                                <ShimmerBlock style={{ height: 18, borderRadius: 9, width: '50%' }} />
                                <ShimmerBlock style={{ height: 16, borderRadius: 8, width: '20%' }} />
                            </View>
                        </View>
                    </View>
                }
                contentContainerStyle={{ paddingBottom: 20, paddingTop: 20 }}
            />
        </View>
    );

    if (loading) {
        return renderSkeletonEnterprise();
    }

    if (!enterprise) {
        return (
            <View className="flex-1" style={{backgroundColor: colors.background}}>
                <View className="flex-1 justify-center items-center">
                    <Ionicons name="business-outline" size={64} color="#EF4444" />
                    <Text className="mt-4 text-xl font-quicksand-bold" style={{color: colors.text}}>
                        {i18n.t("client.enterprise.error.notFound")}
                    </Text>
                    <Text className="mt-2 font-quicksand-medium text-center px-6" style={{color: colors.textSecondary}}>
                        {i18n.t("client.enterprise.error.notFoundMessage")}
                    </Text>
                    <TouchableOpacity
                        className="mt-6 bg-primary-500 rounded-2xl px-6 py-3"
                        onPress={() => router.back()}
                    >
                        <Text className="text-white font-quicksand-semibold">{i18n.t("client.enterprise.error.back")}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View className="flex-1" style={{ backgroundColor: colors.background }}>
            <ExpoStatusBar style="light" translucent />
            {/* Header vert */}
            <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="pb-6 rounded-b-3xl shadow-md" style={{ paddingTop: insets.top + 16, paddingBottom: 16 }}>
                <View className="px-6">
                    <View className="flex-row items-center justify-between">
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="w-10 h-10 bg-white/20 rounded-full justify-center items-center"
                        >
                            <Ionicons name="chevron-back" size={20} color="white" />
                        </TouchableOpacity>
                        <View className="flex-1 mx-4">
                            <Text className="text-lg font-quicksand-bold text-white text-center">
                                {enterprise.companyName}
                            </Text>
                        </View>
                        <TouchableOpacity className="w-10 h-10 bg-white/20 rounded-full justify-center items-center">
                            <Ionicons name="heart-outline" size={20} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>

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
                        <View className="mx-4 rounded-2xl shadow-sm mb-6" style={{
                            backgroundColor: colors.card || colors.background,
                            borderColor: colors.border,
                            borderWidth: 1
                        }}>
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
                                        <Text className="text-xl font-quicksand-bold mb-1" style={{color: colors.text}}>
                                            {enterprise.companyName}
                                        </Text>
                                        <View className="flex-row items-center mb-2">
                                            <Ionicons name="location" size={14} color={colors.textSecondary} />
                                            <Text className="text-sm ml-1" style={{color: colors.textSecondary}}>
                                                {enterprise.location.city}, {enterprise.location.district}
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center">
                                            <View className="w-2 h-2 bg-success-500 rounded-full mr-2" />
                                            <Text className="text-sm text-success-600 font-quicksand-medium">
                                                {i18n.t("client.enterprise.status.active")}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Description */}
                                {enterprise.description && (
                                    <View className="mb-4">
                                        <Text className="font-quicksand-medium leading-5" style={{color: colors.textSecondary}}>
                                            {enterprise.description}
                                        </Text>
                                    </View>
                                )}

                                {/* Statistiques */}
                                <View className="flex-row justify-between mb-6">
                                    <View className="flex-1 rounded-xl p-4 mr-2" style={{
                                        backgroundColor: isDark ? colors.surface || '#1f2937' : '#f9fafb',
                                        borderColor: colors.border,
                                        borderWidth: 1
                                    }}>
                                        <View className="flex-row items-center mb-2">
                                            <View className="w-8 h-8 bg-amber-100 rounded-full justify-center items-center mr-2">
                                                <Ionicons name="star" size={14} color="#F59E0B" />
                                            </View>
                                            <Text className="text-lg font-quicksand-bold" style={{color: colors.text}}>
                                                {enterprise.stats.averageRating?.toFixed(1) || '0.0'}
                                            </Text>
                                        </View>
                                        <Text className="text-xs font-quicksand-medium" style={{color: colors.textSecondary}}>
                                            {i18n.t("client.enterprise.stats.reviews", { count: enterprise.stats.totalReviews || 0 })}
                                        </Text>
                                    </View>

                                    <View className="flex-1 rounded-xl p-4 mx-1" style={{
                                        backgroundColor: isDark ? colors.surface || '#1f2937' : '#f9fafb',
                                        borderColor: colors.border,
                                        borderWidth: 1
                                    }}>
                                        <View className="flex-row items-center mb-2">
                                            <View className="w-8 h-8 bg-emerald-100 rounded-full justify-center items-center mr-2">
                                                <Ionicons name="cube" size={14} color="#10B981" />
                                            </View>
                                            <Text className="text-lg font-quicksand-bold" style={{color: colors.text}}>
                                                {(enterprise as any).totalActiveProducts || products.length}
                                            </Text>
                                        </View>
                                        <Text className="text-xs font-quicksand-medium" style={{color: colors.textSecondary}}>
                                            {i18n.t("client.enterprise.stats.products")}
                                        </Text>
                                    </View>


                                </View>

                                {/* Actions de contact */}
                                <View className="mt-2">
                                    <Text className="text-sm font-quicksand-semibold mb-4" style={{color: colors.text}}>
                                        {i18n.t("client.enterprise.contact.title")}
                                    </Text>
                                    <View className="flex-row flex-wrap gap-3">
                                        {enterprise.contactInfo.phone && (
                                            <>
                                                <TouchableOpacity
                                                    onPress={() => openWhatsApp(enterprise.contactInfo.phone)}
                                                    className="flex-row items-center bg-gradient-to-r from-green-50 to-green-100 rounded-2xl px-4 py-3 border border-green-200 shadow-sm"
                                                    activeOpacity={0.8}
                                                >
                                                    <View className="w-8 h-8 bg-green-500 rounded-full justify-center items-center mr-3">
                                                        <Ionicons name="logo-whatsapp" size={16} color="white" />
                                                    </View>
                                                    <Text className="text-green-700 font-quicksand-semibold text-sm">
                                                        {i18n.t("client.enterprise.contact.whatsapp")}
                                                    </Text>
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    onPress={() => makePhoneCall(enterprise.contactInfo.phone)}
                                                    className="flex-row items-center bg-gradient-to-r from-orange-50 to-orange-100 rounded-2xl px-4 py-3 border border-orange-200 shadow-sm"
                                                    activeOpacity={0.8}
                                                >
                                                    <View className="w-8 h-8 bg-orange-500 rounded-full justify-center items-center mr-3">
                                                        <Ionicons name="call" size={16} color="white" />
                                                    </View>
                                                    <Text className="text-orange-700 font-quicksand-semibold text-sm">
                                                        {i18n.t("client.enterprise.contact.call")}
                                                    </Text>
                                                </TouchableOpacity>
                                            </>
                                        )}

                                        {enterprise.contactInfo.website && (
                                            <TouchableOpacity
                                                onPress={() => openWebsite(enterprise.contactInfo.website!)}
                                                className="flex-row items-center bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl px-4 py-3 border border-blue-200 shadow-sm"
                                                activeOpacity={0.8}
                                            >
                                                <View className="w-8 h-8 bg-blue-500 rounded-full justify-center items-center mr-3">
                                                    <Ionicons name="globe" size={16} color="white" />
                                                </View>
                                                <Text className="text-blue-700 font-quicksand-semibold text-sm">
                                                    {i18n.t("client.enterprise.contact.website")}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </View>



                    </View>
                }
                ListFooterComponent={
                    loadingProducts ? (
                        <View className="py-4 items-center">
                            <ActivityIndicator size="small" color="#FE8C00" />
                            <Text className="mt-2 font-quicksand-medium text-sm" style={{color: colors.textSecondary}}>
                                {i18n.t("client.enterprise.loading")}
                            </Text>
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    !loading ? (
                        <View className="flex-1 justify-center items-center py-20">
                            <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
                            <Text className="mt-4 text-lg font-quicksand-bold" style={{color: colors.textSecondary}}>
                                {i18n.t("client.enterprise.empty.title")}
                            </Text>
                            <Text className="mt-2 font-quicksand-medium text-center px-6" style={{color: colors.textSecondary}}>
                                {i18n.t("client.enterprise.empty.message")}
                            </Text>
                        </View>
                    ) : null
                }
                contentContainerStyle={{ paddingBottom: 20, paddingTop: 20 }}
            />

            {/* Modal d'erreur */}
            <Modal
                visible={errorModal.visible}
                transparent
                animationType="fade"
                onRequestClose={() => setErrorModal({ visible: false, title: '', message: '' })}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setErrorModal({ visible: false, title: '', message: '' })}
                    className="flex-1 bg-black/50 justify-center items-center px-6"
                >
                    <TouchableOpacity activeOpacity={1} className="rounded-3xl p-6 w-full max-w-sm" style={{backgroundColor: colors.card || colors.background}}>
                        {/* Icon d'erreur */}
                        <View className="items-center mb-4">
                            <View className="w-16 h-16 bg-red-100 rounded-full justify-center items-center">
                                <Ionicons name="alert-circle" size={32} color="#EF4444" />
                            </View>
                        </View>

                        {/* Titre */}
                        <Text className="text-xl font-quicksand-bold text-center mb-2" style={{color: colors.text}}>
                            {errorModal.title}
                        </Text>

                        {/* Message */}
                        <Text className="text-base font-quicksand-medium text-center mb-6" style={{color: colors.textSecondary}}>
                            {errorModal.message}
                        </Text>

                        {/* Bouton OK */}
                        <TouchableOpacity
                            onPress={() => setErrorModal({ visible: false, title: '', message: '' })}
                            className="bg-primary-500 py-3 rounded-xl"
                            activeOpacity={0.7}
                        >
                            <Text className="text-white font-quicksand-bold text-center">
                                {i18n.t("client.enterprise.error.modalOk")}
                            </Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}