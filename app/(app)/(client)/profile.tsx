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
const userProfile = {
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "+229 12 34 56 78",
  avatar: "https://via.placeholder.com/120x120/3B82F6/FFFFFF?text=JD",
  memberSince: "2023-06-15",
  totalOrders: 12,
  totalSpent: 2450000,
  loyaltyPoints: 1240,
};

const menuItems = [
  {
    id: 1,
    title: "Informations personnelles",
    icon: "person-outline",
    action: "personal-info",
    hasArrow: true,
  },
  {
    id: 2,
    title: "Adresses de livraison",
    icon: "location-outline",
    action: "addresses",
    hasArrow: true,
  },
  {
    id: 3,
    title: "Méthodes de paiement",
    icon: "card-outline",
    action: "payment",
    hasArrow: true,
  },
  {
    id: 4,
    title: "Notifications",
    icon: "notifications-outline",
    action: "notifications",
    hasArrow: false,
    hasSwitch: true,
  },
  {
    id: 5,
    title: "Historique des achats",
    icon: "time-outline",
    action: "history",
    hasArrow: true,
  },
  {
    id: 6,
    title: "Avis et évaluations",
    icon: "star-outline",
    action: "reviews",
    hasArrow: true,
  },
];

const supportItems = [
  {
    id: 1,
    title: "Centre d'aide",
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
    title: "Conditions d'utilisation",
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

export default function ClientProfile() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric'
    });
  };

  const handleMenuPress = (action: string) => {
    switch (action) {
      case 'personal-info':
        // Navigate to personal info page
        break;
      case 'addresses':
        // Navigate to addresses page
        break;
      case 'payment':
        // Navigate to payment methods page
        break;
      case 'notifications':
        // Handle notification settings
        break;
      case 'history':
        // Navigate to purchase history
        break;
      case 'reviews':
        // Navigate to reviews page
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
        {/* Profile Header */}
        <View className="bg-white px-6 py-8">
          <View className="flex-row items-center">
            <Image
              source={{ uri: userProfile.avatar }}
              className="w-20 h-20 rounded-full"
              resizeMode="cover"
            />
            <View className="ml-4 flex-1">
              <Text className="text-xl font-quicksand-bold text-neutral-800">
                {userProfile.name}
              </Text>
              <Text className="text-sm text-neutral-600 mt-1">
                {userProfile.email}
              </Text>
              <Text className="text-sm text-neutral-600">
                {userProfile.phone}
              </Text>
              <Text className="text-xs text-neutral-500 mt-2">
                Membre depuis {formatDate(userProfile.memberSince)}
              </Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="create-outline" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View className="flex-row px-4 py-4 space-x-2">
          <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-neutral-100">
            <Text className="text-2xl font-quicksand-bold text-primary-500">
              {userProfile.totalOrders}
            </Text>
            <Text className="text-sm font-quicksand-medium text-neutral-600">
              Commandes
            </Text>
          </View>
          
          <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-neutral-100">
            <Text className="text-2xl font-quicksand-bold text-success-500">
              {formatPrice(userProfile.totalSpent)}
            </Text>
            <Text className="text-sm font-quicksand-medium text-neutral-600">
              Dépensé
            </Text>
          </View>
          
          <View className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-neutral-100">
            <Text className="text-2xl font-quicksand-bold text-secondary-500">
              {userProfile.loyaltyPoints}
            </Text>
            <Text className="text-sm font-quicksand-medium text-neutral-600">
              Points
            </Text>
          </View>
        </View>

        {/* Menu Items */}
        <View className="py-4">
          <Text className="text-lg font-quicksand-bold text-neutral-800 px-6 mb-4">
            Mon Compte
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
            NativeCommerce v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
