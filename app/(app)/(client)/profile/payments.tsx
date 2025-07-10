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

export default function PaymentsScreen() {
  const router = useRouter();

  // Données fictives des moyens de paiement
  const paymentMethods = [
    {
      id: 1,
      type: "card",
      name: "Visa",
      lastDigits: "4242",
      expiryDate: "05/25",
      isDefault: true,
      icon: "card-outline",
      color: "#3B82F6",
    },
    {
      id: 2,
      type: "card",
      name: "Mastercard",
      lastDigits: "8888",
      expiryDate: "10/24",
      isDefault: false,
      icon: "card-outline",
      color: "#EF4444",
    },
    {
      id: 3,
      type: "mobile",
      name: "Mobile Money",
      lastDigits: "7890",
      expiryDate: null,
      isDefault: false,
      icon: "phone-portrait-outline",
      color: "#F59E0B",
    },
  ];

  // Fonction pour supprimer un moyen de paiement
  const handleDeletePayment = (id: number) => {
    Alert.alert(
      "Supprimer le moyen de paiement",
      "Êtes-vous sûr de vouloir supprimer ce moyen de paiement ?",
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
          Moyens de paiement
        </Text>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Liste des moyens de paiement */}
        <View className="mt-6">
          {paymentMethods.map((method) => (
            <View
              key={method.id}
              className="bg-white rounded-2xl p-4 mb-4 border-l-4"
              style={{ borderLeftColor: method.isDefault ? "#FE8C00" : "#E5E7EB" }}
            >
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <View 
                    className="w-12 h-12 rounded-full justify-center items-center mr-3" 
                    style={{ backgroundColor: `${method.color}20` }}
                  >
                    <Ionicons name={method.icon as any} size={24} color={method.color} />
                  </View>
                  <View>
                    <View className="flex-row items-center">
                      <Text className="text-base font-quicksand-bold text-neutral-800 mr-2">
                        {method.name}
                      </Text>
                      {method.isDefault && (
                        <View className="bg-primary/10 px-2 py-1 rounded">
                          <Text className="text-xs font-quicksand-bold text-primary">
                            Par défaut
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-sm font-quicksand text-neutral-600">
                      {method.type === "card"
                        ? `**** **** **** ${method.lastDigits}`
                        : `**** **** ${method.lastDigits}`}
                    </Text>
                    {method.expiryDate && (
                      <Text className="text-xs font-quicksand text-neutral-500">
                        Expire le {method.expiryDate}
                      </Text>
                    )}
                  </View>
                </View>
                <View className="flex-row">
                  <TouchableOpacity 
                    className="mr-2"
                    onPress={() => {/* Navigation vers la page d'édition */}}
                  >
                    <Ionicons name="create-outline" size={20} color="#374151" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeletePayment(method.id)}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {!method.isDefault && (
                <TouchableOpacity className="mt-3">
                  <Text className="text-primary font-quicksand-semibold">
                    Définir par défaut
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Bouton ajouter un moyen de paiement */}
        <View className="mb-8">
          <TouchableOpacity className="bg-white rounded-2xl p-4 flex-row items-center justify-center">
            <Ionicons name="add-circle" size={24} color="#FE8C00" />
            <Text className="text-primary font-quicksand-bold text-base ml-2">
              Ajouter un moyen de paiement
            </Text>
          </TouchableOpacity>
        </View>

        {/* Note de sécurité */}
        <View className="bg-gray-50 rounded-xl p-4 mb-6">
          <View className="flex-row items-center mb-2">
            <Ionicons name="shield-checkmark-outline" size={20} color="#10B981" />
            <Text className="text-base font-quicksand-bold text-neutral-800 ml-2">
              Paiements sécurisés
            </Text>
          </View>
          <Text className="text-sm font-quicksand text-neutral-600">
            Vos informations de paiement sont cryptées et stockées en toute sécurité. Nous ne stockons jamais vos données bancaires complètes sur nos serveurs.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
