import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Image,
    SafeAreaView,
    ScrollView,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// Données fictives
const businessProfile = {
  name: "TechStore Cotonou",
  email: "contact@techstore-cotonou.com",
  phone: "+229 21 30 40 50",
  address: "Cotonou, Akpakpa - Carrefour Gbégamey",
  logo: "https://via.placeholder.com/120x120/3B82F6/FFFFFF?text=TC",
  registrationNumber: "RC-2023-B-12345",
  taxNumber: "IFU-987654321",
  category: "Électronique",
  memberSince: "2023-06-15",
  verified: true,
  subscription: {
    plan: "Premium",
    status: "active",
    nextBilling: "2024-02-15",
    price: 25000,
  },
  stats: {
    totalProducts: 45,
    totalOrders: 156,
    totalRevenue: 2450000,
    rating: 4.7,
    reviews: 89,
  },
};

const menuItems = [
  {
    id: 1,
    title: "Informations de l'entreprise",
    icon: "business-outline",
    action: "business-info",
    hasArrow: true,
  },
  {
    id: 2,
    title: "Paramètres de livraison",
    icon: "car-outline",
    action: "delivery-settings",
    hasArrow: true,
  },
  {
    id: 3,
    title: "Méthodes de paiement",
    icon: "card-outline",
    action: "payment-methods",
    hasArrow: true,
  },
  {
    id: 4,
    title: "Gestion des employés",
    icon: "people-outline",
    action: "employees",
    hasArrow: true,
  },
  {
    id: 5,
    title: "Notifications",
    icon: "notifications-outline",
    action: "notifications",
    hasArrow: false,
    hasSwitch: true,
  },
  {
    id: 6,
    title: "Statistiques avancées",
    icon: "analytics-outline",
    action: "analytics",
    hasArrow: true,
  },
];

const businessTools = [
  {
    id: 1,
    title: "Rapports de ventes",
    icon: "document-text-outline",
    action: "sales-reports",
    description: "Générer des rapports détaillés",
  },
  {
    id: 2,
    title: "Gestion des promotions",
    icon: "pricetag-outline",
    action: "promotions",
    description: "Créer des offres spéciales",
  },
  {
    id: 3,
    title: "Support client",
    icon: "headset-outline",
    action: "customer-support",
    description: "Gérer les demandes clients",
  },
  {
    id: 4,
    title: "Intégrations",
    icon: "link-outline",
    action: "integrations",
    description: "Connecter vos outils",
  },
];

const supportItems = [
  {
    id: 1,
    title: "Centre d'aide entreprise",
    icon: "help-circle-outline",
    action: "help",
  },
  {
    id: 2,
    title: "Nous contacter",
    icon: "mail-outline",
    action: "contact",
  },
  {
    id: 3,
    title: "Conditions commerciales",
    icon: "document-text-outline",
    action: "terms",
  },
  {
    id: 4,
    title: "Politique de confidentialité",
    icon: "shield-outline",
    action: "privacy",
  },
];

