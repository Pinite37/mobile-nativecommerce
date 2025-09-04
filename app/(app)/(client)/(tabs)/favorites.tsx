import ProductService from "@/services/api/ProductService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  RefreshControl,
  SafeAreaView,
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

  // Fonction pour récupérer les produits favoris
  const fetchFavoriteProducts = async (isRefresh: boolean = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      
      const response = await ProductService.getFavoriteProducts();
      setFavoriteItems(response || []);
    } catch (err: any) {
      console.error('Erreur lors de la récupération des favoris:', err);
      setError(err.message || 'Erreur lors du chargement des favoris');
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  // Fonction pour supprimer un produit des favoris
  const handleRemoveFavorite = async (productId: string) => {
    Alert.alert(
      "Retirer des favoris",
      "Êtes-vous sûr de vouloir retirer ce produit de vos favoris ?",
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Retirer",
          style: "destructive",
          onPress: async () => {
            try {
              await ProductService.removeProductFromFavorites(productId);
              
              // Mise à jour locale
              setFavoriteItems(prev => prev.filter(item => item.product._id !== productId));
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
              Alert.alert('Erreur', 'Impossible de retirer ce produit des favoris.');
            }
          }
        }
      ]
    );
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

  // Composant ShimmerBlock pour l'animation de chargement
  const ShimmerBlock = ({ width, height, borderRadius = 8 }: { width: number | string; height: number; borderRadius?: number }) => {
    const shimmerAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
      const shimmerAnimation = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      shimmerAnimation.start();
      return () => shimmerAnimation.stop();
    }, [shimmerAnim]);

    const translateX = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-300, 300],
    });

    return (
      <View className="bg-gray-200 overflow-hidden" style={{ width: width as any, height, borderRadius }}>
        <Animated.View
          className="bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 absolute inset-0"
          style={{ transform: [{ translateX }] }}
        />
      </View>
    );
  };

  // Composant SkeletonProduct pour simuler un produit en chargement
  const SkeletonProduct = ({ isGrid = false }: { isGrid?: boolean }) => {
    if (isGrid) {
      return (
        <View className="w-[48%] bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 mx-[1%] mb-4">
          <ShimmerBlock width="100%" height={144} borderRadius={16} />
          <View className="p-3">
            <ShimmerBlock width="80%" height={16} borderRadius={4} />
            <View className="flex-row items-center justify-between mt-2">
              <ShimmerBlock width="60%" height={18} borderRadius={4} />
              <ShimmerBlock width="40%" height={14} borderRadius={4} />
            </View>
          </View>
        </View>
      );
    }

    return (
      <View className="bg-white mx-4 mb-4 rounded-2xl shadow-md overflow-hidden border border-gray-100">
        <View className="flex-row p-4">
          <ShimmerBlock width={96} height={96} borderRadius={12} />
          <View className="flex-1 ml-4 justify-between">
            <View>
              <ShimmerBlock width="70%" height={20} borderRadius={4} />
              <ShimmerBlock width="90%" height={14} borderRadius={4} />
              <View className="flex-row items-center justify-between mt-3">
                <ShimmerBlock width="40%" height={18} borderRadius={4} />
                <ShimmerBlock width="30%" height={14} borderRadius={4} />
              </View>
            </View>
            <ShimmerBlock width="50%" height={12} borderRadius={4} />
          </View>
          <ShimmerBlock width={24} height={24} borderRadius={12} />
        </View>
      </View>
    );
  };

  // Helper formatage prix
  const formatPrice = (price: number | undefined) => {
    if (typeof price !== "number") return "N/A";
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  // Fonction pour rendre les skeletons de favoris
  const renderSkeletonFavorites = () => (
    <SafeAreaView className="flex-1 bg-background-secondary">
      <ExpoStatusBar style="light" backgroundColor="#10B981" />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header skeleton */}
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="px-4 pb-6 rounded-b-3xl shadow-sm"
          style={{ paddingTop: insets.top + 12 }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <ShimmerBlock width={120} height={28} borderRadius={6} />
              <ShimmerBlock width={100} height={14} borderRadius={4} />
            </View>
            <ShimmerBlock width={24} height={24} borderRadius={12} />
          </View>
        </LinearGradient>

        {/* Products skeleton */}
        <View className="pt-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonProduct key={index} isGrid={false} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // Composant pour afficher un produit favori
  const FavoriteProductCard = ({ favoriteItem }: { favoriteItem: FavoriteItem }) => (
    <TouchableOpacity 
      className="bg-white mx-4 mb-4 rounded-2xl shadow-md overflow-hidden border border-gray-100"
      onPress={() => router.push(`/(app)/(client)/product/${favoriteItem.product._id}`)}
    >
      <View className="flex-row p-4">
        {/* Image du produit */}
        <View className="w-24 h-24 rounded-xl overflow-hidden mr-4">
          {favoriteItem.product.images && favoriteItem.product.images.length > 0 ? (
            <Image 
              source={{ uri: favoriteItem.product.images[0] }} 
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full bg-gray-100 justify-center items-center">
              <Ionicons name="image-outline" size={32} color="#9CA3AF" />
            </View>
          )}
        </View>

        {/* Informations du produit */}
        <View className="flex-1 justify-between">
          <View>
            <Text className="text-lg font-quicksand-bold text-neutral-800" numberOfLines={2}>
              {favoriteItem.product.name}
            </Text>
            {favoriteItem.product.description && (
              <Text className="text-sm font-quicksand text-neutral-600 mt-1" numberOfLines={2}>
                {favoriteItem.product.description}
              </Text>
            )}
            {/* Prix + Rating */}
            <View className="flex-row items-center justify-between mt-2">
              <Text className="text-base font-quicksand-bold text-primary-600">
                {formatPrice(favoriteItem.product.price as any)}
              </Text>
              {favoriteItem.product?.stats?.averageRating ? (
                <View className="flex-row items-center">
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text className="text-xs text-neutral-600 ml-1">
                    {Number(favoriteItem.product.stats.averageRating).toFixed(1)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <Text className="text-xs font-quicksand text-gray-500 mt-2">
            Ajouté le {new Date(favoriteItem.createdAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </Text>
        </View>

        {/* Bouton supprimer */}
        <TouchableOpacity 
          className="ml-4 p-2 self-start"
          onPress={(e) => {
            e.stopPropagation(); // Empêche la navigation lors du clic sur le cœur
            handleRemoveFavorite(favoriteItem.product._id);
          }}
        >
          <Ionicons name="heart" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // État de chargement
  if (loading) {
    return renderSkeletonFavorites();
  }

  // État d'erreur
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background-secondary justify-center items-center p-6">
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
  <ExpoStatusBar style="light" backgroundColor="#10B981" />
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="px-4 pb-6 rounded-b-3xl shadow-sm"
          style={{ paddingTop: insets.top + 12 }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-quicksand-bold text-white">
                Mes favoris
              </Text>
              {favoriteItems.length > 0 && (
                <Text className="text-sm font-quicksand text-white/90 mt-1">
                  {favoriteItems.length} produit{favoriteItems.length > 1 ? 's' : ''} en favori{favoriteItems.length > 1 ? 's' : ''}
                </Text>
              )}
            </View>
            <TouchableOpacity className="relative">
              <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
              <View className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full" />
            </TouchableOpacity>
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
    </SafeAreaView>
  );
}