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
const products = [
  {
    id: 1,
    name: "iPhone 14 Pro",
    price: 759000,
    stock: 25,
    sales: 24,
    image: "https://via.placeholder.com/80x80/3B82F6/FFFFFF?text=iPhone",
    category: "Téléphones",
    status: "active",
    rating: 4.8,
    reviews: 156,
  },
  {
    id: 2,
    name: "Samsung Galaxy S23",
    price: 559000,
    stock: 12,
    sales: 18,
    image: "https://via.placeholder.com/80x80/EF4444/FFFFFF?text=Samsung",
    category: "Téléphones",
    status: "active",
    rating: 4.6,
    reviews: 89,
  },
  {
    id: 3,
    name: "MacBook Air M2",
    price: 1250000,
    stock: 0,
    sales: 8,
    image: "https://via.placeholder.com/80x80/10B981/FFFFFF?text=MacBook",
    category: "Ordinateurs",
    status: "inactive",
    rating: 4.9,
    reviews: 45,
  },
  {
    id: 4,
    name: "AirPods Pro 2",
    price: 189000,
    stock: 48,
    sales: 32,
    image: "https://via.placeholder.com/80x80/F59E0B/FFFFFF?text=AirPods",
    category: "Accessoires",
    status: "active",
    rating: 4.7,
    reviews: 78,
  },
  {
    id: 5,
    name: "iPad Air 5",
    price: 429000,
    stock: 15,
    sales: 12,
    image: "https://via.placeholder.com/80x80/8B5CF6/FFFFFF?text=iPad",
    category: "Tablettes",
    status: "active",
    rating: 4.8,
    reviews: 34,
  },
];

const categories = [
  { id: "all", name: "Tous", count: 5 },
  { id: "phones", name: "Téléphones", count: 2 },
  { id: "computers", name: "Ordinateurs", count: 1 },
  { id: "accessories", name: "Accessoires", count: 1 },
  { id: "tablets", name: "Tablettes", count: 1 },
];

const sortOptions = [
  { id: "name", name: "Nom" },
  { id: "price", name: "Prix" },
  { id: "stock", name: "Stock" },
  { id: "sales", name: "Ventes" },
];

export default function EnterpriseProducts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSort, setSelectedSort] = useState("name");
  const [showFilters, setShowFilters] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return { color: '#10B981', bg: '#D1FAE5' };
      case 'inactive':
        return { color: '#EF4444', bg: '#FEE2E2' };
      default:
        return { color: '#6B7280', bg: '#F3F4F6' };
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { color: '#EF4444', text: 'Rupture' };
    if (stock <= 5) return { color: '#F59E0B', text: 'Stock faible' };
    return { color: '#10B981', text: 'En stock' };
  };

  const renderCategory = ({ item }: { item: typeof categories[0] }) => (
    <TouchableOpacity
      className={`mr-3 px-4 py-2 rounded-full ${
        selectedCategory === item.id
          ? "bg-primary-500"
          : "bg-white border border-neutral-200"
      }`}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Text
        className={`text-sm font-quicksand-medium ${
          selectedCategory === item.id ? "text-white" : "text-neutral-700"
        }`}
      >
        {item.name} ({item.count})
      </Text>
    </TouchableOpacity>
  );

  const renderProduct = ({ item }: { item: typeof products[0] }) => {
    const statusStyle = getStatusColor(item.status);
    const stockStatus = getStockStatus(item.stock);

    return (
      <TouchableOpacity className="bg-white rounded-2xl p-4 mx-4 mb-4 shadow-sm border border-neutral-100">
        <View className="flex-row">
          <Image
            source={{ uri: item.image }}
            className="w-20 h-20 rounded-xl"
            resizeMode="cover"
          />
          
          <View className="ml-4 flex-1">
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1">
                <Text className="text-base font-quicksand-semibold text-neutral-800">
                  {item.name}
                </Text>
                <Text className="text-sm text-neutral-600">
                  {item.category}
                </Text>
              </View>
              
              <View className="flex-row items-center space-x-2">
                <View
                  className="px-2 py-1 rounded-full"
                  style={{ backgroundColor: statusStyle.bg }}
                >
                  <Text
                    className="text-xs font-quicksand-semibold"
                    style={{ color: statusStyle.color }}
                  >
                    {item.status === 'active' ? 'Actif' : 'Inactif'}
                  </Text>
                </View>
                <TouchableOpacity>
                  <Ionicons name="ellipsis-horizontal" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
            
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
              
              <View className="flex-row items-center space-x-4">
                <View className="items-center">
                  <Text className="text-sm font-quicksand-bold text-neutral-800">
                    {item.stock}
                  </Text>
                  <Text
                    className="text-xs font-quicksand-medium"
                    style={{ color: stockStatus.color }}
                  >
                    {stockStatus.text}
                  </Text>
                </View>
                
                <View className="items-center">
                  <Text className="text-sm font-quicksand-bold text-neutral-800">
                    {item.sales}
                  </Text>
                  <Text className="text-xs font-quicksand-medium text-neutral-600">
                    Vendus
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        
        <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-neutral-100">
          <TouchableOpacity className="flex-1 bg-primary-500 rounded-xl py-3 mr-2">
            <Text className="text-white font-quicksand-semibold text-center">
              Modifier
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity className="flex-1 bg-background-secondary rounded-xl py-3 ml-2">
            <Text className="text-neutral-700 font-quicksand-semibold text-center">
              Dupliquer
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center px-6">
      <Ionicons name="cube-outline" size={80} color="#D1D5DB" />
      <Text className="text-xl font-quicksand-bold text-neutral-800 mt-4 mb-2">
        Aucun produit trouvé
      </Text>
      <Text className="text-center text-neutral-600 font-quicksand-medium mb-6">
        Commencez par ajouter vos premiers produits à votre catalogue
      </Text>
      <TouchableOpacity className="bg-primary-500 rounded-xl py-4 px-8">
        <Text className="text-white font-quicksand-semibold">
          Ajouter un produit
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      {/* Header */}
      <View className="bg-white px-6 py-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-quicksand-bold text-neutral-800">
            Mes Produits
          </Text>
          <TouchableOpacity className="bg-primary-500 rounded-xl py-2 px-4">
            <View className="flex-row items-center">
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text className="text-white font-quicksand-semibold ml-1">
                Ajouter
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filters */}
      <View className="px-6 py-4 space-y-4">
        <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 shadow-sm border border-neutral-100">
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            className="ml-3 flex-1 text-neutral-800 font-quicksand-medium"
            placeholder="Rechercher un produit..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
            <Ionicons name="options-outline" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 0 }}
        />

        {/* Sort and Filter Bar */}
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-quicksand-medium text-neutral-600">
            {products.length} produits
          </Text>
          
          <TouchableOpacity className="flex-row items-center bg-white rounded-xl px-3 py-2 shadow-sm border border-neutral-100">
            <Text className="text-sm font-quicksand-medium text-neutral-700 mr-1">
              Trier par {sortOptions.find(o => o.id === selectedSort)?.name}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Products List */}
      {products.length > 0 ? (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      ) : (
        renderEmptyState()
      )}
    </SafeAreaView>
  );
}
