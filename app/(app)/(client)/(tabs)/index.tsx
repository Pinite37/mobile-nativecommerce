import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useAuth } from "../../../../contexts/AuthContext";

// Données des villes et quartiers du Bénin
const beninCities = [
  { id: 1, name: "Cotonou" },
  { id: 2, name: "Porto-Novo" },
  { id: 3, name: "Parakou" },
  { id: 4, name: "Abomey-Calavi" },
  { id: 5, name: "Bohicon" },
  { id: 6, name: "Natitingou" },
  { id: 7, name: "Ouidah" },
  { id: 8, name: "Djougou" },
];

const neighborhoodsByCity: { [key: string]: string[] } = {
  "Cotonou": [
    "Akpakpa", "Cadjehoun", "Fidjrossè", "Gbégamey", "Houéyiho", 
    "Jéricho", "Menontin", "Patte d'Oie", "Ste Rita", "Vedoko", "Zongo"
  ],
  "Porto-Novo": [
    "Adjarra", "Adjohoun", "Aguégué", "Akpro-Missérété", "Avrankou", "Dangbo"
  ],
  "Parakou": [
    "Albarika", "Banikanni", "Ladjifarani", "Titirou", "Zongo"
  ],
  "Abomey-Calavi": [
    "Akassato", "Arconville", "Godomey", "Tankpè", "Togoudo", "Zinvié"
  ],
  "Bohicon": [
    "Agongointo", "Avogbanna", "Lissèzoun", "Ouassaho", "Passagon", "Sodohomè"
  ],
  "Natitingou": [
    "Boriyouré", "Kouaba", "Péporiyakou", "Takonta", "Yarikou"
  ],
  "Ouidah": [
    "Avlékété", "Djègbadji", "Houakpè", "Pahou", "Savi"
  ],
  "Djougou": [
    "Bariénou", "Bougou", "Kolokondé", "Partago", "Sérou"
  ],
};

