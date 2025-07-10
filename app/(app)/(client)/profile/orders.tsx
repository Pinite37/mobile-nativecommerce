import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    FlatList,
    Image,
    SafeAreaView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function OrdersScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("all");

  // Données fictives des commandes
  const orders = [
    {
      id: "CMD001",
      date: "2023-05-15",
      status: "delivered",
      totalItems: 3,
      totalAmount: 187500,
      items: [
        {
          id: 1,
          name: "iPhone 14",
          price: 150000,
          image: "https://via.placeholder.com/80x80/3B82F6/FFFFFF?text=iPhone",
          quantity: 1,
        },
        {
          id: 2,
          name: "Écouteurs sans fil",
          price: 37500,
          image: "https://via.placeholder.com/80x80/10B981/FFFFFF?text=Écouteurs",
          quantity: 1,
        },
      ],
    },
    {
      id: "CMD002",
      date: "2023-06-02",
      status: "processing",
      totalItems: 1,
      totalAmount: 55000,
      items: [
        {
          id: 3,
          name: "Smart Watch",
          price: 55000,
          image: "https://via.placeholder.com/80x80/F59E0B/FFFFFF?text=Watch",
          quantity: 1,
        },
      ],
    },
    {
      id: "CMD003",
      date: "2023-06-10",
      status: "cancelled",
      totalItems: 2,
      totalAmount: 120000,
      items: [
        {
          id: 4,
          name: "Casque audio",
          price: 120000,
          image: "https://via.placeholder.com/80x80/EF4444/FFFFFF?text=Casque",
          quantity: 1,
        },
      ],
    },
  ];

  // Filtrer les commandes en fonction de l'onglet actif
  const filteredOrders = activeTab === "all"
    ? orders
    : orders.filter(order => order.status === activeTab);

  // Formatage du prix
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  // Formatage de la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Traduction du statut
  const getStatusText = (status: string) => {
    switch(status) {
      case "delivered": return "Livré";
      case "processing": return "En cours";
      case "cancelled": return "Annulé";
      default: return "Inconnu";
    }
  };

  // Couleur du statut
  const getStatusColor = (status: string) => {
    switch(status) {
      case "delivered": return "#10B981";
      case "processing": return "#F59E0B";
      case "cancelled": return "#EF4444";
      default: return "#6B7280";
    }
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
          Mes commandes
        </Text>
      </View>

      {/* Onglets de filtre */}
      <View className="bg-white px-4 py-3 flex-row border-t border-gray-100">
        <TouchableOpacity
          onPress={() => setActiveTab("all")}
          className={`mr-4 pb-2 ${
            activeTab === "all" ? "border-b-2 border-primary" : ""
          }`}
        >
          <Text
            className={`font-quicksand-medium ${
              activeTab === "all" ? "text-primary" : "text-gray-500"
            }`}
          >
            Toutes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("processing")}
          className={`mr-4 pb-2 ${
            activeTab === "processing" ? "border-b-2 border-primary" : ""
          }`}
        >
          <Text
            className={`font-quicksand-medium ${
              activeTab === "processing" ? "text-primary" : "text-gray-500"
            }`}
          >
            En cours
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("delivered")}
          className={`mr-4 pb-2 ${
            activeTab === "delivered" ? "border-b-2 border-primary" : ""
          }`}
        >
          <Text
            className={`font-quicksand-medium ${
              activeTab === "delivered" ? "text-primary" : "text-gray-500"
            }`}
          >
            Livrées
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("cancelled")}
          className={`mr-4 pb-2 ${
            activeTab === "cancelled" ? "border-b-2 border-primary" : ""
          }`}
        >
          <Text
            className={`font-quicksand-medium ${
              activeTab === "cancelled" ? "text-primary" : "text-gray-500"
            }`}
          >
            Annulées
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste des commandes */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="bg-white rounded-2xl p-4 mb-4"
            onPress={() => {/* Navigation vers le détail de la commande */}}
          >
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center">
                <Text className="text-base font-quicksand-bold text-neutral-800">
                  {item.id}
                </Text>
                <View
                  className="ml-2 px-2 py-1 rounded"
                  style={{ backgroundColor: `${getStatusColor(item.status)}20` }}
                >
                  <Text
                    className="text-xs font-quicksand-bold"
                    style={{ color: getStatusColor(item.status) }}
                  >
                    {getStatusText(item.status)}
                  </Text>
                </View>
              </View>
              <Text className="text-sm font-quicksand text-neutral-500">
                {formatDate(item.date)}
              </Text>
            </View>

            <View className="my-2 border-b border-gray-100" />

            {/* Aperçu des articles */}
            <View className="flex-row">
              <View className="flex-row flex-wrap">
                {item.items.slice(0, 3).map((product, index) => (
                  <Image
                    key={product.id}
                    source={{ uri: product.image }}
                    className="w-12 h-12 rounded-md mr-2 mb-2"
                  />
                ))}
                {item.items.length > 3 && (
                  <View className="w-12 h-12 rounded-md bg-gray-100 justify-center items-center">
                    <Text className="font-quicksand-bold text-neutral-700">
                      +{item.items.length - 3}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View className="flex-row justify-between items-center mt-3">
              <Text className="text-sm font-quicksand-medium text-neutral-600">
                {item.totalItems} {item.totalItems > 1 ? 'articles' : 'article'}
              </Text>
              <View className="flex-row items-center">
                <Text className="text-base font-quicksand-bold text-neutral-800">
                  {formatPrice(item.totalAmount)}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </View>

            {item.status === "delivered" && (
              <View className="mt-3 flex-row">
                <TouchableOpacity className="flex-1 bg-primary/10 py-2 rounded-lg mr-2">
                  <Text className="text-center text-primary font-quicksand-semibold">
                    Acheter à nouveau
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity className="flex-1 bg-neutral-100 py-2 rounded-lg">
                  <Text className="text-center text-neutral-700 font-quicksand-semibold">
                    Évaluer
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
