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
interface Delivery {
  id: string;
  orderId: string;
  customer: {
    name: string;
    phone: string;
    address: string;
  };
  driver: {
    name: string;
    phone: string;
    vehicle: string;
    photo: string;
  };
  status: "assigned" | "picked_up" | "in_transit" | "delivered" | "failed";
  scheduledDate: string;
  deliveredDate?: string;
  total: number;
  items: number;
  trackingNumber: string;
  notes?: string;
}

// Données fictives
const deliveries: Delivery[] = [
  {
    id: "LIV-2024-001",
    orderId: "CMD-2024-001",
    customer: {
      name: "Jean Dupont",
      phone: "+229 12 34 56 78",
      address: "Cotonou, Fidjrossè - Rue de la Paix, Maison Bleue",
    },
    driver: {
      name: "Koffi Mensah",
      phone: "+229 90 12 34 56",
      vehicle: "Moto - AB 123 CD",
      photo: "https://via.placeholder.com/40x40/3B82F6/FFFFFF?text=KM",
    },
    status: "in_transit",
    scheduledDate: "2024-01-22T15:00:00Z",
    total: 125000,
    items: 2,
    trackingNumber: "TRK123456789",
    notes: "Appeler avant la livraison",
  },
  {
    id: "LIV-2024-002",
    orderId: "CMD-2024-002",
    customer: {
      name: "Marie Claire",
      phone: "+229 98 76 54 32",
      address: "Cotonou, Akpakpa - Carrefour Gbégamey",
    },
    driver: {
      name: "Ibrahim Sow",
      phone: "+229 91 23 45 67",
      vehicle: "Vélo - BC 456 EF",
      photo: "https://via.placeholder.com/40x40/10B981/FFFFFF?text=IS",
    },
    status: "picked_up",
    scheduledDate: "2024-01-22T16:30:00Z",
    total: 89000,
    items: 1,
    trackingNumber: "TRK987654321",
  },
  {
    id: "LIV-2024-003",
    orderId: "CMD-2024-003",
    customer: {
      name: "Paul Martin",
      phone: "+229 11 22 33 44",
      address: "Cotonou, Dantokpa - Marché Central",
    },
    driver: {
      name: "Fatou Diallo",
      phone: "+229 92 34 56 78",
      vehicle: "Voiture - CD 789 GH",
      photo: "https://via.placeholder.com/40x40/EF4444/FFFFFF?text=FD",
    },
    status: "delivered",
    scheduledDate: "2024-01-21T14:00:00Z",
    deliveredDate: "2024-01-21T14:25:00Z",
    total: 156000,
    items: 1,
    trackingNumber: "TRK456789123",
  },
  {
    id: "LIV-2024-004",
    orderId: "CMD-2024-004",
    customer: {
      name: "Sophie Ouédraogo",
      phone: "+229 55 66 77 88",
      address: "Cotonou, Cadjehoun - Près de l'aéroport",
    },
    driver: {
      name: "Moussa Traoré",
      phone: "+229 93 45 67 89",
      vehicle: "Moto - DE 012 IJ",
      photo: "https://via.placeholder.com/40x40/F59E0B/FFFFFF?text=MT",
    },
    status: "assigned",
    scheduledDate: "2024-01-23T10:00:00Z",
    total: 1250000,
    items: 1,
    trackingNumber: "TRK789123456",
  },
];

const statusConfig = {
  assigned: { color: "#F59E0B", bg: "#FEF3C7", text: "Assignée", icon: "person" },
  picked_up: { color: "#3B82F6", bg: "#DBEAFE", text: "Récupérée", icon: "bag" },
  in_transit: { color: "#8B5CF6", bg: "#EDE9FE", text: "En transit", icon: "car" },
  delivered: { color: "#10B981", bg: "#D1FAE5", text: "Livrée", icon: "checkmark-circle" },
  failed: { color: "#EF4444", bg: "#FEE2E2", text: "Échec", icon: "close-circle" },
};

const filterOptions = [
  { id: "all", name: "Toutes", count: 4 },
  { id: "assigned", name: "Assignées", count: 1 },
  { id: "picked_up", name: "Récupérées", count: 1 },
  { id: "in_transit", name: "En transit", count: 1 },
  { id: "delivered", name: "Livrées", count: 1 },
  { id: "failed", name: "Échecs", count: 0 },
];

