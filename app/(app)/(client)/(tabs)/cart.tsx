import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function CartScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }} // Add bottom padding to ensure content isn't hidden by tab bar
      >
        <View className="px-6 pt-20 pb-4 bg-white">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-quicksand-bold text-neutral-800">
            Mon panier
          </Text>
          <TouchableOpacity className="relative">
            <Ionicons name="notifications-outline" size={24} color="#374151" />
            <View className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1 justify-center items-center p-6">
        <Ionicons name="cart-outline" size={80} color="#CBD5E1" />
        <Text className="text-xl font-quicksand-bold text-neutral-700 mt-4 text-center">
          Votre panier est vide
        </Text>
        <Text className="text-base font-quicksand text-neutral-500 mt-2 text-center">
          Les produits ajoutés à votre panier apparaîtront ici
        </Text>
        <TouchableOpacity className="mt-6 bg-primary-500 rounded-2xl px-6 py-4">
          <Text className="text-white font-quicksand-semibold">
            Commencer mes achats
          </Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}
