import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import ProductService from "../../../../../services/api/ProductService";
import { Product } from "../../../../../types/product";

export default function ProductDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);

  console.log('🚀 ProductDetails - Product ID:', id);

  const loadProduct = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📡 Chargement du produit:', id);
      
      const productData = await ProductService.getProductById(id);
      console.log('✅ Produit chargé:', productData.name);
      setProduct(productData);
    } catch (err: any) {
      console.error('❌ Erreur chargement produit:', err);
      setError(err.message || 'Erreur lors du chargement du produit');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id, loadProduct]);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await loadProduct();
    } catch (error) {
      console.error('❌ Erreur refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!product) return;
    
    const action = product.isActive ? 'désactiver' : 'activer';
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} le produit`,
      `Voulez-vous vraiment ${action} ce produit ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          onPress: async () => {
            try {
              console.log('🔄 Changement de statut:', product._id, !product.isActive);
              await ProductService.toggleProductStatus(product._id, !product.isActive);
              setProduct(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
              showToast(`Produit ${action}é avec succès`);
            } catch (error: any) {
              console.error('❌ Erreur changement statut:', error);
              showToast(error.message || 'Erreur');
            }
          }
        }
      ]
    );
  };

  const handleDeleteProduct = async () => {
    if (!product) return;
    
    Alert.alert(
      "Supprimer le produit",
      "Êtes-vous sûr ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              console.log('🗑️ Suppression du produit:', product._id);
              await ProductService.deleteProduct(product._id);
              showToast("Produit supprimé avec succès");
              router.back();
            } catch (error: any) {
              console.error('❌ Erreur suppression:', error);
              showToast(error.message || 'Erreur');
            }
          }
        }
      ]
    );
  };

  const handleEditProduct = () => {
    console.log('✏️ Édition du produit à implémenter:', product?._id);
    Alert.alert("Information", "La fonctionnalité d'édition sera bientôt disponible");
  };

  // Fonction temporaire pour les toasts
  const showToast = (message: string) => {
    Alert.alert("Information", message);
  };

  // Utilitaires
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { text: 'Rupture de stock', color: 'text-red-500', bgColor: 'bg-red-100' };
    if (stock <= 5) return { text: 'Stock faible', color: 'text-orange-500', bgColor: 'bg-orange-100' };
    return { text: 'En stock', color: 'text-green-500', bgColor: 'bg-green-100' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // États d'affichage
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background-secondary">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FE8C00" />
          <Text className="mt-4 text-neutral-600 font-quicksand-medium">
            Chargement du produit...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView className="flex-1 bg-background-secondary">
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="warning" size={64} color="#EF4444" />
          <Text className="text-xl font-quicksand-bold text-neutral-800 mt-4 text-center">
            Erreur de chargement
          </Text>
          <Text className="text-neutral-600 font-quicksand mt-2 text-center">
            {error || 'Produit non trouvé'}
          </Text>
          <TouchableOpacity
            onPress={loadProduct}
            className="bg-primary-500 py-3 px-6 rounded-2xl mt-6"
          >
            <Text className="text-white font-quicksand-semibold">
              Réessayer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-4"
          >
            <Text className="text-neutral-500 font-quicksand">
              Retour
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const stockStatus = getStockStatus(product.stock);

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      {/* Header */}
      <View className="bg-white px-6 pt-16 py-4 border-b border-neutral-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => {
              console.log('🔙 Retour demandé');
              router.back();
            }}
            className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-quicksand-bold text-neutral-800 flex-1 text-center" numberOfLines={1}>
            {product.name}
          </Text>
          <TouchableOpacity
            onPress={handleEditProduct}
            className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center"
          >
            <Ionicons name="pencil" size={18} color="#FE8C00" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FE8C00']}
          />
        }
      >
        <View className="px-6 py-6">
          <View className="mb-6">
            {product.images && product.images.length > 0 ? (
              <>
                <View className="mb-4">
                  <Image
                    source={{ uri: product.images[selectedImageIndex] }}
                    className="w-full rounded-2xl"
                    style={{ height: 300 }}
                    resizeMode="cover"
                  />
                  {product.images.length > 1 && (
                    <View className="absolute bottom-4 right-4 bg-black/50 rounded-full px-3 py-1">
                      <Text className="text-white font-quicksand-medium text-sm">
                        {selectedImageIndex + 1} / {product.images.length}
                      </Text>
                    </View>
                  )}
                </View>
                
                {product.images.length > 1 && (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                  >
                    {product.images.map((image, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => setSelectedImageIndex(index)}
                        className={`border-2 rounded-xl mr-3 ${
                          selectedImageIndex === index ? 'border-primary-500' : 'border-neutral-200'
                        }`}
                      >
                        <Image
                          source={{ uri: image }}
                          className="w-20 h-20 rounded-xl"
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </>
            ) : (
              <View className="w-full h-72 bg-neutral-100 rounded-2xl items-center justify-center">
                <Ionicons name="image" size={48} color="#9CA3AF" />
                <Text className="text-neutral-500 font-quicksand-medium mt-2">Aucune image</Text>
              </View>
            )}
          </View>

          <View className="bg-white rounded-3xl p-6 shadow-sm">
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-1 mr-4">
                <Text className="text-2xl font-quicksand-bold text-neutral-800 mb-2">
                  {product.name}
                </Text>
                <View className="flex-row items-center">
                  <View className={`px-3 py-1 rounded-full ${stockStatus.bgColor}`}>
                    <Text className={`text-sm font-quicksand-semibold ${stockStatus.color}`}>
                      {stockStatus.text}
                    </Text>
                  </View>
                  <View className={`ml-2 px-3 py-1 rounded-full ${
                    product.isActive ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    <Text className={`text-sm font-quicksand-semibold ${
                      product.isActive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {product.isActive ? 'Actif' : 'Inactif'}
                    </Text>
                  </View>
                </View>
              </View>
              <Text className="text-3xl font-quicksand-bold text-primary-500">
                {formatPrice(product.price)}
              </Text>
            </View>

            <View className="flex-row items-center mb-4">
              <View className="items-center flex-1">
                <Text className="text-sm text-neutral-500 font-quicksand">Stock</Text>
                <Text className="text-lg font-quicksand-bold text-neutral-800">
                  {product.stock}
                </Text>
              </View>
              {typeof product.category === 'object' && (
                <View className="items-center flex-1">
                  <Text className="text-sm text-neutral-500 font-quicksand">Catégorie</Text>
                  <Text className="text-lg font-quicksand-bold text-neutral-800">
                    {product.category.name}
                  </Text>
                </View>
              )}
              <View className="items-center flex-1">
                <Text className="text-sm text-neutral-500 font-quicksand">Vues</Text>
                <Text className="text-lg font-quicksand-bold text-neutral-800">
                  {product.stats.views}
                </Text>
              </View>
            </View>

            <View className="border-t border-neutral-100 pt-4">
              <Text className="text-sm text-neutral-500 font-quicksand mb-2">Description</Text>
              <Text 
                className="text-neutral-700 font-quicksand-medium leading-6"
                numberOfLines={showFullDescription ? undefined : 3}
              >
                {product.description}
              </Text>
              {product.description.length > 150 && (
                <TouchableOpacity
                  onPress={() => setShowFullDescription(!showFullDescription)}
                  className="mt-2"
                >
                  <Text className="text-primary-500 font-quicksand-semibold">
                    {showFullDescription ? 'Voir moins' : 'Voir plus'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {product.specifications && product.specifications.length > 0 && (
            <View className="bg-white rounded-3xl p-6 shadow-sm">
              <Text className="text-xl font-quicksand-bold text-neutral-800 mb-4">
                Spécifications
              </Text>
              <View>
                {product.specifications.map((spec: any, index: number) => (
                  <View key={index} className="flex-row justify-between py-2 border-b border-neutral-100">
                    <Text className="text-neutral-600 font-quicksand flex-1">{spec.key}</Text>
                    <Text className="text-neutral-800 font-quicksand-semibold flex-1 text-right">
                      {spec.value}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {product.tags && product.tags.length > 0 && (
            <View className="bg-white rounded-3xl p-6 shadow-sm">
              <Text className="text-xl font-quicksand-bold text-neutral-800 mb-4">
                Tags
              </Text>
              <View className="flex-row flex-wrap">
                {product.tags.map((tag, index) => (
                  <View key={index} className="bg-primary-100 px-3 py-1 rounded-full mr-2 mb-2">
                    <Text className="text-primary-600 font-quicksand-medium">#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View className="bg-white rounded-3xl p-6 shadow-sm">
            <Text className="text-xl font-quicksand-bold text-neutral-800 mb-4">
              Informations
            </Text>
            <View>
              <View className="flex-row justify-between py-2">
                <Text className="text-neutral-600 font-quicksand">Note moyenne</Text>
                <View className="flex-row items-center">
                  <Ionicons name="star" size={16} color="#FE8C00" />
                  <Text className="text-neutral-800 font-quicksand-semibold ml-1">
                    {product.stats.averageRating.toFixed(1)} ({product.stats.totalReviews} avis)
                  </Text>
                </View>
              </View>
              
              <View className="flex-row justify-between py-2">
                <Text className="text-neutral-600 font-quicksand">Ventes totales</Text>
                <Text className="text-neutral-800 font-quicksand-semibold">
                  {formatPrice(product.stats.totalSales)}
                </Text>
              </View>

              {product.weight && (
                <View className="flex-row justify-between py-2">
                  <Text className="text-neutral-600 font-quicksand">Poids</Text>
                  <Text className="text-neutral-800 font-quicksand-semibold">
                    {product.weight} kg
                  </Text>
                </View>
              )}

              <View className="flex-row justify-between py-2">
                <Text className="text-neutral-600 font-quicksand">Créé le</Text>
                <Text className="text-neutral-800 font-quicksand-semibold">
                  {formatDate(product.createdAt)}
                </Text>
              </View>

              <View className="flex-row justify-between py-2">
                <Text className="text-neutral-600 font-quicksand">Modifié le</Text>
                <Text className="text-neutral-800 font-quicksand-semibold">
                  {formatDate(product.updatedAt)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="bg-white px-6 py-4 border-t border-neutral-100">
        <View className="flex-row">
          <TouchableOpacity
            onPress={handleToggleStatus}
            className={`flex-1 py-4 rounded-2xl mr-3 ${
              product.isActive ? 'bg-orange-500' : 'bg-green-500'
            }`}
          >
            <Text className="text-white text-center font-quicksand-semibold">
              {product.isActive ? 'Désactiver' : 'Activer'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleEditProduct}
            className="flex-1 bg-primary-500 py-4 rounded-2xl mr-3"
          >
            <Text className="text-white text-center font-quicksand-semibold">
              Modifier
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleDeleteProduct}
            className="bg-red-500 py-4 px-6 rounded-2xl"
          >
            <Ionicons name="trash" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
