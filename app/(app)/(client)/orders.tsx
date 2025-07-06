import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    FlatList,
    Image,
    SafeAreaView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// Types
interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface Order {
  id: string;
  date: string;
  status: "pending" | "confirmed" | "shipping" | "delivered" | "cancelled";
  total: number;
  items: OrderItem[];
  store: string;
  deliveryAddress: string;
  trackingNumber?: string;
}

// Données fictives
const orders: Order[] = [
  {
    id: "CMD-2024-001",
    date: "2024-01-15",
    status: "delivered",
    total: 948000,
    store: "TechStore Cotonou",
    deliveryAddress: "Cotonou, Fidjrossè",
    trackingNumber: "TRK123456789",
    items: [
      {
        id: 1,
        name: "iPhone 14 Pro",
        price: 759000,
        quantity: 1,
        image: "https://via.placeholder.com/60x60/3B82F6/FFFFFF?text=iPhone",
      },
      {
        id: 2,
        name: "Coque iPhone 14 Pro",
        price: 15000,
        quantity: 1,
        image: "https://via.placeholder.com/60x60/10B981/FFFFFF?text=Case",
      },
    ],
  },
  {
    id: "CMD-2024-002",
    date: "2024-01-18",
    status: "shipping",
    total: 1250000,
    store: "Apple Store Cotonou",
    deliveryAddress: "Cotonou, Akpakpa",
    trackingNumber: "TRK987654321",
    items: [
      {
        id: 3,
        name: "MacBook Air M2",
        price: 1250000,
        quantity: 1,
        image: "https://via.placeholder.com/60x60/10B981/FFFFFF?text=MacBook",
      },
    ],
  },
  {
    id: "CMD-2024-003",
    date: "2024-01-20",
    status: "confirmed",
    total: 559000,
    store: "Mobile World",
    deliveryAddress: "Cotonou, Dantokpa",
    items: [
      {
        id: 4,
        name: "Samsung Galaxy S23 Ultra",
        price: 559000,
        quantity: 1,
        image: "https://via.placeholder.com/60x60/EF4444/FFFFFF?text=Samsung",
      },
    ],
  },
  {
    id: "CMD-2024-004",
    date: "2024-01-22",
    status: "pending",
    total: 189000,
    store: "Audio Plus",
    deliveryAddress: "Cotonou, Cadjehoun",
    items: [
      {
        id: 5,
        name: "AirPods Pro 2",
        price: 189000,
        quantity: 1,
        image: "https://via.placeholder.com/60x60/F59E0B/FFFFFF?text=AirPods",
      },
    ],
  },
];

const statusConfig = {
  pending: { color: "#F59E0B", bg: "#FEF3C7", text: "En attente" },
  confirmed: { color: "#3B82F6", bg: "#DBEAFE", text: "Confirmée" },
  shipping: { color: "#8B5CF6", bg: "#EDE9FE", text: "En livraison" },
  delivered: { color: "#10B981", bg: "#D1FAE5", text: "Livrée" },
  cancelled: { color: "#EF4444", bg: "#FEE2E2", text: "Annulée" },
};

const filterOptions = [
  { id: "all", name: "Toutes", count: 4 },
  { id: "pending", name: "En attente", count: 1 },
  { id: "confirmed", name: "Confirmées", count: 1 },
  { id: "shipping", name: "En livraison", count: 1 },
  { id: "delivered", name: "Livrées", count: 1 },
];

