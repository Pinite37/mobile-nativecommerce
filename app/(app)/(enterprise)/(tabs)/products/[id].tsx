import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
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
  // Fonction pour afficher un toast (temporaire pour éviter l'erreur de navigation context)
  const showToast = (message: string) => {
    Alert.alert('Info', message);
  };
  
  // Récupérer l'ID depuis l'URL ou utiliser un ID par défaut pour test
  const [productId, setProductId] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Essayer de récupérer l'ID depuis l'URL via window.location (pour le web) ou utiliser un ID test
  useEffect(() => {
    try {
      // Tentative d'extraction de l'ID depuis l'URL
      if (typeof window !== 'undefined' && window.location) {
        const pathParts = window.location.pathname.split('/');
        const id = pathParts[pathParts.length - 1];
        if (id && id !== '[id]' && id.length > 10) {
          console.log('🔍 ID extrait depuis l\'URL:', id);
          setProductId(id);
          return;
        }
      }
      
      // Fallback: utiliser l'ID du produit Samsung A56 pour test
      const fallbackId = "686d2660b08e2e6de1dbe696";
      console.log('🔄 Utilisation de l\'ID de fallback pour test:', fallbackId);
      setProductId(fallbackId);
    } catch (err) {
      console.error('❌ Erreur lors de l\'extraction de l\'ID:', err);
      // Utiliser l'ID de test même en cas d'erreur
      setProductId("686d2660b08e2e6de1dbe696");
    }
  }, []);

  const loadProduct = useCallback(async () => {
    console.log('🔍 Debug - ID du produit:', productId);
    
    if (!productId) {
      console.warn('❌ Aucun ID trouvé');
      setError('ID du produit non trouvé');
      setLoading(false);
      return;
    }
    
    try {
      setError(null);
      console.log('🚀 Chargement du produit avec ID:', productId);
      const productData = await ProductService.getProductById(productId);
      console.log('✅ Produit chargé:', productData);
      setProduct(productData);
    } catch (err: any) {
      console.error('❌ Erreur chargement produit:', err);
      setError(err.message || 'Erreur lors du chargement du produit');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId, loadProduct]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProduct();
    setRefreshing(false);
  }, [loadProduct]);

  const handleToggleStatus = async () => {
    if (!product) return;

    Alert.alert(
      `${product.isActive ? 'Désactiver' : 'Activer'} le produit`,
      `Voulez-vous vraiment ${product.isActive ? 'désactiver' : 'activer'} ce produit ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: product.isActive ? 'Désactiver' : 'Activer',
          onPress: async () => {
            try {
              await ProductService.toggleProductStatus(product._id, !product.isActive);
              setProduct((prev: Product | null) => prev ? { ...prev, isActive: !prev.isActive } : null);
              showToast(`Produit ${product.isActive ? 'désactivé' : 'activé'} avec succès`);
            } catch (error: any) {
              showToast(error.message || 'Erreur lors de la modification du statut');
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
      "Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await ProductService.deleteProduct(product._id);
              showToast("Produit supprimé avec succès");
              // Note: L'utilisateur devra naviguer manuellement vers la liste
              console.log('Produit supprimé, veuillez retourner à la liste des produits');
            } catch (error: any) {
              showToast(error.message || 'Erreur lors de la suppression');
            }
          }
        }
      ]
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { text: 'Rupture de stock', color: 'text-red-500', bgColor: 'bg-red-100' };
    if (stock <= 5) return { text: 'Stock faible', color: 'text-orange-500', bgColor: 'bg-orange-100' };
    return { text: 'En stock', color: 'text-green-500', bgColor: 'bg-green-100' };
  };

  const renderImageGallery = () => {
    if (!product?.images || product.images.length === 0) {
      return (
        <View className="bg-neutral-100 rounded-2xl items-center justify-center" style={{ height: 300 }}>
          <Ionicons name="image-outline" size={60} color="#9CA3AF" />
          <Text className="text-neutral-500 font-quicksand-medium mt-2">Aucune image</Text>
        </View>
      );
    }

    return (
      <View className="mb-6">
        {/* Image principale */}
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

        {/* Miniatures */}
        {product.images.length > 1 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="px-2"
            contentContainerStyle={{ paddingHorizontal: 4 }}
          >
            {product.images.map((image: string, index: number) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedImageIndex(index)}
                className={`mr-3 rounded-xl overflow-hidden border-2 ${
                  selectedImageIndex === index ? 'border-primary-500' : 'border-neutral-200'
                }`}
              >
                <Image
                  source={{ uri: image }}
                  className="w-16 h-16"
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background-secondary">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#6366F1" />
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
          <Ionicons name="alert-circle-outline" size={80} color="#EF4444" />
          <Text className="text-xl font-quicksand-bold text-neutral-800 mt-4 mb-2">
            Erreur
          </Text>
          <Text className="text-center text-neutral-600 font-quicksand-medium mb-6">
            {error || 'Produit non trouvé'}
          </Text>
          <TouchableOpacity 
            className="bg-primary-500 rounded-xl py-4 px-8"
            onPress={loadProduct}
          >
            <Text className="text-white font-quicksand-semibold">
              Réessayer
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
      <View className="bg-white px-6 py-4 pt-16 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Link href="/(app)/(enterprise)/(tabs)/products/" asChild>
            <TouchableOpacity
              className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center"
            >
              <Ionicons name="arrow-back" size={20} color="#374151" />
            </TouchableOpacity>
          </Link>
          <Text className="text-lg font-quicksand-bold text-neutral-800" numberOfLines={1}>
            {product.name}
          </Text>
          <TouchableOpacity
            onPress={() => console.log('Édition à implémenter')}
            className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center"
          >
            <Ionicons name="pencil" size={18} color="#6366F1" />
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
            colors={['#6366F1']}
          />
        }
      >
        <View className="px-6 py-6 space-y-6">
          {/* Images */}
          {renderImageGallery()}

          {/* Informations principales */}
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

            <View className="flex-row items-center space-x-6 mb-4">
              <View className="items-center">
                <Text className="text-sm text-neutral-500 font-quicksand">Stock</Text>
                <Text className="text-lg font-quicksand-bold text-neutral-800">
                  {product.stock}
                </Text>
              </View>
              {typeof product.category === 'object' && (
                <View className="items-center">
                  <Text className="text-sm text-neutral-500 font-quicksand">Catégorie</Text>
                  <Text className="text-lg font-quicksand-bold text-neutral-800">
                    {product.category.name}
                  </Text>
                </View>
              )}
              {product.sku && (
                <View className="items-center">
                  <Text className="text-sm text-neutral-500 font-quicksand">SKU</Text>
                  <Text className="text-lg font-quicksand-bold text-neutral-800">
                    {product.sku}
                  </Text>
                </View>
              )}
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

          {/* Détails techniques */}
          {(product.brand || product.model || product.weight || product.dimensions) && (
            <View className="bg-white rounded-3xl p-6 shadow-sm">
              <Text className="text-xl font-quicksand-bold text-neutral-800 mb-4">
                Détails techniques
              </Text>
              <View className="space-y-3">
                {product.brand && (
                  <View className="flex-row justify-between py-2 border-b border-neutral-100">
                    <Text className="text-neutral-600 font-quicksand">Marque</Text>
                    <Text className="text-neutral-800 font-quicksand-semibold">{product.brand}</Text>
                  </View>
                )}
                {product.model && (
                  <View className="flex-row justify-between py-2 border-b border-neutral-100">
                    <Text className="text-neutral-600 font-quicksand">Modèle</Text>
                    <Text className="text-neutral-800 font-quicksand-semibold">{product.model}</Text>
                  </View>
                )}
                {product.weight && (
                  <View className="flex-row justify-between py-2 border-b border-neutral-100">
                    <Text className="text-neutral-600 font-quicksand">Poids</Text>
                    <Text className="text-neutral-800 font-quicksand-semibold">{product.weight} kg</Text>
                  </View>
                )}
                {product.dimensions && (
                  <View className="flex-row justify-between py-2">
                    <Text className="text-neutral-600 font-quicksand">Dimensions</Text>
                    <Text className="text-neutral-800 font-quicksand-semibold">
                      {product.dimensions.length || 0} × {product.dimensions.width || 0} × {product.dimensions.height || 0} cm
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Spécifications */}
          {product.specifications && product.specifications.length > 0 && (
            <View className="bg-white rounded-3xl p-6 shadow-sm">
              <Text className="text-xl font-quicksand-bold text-neutral-800 mb-4">
                Spécifications
              </Text>
              <View className="space-y-3">
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

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <View className="bg-white rounded-3xl p-6 shadow-sm">
              <Text className="text-xl font-quicksand-bold text-neutral-800 mb-4">
                Tags
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {product.tags.map((tag: string, index: number) => (
                  <View key={index} className="bg-primary-100 rounded-full px-3 py-2">
                    <Text className="text-primary-700 font-quicksand-medium">{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Informations de gestion */}
          <View className="bg-white rounded-3xl p-6 shadow-sm">
            <Text className="text-xl font-quicksand-bold text-neutral-800 mb-4">
              Informations de gestion
            </Text>
            <View className="space-y-3">
              <View className="flex-row justify-between py-2 border-b border-neutral-100">
                <Text className="text-neutral-600 font-quicksand">Date de création</Text>
                <Text className="text-neutral-800 font-quicksand-semibold">
                  {new Date(product.createdAt).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <View className="flex-row justify-between py-2 border-b border-neutral-100">
                <Text className="text-neutral-600 font-quicksand">Dernière modification</Text>
                <Text className="text-neutral-800 font-quicksand-semibold">
                  {new Date(product.updatedAt).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <View className="flex-row justify-between py-2">
                <Text className="text-neutral-600 font-quicksand">ID du produit</Text>
                <Text className="text-neutral-800 font-quicksand-semibold">{product._id}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Actions flottantes */}
      <View className="px-6 py-4 bg-white border-t border-neutral-200">
        <View className="flex-row space-x-3">
          <TouchableOpacity
            onPress={handleToggleStatus}
            className={`flex-1 py-4 rounded-2xl ${
              product.isActive ? 'bg-orange-500' : 'bg-green-500'
            }`}
          >
            <Text className="text-white text-center font-quicksand-semibold">
              {product.isActive ? 'Désactiver' : 'Activer'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => console.log('Édition à implémenter')}
            className="flex-1 bg-primary-500 py-4 rounded-2xl"
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
