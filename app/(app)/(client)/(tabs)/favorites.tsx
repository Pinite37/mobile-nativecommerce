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
import ProductService from "@/services/api/ProductService";

import { Product, FavoriteItem                                                                                                                                                                                 } from "@/types/product";

export default function FavoritesScreen() {
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
      // La réponse contient directement le tableau de favoris
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
  const handleRemoveFavorite = async (favoriteId: string) => {
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
              // Supposons qu'il y ait une méthode pour supprimer des favoris
              // await ProductService.removeFavorite(favoriteId);
              
              // Mise à jour locale en attendant
              setFavoriteItems(prev => prev.filter(item => item._id !== favoriteId));
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
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

  // Chargement initial
  useEffect(() => {
    fetchFavoriteProducts();
  }, []);

  // Composant pour afficher un produit favori
  const FavoriteProductCard = ({ favoriteItem }: { favoriteItem: FavoriteItem }) => (
    <View className="bg-white mx-6 mb-4 rounded-2xl p-4 shadow-sm">
      <View className="flex-row">
        {/* Image du produit */}
        <View className="w-20 h-20 bg-gray-100 rounded-xl mr-4 justify-center items-center">
          {favoriteItem.product.images && favoriteItem.product.images.length > 0 ? (
            <Image 
              source={{ uri: favoriteItem.product.images[0] }} 
              className="w-full h-full rounded-xl"
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="image-outline" size={24} color="#9CA3AF" />
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
            <Text className="text-xs font-quicksand text-gray-500 mt-2">
              Ajouté le {new Date(favoriteItem.createdAt).toLocaleDateString('fr-FR')}
            </Text>
          </View>
        </View>

        {/* Bouton supprimer */}
        <TouchableOpacity 
          className="ml-2 p-2"
          onPress={() => handleRemoveFavorite(favoriteItem._id)}
        >
          <Ionicons name="heart" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // État de chargement
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background-secondary">
        <View className="px-6 pt-20 pb-4 bg-white">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-quicksand-bold text-neutral-800">
              Mes favoris
            </Text>
            <TouchableOpacity className="relative">
              <Ionicons name="notifications-outline" size={24} color="#374151" />
              <View className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-base font-quicksand text-neutral-600 mt-4">
            Chargement de vos favoris...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background-secondary">
        <View className="px-6 pt-20 pb-4 bg-white">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-quicksand-bold text-neutral-800">
              Mes favoris
            </Text>
            <TouchableOpacity className="relative">
              <Ionicons name="notifications-outline" size={24} color="#374151" />
              <View className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View className="flex-1 justify-center items-center p-6">
          <Ionicons name="alert-circle-outline" size={80} color="#EF4444" />
          <Text className="text-xl font-quicksand-bold text-neutral-700 mt-4 text-center">
            Erreur de chargement
          </Text>
          <Text className="text-base font-quicksand text-neutral-500 mt-2 text-center">
            {error}
          </Text>
          <TouchableOpacity 
            className="mt-6 bg-primary-500 rounded-2xl px-6 py-4"
            onPress={() => fetchFavoriteProducts()}
          >
            <Text className="text-white font-quicksand-semibold">
              Réessayer
            </Text>
          </TouchableOpacity>
        </View>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="px-6 pt-20 pb-4 bg-white">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-quicksand-bold text-neutral-800">
              Mes favoris
            </Text>
            <TouchableOpacity className="relative">
              <Ionicons name="notifications-outline" size={24} color="#374151" />
              <View className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full" />
            </TouchableOpacity>
          </View>
          
          {/* Compteur de favoris */}
          {favoriteItems.length > 0 && (
            <Text className="text-sm font-quicksand text-neutral-600 mt-2">
              {favoriteItems.length} produit{favoriteItems.length > 1 ? 's' : ''} en favori{favoriteItems.length > 1 ? 's' : ''}
            </Text>
          )}
        </View>

        {/* Contenu principal */}
        {favoriteItems.length === 0 ? (
          // État vide
          <View className="flex-1 justify-center items-center p-6">
            <Ionicons name="heart-outline" size={80} color="#CBD5E1" />
            <Text className="text-xl font-quicksand-bold text-neutral-700 mt-4 text-center">
              Vos favoris apparaîtront ici
            </Text>
            <Text className="text-base font-quicksand text-neutral-500 mt-2 text-center">
              Ajoutez des produits à vos favoris pour les retrouver facilement
            </Text>
            <TouchableOpacity className="mt-6 bg-primary-500 rounded-2xl px-6 py-4">
              <Text className="text-white font-quicksand-semibold">
                Explorer les produits
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Liste des produits favoris
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