export default function ClientOrders() {
  const [selectedFilter, setSelectedFilter] = useState("all");

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const filteredOrders = selectedFilter === "all" 
    ? orders 
    : orders.filter(order => order.status === selectedFilter);

  const renderFilterOption = ({ item }: { item: typeof filterOptions[0] }) => (
    <TouchableOpacity
      className={`mr-3 px-4 py-2 rounded-full ${
        selectedFilter === item.id
          ? "bg-primary-500"
          : "bg-white border border-neutral-200"
      }`}
      onPress={() => setSelectedFilter(item.id)}
    >
      <Text
        className={`text-sm font-quicksand-medium ${
          selectedFilter === item.id ? "text-white" : "text-neutral-700"
        }`}
      >
        {item.name} ({item.count})
      </Text>
    </TouchableOpacity>
  );

  const renderOrderItem = ({ item }: { item: OrderItem }) => (
    <View className="flex-row items-center py-2">
      <Image
        source={{ uri: item.image }}
        className="w-12 h-12 rounded-lg"
        resizeMode="cover"
      />
      <View className="ml-3 flex-1">
        <Text className="text-sm font-quicksand-medium text-neutral-800">
          {item.name}
        </Text>
        <Text className="text-xs text-neutral-600">
          Qté: {item.quantity} × {formatPrice(item.price)}
        </Text>
      </View>
    </View>
  );

  const renderOrder = ({ item }: { item: Order }) => {
    const status = statusConfig[item.status];
    
    return (
      <TouchableOpacity className="bg-white rounded-2xl p-4 mx-4 mb-4 shadow-sm border border-neutral-100">
        {/* Order Header */}
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-base font-quicksand-bold text-neutral-800">
              {item.id}
            </Text>
            <Text className="text-sm text-neutral-600">
              {formatDate(item.date)}
            </Text>
          </View>
          <View
            className="px-3 py-1 rounded-full"
            style={{ backgroundColor: status.bg }}
          >
            <Text
              className="text-xs font-quicksand-semibold"
              style={{ color: status.color }}
            >
              {status.text}
            </Text>
          </View>
        </View>

        {/* Store Info */}
        <View className="flex-row items-center mb-3">
          <Ionicons name="storefront-outline" size={16} color="#6B7280" />
          <Text className="text-sm font-quicksand-medium text-neutral-700 ml-2">
            {item.store}
          </Text>
        </View>

        {/* Order Items */}
        <View className="border-t border-neutral-100 pt-3 mb-3">
          <FlatList
            data={item.items}
            renderItem={renderOrderItem}
            keyExtractor={(orderItem) => orderItem.id.toString()}
            scrollEnabled={false}
          />
        </View>

        {/* Total and Actions */}
        <View className="flex-row items-center justify-between pt-3 border-t border-neutral-100">
          <View>
            <Text className="text-lg font-quicksand-bold text-primary-500">
              {formatPrice(item.total)}
            </Text>
            <Text className="text-xs text-neutral-600">
              {item.items.length} article{item.items.length > 1 ? 's' : ''}
            </Text>
          </View>
          
          <View className="flex-row items-center space-x-2">
            {item.status === "shipping" && item.trackingNumber && (
              <TouchableOpacity className="bg-secondary-500 rounded-lg px-3 py-2 mr-2">
                <Text className="text-white text-xs font-quicksand-semibold">
                  Suivre
                </Text>
              </TouchableOpacity>
            )}
            
            {item.status === "delivered" && (
              <TouchableOpacity className="bg-success-500 rounded-lg px-3 py-2 mr-2">
                <Text className="text-white text-xs font-quicksand-semibold">
                  Évaluer
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity className="bg-background-secondary rounded-lg px-3 py-2">
              <Text className="text-neutral-700 text-xs font-quicksand-semibold">
                Détails
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center px-6">
      <Ionicons name="bag-outline" size={80} color="#D1D5DB" />
      <Text className="text-xl font-quicksand-bold text-neutral-800 mt-4 mb-2">
        Aucune commande trouvée
      </Text>
      <Text className="text-center text-neutral-600 font-quicksand-medium mb-6">
        Vous n&apos;avez pas encore passé de commande ou aucune commande ne correspond à votre filtre
      </Text>
      <TouchableOpacity className="bg-primary-500 rounded-xl py-4 px-8">
        <Text className="text-white font-quicksand-semibold">
          Commencer mes achats
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
            Mes Commandes
          </Text>
          <TouchableOpacity>
            <Ionicons name="search" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <View className="py-4">
        <FlatList
          data={filterOptions}
          renderItem={renderFilterOption}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24 }}
        />
      </View>

      {/* Orders List */}
      {filteredOrders.length > 0 ? (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      ) : (
        renderEmptyState()
      )}
    </SafeAreaView>
  );
}
