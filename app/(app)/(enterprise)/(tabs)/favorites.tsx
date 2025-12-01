import ProductService from "@/services/api/ProductService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLocale } from "@/contexts/LocaleContext";
import i18n from "@/i18n/i18n";
import { FavoriteItem } from "@/types/product";
import { useTheme } from "../../../../contexts/ThemeContext";

export default function EnterpriseFavoritesScreen() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { locale } = useLocale(); // Écoute les changements de langue pour re-render automatiquement
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // États pour les modals
  const [deleteModal, setDeleteModal] = useState<{
    visible: boolean;
    productId: string | null;
  }>({
    visible: false,
    productId: null,
  });
  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    message: string;
  }>({
    visible: false,
    message: "",
  });

  // Fonction pour récupérer les produits favoris
  const fetchFavoriteProducts = async (isRefresh: boolean = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      const response = await ProductService.getFavoriteProducts();

      // Filtrer les favoris qui ont un produit valide (product non null)
      const validFavorites = (response || []).filter(
        (item) => item.product !== null && item.product !== undefined
      );

      setFavoriteItems(validFavorites);
    } catch (err: any) {
      console.error("Erreur lors de la récupération des favoris:", err);
      setError(err.message || i18n.t("enterprise.favorites.error.loadError"));
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  // Fonction pour supprimer un produit des favoris
  const handleRemoveFavorite = async (productId: string) => {
    setDeleteModal({ visible: true, productId });
  };

  const confirmRemoveFavorite = async () => {
    if (!deleteModal.productId) return;

    const productId = deleteModal.productId;
    setDeleteModal({ visible: false, productId: null });

    try {
      await ProductService.removeProductFromFavorites(productId);

      // Mise à jour locale
      setFavoriteItems((prev) =>
        prev.filter((item) => item.product._id !== productId)
      );
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      setErrorModal({
        visible: true,
        message: i18n.t("enterprise.favorites.errorModal.message"),
      });
    }
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
    const translateX = shimmer.interpolate({
      inputRange: [0, 1],
      outputRange: [-150, 150],
    });
    return (
      <View style={[{ backgroundColor: isDark ? colors.tertiary : "#E5E7EB", overflow: "hidden" }, style]}>
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: 120,
            transform: [{ translateX }],
            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.35)",
            opacity: 0.7,
          }}
        />
      </View>
    );
  };

  const SkeletonProduct = () => (
    <View
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
      className="rounded-2xl border p-2 mb-3 w-[48%] overflow-hidden"
    >
      <ShimmerBlock style={{ height: 128, borderRadius: 16, width: "100%" }} />
      <View className="p-2">
        <ShimmerBlock
          style={{ height: 14, borderRadius: 7, width: "80%", marginBottom: 8 }}
        />
        <ShimmerBlock
          style={{ height: 16, borderRadius: 8, width: "60%", marginBottom: 8 }}
        />
        <ShimmerBlock style={{ height: 12, borderRadius: 6, width: "40%" }} />
      </View>
    </View>
  );

  const renderSkeletonFavorites = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 90 }}
    >
      {/* Header Skeleton */}
      <LinearGradient
        colors={[colors.brandGradientStart, colors.brandGradientEnd]}
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
          <ShimmerBlock
            style={{ height: 24, borderRadius: 12, width: "40%" }}
          />
        </View>
        <View className="flex-row justify-between items-center">
          <ShimmerBlock
            style={{ height: 32, borderRadius: 16, width: "35%" }}
          />
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
  const FavoriteProductCard = ({
    favoriteItem,
  }: {
    favoriteItem: FavoriteItem;
  }) => {
    // Vérification de sécurité supplémentaire
    if (!favoriteItem.product) {
      return null;
    }

    return (
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
        className="mx-4 mb-4 rounded-2xl overflow-hidden border"
        onPress={() => {
          router.push(`/(app)/(enterprise)/product/${favoriteItem.product._id}`);
        }}
      >
        <View className="flex-row p-4">
          {/* Image du produit */}
          <View className="relative">
            <View
              style={{ backgroundColor: colors.tertiary }}
              className="w-28 h-28 rounded-2xl overflow-hidden"
            >
              {favoriteItem.product.images &&
                favoriteItem.product.images.length > 0 ? (
                <Image
                  source={{ uri: favoriteItem.product.images[0] }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full justify-center items-center">
                  <Ionicons name="image-outline" size={36} color={colors.textTertiary} />
                </View>
              )}
            </View>
            {/* Badge stock - Retiré car non disponible dans le type */}
          </View>

          {/* Informations du produit */}
          <View className="flex-1 justify-between ml-4">
            <View>
              <Text
                style={{ color: colors.textPrimary }}
                className="text-lg font-quicksand-bold"
                numberOfLines={2}
              >
                {favoriteItem.product.name}
              </Text>
              {favoriteItem.product.description && (
                <Text
                  style={{ color: colors.textSecondary }}
                  className="text-sm font-quicksand mt-1"
                  numberOfLines={1}
                >
                  {favoriteItem.product.description}
                </Text>
              )}
            </View>

            {/* Prix et infos */}
            <View className="mt-2">
              <View className="flex-row items-center justify-between">
                <Text style={{ color: colors.brandPrimary }} className="text-xl font-quicksand-bold">
                  {favoriteItem.product.price.toLocaleString("fr-FR")} FCFA
                </Text>
              </View>
              <Text style={{ color: colors.textTertiary }} className="text-[10px] font-quicksand mt-1">
                {i18n.t("enterprise.favorites.labels.addedOn")}{" "}
                {new Date(favoriteItem.createdAt).toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>

          {/* Bouton supprimer */}
          <TouchableOpacity
            style={{ backgroundColor: isDark ? colors.tertiary : '#FEF2F2' }}
            className="ml-2 self-start p-2.5 rounded-xl"
            onPress={(e) => {
              e.stopPropagation();
              handleRemoveFavorite(favoriteItem.product._id);
            }}
          >
            <Ionicons name="heart" size={22} color={colors.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

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
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={{ color: colors.textPrimary }} className="text-xl font-quicksand-bold mt-4 text-center">
          {i18n.t("enterprise.favorites.error.title")}
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-base font-quicksand mt-2 text-center">
          {error}
        </Text>
        <TouchableOpacity
          className="mt-6 bg-primary rounded-2xl px-6 py-3"
          onPress={() => fetchFavoriteProducts()}
        >
          <Text className="text-white font-quicksand-bold">{i18n.t("enterprise.favorites.error.retry")}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      <ExpoStatusBar style={isDark ? "light" : "light"} translucent />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.brandPrimary]}
          />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={[colors.brandGradientStart, colors.brandGradientEnd]}
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
              {i18n.t("enterprise.favorites.title")}
            </Text>
          </View>

          {/* Compteur de favoris */}
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center px-4 py-2 rounded-full bg-white/20">
              <Ionicons
                name="heart"
                size={16}
                color="white"
                style={{ marginRight: 8 }}
              />
              <Text className="text-white font-quicksand-medium text-sm">
                {favoriteItems.length}{" "}
                {favoriteItems.length > 1 ? i18n.t("enterprise.favorites.count.products") : i18n.t("enterprise.favorites.count.product")}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Contenu principal */}
        {favoriteItems.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20 px-6">
            <Ionicons name="heart-outline" size={64} color={colors.textTertiary} />
            <Text style={{ color: colors.textPrimary }} className="text-xl font-quicksand-bold mt-4 text-center">
              {i18n.t("enterprise.favorites.empty.title")}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-base font-quicksand mt-2 text-center">
              {i18n.t("enterprise.favorites.empty.message")}
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: colors.brandPrimary }}
              className="mt-6 rounded-2xl px-6 py-3"
            >
              <Text style={{ color: colors.textOnBrand }} className="font-quicksand-bold">
                {i18n.t("enterprise.favorites.empty.exploreButton")}
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

      {/* Modal de confirmation de suppression */}
      <Modal
        visible={deleteModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setDeleteModal({ visible: false, productId: null })
        }
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setDeleteModal({ visible: false, productId: null })}
          style={{ backgroundColor: colors.overlay }}
          className="flex-1 justify-center items-center px-6"
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{ backgroundColor: colors.card }}
            className="rounded-3xl p-6 w-full max-w-sm"
          >
            {/* Icon de coeur */}
            <View className="items-center mb-4">
              <View
                style={{ backgroundColor: isDark ? colors.tertiary : '#FEE2E2' }}
                className="w-16 h-16 rounded-full justify-center items-center"
              >
                <Ionicons name="heart-dislike" size={32} color={colors.error} />
              </View>
            </View>

            {/* Titre */}
            <Text style={{ color: colors.textPrimary }} className="text-xl font-quicksand-bold text-center mb-2">
              {i18n.t("enterprise.favorites.deleteModal.title")}
            </Text>

            {/* Message */}
            <Text style={{ color: colors.textSecondary }} className="text-base font-quicksand-medium text-center mb-6">
              {i18n.t("enterprise.favorites.deleteModal.message")}
            </Text>

            {/* Actions */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() =>
                  setDeleteModal({ visible: false, productId: null })
                }
                style={{ backgroundColor: colors.tertiary }}
                className="flex-1 py-3 rounded-xl"
                activeOpacity={0.7}
              >
                <Text style={{ color: colors.textPrimary }} className="font-quicksand-bold text-center">
                  {i18n.t("enterprise.favorites.deleteModal.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmRemoveFavorite}
                style={{ backgroundColor: colors.error }}
                className="flex-1 py-3 rounded-xl"
                activeOpacity={0.7}
              >
                <Text style={{ color: colors.textOnBrand }} className="font-quicksand-bold text-center">
                  {i18n.t("enterprise.favorites.deleteModal.confirm")}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal d'erreur */}
      <Modal
        visible={errorModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorModal({ visible: false, message: "" })}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setErrorModal({ visible: false, message: "" })}
          style={{ backgroundColor: colors.overlay }}
          className="flex-1 justify-center items-center px-6"
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{ backgroundColor: colors.card }}
            className="rounded-3xl p-6 w-full max-w-sm"
          >
            {/* Icon d'erreur */}
            <View className="items-center mb-4">
              <View
                style={{ backgroundColor: isDark ? colors.tertiary : '#FEE2E2' }}
                className="w-16 h-16 rounded-full justify-center items-center"
              >
                <Ionicons name="alert-circle" size={32} color={colors.error} />
              </View>
            </View>

            {/* Titre */}
            <Text style={{ color: colors.textPrimary }} className="text-xl font-quicksand-bold text-center mb-2">
              {i18n.t("enterprise.favorites.errorModal.title")}
            </Text>

            {/* Message */}
            <Text style={{ color: colors.textSecondary }} className="text-base font-quicksand-medium text-center mb-6">
              {errorModal.message}
            </Text>

            {/* Bouton OK */}
            <TouchableOpacity
              onPress={() => setErrorModal({ visible: false, message: "" })}
              style={{ backgroundColor: colors.brandPrimary }}
              className="py-3 rounded-xl"
              activeOpacity={0.7}
            >
              <Text style={{ color: colors.textOnBrand }} className="font-quicksand-bold text-center">
                {i18n.t("enterprise.favorites.errorModal.ok")}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