export default function EnterpriseDeliveries() {
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

  const filteredDeliveries = selectedFilter === "all" 
    ? deliveries 
    : deliveries.filter(delivery => delivery.status === selectedFilter);

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

  const renderDelivery = ({ item }: { item: Delivery }) => {
    const status = statusConfig[item.status];

    return (
      <TouchableOpacity className="bg-white rounded-2xl p-4 mx-4 mb-4 shadow-sm border border-neutral-100">
        {/* Delivery Header */}
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-base font-quicksand-bold text-neutral-800">
              {item.id}
            </Text>
            <Text className="text-sm text-neutral-600">
              Commande {item.orderId}
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
          <Text className="text-xs text-neutral-600 mb-2">
            {item.customer.phone}
          </Text>
          <View className="flex-row items-start">
            <Ionicons name="location" size={14} color="#6B7280" />
            <Text className="text-xs text-neutral-600 ml-1 flex-1">
              {item.customer.address}
            </Text>
          </View>
        </View>

        {/* Driver Info */}
        <View className="flex-row items-center p-3 bg-primary-50 rounded-xl mb-3">
          <Image
            source={{ uri: item.driver.photo }}
            className="w-10 h-10 rounded-full"
            resizeMode="cover"
          />
          <View className="ml-3 flex-1">
            <Text className="text-sm font-quicksand-semibold text-neutral-800">
              {item.driver.name}
            </Text>
            <Text className="text-xs text-neutral-600">
              {item.driver.vehicle}
            </Text>
          </View>
          <TouchableOpacity className="ml-2">
            <Ionicons name="call" size={16} color="#FE8C00" />
          </TouchableOpacity>
          <TouchableOpacity className="ml-2">
            <Ionicons name="location" size={16} color="#FE8C00" />
          </TouchableOpacity>
        </View>

        {/* Delivery Details */}
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="text-sm font-quicksand-medium text-neutral-700">
              Programmée: {formatDate(item.scheduledDate)}
            </Text>
            {item.deliveredDate && (
              <Text className="text-sm font-quicksand-medium text-success-600">
                Livrée: {formatDate(item.deliveredDate)}
              </Text>
            )}
          </View>
          <View className="items-end">
            <Text className="text-lg font-quicksand-bold text-primary-500">
              {formatPrice(item.total)}
            </Text>
            <Text className="text-xs text-neutral-600">
              {item.items} article{item.items > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Tracking */}
        <View className="bg-neutral-50 rounded-lg p-2 mb-3">
          <View className="flex-row items-center">
            <Ionicons name="barcode" size={16} color="#6B7280" />
            <Text className="text-sm font-quicksand-medium text-neutral-700 ml-2">
              Suivi: {item.trackingNumber}
            </Text>
          </View>
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
            <Ionicons name="map-outline" size={16} color="#6B7280" />
            <Text className="text-sm font-quicksand-medium text-neutral-700 ml-2">
              Voir sur la carte
            </Text>
          </TouchableOpacity>
          
          <View className="flex-row items-center space-x-2">
            {item.status === "assigned" && (
              <TouchableOpacity className="bg-primary-500 rounded-lg px-4 py-2">
                <Text className="text-white text-sm font-quicksand-semibold">
                  Notifier le livreur
                </Text>
              </TouchableOpacity>
            )}
            
            {item.status === "in_transit" && (
              <TouchableOpacity className="bg-secondary-500 rounded-lg px-4 py-2">
                <Text className="text-white text-sm font-quicksand-semibold">
                  Suivre
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
      <Ionicons name="car-outline" size={80} color="#D1D5DB" />
      <Text className="text-xl font-quicksand-bold text-neutral-800 mt-4 mb-2">
        Aucune livraison trouvée
      </Text>
      <Text className="text-center text-neutral-600 font-quicksand-medium mb-6">
        Les livraisons de vos commandes apparaîtront ici
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      {/* Header */}
      <View className="bg-white px-6 py-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-quicksand-bold text-neutral-800">
            Livraisons
          </Text>
          <TouchableOpacity className="bg-primary-500 rounded-xl py-2 px-4">
            <View className="flex-row items-center">
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text className="text-white font-quicksand-semibold ml-1">
                Programmer
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Stats */}
      <View className="flex-row px-4 py-4 space-x-2">
        <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-neutral-100">
          <Text className="text-2xl font-quicksand-bold text-primary-500">
            {deliveries.filter(d => d.status === 'in_transit').length}
          </Text>
          <Text className="text-sm font-quicksand-medium text-neutral-600">
            En transit
          </Text>
        </View>
        
        <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-neutral-100">
          <Text className="text-2xl font-quicksand-bold text-success-500">
            {deliveries.filter(d => d.status === 'delivered').length}
          </Text>
          <Text className="text-sm font-quicksand-medium text-neutral-600">
            Livrées
          </Text>
        </View>
        
        <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-neutral-100">
          <Text className="text-2xl font-quicksand-bold text-warning-500">
            {deliveries.filter(d => d.status === 'assigned').length}
          </Text>
          <Text className="text-sm font-quicksand-medium text-neutral-600">
            En attente
          </Text>
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

      {/* Deliveries List */}
      {filteredDeliveries.length > 0 ? (
        <FlatList
          data={filteredDeliveries}
          renderItem={renderDelivery}
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
