import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    FlatList,
    Image,
    SafeAreaView,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// Données fictives
const stats = {
  totalRevenue: 2450000,
  totalOrders: 156,
  totalProducts: 45,
  totalCustomers: 234,
  monthlyGrowth: 12.5,
  orderGrowth: 8.3,
  productGrowth: 15.2,
  customerGrowth: 6.7,
};

const recentOrders = [
  {
    id: "CMD-2024-001",
    customer: "Jean Dupont",
    total: 125000,
    status: "pending",
    date: "2024-01-22",
    items: 3,
  },
  {
    id: "CMD-2024-002",
    customer: "Marie Claire",
    total: 89000,
    status: "confirmed",
    date: "2024-01-22",
    items: 2,
  },
  {
    id: "CMD-2024-003",
    customer: "Paul Martin",
    total: 156000,
    status: "shipping",
    date: "2024-01-21",
    items: 1,
  },
];

const topProducts = [
  {
    id: 1,
    name: "iPhone 14 Pro",
    sales: 24,
    revenue: 1800000,
    image: "https://via.placeholder.com/60x60/3B82F6/FFFFFF?text=iPhone",
    trend: "up",
  },
  {
    id: 2,
    name: "Samsung Galaxy S23",
    sales: 18,
    revenue: 1080000,
    image: "https://via.placeholder.com/60x60/EF4444/FFFFFF?text=Samsung",
    trend: "up",
  },
  {
    id: 3,
    name: "AirPods Pro",
    sales: 32,
    revenue: 640000,
    image: "https://via.placeholder.com/60x60/10B981/FFFFFF?text=AirPods",
    trend: "down",
  },
];

const quickActions = [
  {
    id: 1,
    title: "Ajouter un produit",
    icon: "add-circle",
    color: "#10B981",
    action: "add-product",
  },
  {
    id: 2,
    title: "Gérer les commandes",
    icon: "receipt",
    color: "#3B82F6",
    action: "manage-orders",
  },
  {
    id: 3,
    title: "Voir les statistiques",
    icon: "bar-chart",
    color: "#8B5CF6",
    action: "view-stats",
  },
  {
    id: 4,
    title: "Gérer les livraisons",
    icon: "car",
    color: "#F59E0B",
    action: "manage-deliveries",
  },
];

const statusConfig = {
  pending: { color: "#F59E0B", bg: "#FEF3C7", text: "En attente" },
  confirmed: { color: "#3B82F6", bg: "#DBEAFE", text: "Confirmée" },
  shipping: { color: "#8B5CF6", bg: "#EDE9FE", text: "En livraison" },
  delivered: { color: "#10B981", bg: "#D1FAE5", text: "Livrée" },
};

