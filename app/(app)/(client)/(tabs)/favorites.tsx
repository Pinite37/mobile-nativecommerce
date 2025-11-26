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

import { FavoriteItem } from "@/types/product";

export default function FavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [productToRemove, setProductToRemove] = useState<string | null>(null);

  // Fonction pour récupérer les produits favoris
  const fetchFavoriteProducts = async (isRefresh: boolean = false) => {
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
  };

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
    }, [])
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

  const SkeletonProduct = () => (
    <View className="bg-white rounded-2xl border border-neutral-100 p-2 mb-3 w-[48%] overflow-hidden">
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

    return (
      <TouchableOpacity
        className="bg-white mx-4 mb-4 rounded-2xl overflow-hidden border border-neutral-100"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.03,
          shadowRadius: 3,
          elevation: 1,
        }}
        onPress={() => router.push(`/(app)/(client)/product/${favoriteItem.product._id}`)}
      >
        <View className="flex-row p-4">
          {/* Image du produit */}
          <View className="relative">
            <View className="w-28 h-28 rounded-2xl overflow-hidden bg-gray-50">
              {favoriteItem.product.images && favoriteItem.product.images.length > 0 ? (
                <Image
                  source={{ uri: favoriteItem.product.images[0] }}
                  className="w-full h-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full justify-center items-center">
                  <Ionicons name="image-outline" size={36} color="#D1D5DB" />
                </View>
              )}
            </View>
          </View>

          {/* Informations du produit */}
          <View className="flex-1 justify-between ml-4">
            <View>
              <Text className="text-lg font-quicksand-bold text-neutral-800" numberOfLines={2}>
                {favoriteItem.product.name}
              </Text>
              {favoriteItem.product.description && (
                <Text className="text-sm font-quicksand text-neutral-500 mt-1" numberOfLines={1}>
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
              <Text className="text-[10px] font-quicksand text-gray-400 mt-1">
                Ajouté le {new Date(favoriteItem.createdAt).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
            </View>
          </View>

          {/* Bouton supprimer */}
          <TouchableOpacity
            className="ml-2 self-start bg-red-50 p-2.5 rounded-xl"
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

  // État de chargement avec skeleton
  if (loading) {
    return (
      <View className="flex-1 bg-background-secondary">
        {renderSkeletonFavorites()}
      </View>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <View className="flex-1 bg-background-secondary justify-center items-center p-6">
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text className="text-xl font-quicksand-bold text-neutral-800 mt-4 text-center">
          Erreur de chargement
        </Text>
        <Text className="text-base font-quicksand text-neutral-600 mt-2 text-center">
          {error}
        </Text>
        <TouchableOpacity
          className="mt-6 bg-primary rounded-2xl px-6 py-3"
          onPress={() => fetchFavoriteProducts()}
        >
          <Text className="text-white font-quicksand-bold">
            Réessayer
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-secondary">
      <ExpoStatusBar style="light" translucent />
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} />
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
              Mes Favoris
            </Text>
          </View>

          {/* Compteur de favoris */}
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center px-4 py-2 rounded-full bg-white/20">
              <Ionicons name="heart" size={16} color="white" style={{ marginRight: 8 }} />
              <Text className="text-white font-quicksand-medium text-sm">
                {favoriteItems.length} {favoriteItems.length > 1 ? 'produits' : 'produit'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Contenu principal */}
        {favoriteItems.length === 0 ? (
          <View className="flex-1 justify-center items-center py-20 px-6">
            <Ionicons name="heart-outline" size={64} color="#CBD5E1" />
            <Text className="text-xl font-quicksand-bold text-neutral-800 mt-4 text-center">
              Votre liste de favoris est vide
            </Text>
            <Text className="text-base font-quicksand text-neutral-600 mt-2 text-center">
              Ajoutez des produits à vos favoris pour les retrouver facilement
            </Text>
            <TouchableOpacity className="mt-6 bg-primary rounded-2xl px-6 py-3">
              <Text className="text-white font-quicksand-bold">
                Explorer les produits
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
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
            {/* Icône */}
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-red-100 rounded-full justify-center items-center">
                <Ionicons name="heart-dislike" size={32} color="#EF4444" />
              </View>
            </View>

            {/* Titre */}
            <Text className="text-xl font-quicksand-bold text-neutral-800 mb-2 text-center">
              Retirer des favoris
            </Text>

            {/* Message */}
            <Text className="text-base text-neutral-600 font-quicksand-medium mb-6 text-center">
              Êtes-vous sûr de vouloir retirer ce produit de vos favoris ?
            </Text>

            {/* Boutons */}
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 bg-neutral-100 rounded-xl py-3"
                onPress={cancelRemoveFavorite}
              >
                <Text className="text-neutral-700 font-quicksand-semibold text-center">
                  Annuler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-red-500 rounded-xl py-3"
                onPress={confirmRemoveFavorite}
              >
                <Text className="text-white font-quicksand-semibold text-center">
                  Retirer
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
