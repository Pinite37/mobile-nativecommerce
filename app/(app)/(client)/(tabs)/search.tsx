import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    FlatList,
    Image,
    SafeAreaView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

// Données fictives
const recentSearches = [
  "iPhone 14",
  "Samsung Galaxy",
  "MacBook Pro",
  "AirPods",
  "iPad Air",
];

const searchResults = [
  {
    id: 1,
    name: "iPhone 14 Pro Max",
    price: 759000,
    image: "https://via.placeholder.com/100x100/3B82F6/FFFFFF?text=iPhone",
    rating: 4.8,
    reviews: 245,
    store: "TechStore Cotonou",
    inStock: true,
  },
  {
    id: 2,
    name: "Samsung Galaxy S23 Ultra",
    price: 559000,
    image: "https://via.placeholder.com/100x100/EF4444/FFFFFF?text=Samsung",
    rating: 4.6,
    reviews: 189,
    store: "Mobile World",
    inStock: true,
  },
  {
    id: 3,
    name: "Google Pixel 7 Pro",
    price: 429000,
    image: "https://via.placeholder.com/100x100/10B981/FFFFFF?text=Pixel",
    rating: 4.7,
    reviews: 156,
    store: "Phone Center",
    inStock: false,
  },
  {
    id: 4,
    name: "OnePlus 11",
    price: 389000,
    image: "https://via.placeholder.com/100x100/F59E0B/FFFFFF?text=OnePlus",
    rating: 4.5,
    reviews: 98,
    store: "Digital Plaza",
    inStock: true,
  },
];

const categories = [
  { id: 1, name: "Tous", selected: true },
  { id: 2, name: "Téléphones", selected: false },
  { id: 3, name: "Ordinateurs", selected: false },
  { id: 4, name: "Accessoires", selected: false },
];

const filters = [
  { id: 1, name: "Prix", icon: "pricetag-outline" },
  { id: 2, name: "Marque", icon: "business-outline" },
  { id: 3, name: "Note", icon: "star-outline" },
  { id: 4, name: "Disponibilité", icon: "checkmark-circle-outline" },
];

export default function ClientSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(1);
  const [isSearching, setIsSearching] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setIsSearching(text.length > 0);
  };

  const renderRecentSearch = ({ item }: { item: string }) => (
    <TouchableOpacity
      className="flex-row items-center py-3 px-4 border-b border-neutral-100"
      onPress={() => handleSearch(item)}
    >
      <Ionicons name="time-outline" size={20} color="#9CA3AF" />
      <Text className="ml-3 flex-1 text-neutral-700 font-quicksand-medium">
        {item}
      </Text>
      <TouchableOpacity>
        <Ionicons name="close" size={18} color="#9CA3AF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

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
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderFilter = ({ item }: { item: typeof filters[0] }) => (
    <TouchableOpacity className="flex-row items-center bg-white rounded-xl px-4 py-3 mr-3 shadow-sm border border-neutral-100">
      <Ionicons name={item.icon as any} size={18} color="#374151" />
      <Text className="ml-2 text-sm font-quicksand-medium text-neutral-700">
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderProduct = ({ item }: { item: typeof searchResults[0] }) => (
    <TouchableOpacity className="bg-white rounded-2xl p-4 mx-4 mb-4 shadow-sm border border-neutral-100">
      <View className="flex-row">
        <Image
          source={{ uri: item.image }}
          className="w-20 h-20 rounded-xl"
          resizeMode="cover"
        />
        <View className="ml-4 flex-1">
          <Text className="text-base font-quicksand-semibold text-neutral-800 mb-1">
            {item.name}
          </Text>
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
            <Text className="text-lg font-quicksand-bold text-primary-500">
              {formatPrice(item.price)}
            </Text>
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
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      {/* Search Header */}
      <View className="bg-white px-6 py-4 pt-20">
        <View className="flex-row items-center bg-background-secondary rounded-2xl px-4 py-3">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            className="ml-3 flex-1 text-neutral-800 font-quicksand-medium"
            placeholder="Rechercher des produits..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!isSearching ? (
        /* Recent Searches */
        <View className="flex-1">
          <Text className="text-lg font-quicksand-bold text-neutral-800 px-6 py-4">
            Recherches récentes
          </Text>
          <FlatList
            data={recentSearches}
            renderItem={renderRecentSearch}
            keyExtractor={(item, index) => index.toString()}
            className="bg-white mx-4 rounded-2xl"
          />
        </View>
      ) : (
        /* Search Results */
        <View className="flex-1">
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

          {/* Filters */}
          <View className="py-2">
            <FlatList
              data={filters}
              renderItem={renderFilter}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24 }}
            />
          </View>

          {/* Results Header */}
          <View className="flex-row items-center justify-between px-6 py-4">
            <Text className="text-base font-quicksand-semibold text-neutral-800">
              {searchResults.length} résultats pour &quot;{searchQuery}&quot;
            </Text>
            <TouchableOpacity className="flex-row items-center">
              <Text className="text-sm font-quicksand-medium text-neutral-600 mr-1">
                Trier
              </Text>
              <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Results */}
          <FlatList
            data={searchResults}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
