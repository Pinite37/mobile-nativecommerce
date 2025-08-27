import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { 
  SafeAreaView, 
  ScrollView, 
  Text, 
  TouchableOpacity, 
  View, 
  Image, 
  ActivityIndicator,
  Alert,
  RefreshControl
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import ProductService from "@/services/api/ProductService";

import { FavoriteItem } from "@/types/product";

export default function FavoritesScreen() {
  const router = useRouter();
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
    return (
      <SafeAreaView className="flex-1 bg-background-secondary justify-center items-center">
        <ActivityIndicator size="large" color="#FE8C00" />
        <Text className="text-base font-quicksand text-neutral-600 mt-4">
          Chargement de vos favoris...
        </Text>
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
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FE8C00']} />
        }
      >
        {/* Header */}
        <View className="bg-white px-4 py-6 shadow-sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-quicksand-bold text-neutral-800">
              Mes favoris
            </Text>
            <TouchableOpacity className="relative">
              <Ionicons name="notifications-outline" size={24} color="#374151" />
              <View className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full" />
            </TouchableOpacity>
          </View>
          
          {favoriteItems.length > 0 && (
            <Text className="text-sm font-quicksand text-neutral-600 mt-1">
              {favoriteItems.length} produit{favoriteItems.length > 1 ? 's' : ''} en favori{favoriteItems.length > 1 ? 's' : ''}
            </Text>
          )}
        </View>

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