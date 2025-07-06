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
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  date: string;
  status: "pending" | "confirmed" | "preparing" | "ready" | "shipping" | "delivered" | "cancelled";
  total: number;
  items: OrderItem[];
  deliveryAddress: string;
  paymentMethod: string;
  notes?: string;
}

// Données fictives
const orders: Order[] = [
  {
    id: "CMD-2024-001",
    customer: {
      name: "Jean Dupont",
      phone: "+229 12 34 56 78",
      email: "jean.dupont@email.com",
    },
    date: "2024-01-22T10:30:00Z",
    status: "pending",
    total: 125000,
    deliveryAddress: "Cotonou, Fidjrossè - Rue de la Paix, Maison Bleue",
    paymentMethod: "Mobile Money",
    notes: "Appeler avant la livraison",
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
        name: "Coque iPhone 14",
        price: 15000,
        quantity: 2,
        image: "https://via.placeholder.com/60x60/10B981/FFFFFF?text=Case",
      },
    ],
  },
  {
    id: "CMD-2024-002",
    customer: {
      name: "Marie Claire",
      phone: "+229 98 76 54 32",
      email: "marie.claire@email.com",
    },
    date: "2024-01-22T14:15:00Z",
    status: "confirmed",
    total: 89000,
    deliveryAddress: "Cotonou, Akpakpa - Carrefour Gbégamey",
    paymentMethod: "Espèces",
    items: [
      {
        id: 3,
        name: "AirPods Pro 2",
        price: 189000,
        quantity: 1,
        image: "https://via.placeholder.com/60x60/F59E0B/FFFFFF?text=AirPods",
      },
    ],
  },
  {
    id: "CMD-2024-003",
    customer: {
      name: "Paul Martin",
      phone: "+229 11 22 33 44",
      email: "paul.martin@email.com",
    },
    date: "2024-01-21T16:45:00Z",
    status: "preparing",
    total: 156000,
    deliveryAddress: "Cotonou, Dantokpa - Marché Central",
    paymentMethod: "Carte bancaire",
    items: [
      {
        id: 4,
        name: "Samsung Galaxy S23",
        price: 559000,
        quantity: 1,
        image: "https://via.placeholder.com/60x60/EF4444/FFFFFF?text=Samsung",
      },
    ],
  },
  {
    id: "CMD-2024-004",
    customer: {
      name: "Sophie Ouédraogo",
      phone: "+229 55 66 77 88",
      email: "sophie.ouedraogo@email.com",
    },
    date: "2024-01-21T09:20:00Z",
    status: "ready",
    total: 1250000,
    deliveryAddress: "Cotonou, Cadjehoun - Près de l'aéroport",
    paymentMethod: "Virement",
    items: [
      {
        id: 5,
        name: "MacBook Air M2",
        price: 1250000,
        quantity: 1,
        image: "https://via.placeholder.com/60x60/10B981/FFFFFF?text=MacBook",
      },
    ],
  },
];

const statusConfig = {
  pending: { color: "#F59E0B", bg: "#FEF3C7", text: "En attente", icon: "time" },
  confirmed: { color: "#3B82F6", bg: "#DBEAFE", text: "Confirmée", icon: "checkmark-circle" },
  preparing: { color: "#8B5CF6", bg: "#EDE9FE", text: "Préparation", icon: "construct" },
  ready: { color: "#10B981", bg: "#D1FAE5", text: "Prête", icon: "checkmark-done" },
  shipping: { color: "#F59E0B", bg: "#FEF3C7", text: "En livraison", icon: "car" },
  delivered: { color: "#10B981", bg: "#D1FAE5", text: "Livrée", icon: "checkmark-done-circle" },
  cancelled: { color: "#EF4444", bg: "#FEE2E2", text: "Annulée", icon: "close-circle" },
};

const filterOptions = [
  { id: "all", name: "Toutes", count: 4 },
  { id: "pending", name: "En attente", count: 1 },
  { id: "confirmed", name: "Confirmées", count: 1 },
  { id: "preparing", name: "Préparation", count: 1 },
  { id: "ready", name: "Prêtes", count: 1 },
  { id: "shipping", name: "En livraison", count: 0 },
  { id: "delivered", name: "Livrées", count: 0 },
];

