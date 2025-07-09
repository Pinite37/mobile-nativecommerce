import React from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

export default function ClientHome() {
  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-6">
          <Text className="text-2xl font-quicksand-bold text-neutral-800 mb-4">
            Accueil Client
          </Text>
          <Text className="text-neutral-600 font-quicksand">
            Bienvenue sur l&apos;interface client de NativeCommerce
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
