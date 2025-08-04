import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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
import ProductService from "../../../../services/api/ProductService";
import { Product } from "../../../../types/product";

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
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState(beninCities[0].name);
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("");
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [neighborhoodModalVisible, setNeighborhoodModalVisible] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  
  // États pour les produits de l'API
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Données pour le carrousel d'annonces boostées
  const boostedAds = [
    {
      id: 1,
      title: "Votre entreprise",
      subtitle: "est visible",
      description: "Augmentez votre visibilité avec nos services",
      type: "main",
      bgColor: "#FE8C00",
      textColor: "#FFFFFF"
    },
    {
      id: 2,
      title: "Correcteur de posture",
      subtitle: "Soulage les douleurs dorsales",
      price: "15.000 FCFA",
      badge: "PROMO",
      type: "product",
      bgColor: "#FFFFFF",
      textColor: "#374151"
    },
    {
      id: 3,
      title: "Robe d'été",
      subtitle: "Collection été 2025",
      price: "25.000 FCFA",
      badge: "FLASH",
      type: "product",
      bgColor: "#FFFFFF",
      textColor: "#374151"
    },
    {
      id: 4,
      title: "Smartphone Samsung",
      subtitle: "Galaxy A54 - Neuf",
      price: "320.000 FCFA",
      badge: "NOUVEAU",
      type: "product",
      bgColor: "#FFFFFF",
      textColor: "#374151"
    }
  ];

  useEffect(() => {
    // Réinitialiser le quartier si la ville change
    setSelectedNeighborhood("");
  }, [selectedCity]);

  useEffect(() => {
    // Charger les produits populaires au montage
    loadFeaturedProducts();
  }, []);

  const loadFeaturedProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await ProductService.getPopularProducts(6);
      setFeaturedProducts(response.products);
    } catch (error) {
      console.error('❌ Erreur chargement produits populaires:', error);
    } finally {
      setLoadingProducts(false);
    }
  };
  
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



  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      className="bg-white rounded-xl mr-3 shadow-sm border border-neutral-100"
      onPress={() => router.push(`/(app)/(client)/product/${item._id}`)}
    >
      <View className="relative">
        <Image
          source={{ uri: item.images[0] || "https://via.placeholder.com/150x150/CCCCCC/FFFFFF?text=No+Image" }}
          className="w-36 h-28 rounded-t-xl"
          resizeMode="cover"
        />
        {/* Badge pour les produits avec beaucoup de ventes */}
        {item.stats.totalSales > 10 && (
          <View className="absolute top-2 right-2 bg-success-500 rounded-full px-2 py-1">
            <Text className="text-white text-xs font-quicksand-bold">
              Populaire
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
            {item.stats.averageRating.toFixed(1)}
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
            <TouchableOpacity 
              className="flex-row items-center bg-white rounded-xl px-4 py-3 shadow-md"
              onPress={() => router.push('/(app)/(client)/(tabs)/search')}
            >
              <Ionicons name="search" size={20} color="#9CA3AF" />
              <Text className="ml-3 flex-1 text-neutral-500 font-quicksand-medium">
                Que cherchez-vous ?
              </Text>
              <Ionicons name="options-outline" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Annonces Boostées / Publicités - Carrousel */}
        <View className="py-4">
          <View className="flex-row items-center justify-between mb-4 px-4">
            <Text className="text-lg font-quicksand-bold text-neutral-800">
              Annonces Boostées
            </Text>
            <TouchableOpacity className="flex-row items-center">
              <Text className="text-primary-500 font-quicksand-medium text-sm mr-1">
                Voir tout
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#FE8C00" />
            </TouchableOpacity>
          </View>
          
          <View className="relative">
            <FlatList
              ref={useRef(null)}
              data={boostedAds}
              renderItem={({ item }) => {
                const screenWidth = Dimensions.get('window').width;
                const cardWidth = screenWidth - 32; // 16px padding de chaque côté
                
                if (item.type === "main") {
                  return (
                    <View style={{ width: screenWidth, paddingHorizontal: 16 }}>
                      <TouchableOpacity 
                        className="rounded-2xl p-6 shadow-md"
                        style={{ 
                          backgroundColor: item.bgColor,
                          width: cardWidth,
                          minHeight: 140
                        }}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-1">
                            <Text 
                              className="font-quicksand-bold text-xl mb-2"
                              style={{ color: item.textColor }}
                            >
                              {item.title}
                            </Text>
                            <Text 
                              className="font-quicksand-bold text-2xl mb-1"
                              style={{ color: item.textColor }}
                            >
                              {item.subtitle}
                            </Text>
                            <Text 
                              className="font-quicksand-medium text-sm mb-4 opacity-90"
                              style={{ color: item.textColor }}
                            >
                              {item.description}
                            </Text>
                            <View className="bg-white rounded-full px-4 py-2 self-start">
                              <Text className="text-primary-500 font-quicksand-bold text-sm">
                                En savoir plus
                              </Text>
                            </View>
                          </View>
                          <View className="ml-4 items-center">
                            <View className="bg-white/20 rounded-full p-3 mb-2">
                              <Ionicons name="megaphone" size={32} color="white" />
                            </View>
                            <View className="bg-error-500 rounded-full px-3 py-1">
                              <Text className="text-white font-quicksand-bold text-xs">
                                ICI
                              </Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                } else {
                  return (
                    <View style={{ width: screenWidth, paddingHorizontal: 16 }}>
                      <TouchableOpacity 
                        className="rounded-2xl p-4 shadow-sm border border-neutral-100"
                        style={{ 
                          backgroundColor: item.bgColor,
                          width: cardWidth,
                          minHeight: 140
                        }}
                      >
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="bg-success-100 rounded-full px-2 py-1">
                            <Text className="text-success-600 font-quicksand-bold text-xs">
                              {item.badge}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                        </View>
                        <Text 
                          className="font-quicksand-bold text-sm mb-1"
                          style={{ color: item.textColor }}
                        >
                          {item.title}
                        </Text>
                        <Text 
                          className="font-quicksand-medium text-xs mb-2 opacity-75"
                          style={{ color: item.textColor }}
                        >
                          {item.subtitle}
                        </Text>
                        <Text className="text-primary-500 font-quicksand-bold text-sm">
                          {item.price}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                }
              }}
              keyExtractor={(item) => item.id.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const newIndex = Math.round(event.nativeEvent.contentOffset.x / Dimensions.get('window').width);
                setCurrentAdIndex(newIndex);
              }}
            />
            
            {/* Indicateurs de pagination */}
            <View className="flex-row justify-center mt-4">
              {boostedAds.map((_, index) => (
                <View
                  key={index}
                  className={`w-2 h-2 rounded-full mx-1 ${
                    index === currentAdIndex ? 'bg-primary-500' : 'bg-neutral-300'
                  }`}
                />
              ))}
            </View>
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
            keyExtractor={(item) => item._id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            ListEmptyComponent={
              loadingProducts ? (
                <View className="flex-1 justify-center items-center py-8">
                  <ActivityIndicator size="large" color="#FE8C00" />
                  <Text className="mt-2 text-neutral-600 font-quicksand-medium">
                    Chargement des produits...
                  </Text>
                </View>
              ) : (
                <View className="flex-1 justify-center items-center py-8">
                  <Text className="text-neutral-600 font-quicksand-medium">
                    Aucun produit disponible
                  </Text>
                </View>
              )
            }
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

        {/* Bannière Promotionnelle Finale */}
        <View className="px-4 py-6">
          <TouchableOpacity className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 shadow-lg">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-white font-quicksand-bold text-lg mb-1">
                  DealToo
                </Text>
                <Text className="text-white/90 font-quicksand-medium text-sm mb-3">
                  Votre marketplace #1 au Bénin
                </Text>
                <View className="bg-white/20 rounded-full px-4 py-2 self-start">
                  <Text className="text-white font-quicksand-bold text-sm">
                    Découvrir plus
                  </Text>
                </View>
              </View>
              <View className="ml-4">
                <View className="bg-white/20 rounded-full p-3">
                  <Ionicons name="storefront" size={32} color="white" />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section Flash Deals inspirée de l'interface */}
        <View className="px-4 pb-8">
          <View className="bg-primary-50 rounded-2xl p-4 border border-primary-200">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center">
                <View className="bg-error-500 rounded-full p-2 mr-3">
                  <Ionicons name="flash" size={16} color="white" />
                </View>
                <Text className="text-primary-700 font-quicksand-bold text-sm">
                  Ventes Flash
                </Text>
              </View>
              <Text className="text-primary-600 font-quicksand-medium text-xs">
                Se termine dans 2h
              </Text>
            </View>
            <Text className="text-primary-600 font-quicksand-medium text-xs">
              Profitez des meilleures offres avant qu&apos;il ne soit trop tard !
            </Text>
          </View>
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