export default function EnterpriseOrders() {
  const [selectedFilter, setSelectedFilter] = useState("all");

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredOrders = selectedFilter === "all" 
    ? orders 
    : orders.filter(order => order.status === selectedFilter);

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = {
      pending: "confirmed",
      confirmed: "preparing",
      preparing: "ready",
      ready: "shipping",
      shipping: "delivered",
    };
    return statusFlow[currentStatus as keyof typeof statusFlow];
  };

  const getStatusAction = (status: string) => {
    const actions = {
      pending: "Confirmer",
      confirmed: "Préparer",
      preparing: "Marquer prêt",
      ready: "Expédier",
      shipping: "Marquer livrée",
    };
    return actions[status as keyof typeof actions];
  };

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
        className="w-10 h-10 rounded-lg"
        resizeMode="cover"
      />
      <View className="ml-3 flex-1">
        <Text className="text-sm font-quicksand-medium text-neutral-800">
          {item.name}
        </Text>
        <Text className="text-xs text-neutral-600">
          {item.quantity} × {formatPrice(item.price)}
        </Text>
      </View>
    </View>
  );

  const renderOrder = ({ item }: { item: Order }) => {
    const status = statusConfig[item.status];
    const nextStatus = getNextStatus(item.status);
    const statusAction = getStatusAction(item.status);

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
            className="flex-row items-center px-3 py-1 rounded-full"
            style={{ backgroundColor: status.bg }}
          >
            <Ionicons name={status.icon as any} size={14} color={status.color} />
            <Text
              className="text-xs font-quicksand-semibold ml-1"
              style={{ color: status.color }}
            >
              {status.text}
            </Text>
          </View>
        </View>

        {/* Customer Info */}
        <View className="bg-background-secondary rounded-xl p-3 mb-3">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-quicksand-semibold text-neutral-800">
              {item.customer.name}
            </Text>
            <TouchableOpacity>
              <Ionicons name="call" size={16} color="#10B981" />
            </TouchableOpacity>
          </View>
          <Text className="text-xs text-neutral-600 mb-1">
            {item.customer.phone}
          </Text>
          <Text className="text-xs text-neutral-600 mb-2">
            {item.customer.email}
          </Text>
          <View className="flex-row items-start">
            <Ionicons name="location" size={14} color="#6B7280" />
            <Text className="text-xs text-neutral-600 ml-1 flex-1">
              {item.deliveryAddress}
            </Text>
          </View>
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

        {/* Payment Info */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Ionicons name="card" size={16} color="#6B7280" />
            <Text className="text-sm font-quicksand-medium text-neutral-700 ml-2">
              {item.paymentMethod}
            </Text>
          </View>
          <Text className="text-lg font-quicksand-bold text-primary-500">
            {formatPrice(item.total)}
          </Text>
        </View>

        {/* Notes */}
        {item.notes && (
          <View className="bg-warning-50 rounded-lg p-2 mb-3">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={16} color="#F59E0B" />
              <Text className="text-sm font-quicksand-medium text-warning-600 ml-2 flex-1">
                {item.notes}
              </Text>
            </View>
          </View>
        )}

        {/* Actions */}
        <View className="flex-row items-center justify-between pt-3 border-t border-neutral-100">
          <TouchableOpacity className="flex-row items-center">
            <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
            <Text className="text-sm font-quicksand-medium text-neutral-700 ml-2">
              Contacter
            </Text>
          </TouchableOpacity>
          
          <View className="flex-row items-center space-x-2">
            {item.status !== "delivered" && item.status !== "cancelled" && nextStatus && (
              <TouchableOpacity className="bg-primary-500 rounded-lg px-4 py-2">
                <Text className="text-white text-sm font-quicksand-semibold">
                  {statusAction}
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity className="bg-background-secondary rounded-lg px-4 py-2">
              <Text className="text-neutral-700 text-sm font-quicksand-semibold">
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
      <Ionicons name="receipt-outline" size={80} color="#D1D5DB" />
      <Text className="text-xl font-quicksand-bold text-neutral-800 mt-4 mb-2">
        Aucune commande trouvée
      </Text>
      <Text className="text-center text-neutral-600 font-quicksand-medium mb-6">
        Les commandes de vos clients apparaîtront ici
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      {/* Header */}
      <View className="bg-white px-6 py-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-quicksand-bold text-neutral-800">
            Commandes
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
