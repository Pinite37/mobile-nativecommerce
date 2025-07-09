import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
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

// Variable globale pour récupérer l'ID du produit
declare global {
  var __CURRENT_PRODUCT_ID__: string | undefined;
}

export default function ProductDetails() {
  // États du composant
  const [productId, setProductId] = useState<string | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Fonction pour afficher un toast
  const showToast = (message: string) => {
    Alert.alert('Info', message);
  };

  // Récupérer l'ID au démarrage
  useEffect(() => {
    let currentId: string | null = null;
    
    try {
      // Méthode 1: Variable globale
      if (typeof global !== 'undefined' && global.__CURRENT_PRODUCT_ID__) {
        currentId = global.__CURRENT_PRODUCT_ID__;
        console.log('✅ ID extrait depuis global:', currentId);
      }
      
      // Méthode 2: Fallback vers un ID de test
      if (!currentId) {
        currentId = "686d07b0edb27d4770997a75"; // iPhone 15 pour test
        console.warn('⚠️ Utilisation de l\'ID de fallback:', currentId);
      }
    } catch (err) {
      console.error('❌ Erreur extraction ID:', err);
      currentId = "686d07b0edb27d4770997a75";
    }
    
    console.log('🔍 ID final:', currentId);
    setProductId(currentId);
  }, []);

  // Charger le produit
  useEffect(() => {
    if (!productId) return;
    
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('🚀 Chargement produit:', productId);
        
        const productData = await ProductService.getProductById(productId);
        console.log('✅ Produit chargé:', productData);
        setProduct(productData);
      } catch (err: any) {
        console.error('❌ Erreur:', err);
        setError(err.message || 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };
    
    loadProduct();
  }, [productId]);

  // Fonction de refresh
  const onRefresh = async () => {
    if (!productId) return;
    
    setRefreshing(true);
    try {
      const productData = await ProductService.getProductById(productId);
      setProduct(productData);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Actions sur le produit
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
              await ProductService.toggleProductStatus(product._id, !product.isActive);
              setProduct(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
              showToast(`Produit ${action}é avec succès`);
            } catch (error: any) {
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
              await ProductService.deleteProduct(product._id);
              showToast("Produit supprimé avec succès");
            } catch (error: any) {
              showToast(error.message || 'Erreur');
            }
          }
        }
      ]
    );
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

  // États d'affichage
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
            onPress={onRefresh}
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
      {/* Header simplifié */}
      <View className="bg-white px-6 py-4 pt-16 shadow-sm">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => {
              if (typeof global !== 'undefined') {
                delete global.__CURRENT_PRODUCT_ID__;
              }
              console.log('Retour demandé');
            }}
            className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center"
          >
            <Ionicons name="arrow-back" size={20} color="#374151" />
          </TouchableOpacity>
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
                    className="px-2"
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
              </>
            ) : (
              <View className="bg-neutral-100 rounded-2xl items-center justify-center" style={{ height: 300 }}>
                <Ionicons name="image-outline" size={60} color="#9CA3AF" />
                <Text className="text-neutral-500 font-quicksand-medium mt-2">Aucune image</Text>
              </View>
            )}
          </View>

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
        </View>
      </ScrollView>

      {/* Actions */}
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
