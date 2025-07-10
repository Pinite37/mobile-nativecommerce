import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Image,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function ProductDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id } = params;

  // État local pour la quantité de produit
  const [quantity, setQuantity] = useState(1);

  // Données fictives pour les détails du produit
  const product = {
    id: id || '1',
    name: "iPhone 14 Pro Max",
    description: "Le dernier iPhone avec la technologie Dynamic Island, puce A16 Bionic, et un système de caméra pro de 48MP.",
    price: 729000,
    discountPrice: 699000,
    rating: 4.8,
    reviews: 245,
    image: "https://via.placeholder.com/400x400/3B82F6/FFFFFF?text=iPhone+14+Pro",
    images: [
      "https://via.placeholder.com/400x400/3B82F6/FFFFFF?text=iPhone+Image+1",
      "https://via.placeholder.com/400x400/3B82F6/FFFFFF?text=iPhone+Image+2",
      "https://via.placeholder.com/400x400/3B82F6/FFFFFF?text=iPhone+Image+3",
    ],
    colors: ["#1F2937", "#FBBF24", "#FFFFFF"],
    seller: {
      name: "TechStore Cotonou",
      verified: true,
      rating: 4.7,
    }
  };

  // Formatage du prix
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  // Gérer la quantité
  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const increaseQuantity = () => {
    setQuantity(quantity + 1);
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header avec bouton de retour et partage */}
      <View className="pt-12 px-4 flex-row justify-between items-center absolute top-0 left-0 right-0 z-10 bg-white/80">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/90 justify-center items-center shadow-sm"
        >
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <View className="flex-row">
          <TouchableOpacity className="w-10 h-10 rounded-full bg-white/90 justify-center items-center shadow-sm mr-2">
            <Ionicons name="heart-outline" size={22} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity className="w-10 h-10 rounded-full bg-white/90 justify-center items-center shadow-sm">
            <Ionicons name="share-outline" size={22} color="#1F2937" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 pt-24 pb-32">
        {/* Image du produit */}
        <View className="w-full h-80 bg-gray-100">
          <Image
            source={{ uri: product.image }}
            className="w-full h-full"
            resizeMode="contain"
          />
        </View>

        {/* Images miniatures */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
        >
          {product.images.map((image, index) => (
            <TouchableOpacity
              key={index}
              className="w-16 h-16 rounded-lg mr-3 border-2 border-primary overflow-hidden"
            >
              <Image
                source={{ uri: image }}
                className="w-full h-full"
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Détails du produit */}
        <View className="px-4">
          {/* Nom et prix */}
          <Text className="text-2xl font-quicksand-bold text-gray-900 mb-2 mt-2">
            {product.name}
          </Text>

          <View className="flex-row items-center mb-4">
            <Text className="text-xl font-quicksand-bold text-primary mr-3">
              {formatPrice(product.discountPrice)}
            </Text>
            <Text className="text-sm font-quicksand-medium text-gray-500 line-through">
              {formatPrice(product.price)}
            </Text>
            <View className="ml-3 px-2 py-1 bg-primary/10 rounded">
              <Text className="text-xs font-quicksand-bold text-primary">
                -{Math.round(((product.price - product.discountPrice) / product.price) * 100)}%
              </Text>
            </View>
          </View>

          {/* Évaluation */}
          <View className="flex-row items-center mb-4">
            <View className="flex-row">
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= Math.floor(product.rating) ? "star" : "star-outline"}
                  size={16}
                  color="#F59E0B"
                />
              ))}
            </View>
            <Text className="text-sm font-quicksand-medium text-gray-700 ml-2">
              {product.rating} ({product.reviews} avis)
            </Text>
          </View>

          {/* Vendeur */}
          <TouchableOpacity className="flex-row items-center mb-4 bg-gray-50 p-3 rounded-lg">
            <View className="w-10 h-10 bg-gray-200 rounded-full justify-center items-center">
              <Text className="font-quicksand-bold text-gray-700">TS</Text>
            </View>
            <View className="ml-3">
              <View className="flex-row items-center">
                <Text className="text-sm font-quicksand-bold text-gray-900 mr-1">
                  {product.seller.name}
                </Text>
                {product.seller.verified && (
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                )}
              </View>
              <View className="flex-row items-center">
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text className="text-xs font-quicksand-medium text-gray-700 ml-1">
                  {product.seller.rating}
                </Text>
              </View>
            </View>
            <View className="ml-auto">
              <TouchableOpacity className="px-3 py-1 border border-primary rounded-full">
                <Text className="text-xs font-quicksand-medium text-primary">Visiter</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          {/* Sélection de couleur */}
          <Text className="text-base font-quicksand-bold text-gray-900 mb-3">
            Couleur
          </Text>
          <View className="flex-row mb-4">
            {product.colors.map((color, index) => (
              <TouchableOpacity
                key={index}
                className="w-8 h-8 rounded-full mr-3 border-2 border-gray-300 justify-center items-center"
              >
                <View
                  style={{ backgroundColor: color }}
                  className="w-6 h-6 rounded-full"
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Quantité */}
          <Text className="text-base font-quicksand-bold text-gray-900 mb-3">
            Quantité
          </Text>
          <View className="flex-row items-center mb-6">
            <TouchableOpacity
              onPress={decreaseQuantity}
              className="w-10 h-10 bg-gray-100 rounded-l-lg justify-center items-center"
            >
              <Ionicons name="remove" size={20} color="#4B5563" />
            </TouchableOpacity>
            <View className="w-12 h-10 bg-gray-100 justify-center items-center">
              <Text className="text-base font-quicksand-semibold text-gray-900">
                {quantity}
              </Text>
            </View>
            <TouchableOpacity
              onPress={increaseQuantity}
              className="w-10 h-10 bg-gray-100 rounded-r-lg justify-center items-center"
            >
              <Ionicons name="add" size={20} color="#4B5563" />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text className="text-base font-quicksand-bold text-gray-900 mb-3">
            Description
          </Text>
          <Text className="text-sm font-quicksand-medium text-gray-700 mb-8 leading-5">
            {product.description}
          </Text>
        </View>
      </ScrollView>

      {/* Barre d'action flottante en bas */}
      <View className="absolute bottom-0 left-0 right-0 bg-white py-4 px-4 flex-row items-center border-t border-gray-100 shadow-lg">
        <View className="flex-1 mr-3">
          <Text className="text-xs font-quicksand-medium text-gray-700">Prix total</Text>
          <Text className="text-lg font-quicksand-bold text-primary">
            {formatPrice(product.discountPrice * quantity)}
          </Text>
        </View>
        <TouchableOpacity className="flex-1 bg-primary py-3 rounded-xl justify-center items-center">
          <Text className="text-base font-quicksand-bold text-white">
            Ajouter au panier
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