// Données fictives
const categories = [
  { id: 1, name: "Tendances", icon: "flame", color: "#FF6B35" },
  { id: 2, name: "Véhicules", icon: "car-sport", color: "#3B82F6" },
  { id: 3, name: "Immobilier", icon: "home", color: "#8B5CF6" },
  { id: 4, name: "Téléphones", icon: "phone-portrait", color: "#EC4899" },
  { id: 5, name: "Électronique", icon: "laptop", color: "#10B981" },
  { id: 6, name: "Meubles", icon: "bed", color: "#6366F1" },
  { id: 7, name: "Mode", icon: "shirt", color: "#EF4444" },
  { id: 8, name: "Services", icon: "construct", color: "#F59E0B" },
  { id: 9, name: "Emplois", icon: "briefcase", color: "#0EA5E9" },
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
  const [selectedCity, setSelectedCity] = useState(beninCities[0].name);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("");
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [neighborhoodModalVisible, setNeighborhoodModalVisible] = useState(false);
  
  useEffect(() => {
    // Réinitialiser le quartier si la ville change
    setSelectedNeighborhood("");
  }, [selectedCity]);
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };



  const greetUser = () => {
    const hours = new Date().getHours();
    if (hours < 12) {
      return "Bonjour";
    } else if (hours < 18) {
      return "Bon après-midi";
    } else {
      return "Bonsoir";
    }
  };
  

  
  // Fonction pour sélectionner une ville
  const selectCity = (cityName: string) => {
    setSelectedCity(cityName);
    setCityModalVisible(false);
  };
  
  // Fonction pour sélectionner un quartier
  const selectNeighborhood = (neighborhoodName: string) => {
    setSelectedNeighborhood(neighborhoodName);
    setNeighborhoodModalVisible(false);
  };



  const renderProduct = ({ item }: { item: typeof featuredProducts[0] }) => (
    <TouchableOpacity className="bg-white rounded-xl mr-3 shadow-sm border border-neutral-100">
      <View className="relative">
        <Image
          source={{ uri: item.image }}
          className="w-36 h-28 rounded-t-xl"
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
      <View className="p-2">
        <Text numberOfLines={1} className="text-xs font-quicksand-semibold text-neutral-800">
          {item.name}
        </Text>
        <View className="flex-row items-center my-1">
          <Ionicons name="star" size={12} color="#FE8C00" />
          <Text className="text-xs text-neutral-500 ml-1">
            {item.rating}
          </Text>
        </View>
        <Text className="text-sm font-quicksand-bold text-primary-600">
          {formatPrice(item.price)}
        </Text>
      </View>
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
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }} // Add bottom padding to ensure content isn't hidden by tab bar
      >
        {/* Location & Search Area - Orange background with greeting */}
        <View className="bg-primary py-6 pt-16">
          {/* Header with greeting and notification icon */}
          <View className="px-6 pb-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-quicksand-medium text-white opacity-90">
                  {greetUser()},
                </Text>
                <Text className="text-lg font-quicksand-bold text-white">
                  {user ? `${user.firstName} ${user.lastName}` : 'Utilisateur'}
                </Text>
              </View>
              <TouchableOpacity className="relative">
                <Ionicons name="notifications-outline" size={24} color="white" />
                <View className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Location Selection */}
          <View className="flex-row justify-between px-6 mb-4">
            <TouchableOpacity 
              onPress={() => setCityModalVisible(true)}
              className="bg-primary-700 flex-1 rounded-2xl py-3 px-4 mr-2"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-white font-quicksand-medium">
                  {selectedCity || "Toutes les villes"}
                </Text>
                <Ionicons name="chevron-down-outline" size={16} color="white" />
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => selectedCity && setNeighborhoodModalVisible(true)}
              className="bg-primary-700 flex-1 rounded-2xl py-3 px-4 ml-2"
              disabled={!selectedCity}
            >
              <View className="flex-row items-center justify-between">
                <Text className={`font-quicksand-medium ${selectedNeighborhood ? "text-white" : "text-gray-300"}`}>
                  {selectedNeighborhood || "Tous les quartiers"}
                </Text>
                <Ionicons name="chevron-down-outline" size={16} color="white" />
              </View>
            </TouchableOpacity>
          </View>
          
          {/* Search Bar */}
          <View className="px-6">
            <TouchableOpacity className="flex-row items-center bg-white rounded-xl px-4 py-3 shadow-md">
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <Text className="ml-3 flex-1 text-neutral-500 font-quicksand-medium">
                Que cherchez-vous ?
              </Text>
              <Ionicons name="options-outline" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Categories Grid Style */}
        <View className="py-4 bg-background-secondary">
          <Text className="text-lg font-quicksand-bold text-neutral-800 px-6 mb-4">
            Catégories
          </Text>
          <View className="flex-row flex-wrap justify-center px-3">
            {categories.slice(0, 8).map((category) => (
              <View key={category.id} style={{ width: '25%', paddingHorizontal: 5, marginBottom: 14 }}>
                <TouchableOpacity className="items-center">
                  <View
                    className="w-14 h-14 rounded-xl justify-center items-center mb-2"
                    style={{ backgroundColor: category.color + '15' }}
                  >
                    <Ionicons name={category.icon as any} size={22} color={category.color} />
                  </View>
                  <Text className="text-xs font-quicksand-medium text-neutral-700 text-center">
                    {category.name}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Featured Products */}
        <View className="pt-4 pb-2">
          <View className="px-4 mb-4">
            <Text className="text-base font-quicksand-bold text-neutral-800">
              Produits populaires
            </Text>
          </View>
          <FlatList
            data={featuredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        </View>

        {/* Popular Stores */}
        <View className="py-4 pb-8">
          <View className="px-4 mb-4">
            <Text className="text-base font-quicksand-bold text-neutral-800">
              Boutiques populaires
            </Text>
          </View>
          <FlatList
            data={popularStores}
            renderItem={renderStore}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        </View>
      </ScrollView>
      
      {/* Modal de sélection de ville */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={cityModalVisible}
        onRequestClose={() => setCityModalVisible(false)}
      >
        <View className="flex-1 bg-transparent justify-end">
          <View className="bg-white rounded-t-3xl pb-10 pt-4 px-4">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-lg font-quicksand-bold text-neutral-800">
                Choisir une ville
              </Text>
              <TouchableOpacity onPress={() => setCityModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={beninCities}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => selectCity(item.name)}
                  className="py-3 border-b border-gray-100"
                >
                  <Text 
                    className={`text-base font-quicksand-medium ${
                      selectedCity === item.name ? 'text-primary' : 'text-neutral-700'
                    }`}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
      
      {/* Modal de sélection de quartier */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={neighborhoodModalVisible}
        onRequestClose={() => setNeighborhoodModalVisible(false)}
      >
        <View className="flex-1 bg-transparent justify-end">
          <View className="bg-white rounded-t-3xl pb-10 pt-4 px-4">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-lg font-quicksand-bold text-neutral-800">
                Choisir un quartier à {selectedCity}
              </Text>
              <TouchableOpacity onPress={() => setNeighborhoodModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={neighborhoodsByCity[selectedCity] || []}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  onPress={() => selectNeighborhood(item)}
                  className="py-3 border-b border-gray-100"
                >
                  <Text 
                    className={`text-base font-quicksand-medium ${
                      selectedNeighborhood === item ? 'text-primary' : 'text-neutral-700'
                    }`}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
