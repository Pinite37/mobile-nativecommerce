import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { Alert, Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../../../contexts/AuthContext";

export default function ProfileScreen() {
  const { user, logout, refreshUserData } = useAuth();
  
  // Rafraîchir les données utilisateur au chargement de la page
  useEffect(() => {
    // Toujours rafraîchir les données utilisateur au chargement de la page
    // pour s'assurer d'avoir les informations les plus récentes
    refreshUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Êtes-vous sûr de vouloir vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Déconnexion", 
          style: "destructive",
          onPress: () => {
            logout();
            router.replace("/(auth)/signin");
          }
        }
      ]
    );
  };

  const menuItems = [
    { icon: "person-outline", title: "Mes informations", route: "/(app)/(client)/profile/details" },
    { icon: "location-outline", title: "Mes adresses", route: "/(app)/(client)/profile/addresses" },
    { icon: "bag-check-outline", title: "Mes commandes", route: "/(app)/(client)/profile/orders" },
    { icon: "card-outline", title: "Moyens de paiement", route: "/(app)/(client)/profile/payments" },
    { icon: "settings-outline", title: "Paramètres", route: "/(app)/(client)/profile/settings" },
    { icon: "help-circle-outline", title: "Aide et support", route: "/(app)/(client)/profile/help" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }} // Add bottom padding to ensure content isn't hidden by tab bar
      >
        {/* Header */}
        <View className="px-6 pt-20 pb-6 bg-white">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-quicksand-bold text-neutral-800">
              Mon profil
            </Text>
            <TouchableOpacity className="relative">
              <Ionicons name="notifications-outline" size={24} color="#374151" />
              <View className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full" />
            </TouchableOpacity>
          </View>
        </View>

        {/* User Profile */}
        <View className="bg-white px-6 py-6 mb-6">
          <View className="flex-row items-center">
            {user?.profileImage ? (
              <Image 
                source={{ uri: user.profileImage }}
                className="w-20 h-20 rounded-full mr-4"
                style={{ borderWidth: 2, borderColor: '#FE8C00' }}
              />
            ) : (
              <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center mr-4">
                <Ionicons name="person" size={32} color="#FE8C00" />
              </View>
            )}
            <View className="flex-1">
              <Text className="text-xl font-quicksand-bold text-neutral-800">
                {user ? `${user.firstName} ${user.lastName}` : 'Utilisateur'}
              </Text>
              <Text className="text-neutral-500 font-quicksand">
                {user?.email || 'email@exemple.com'}
              </Text>
              <TouchableOpacity 
                className="mt-2" 
                onPress={() => router.push("/(app)/(client)/profile/details")}
              >
                <Text className="text-primary-500 font-quicksand-semibold">
                  Modifier mon profil
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Menu */}
        <View className="bg-white rounded-3xl px-6 py-6 mb-6 mx-6">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              className={`flex-row items-center py-4 ${
                index < menuItems.length - 1 ? "border-b border-neutral-100" : ""
              }`}
              onPress={() => router.push(item.route as any)}
            >
              <Ionicons name={item.icon as any} size={22} color="#374151" />
              <Text className="flex-1 text-neutral-800 font-quicksand-medium ml-4">
                {item.title}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <View className="px-6 mb-10">
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-red-500 py-4 rounded-2xl"
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="log-out-outline" size={20} color="white" style={{ marginRight: 8 }} />
              <Text className="text-white font-quicksand-semibold">
                Déconnexion
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