export default function EnterpriseProfile() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

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

  const handleMenuPress = (action: string) => {
    switch (action) {
      case 'business-info':
        // Navigate to business info page
        break;
      case 'delivery-settings':
        // Navigate to delivery settings page
        break;
      case 'payment-methods':
        // Navigate to payment methods page
        break;
      case 'employees':
        // Navigate to employees management page
        break;
      case 'notifications':
        // Handle notification settings
        break;
      case 'analytics':
        // Navigate to analytics page
        break;
      case 'sales-reports':
        // Navigate to sales reports page
        break;
      case 'promotions':
        // Navigate to promotions page
        break;
      case 'customer-support':
        // Navigate to customer support page
        break;
      case 'integrations':
        // Navigate to integrations page
        break;
      case 'help':
        // Navigate to help center
        break;
      case 'contact':
        // Navigate to contact page
        break;
      case 'terms':
        // Navigate to terms page
        break;
      case 'privacy':
        // Navigate to privacy policy
        break;
      default:
        break;
    }
  };

  const handleLogout = () => {
    // Clear user data and navigate to auth
    router.replace('/(auth)/welcome');
  };

  const renderMenuItem = (item: typeof menuItems[0]) => (
    <TouchableOpacity
      key={item.id}
      className="bg-white rounded-2xl p-4 mx-4 mb-3 shadow-sm border border-neutral-100"
      onPress={() => handleMenuPress(item.action)}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View className="w-10 h-10 bg-background-secondary rounded-full justify-center items-center">
            <Ionicons name={item.icon as any} size={20} color="#374151" />
          </View>
          <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
            {item.title}
          </Text>
        </View>
        
        {item.hasSwitch && (
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            thumbColor="#FFFFFF"
            trackColor={{ false: "#D1D5DB", true: "#FE8C00" }}
          />
        )}
        
        {item.hasArrow && (
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderBusinessTool = (item: typeof businessTools[0]) => (
    <TouchableOpacity
      key={item.id}
      className="bg-white rounded-2xl p-4 mr-4 shadow-sm border border-neutral-100"
      onPress={() => handleMenuPress(item.action)}
    >
      <View className="w-12 h-12 bg-primary-100 rounded-full justify-center items-center mb-3">
        <Ionicons name={item.icon as any} size={24} color="#FE8C00" />
      </View>
      <Text className="text-base font-quicksand-semibold text-neutral-800 mb-1">
        {item.title}
      </Text>
      <Text className="text-sm text-neutral-600">
        {item.description}
      </Text>
    </TouchableOpacity>
  );

  const renderSupportItem = (item: typeof supportItems[0]) => (
    <TouchableOpacity
      key={item.id}
      className="flex-row items-center justify-between py-4 px-6 border-b border-neutral-100"
      onPress={() => handleMenuPress(item.action)}
    >
      <View className="flex-row items-center">
        <Ionicons name={item.icon as any} size={20} color="#6B7280" />
        <Text className="text-base font-quicksand-medium text-neutral-700 ml-3">
          {item.title}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Business Header */}
        <View className="bg-white px-6 py-8">
          <View className="flex-row items-center">
            <View className="relative">
              <Image
                source={{ uri: businessProfile.logo }}
                className="w-20 h-20 rounded-2xl"
                resizeMode="cover"
              />
              {businessProfile.verified && (
                <View className="absolute -top-1 -right-1 w-6 h-6 bg-success-500 rounded-full justify-center items-center">
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
              )}
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-xl font-quicksand-bold text-neutral-800">
                {businessProfile.name}
              </Text>
              <Text className="text-sm text-neutral-600 mt-1">
                {businessProfile.category}
              </Text>
              <Text className="text-sm text-neutral-600">
                {businessProfile.email}
              </Text>
              <Text className="text-xs text-neutral-500 mt-2">
                Membre depuis {formatDate(businessProfile.memberSince)}
              </Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="create-outline" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Subscription Status */}
        <View className="px-4 py-4">
          <View className="bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl p-4 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-white font-quicksand-bold text-lg">
                  Plan {businessProfile.subscription.plan}
                </Text>
                <Text className="text-white opacity-90 text-sm">
                  Prochain paiement: {formatDate(businessProfile.subscription.nextBilling)}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-white font-quicksand-bold text-xl">
                  {formatPrice(businessProfile.subscription.price)}
                </Text>
                <Text className="text-white opacity-90 text-sm">
                  /mois
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View className="px-4 py-4">
          <View className="grid grid-cols-2 gap-3">
            <View className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100">
              <Text className="text-2xl font-quicksand-bold text-primary-500">
                {businessProfile.stats.totalProducts}
              </Text>
              <Text className="text-sm font-quicksand-medium text-neutral-600">
                Produits
              </Text>
            </View>
            
            <View className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100">
              <Text className="text-2xl font-quicksand-bold text-success-500">
                {businessProfile.stats.totalOrders}
              </Text>
              <Text className="text-sm font-quicksand-medium text-neutral-600">
                Commandes
              </Text>
            </View>
            
            <View className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100">
              <Text className="text-2xl font-quicksand-bold text-secondary-500">
                {formatPrice(businessProfile.stats.totalRevenue)}
              </Text>
              <Text className="text-sm font-quicksand-medium text-neutral-600">
                Revenus
              </Text>
            </View>
            
            <View className="bg-white rounded-2xl p-4 shadow-sm border border-neutral-100">
              <View className="flex-row items-center">
                <Ionicons name="star" size={16} color="#FE8C00" />
                <Text className="text-2xl font-quicksand-bold text-warning-500 ml-1">
                  {businessProfile.stats.rating}
                </Text>
              </View>
              <Text className="text-sm font-quicksand-medium text-neutral-600">
                {businessProfile.stats.reviews} avis
              </Text>
            </View>
          </View>
        </View>

        {/* Business Tools */}
        <View className="py-4">
          <Text className="text-lg font-quicksand-bold text-neutral-800 px-6 mb-4">
            Outils Business
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24 }}
          >
            {businessTools.map(renderBusinessTool)}
          </ScrollView>
        </View>

        {/* Menu Items */}
        <View className="py-4">
          <Text className="text-lg font-quicksand-bold text-neutral-800 px-6 mb-4">
            Paramètres
          </Text>
          {menuItems.map(renderMenuItem)}
        </View>

        {/* Support Section */}
        <View className="py-4">
          <Text className="text-lg font-quicksand-bold text-neutral-800 px-6 mb-4">
            Support
          </Text>
          <View className="bg-white mx-4 rounded-2xl shadow-sm border border-neutral-100">
            {supportItems.map(renderSupportItem)}
          </View>
        </View>

        {/* Logout Button */}
        <View className="px-4 py-6">
          <TouchableOpacity
            className="bg-error-500 rounded-2xl py-4"
            onPress={handleLogout}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
              <Text className="text-white font-quicksand-semibold ml-2">
                Se déconnecter
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View className="px-6 py-4">
          <Text className="text-center text-xs text-neutral-500 font-quicksand-medium">
            NativeCommerce Business v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
