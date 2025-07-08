import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    FlatList,
    Image,
    SafeAreaView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// Données fictives
const favoriteProducts = [
  {
    id: 1,
    name: "iPhone 14 Pro Max",
    price: 759000,
    originalPrice: 899000,
    image: "https://via.placeholder.com/150x150/3B82F6/FFFFFF?text=iPhone",
    rating: 4.8,
    reviews: 245,
    store: "TechStore Cotonou",
    inStock: true,
    discount: 15,
    dateAdded: "2024-01-15",
  },
  {
    id: 2,
    name: "MacBook Air M2",
    price: 1250000,
    originalPrice: 1350000,
    image: "https://via.placeholder.com/150x150/10B981/FFFFFF?text=MacBook",
    rating: 4.9,
    reviews: 78,
    store: "Apple Store Cotonou",
    inStock: true,
    discount: 7,
    dateAdded: "2024-01-10",
  },
  {
    id: 3,
    name: "Samsung Galaxy S23 Ultra",
    price: 559000,
    originalPrice: 629000,
    image: "https://via.placeholder.com/150x150/EF4444/FFFFFF?text=Samsung",
    rating: 4.6,
    reviews: 189,
    store: "Mobile World",
    inStock: false,
    discount: 11,
    dateAdded: "2024-01-05",
  },
  {
    id: 4,
    name: "AirPods Pro 2",
    price: 189000,
    originalPrice: 219000,
    image: "https://via.placeholder.com/150x150/F59E0B/FFFFFF?text=AirPods",
    rating: 4.7,
    reviews: 312,
    store: "Audio Plus",
    inStock: true,
    discount: 14,
    dateAdded: "2024-01-08",
  },
  {
    id: 5,
    name: "iPad Air 5",
    price: 429000,
    originalPrice: 499000,
    image: "https://via.placeholder.com/150x150/8B5CF6/FFFFFF?text=iPad",
    rating: 4.8,
    reviews: 156,
    store: "Digital Store",
    inStock: true,
    discount: 14,
    dateAdded: "2024-01-12",
  },
];

const categories = [
  { id: 1, name: "Tous", count: 5, selected: true },
  { id: 2, name: "Téléphones", count: 2, selected: false },
  { id: 3, name: "Ordinateurs", count: 2, selected: false },
  { id: 4, name: "Accessoires", count: 1, selected: false },
];

export default function ClientFavorites() {
  const [selectedCategory, setSelectedCategory] = useState(1);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const toggleItemSelection = (itemId: number) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const removeFromFavorites = (itemId: number) => {
    // Logic to remove item from favorites
    console.log('Remove from favorites:', itemId);
  };

  const renderCategory = ({ item }: { item: typeof categories[0] }) => (
    <TouchableOpacity
      className={`mr-3 px-4 py-2 rounded-full ${
        item.selected
          ? "bg-primary-500"
          : "bg-white border border-neutral-200"
      }`}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Text
        className={`text-sm font-quicksand-medium ${
          item.selected ? "text-white" : "text-neutral-700"
        }`}
      >
        {item.name} ({item.count})
      </Text>
    </TouchableOpacity>
  );

  const renderProduct = ({ item }: { item: typeof favoriteProducts[0] }) => (
    <TouchableOpacity className="bg-white rounded-2xl p-4 mx-4 mb-4 shadow-sm border border-neutral-100">
      <View className="flex-row">
        <View className="relative">
          <Image
            source={{ uri: item.image }}
            className="w-24 h-24 rounded-xl"
            resizeMode="cover"
          />
          {item.discount > 0 && (
            <View className="absolute top-1 left-1 bg-error-500 rounded-full px-2 py-1">
              <Text className="text-white text-xs font-quicksand-bold">
                -{item.discount}%
              </Text>
            </View>
          )}
        </View>
        
        <View className="ml-4 flex-1">
          <View className="flex-row items-start justify-between mb-1">
            <Text className="text-base font-quicksand-semibold text-neutral-800 flex-1 pr-2">
              {item.name}
            </Text>
            <TouchableOpacity
              onPress={() => removeFromFavorites(item.id)}
              className="p-1"
            >
              <Ionicons name="heart" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
          
          <Text className="text-sm text-neutral-600 mb-1">
            {item.store}
          </Text>
          
          <View className="flex-row items-center mb-2">
            <Ionicons name="star" size={14} color="#FE8C00" />
            <Text className="text-xs text-neutral-600 ml-1">
              {item.rating} ({item.reviews} avis)
            </Text>
          </View>
          
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-quicksand-bold text-primary-500">
                {formatPrice(item.price)}
              </Text>
              {item.discount > 0 && (
                <Text className="text-sm font-quicksand-medium text-neutral-500 line-through">
                  {formatPrice(item.originalPrice)}
                </Text>
              )}
            </View>
            
            <View className="flex-row items-center">
              <View
                className={`w-2 h-2 rounded-full mr-2 ${
                  item.inStock ? "bg-success-500" : "bg-error-500"
                }`}
              />
              <Text
                className={`text-xs font-quicksand-medium ${
                  item.inStock ? "text-success-600" : "text-error-600"
                }`}
              >
                {item.inStock ? "En stock" : "Rupture"}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-neutral-100">
        <TouchableOpacity
          className="flex-1 bg-primary-500 rounded-xl py-3 mr-2"
          disabled={!item.inStock}
        >
          <Text className="text-white font-quicksand-semibold text-center">
            {item.inStock ? "Ajouter au panier" : "Indisponible"}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity className="bg-background-secondary rounded-xl py-3 px-4">
          <Ionicons name="share-outline" size={20} color="#374151" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center px-6">
      <Ionicons name="heart-outline" size={80} color="#D1D5DB" />
      <Text className="text-xl font-quicksand-bold text-neutral-800 mt-4 mb-2">
        Aucun favori pour le moment
      </Text>
      <Text className="text-center text-neutral-600 font-quicksand-medium mb-6">
        Ajoutez des produits à vos favoris pour les retrouver facilement ici
      </Text>
      <TouchableOpacity className="bg-primary-500 rounded-xl py-4 px-8">
        <Text className="text-white font-quicksand-semibold">
          Découvrir des produits
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      {/* Header */}
      <View className="bg-white pt-20 px-6 py-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-quicksand-bold text-neutral-800">
            Favoris
          </Text>
          <TouchableOpacity>
            <Ionicons name="search" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      {favoriteProducts.length > 0 ? (
        <>
          {/* Categories */}
          <View className="py-4">
            <FlatList
              data={categories}
              renderItem={renderCategory}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24 }}
            />
          </View>

          {/* Sort Options */}
          <View className="flex-row items-center justify-between px-6 py-2">
            <Text className="text-sm font-quicksand-medium text-neutral-600">
              {favoriteProducts.length} produits
            </Text>
            <TouchableOpacity className="flex-row items-center">
              <Text className="text-sm font-quicksand-medium text-neutral-600 mr-1">
                Trier par date
              </Text>
              <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Products List */}
          <FlatList
            data={favoriteProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </>
      ) : (
        renderEmptyState()
      )}
    </SafeAreaView>
  );
}