export default function EnterpriseDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const renderStatCard = (title: string, value: string, growth: number, icon: string) => (
    <View className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100">
      <View className="flex-row items-center justify-between mb-2">
        <View className="w-10 h-10 bg-primary-100 rounded-full justify-center items-center">
          <Ionicons name={icon as any} size={20} color="#FE8C00" />
        </View>
        <View className={`flex-row items-center ${growth >= 0 ? 'text-success-500' : 'text-error-500'}`}>
          <Ionicons 
            name={growth >= 0 ? "trending-up" : "trending-down"} 
            size={16} 
            color={growth >= 0 ? "#10B981" : "#EF4444"} 
          />
          <Text className={`text-xs font-quicksand-medium ml-1 ${growth >= 0 ? 'text-success-500' : 'text-error-500'}`}>
            {Math.abs(growth)}%
          </Text>
        </View>
      </View>
      <Text className="text-2xl font-quicksand-bold text-neutral-800 mb-1">
        {value}
      </Text>
      <Text className="text-sm font-quicksand-medium text-neutral-600">
        {title}
      </Text>
    </View>
  );

  const renderQuickAction = ({ item }: { item: typeof quickActions[0] }) => (
    <TouchableOpacity className="bg-white rounded-2xl p-4 items-center shadow-sm border border-neutral-100">
      <View 
        className="w-12 h-12 rounded-full justify-center items-center mb-3"
        style={{ backgroundColor: item.color + '20' }}
      >
        <Ionicons name={item.icon as any} size={24} color={item.color} />
      </View>
      <Text className="text-sm font-quicksand-medium text-neutral-700 text-center">
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  const renderRecentOrder = ({ item }: { item: typeof recentOrders[0] }) => {
    const status = statusConfig[item.status as keyof typeof statusConfig];
    
    return (
      <TouchableOpacity className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-neutral-100">
        <View className="flex-row items-center justify-between mb-2">
          <View>
            <Text className="text-base font-quicksand-semibold text-neutral-800">
              {item.id}
            </Text>
            <Text className="text-sm text-neutral-600">
              {item.customer}
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
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-quicksand-bold text-primary-500">
            {formatPrice(item.total)}
          </Text>
          <Text className="text-sm text-neutral-600">
            {item.items} article{item.items > 1 ? 's' : ''} • {formatDate(item.date)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTopProduct = ({ item }: { item: typeof topProducts[0] }) => (
    <TouchableOpacity className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-neutral-100">
      <View className="flex-row items-center">
        <Image
          source={{ uri: item.image }}
          className="w-12 h-12 rounded-lg"
          resizeMode="cover"
        />
        <View className="ml-3 flex-1">
          <Text className="text-base font-quicksand-semibold text-neutral-800">
            {item.name}
          </Text>
          <Text className="text-sm text-neutral-600">
            {item.sales} ventes • {formatPrice(item.revenue)}
          </Text>
        </View>
        <Ionicons 
          name={item.trend === 'up' ? "trending-up" : "trending-down"} 
          size={20} 
          color={item.trend === 'up' ? "#10B981" : "#EF4444"} 
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-white px-6 py-4">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-quicksand-medium text-neutral-600">
                Bonjour,
              </Text>
              <Text className="text-lg font-quicksand-bold text-neutral-800">
                TechStore Cotonou
              </Text>
            </View>
            <TouchableOpacity className="relative">
              <Ionicons name="notifications-outline" size={24} color="#374151" />
              <View className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Period Selector */}
        <View className="px-6 py-4">
          <View className="flex-row bg-white rounded-2xl p-1 shadow-sm border border-neutral-100">
            {['today', 'week', 'month'].map((period) => (
              <TouchableOpacity
                key={period}
                className={`flex-1 py-2 px-4 rounded-xl ${
                  selectedPeriod === period ? 'bg-primary-500' : 'bg-transparent'
                }`}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text
                  className={`text-center text-sm font-quicksand-medium ${
                    selectedPeriod === period ? 'text-white' : 'text-neutral-600'
                  }`}
                >
                  {period === 'today' ? 'Aujourd\'hui' : period === 'week' ? 'Semaine' : 'Mois'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stats Cards */}
        <View className="px-6 py-4">
          <View className="grid grid-cols-2 gap-4">
            {renderStatCard("Chiffre d'affaires", formatPrice(stats.totalRevenue), stats.monthlyGrowth, "trending-up")}
            {renderStatCard("Commandes", stats.totalOrders.toString(), stats.orderGrowth, "receipt")}
            {renderStatCard("Produits", stats.totalProducts.toString(), stats.productGrowth, "cube")}
            {renderStatCard("Clients", stats.totalCustomers.toString(), stats.customerGrowth, "people")}
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-6 py-4">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-4">
            Actions rapides
          </Text>
          <View className="grid grid-cols-2 gap-3">
            <FlatList
              data={quickActions}
              renderItem={renderQuickAction}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: 'space-between' }}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View className="h-3" />}
            />
          </View>
        </View>

        {/* Recent Orders */}
        <View className="px-6 py-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-quicksand-bold text-neutral-800">
              Commandes récentes
            </Text>
            <TouchableOpacity>
              <Text className="text-sm font-quicksand-semibold text-primary-500">
                Voir tout
              </Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={recentOrders}
            renderItem={renderRecentOrder}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>

        {/* Top Products */}
        <View className="px-6 py-4 pb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-quicksand-bold text-neutral-800">
              Produits populaires
            </Text>
            <TouchableOpacity>
              <Text className="text-sm font-quicksand-semibold text-primary-500">
                Voir tout
              </Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={topProducts}
            renderItem={renderTopProduct}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
