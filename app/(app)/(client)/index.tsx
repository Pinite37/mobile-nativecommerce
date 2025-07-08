import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    FlatList,
    Image,
    SafeAreaView,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from '../../../contexts/AuthContext';

// Données fictives
const categories = [
  { id: 1, name: "Électronique", icon: "phone-portrait", color: "#3B82F6" },
  { id: 2, name: "Mode", icon: "shirt", color: "#EF4444" },
  { id: 3, name: "Maison", icon: "home", color: "#10B981" },
  { id: 4, name: "Sports", icon: "football", color: "#F59E0B" },
];

const featuredProducts = [
  {
    id: 1,
    name: "iPhone 14 Pro",
    price: 659000,
    image: "https://via.placeholder.com/150x150/3B82F6/FFFFFF?text=iPhone",
    rating: 4.8,
    reviews: 245,
    discount: 15,
  },
  {
    id: 2,
    name: "Samsung Galaxy S23",
    price: 459000,
    image: "https://via.placeholder.com/150x150/EF4444/FFFFFF?text=Samsung",
    rating: 4.6,
    reviews: 189,
    discount: 10,
  },
  {
    id: 3,
    name: "MacBook Air M2",
    price: 1250000,
    image: "https://via.placeholder.com/150x150/10B981/FFFFFF?text=MacBook",
    rating: 4.9,
    reviews: 78,
    discount: 8,
  },
];

const popularStores = [
  {
    id: 1,
    name: "TechStore Cotonou",
    category: "Électronique",
    rating: 4.7,
    image: "https://via.placeholder.com/80x80/3B82F6/FFFFFF?text=TS",
    verified: true,
  },
  {
    id: 2,
    name: "Fashion Plus",
    category: "Mode",
    rating: 4.5,
    image: "https://via.placeholder.com/80x80/EF4444/FFFFFF?text=FP",
    verified: true,
  },
  {
    id: 3,
    name: "Home Decor",
    category: "Maison",
    rating: 4.8,
    image: "https://via.placeholder.com/80x80/10B981/FFFFFF?text=HD",
    verified: false,
  },
];

export default function ClientHome() {
  const { user } = useAuth();
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const renderCategory = ({ item }: { item: typeof categories[0] }) => (
    <TouchableOpacity className="items-center mx-4 my-2">
      <View
        className="w-16 h-16 rounded-full justify-center items-center mb-2"
        style={{ backgroundColor: item.color + '20' }}
      >
        <Ionicons name={item.icon as any} size={24} color={item.color} />
      </View>
      <Text className="text-xs font-quicksand-medium text-neutral-700 text-center">
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderProduct = ({ item }: { item: typeof featuredProducts[0] }) => (
    <TouchableOpacity className="bg-white rounded-2xl p-4 mr-4 shadow-sm border border-neutral-100">
      <View className="relative">
        <Image
          source={{ uri: item.image }}
          className="w-32 h-32 rounded-xl mb-3"
          resizeMode="cover"
        />
        {item.discount > 0 && (
          <View className="absolute top-2 right-2 bg-error-500 rounded-full px-2 py-1">
            <Text className="text-white text-xs font-quicksand-bold">
              -{item.discount}%
            </Text>
          </View>
        )}
      </View>
      <Text className="text-sm font-quicksand-semibold text-neutral-800 mb-1">
        {item.name}
      </Text>
      <View className="flex-row items-center mb-2">
        <Ionicons name="star" size={14} color="#FE8C00" />
        <Text className="text-xs text-neutral-600 ml-1">
          {item.rating} ({item.reviews})
        </Text>
      </View>
      <Text className="text-base font-quicksand-bold text-primary-500">
        {formatPrice(item.price)}
      </Text>
    </TouchableOpacity>
  );

  const renderStore = ({ item }: { item: typeof popularStores[0] }) => (
    <TouchableOpacity className="bg-white rounded-2xl p-4 mr-4 shadow-sm border border-neutral-100">
      <View className="flex-row items-center">
        <Image
          source={{ uri: item.image }}
          className="w-12 h-12 rounded-xl"
          resizeMode="cover"
        />
        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Text className="text-sm font-quicksand-semibold text-neutral-800">
              {item.name}
            </Text>
            {item.verified && (
              <Ionicons name="checkmark-circle" size={16} color="#10B981" className="ml-1" />
            )}
          </View>
          <Text className="text-xs text-neutral-600 mt-1">
            {item.category}
          </Text>
          <View className="flex-row items-center mt-1">
            <Ionicons name="star" size={12} color="#FE8C00" />
            <Text className="text-xs text-neutral-600 ml-1">
              {item.rating}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-20 pb-4 bg-white">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-quicksand-medium text-neutral-600">
                Bonjour,
              </Text>
              <Text className="text-lg font-quicksand-bold text-neutral-800">
                {user ? `${user.firstName} ${user.lastName}` : 'Utilisateur'}
              </Text>
            </View>
            <TouchableOpacity className="relative">
              <Ionicons name="notifications-outline" size={24} color="#374151" />
              <View className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View className="px-6 py-4">
          <TouchableOpacity className="flex-row items-center bg-white rounded-2xl px-4 py-3 shadow-sm">
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <Text className="ml-3 flex-1 text-neutral-500 font-quicksand-medium">
              Que cherchez-vous ?
            </Text>
            <Ionicons name="options-outline" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View className="py-4">
          <Text className="text-lg font-quicksand-bold text-neutral-800 px-6 mb-4">
            Catégories
          </Text>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        </View>

        {/* Featured Products */}
        <View className="py-4">
          <View className="flex-row items-center justify-between px-6 mb-4">
            <Text className="text-lg font-quicksand-bold text-neutral-800">
              Produits populaires
            </Text>
            <TouchableOpacity>
              <Text className="text-sm font-quicksand-semibold text-primary-500">
                Voir tout
              </Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={featuredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24 }}
          />
        </View>

        {/* Popular Stores */}
        <View className="py-4 pb-8">
          <View className="flex-row items-center justify-between px-6 mb-4">
            <Text className="text-lg font-quicksand-bold text-neutral-800">
              Boutiques populaires
            </Text>
            <TouchableOpacity>
              <Text className="text-sm font-quicksand-semibold text-primary-500">
                Voir tout
              </Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={popularStores}
            renderItem={renderStore}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24 }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
