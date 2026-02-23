import ProductService from "@/services/api/ProductService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
    Animated,
    Easing,
    Image,
    Modal,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLocale } from "@/contexts/LocaleContext";
import { useTheme } from "@/contexts/ThemeContext";
import i18n from "@/i18n/i18n";
import { useAuth } from "../../../../contexts/AuthContext";

import { FavoriteItem } from "@/types/product";

export default function FavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locale } = useLocale();
  const { colors, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [productToRemove, setProductToRemove] = useState<string | null>(null);

  // Fonction pour récupérer les produits favoris
  const fetchFavoriteProducts = React.useCallback(async (isRefresh: boolean = false) => {
    if (!isAuthenticated) {
      setFavoriteItems([]);
      setError(null);
      setLoading(false);
      if (isRefresh) setRefreshing(false);
      return;
    }

    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      const response = await ProductService.getFavoriteProducts();

      // Filtrer les favoris qui ont un produit valide (product non null)
      const validFavorites = (response || []).filter(item => item.product !== null && item.product !== undefined);

      setFavoriteItems(validFavorites);
    } catch (err: any) {
      console.error('Erreur lors de la récupération des favoris:', err);
      setError(err.message || 'Erreur lors du chargement des favoris');
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [isAuthenticated]);

  // Fonction pour ouvrir le modal de confirmation
  const handleRemoveFavorite = (productId: string) => {
    setProductToRemove(productId);
    setConfirmModalVisible(true);
  };

  // Fonction pour confirmer la suppression
  const confirmRemoveFavorite = async () => {
    if (!productToRemove) return;

    try {
      await ProductService.removeProductFromFavorites(productToRemove);

      // Mise à jour locale
      setFavoriteItems(prev => prev.filter(item => item.product._id !== productToRemove));

      // Fermer le modal
      setConfirmModalVisible(false);
      setProductToRemove(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      // Vous pouvez ajouter un toast d'erreur ici si vous le souhaitez
      setConfirmModalVisible(false);
      setProductToRemove(null);
    }
  };

  // Fonction pour annuler la suppression
  const cancelRemoveFavorite = () => {
    setConfirmModalVisible(false);
    setProductToRemove(null);
  };

  // Fonction de rafraîchissement
  const onRefresh = () => {
    setRefreshing(true);
    fetchFavoriteProducts(true);
  };

  // Chargement à chaque focus sur la page
  useFocusEffect(
    React.useCallback(() => {
      fetchFavoriteProducts();
    }, [fetchFavoriteProducts])
  );

  // Skeleton Loader Component
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
          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.35)',
          opacity: 0.7,
        }} />
      </View>
    );
  };

  const SkeletonProduct = () => (
    <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-2xl border p-2 mb-3 w-[48%] overflow-hidden">
      <ShimmerBlock style={{ height: 128, borderRadius: 16, width: '100%' }} />
      <View className="p-2">
        <ShimmerBlock style={{ height: 14, borderRadius: 7, width: '80%', marginBottom: 8 }} />
        <ShimmerBlock style={{ height: 16, borderRadius: 8, width: '60%', marginBottom: 8 }} />
        <ShimmerBlock style={{ height: 12, borderRadius: 6, width: '40%' }} />
      </View>
    </View>
  );

  const renderSkeletonFavorites = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
    >
      {/* Header Skeleton */}
      <LinearGradient
        colors={["#047857", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="rounded-b-3xl shadow-md"
        style={{
          paddingTop: insets.top + 16,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
          paddingBottom: 16,
        }}
      >
        <View className="flex-row items-center justify-between mb-4">
          <ShimmerBlock style={{ height: 24, borderRadius: 12, width: "40%" }} />
        </View>
        <View className="flex-row justify-between items-center">
          <ShimmerBlock style={{ height: 32, borderRadius: 16, width: "35%" }} />
        </View>
      </LinearGradient>

      {/* Content Skeleton */}
      <View className="py-4 px-4">
        <View className="flex-row flex-wrap justify-between">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonProduct key={index} />
          ))}
        </View>
      </View>
    </ScrollView>
  );

  // Composant pour afficher un produit favori
  const FavoriteProductCard = ({ favoriteItem }: { favoriteItem: FavoriteItem }) => {
    // Vérification de sécurité supplémentaire
    if (!favoriteItem.product) {
      return null;
    }

    const handleProductPress = () => {
      try {
        const productId = favoriteItem.product._id;
        console.log('🔍 Navigation vers produit client:', productId);
        console.log('🔍 Route complète:', `/(app)/(client)/product/${productId}`);
        
        if (!productId) {
          console.error('❌ ID produit manquant');
          return;
        }
        
        // Utiliser setTimeout pour éviter les problèmes de timing
        setTimeout(() => {
          router.push({
            pathname: `/(app)/(client)/product/[id]`,
            params: { id: productId }
          });
        }, 0);
      } catch (error) {
        console.error('❌ Erreur navigation produit:', error);
      }
    };

    return (
      <TouchableOpacity
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
        className="mx-4 mb-4 rounded-2xl overflow-hidden border"
        onPress={handleProductPress}
      >
        <View className="flex-row p-4">
          {/* Image du produit */}
          <View className="relative">
            <View style={{ backgroundColor: colors.secondary }} className="w-28 h-28 rounded-2xl overflow-hidden">
              {favoriteItem.product.images && favoriteItem.product.images.length > 0 ? (
                <Image
                  source={{ uri: favoriteItem.product.images[0] }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full justify-center items-center">
                  <Ionicons name="image-outline" size={36} color={colors.textSecondary} />
                </View>
              )}
            </View>
          </View>

          {/* Informations du produit */}
          <View className="flex-1 justify-between ml-4">
            <View>
              <Text style={{ color: colors.textPrimary }} className="text-lg font-quicksand-bold" numberOfLines={2}>
                {favoriteItem.product.name}
              </Text>
              {favoriteItem.product.description && (
                <Text style={{ color: colors.textSecondary }} className="text-sm font-quicksand mt-1" numberOfLines={1}>
                  {favoriteItem.product.description}
                </Text>
              )}
            </View>

            {/* Prix et infos */}
            <View className="mt-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-quicksand-bold text-primary">
                  {favoriteItem.product.price.toLocaleString('fr-FR')} FCFA
                </Text>
              </View>
              <Text style={{ color: colors.textSecondary }} className="text-[10px] font-quicksand mt-1">
                {i18n.t("client.favorites.addedDate", {
                  date: new Date(favoriteItem.createdAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })
                })}
              </Text>
            </View>
          </View>

          {/* Bouton supprimer */}
          <TouchableOpacity
            style={{ backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2' }}
            className="ml-2 self-start p-2.5 rounded-xl"
            onPress={(e) => {
              e.stopPropagation();
              handleRemoveFavorite(favoriteItem.product._id);
            }}
          >
            <Ionicons name="heart" size={22} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (!isAuthenticated) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.secondary }}
        className="justify-center items-center p-6"
      >
        <Ionicons name="lock-closed-outline" size={64} color="#10B981" />
        <Text
          style={{ color: colors.textPrimary }}
          className="text-xl font-quicksand-bold mt-4 text-center"
        >
          Connexion requise
        </Text>
        <Text
          style={{ color: colors.textSecondary }}
          className="text-base font-quicksand mt-2 text-center"
        >
          Connectez-vous pour voir et gérer vos favoris.
        </Text>
        <TouchableOpacity
          className="mt-6 bg-primary rounded-2xl px-6 py-3"
          onPress={() => router.push("/(auth)/signin")}
        >
          <Text className="text-white font-quicksand-bold">Se connecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // État de chargement avec skeleton
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.secondary }}>
        {renderSkeletonFavorites()}
      </View>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.secondary }} className="justify-center items-center p-6">
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={{ color: colors.textPrimary }} className="text-xl font-quicksand-bold mt-4 text-center">
          {i18n.t("client.favorites.error.title")}
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-base font-quicksand mt-2 text-center">
          {error}
        </Text>
        <TouchableOpacity
          className="mt-6 bg-primary rounded-2xl px-6 py-3"
          onPress={() => fetchFavoriteProducts()}
        >
          <Text className="text-white font-quicksand-bold">
            {i18n.t("client.favorites.error.retry")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brandPrimary]} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={["#047857", "#10B981"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="rounded-b-3xl shadow-md"
          style={{
            paddingTop: insets.top + 16,
            paddingLeft: insets.left + 24,
            paddingRight: insets.right + 24,
            paddingBottom: 16,
          }}
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-2xl font-quicksand-bold text-white">
              {i18n.t("client.favorites.title")}
            </Text>
          </View>

          {/* Compteur de favoris */}
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center px-4 py-2 rounded-full bg-white/20">
              <Ionicons name="heart" size={16} color="white" style={{ marginRight: 8 }} />
              <Text className="text-white font-quicksand-medium text-sm">
                {i18n.t(favoriteItems.length === 1 ? "client.favorites.counter.one" : "client.favorites.counter.other", { count: favoriteItems.length })}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Contenu principal */}
        {favoriteItems.length === 0 ? (
          <View style={{ flex: 1, backgroundColor: colors.secondary }} className="justify-center items-center py-20 px-6">
            <Ionicons name="heart-outline" size={64} color={colors.textSecondary} />
            <Text style={{ color: colors.textPrimary }} className="text-xl font-quicksand-bold mt-4 text-center">
              {i18n.t("client.favorites.empty.title")}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-base font-quicksand mt-2 text-center">
              {i18n.t("client.favorites.empty.message")}
            </Text>
            <TouchableOpacity className="mt-6 bg-primary rounded-2xl px-6 py-3">
              <Text className="text-white font-quicksand-bold">
                {i18n.t("client.favorites.empty.button")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="pt-4">
            {favoriteItems.map((favoriteItem) => (
              <FavoriteProductCard
                key={favoriteItem._id}
                favoriteItem={favoriteItem}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal de confirmation */}
      <Modal
        visible={confirmModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelRemoveFavorite}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View style={{ backgroundColor: colors.card }} className="rounded-2xl p-6 w-full max-w-sm">
            {/* Icône */}
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-red-100 rounded-full justify-center items-center">
                <Ionicons name="heart-dislike" size={32} color="#EF4444" />
              </View>
            </View>

            {/* Titre */}
            <Text style={{ color: colors.textPrimary }} className="text-xl font-quicksand-bold mb-2 text-center">
              {i18n.t("client.favorites.modal.title")}
            </Text>

            {/* Message */}
            <Text style={{ color: colors.textSecondary }} className="text-base font-quicksand-medium mb-6 text-center">
              {i18n.t("client.favorites.modal.message")}
            </Text>

            {/* Boutons */}
            <View className="flex-row space-x-3">
              <TouchableOpacity
                style={{ backgroundColor: colors.secondary }}
                className="flex-1 rounded-xl py-3"
                onPress={cancelRemoveFavorite}
              >
                <Text style={{ color: colors.textPrimary }} className="font-quicksand-semibold text-center">
                  {i18n.t("client.favorites.modal.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-red-500 rounded-xl py-3"
                onPress={confirmRemoveFavorite}
              >
                <Text className="text-white font-quicksand-semibold text-center">
                  {i18n.t("client.favorites.modal.confirm")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
