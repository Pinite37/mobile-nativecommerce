import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
    Alert,
    SafeAreaView,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function AddressesScreen() {
  const router = useRouter();

  // Données fictives d'adresses
  const addresses = [
    {
      id: 1,
      title: "Domicile",
      recipient: "John Doe",
      address: "123 Rue du Commerce",
      city: "Cotonou",
      postalCode: "01 BP 1234",
      country: "Bénin",
      phone: "+229 97123456",
      isDefault: true,
    },
    {
      id: 2,
      title: "Bureau",
      recipient: "John Doe",
      address: "45 Avenue des Affaires",
      city: "Cotonou",
      postalCode: "01 BP 5678",
      country: "Bénin",
      phone: "+229 97654321",
      isDefault: false,
    },
  ];

  // Fonction pour supprimer une adresse
  const handleDeleteAddress = (id: number) => {
    Alert.alert(
      "Supprimer l'adresse",
      "Êtes-vous sûr de vouloir supprimer cette adresse ?",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive" }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      {/* Header avec bouton retour */}
      <View className="bg-white px-4 pt-16 pb-4 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-gray-100 justify-center items-center mr-4"
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-quicksand-bold text-neutral-800">
          Mes adresses
        </Text>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Liste des adresses */}
        <View className="mt-6">
          {addresses.map((address) => (
            <View
              key={address.id}
              className="bg-white rounded-2xl p-4 mb-4 border-l-4"
              style={{ borderLeftColor: address.isDefault ? "#FE8C00" : "#E5E7EB" }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Text className="text-lg font-quicksand-semibold text-neutral-800">
                    {address.title}
                  </Text>
                  {address.isDefault && (
                    <View className="bg-primary/10 px-2 py-1 rounded ml-2">
                      <Text className="text-xs font-quicksand-bold text-primary">
                        Par défaut
                      </Text>
                    </View>
                  )}
                </View>
                <View className="flex-row">
                  <TouchableOpacity 
                    className="mr-2"
                    onPress={() => {/* Navigation vers la page d'édition */}}
                  >
                    <Ionicons name="create-outline" size={20} color="#374151" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteAddress(address.id)}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="my-3 border-b border-gray-100" />

              <Text className="text-neutral-800 font-quicksand-medium mb-1">
                {address.recipient}
              </Text>
              <Text className="text-neutral-600 font-quicksand mb-1">
                {address.address}
              </Text>
              <Text className="text-neutral-600 font-quicksand mb-1">
                {address.postalCode}, {address.city}
              </Text>
              <Text className="text-neutral-600 font-quicksand mb-1">
                {address.country}
              </Text>
              <Text className="text-neutral-600 font-quicksand">
                {address.phone}
              </Text>

              {!address.isDefault && (
                <TouchableOpacity className="mt-3">
                  <Text className="text-primary font-quicksand-semibold">
                    Définir comme adresse par défaut
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Bouton ajouter une adresse */}
        <TouchableOpacity className="bg-white rounded-2xl p-4 mb-6 flex-row items-center justify-center">
          <Ionicons name="add-circle" size={24} color="#FE8C00" />
          <Text className="text-primary font-quicksand-bold text-base ml-2">
            Ajouter une nouvelle adresse
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
