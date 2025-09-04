import ProductService from "@/services/api/ProductService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
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

export default function EnterpriseFavoritesScreen() {
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

  const renderSkeletonFavorites = () => (
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
        <View className="px-6">
          <ShimmerBlock style={{ height: 16, borderRadius: 8, width: '60%' }} />
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
  const FavoriteProductCard = ({ favoriteItem }: { favoriteItem: FavoriteItem }) => (
    <TouchableOpacity
      className="bg-white mx-4 mb-4 rounded-2xl shadow-md overflow-hidden border border-gray-100"
      onPress={() => {
        // Navigation vers le produit - à adapter selon la structure des routes entreprise
        console.log('Navigate to product:', favoriteItem.product._id);
      }}
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

  // État de chargement avec skeleton
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background-secondary">
        {renderSkeletonFavorites()}
      </SafeAreaView>
    );
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
