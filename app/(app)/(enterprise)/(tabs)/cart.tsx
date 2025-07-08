import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { cartService } from "../../../../services/api/CartService";
import { Cart, CartItem } from "../../../../types/cart";

export default function EnterpriseCart() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load cart data
  const loadCartData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const cartData = await cartService.getCart();
      setCart(cartData);
      
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement du panier');
      console.error('Error loading cart:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCartData();
  }, [loadCartData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCartData();
    setRefreshing(false);
  }, [loadCartData]);

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      handleRemoveItem(itemId);
      return;
    }

    try {
      setUpdatingItem(itemId);
      const updatedCart = await cartService.updateCartItem(itemId, { quantity: newQuantity });
      setCart(updatedCart);
    } catch (err: any) {
      Alert.alert("Erreur", err.message || "Impossible de mettre à jour la quantité");
    } finally {
      setUpdatingItem(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    Alert.alert(
      "Supprimer du panier",
      "Voulez-vous vraiment supprimer cet article du panier ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedCart = await cartService.removeFromCart(itemId);
              setCart(updatedCart);
            } catch (err: any) {
              Alert.alert("Erreur", err.message || "Impossible de supprimer l'article");
            }
          }
        }
      ]
    );
  };

  const handleClearCart = async () => {
    Alert.alert(
      "Vider le panier",
      "Voulez-vous vraiment vider tout le panier ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Vider",
          style: "destructive",
          onPress: async () => {
            try {
              await cartService.clearCart();
              setCart(null);
            } catch (err: any) {
              Alert.alert("Erreur", err.message || "Impossible de vider le panier");
            }
          }
        }
      ]
    );
  };

  const handleCheckout = () => {
    if (!cart || cart.items.length === 0) {
      Alert.alert("Panier vide", "Votre panier est vide. Ajoutez des produits pour continuer.");
      return;
    }

    // TODO: Navigate to checkout page
    Alert.alert(
      "Commande",
      "Voulez-vous passer cette commande ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Commander",
          onPress: () => {
            // TODO: Implement checkout flow
            Alert.alert("Commande", "Fonction de commande à implémenter");
          }
        }
      ]
    );
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View className="bg-white rounded-2xl p-4 mb-4 mx-4 shadow-sm border border-neutral-100">
      <View className="flex-row">
        <Image
          source={{ uri: item.product.images[0] || 'https://via.placeholder.com/80x80/E5E7EB/9CA3AF?text=No+Image' }}
          className="w-20 h-20 rounded-xl"
          resizeMode="cover"
        />
        
        <View className="ml-4 flex-1">
          <View className="flex-row items-start justify-between mb-2">
            <View className="flex-1">
              <Text className="text-base font-quicksand-semibold text-neutral-800" numberOfLines={2}>
                {item.product.name}
              </Text>
              <Text className="text-sm text-neutral-600">
                {item.product.category.name}
              </Text>
              <Text className="text-xs text-neutral-500">
                par {item.product.enterprise.companyName}
              </Text>
            </View>
            
            <TouchableOpacity
              onPress={() => handleRemoveItem(item._id)}
              className="p-1"
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
          
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className="text-sm text-neutral-600 mr-2">Quantité:</Text>
              <View className="flex-row items-center bg-neutral-100 rounded-lg">
                <TouchableOpacity
                  onPress={() => handleUpdateQuantity(item._id, item.quantity - 1)}
                  className="p-2"
                  disabled={updatingItem === item._id}
                >
                  <Ionicons name="remove" size={16} color="#6B7280" />
                </TouchableOpacity>
                
                <Text className="text-base font-quicksand-semibold text-neutral-800 px-3">
                  {item.quantity}
                </Text>
                
                <TouchableOpacity
                  onPress={() => handleUpdateQuantity(item._id, item.quantity + 1)}
                  className="p-2"
                  disabled={updatingItem === item._id || item.quantity >= item.product.stock}
                >
                  <Ionicons name="add" size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              {updatingItem === item._id && (
                <ActivityIndicator size="small" color="#6366F1" className="ml-2" />
              )}
            </View>
            
            <View className="items-end">
              <Text className="text-sm text-neutral-600">
                {formatPrice(item.pricePerUnit)} × {item.quantity}
              </Text>
              <Text className="text-lg font-quicksand-bold text-primary-500">
                {formatPrice(item.totalPrice)}
              </Text>
            </View>
          </View>
          
          {item.quantity >= item.product.stock && (
            <Text className="text-xs text-orange-600 mt-1">
              ⚠️ Stock limité ({item.product.stock} disponibles)
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  const renderEmptyCart = () => (
    <View className="flex-1 justify-center items-center px-6">
      <Ionicons name="cart-outline" size={80} color="#D1D5DB" />
      <Text className="text-xl font-quicksand-bold text-neutral-800 mt-4 mb-2">
        Votre panier est vide
      </Text>
      <Text className="text-center text-neutral-600 font-quicksand-medium mb-6">
        Explorez notre marketplace pour ajouter des produits à votre panier
      </Text>
      <TouchableOpacity 
        className="bg-primary-500 rounded-xl py-4 px-8"
        onPress={() => {
          // TODO: Navigate to marketplace
          console.log('Navigate to marketplace');
        }}
      >
        <Text className="text-white font-quicksand-semibold">
          Découvrir les produits
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background-secondary">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#6366F1" />
          <Text className="mt-4 text-neutral-600 font-quicksand-medium">
            Chargement du panier...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-background-secondary">
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="alert-circle-outline" size={80} color="#EF4444" />
          <Text className="text-xl font-quicksand-bold text-neutral-800 mt-4 mb-2">
            Erreur
          </Text>
          <Text className="text-center text-neutral-600 font-quicksand-medium mb-6">
            {error}
          </Text>
          <TouchableOpacity 
            className="bg-primary-500 rounded-xl py-4 px-8"
            onPress={loadCartData}
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
      {/* Header */}
      <View className="bg-white px-6 py-4 pt-16">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-quicksand-bold text-neutral-800">
            Mon Panier
          </Text>
          {cart && cart.items.length > 0 && (
            <TouchableOpacity 
              onPress={handleClearCart}
              className="bg-red-50 rounded-xl py-2 px-4"
            >
              <Text className="text-red-600 font-quicksand-semibold">
                Vider
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {cart && cart.items.length > 0 && (
          <Text className="text-sm text-neutral-600 mt-2">
            {cart.totalItems} article{cart.totalItems > 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {/* Cart Content */}
      {cart && cart.items.length > 0 ? (
        <>
          <FlatList
            data={cart.items}
            renderItem={renderCartItem}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#6366F1']}
              />
            }
          />
          
          {/* Cart Summary */}
          <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-quicksand-bold text-neutral-800">
                Total
              </Text>
              <Text className="text-2xl font-quicksand-bold text-primary-500">
                {formatPrice(cart.totalAmount)}
              </Text>
            </View>
            
            <TouchableOpacity
              className="bg-primary-500 rounded-xl py-4"
              onPress={handleCheckout}
            >
              <Text className="text-white font-quicksand-semibold text-center text-lg">
                Commander ({cart.totalItems} article{cart.totalItems > 1 ? 's' : ''})
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        renderEmptyCart()
      )}
    </SafeAreaView>
  );
}
