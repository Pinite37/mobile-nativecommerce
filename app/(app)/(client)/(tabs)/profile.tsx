import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Animated, Easing, Image, SafeAreaView, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../../../../components/ui/ToastManager";
import { useAuth } from "../../../../contexts/AuthContext";

export default function ProfileScreen() {
  const { user, logout, refreshUserData } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  
  // Rafraîchir les données utilisateur au chargement de la page
  useEffect(() => {
    const loadUserData = async () => {
      try {
        await refreshUserData();
      } catch (error) {
        console.error('Erreur lors du chargement des données utilisateur:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // refreshUserData retiré des dépendances pour éviter la boucle infinie

  // Skeleton Loader Component
  const ShimmerBlock = ({ style }: { style?: any }) => {
    const shimmer = React.useRef(new Animated.Value(0)).current;
    useEffect(() => {
      const loop = Animated.loop(
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      loop.start();
      return () => loop.stop();
    }, [shimmer]);
    const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-150, 150] });
    return (
      <View style={[{ backgroundColor: '#E5E7EB', overflow: 'hidden' }, style]}>
        <Animated.View style={{
          position: 'absolute', top: 0, bottom: 0, width: 120,
          transform: [{ translateX }],
          backgroundColor: 'rgba(255,255,255,0.35)',
          opacity: 0.7,
        }} />
      </View>
    );
  };

  const SkeletonMenuItem = () => (
    <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-4 mb-3">
      <View className="flex-row items-center">
        <ShimmerBlock style={{ width: 48, height: 48, borderRadius: 12 }} />
        <View className="ml-4 flex-1">
          <ShimmerBlock style={{ height: 16, borderRadius: 8, width: '70%', marginBottom: 8 }} />
          <ShimmerBlock style={{ height: 14, borderRadius: 6, width: '50%' }} />
        </View>
        <ShimmerBlock style={{ width: 20, height: 20, borderRadius: 2 }} />
      </View>
    </View>
  );

  const renderSkeletonProfile = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 90 }}
    >
      {/* Header Skeleton */}
      <LinearGradient
        colors={['#10B981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="px-6 pb-6 rounded-b-3xl shadow-sm"
        style={{ paddingTop: insets.top + 12 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <ShimmerBlock style={{ height: 24, borderRadius: 12, width: '60%', marginBottom: 8 }} />
            <ShimmerBlock style={{ height: 14, borderRadius: 7, width: '40%' }} />
          </View>
          <ShimmerBlock style={{ width: 24, height: 24, borderRadius: 12 }} />
        </View>
      </LinearGradient>

      {/* User Profile Skeleton */}
      <View className="bg-white mx-6 mt-6 rounded-3xl shadow-md border border-neutral-100 overflow-hidden">
        <View className="p-6">
          <View className="flex-row items-center">
            <ShimmerBlock style={{ width: 80, height: 80, borderRadius: 40 }} />
            <View className="ml-4 flex-1">
              <ShimmerBlock style={{ height: 20, borderRadius: 10, width: '80%', marginBottom: 8 }} />
              <ShimmerBlock style={{ height: 14, borderRadius: 7, width: '60%', marginBottom: 16 }} />
              <ShimmerBlock style={{ height: 32, borderRadius: 16, width: '40%' }} />
            </View>
          </View>
        </View>
      </View>

      {/* Menu Skeleton */}
      <View className="mx-6 mb-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <SkeletonMenuItem key={index} />
        ))}
      </View>

      {/* Logout Button Skeleton */}
      <View className="px-6 mb-10">
        <ShimmerBlock style={{ height: 48, borderRadius: 16, width: '100%' }} />
      </View>
    </ScrollView>
  );

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
            toast.showInfo("Déconnexion", "Vous avez été déconnecté avec succès");
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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background-secondary">
        <StatusBar backgroundColor="#10B981" barStyle="light-content" />
        {renderSkeletonProfile()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }} // Add bottom padding to ensure content isn't hidden by tab bar
      >
        {/* Header */}
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="px-6 pb-6 rounded-b-3xl shadow-sm"
          style={{ paddingTop: insets.top + 12 }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-quicksand-bold text-white">
                Mon profil
              </Text>
              {user && (
                <Text className="text-sm font-quicksand text-white/90 mt-1">
                  {user.firstName} {user.lastName}
                </Text>
              )}
            </View>
            <TouchableOpacity className="relative">
              <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
              <View className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* User Profile */}
        <View className="bg-white mx-6 mt-6 rounded-3xl shadow-md border border-neutral-100 overflow-hidden">
          <View className="p-6">
            <View className="flex-row items-center">
              {user?.profileImage ? (
                <Image
                  source={{ uri: user.profileImage }}
                  className="w-20 h-20 rounded-full mr-4"
                  style={{ borderWidth: 3, borderColor: '#10B981' }}
                />
              ) : (
                <View className="w-20 h-20 rounded-full bg-primary-100 items-center justify-center mr-4 border-2 border-primary-200">
                  <Ionicons name="person" size={32} color="#10B981" />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-xl font-quicksand-bold text-neutral-800">
                  {user ? `${user.firstName} ${user.lastName}` : 'Utilisateur'}
                </Text>
                <Text className="text-neutral-500 font-quicksand mt-1">
                  {user?.email || 'email@exemple.com'}
                </Text>
                <TouchableOpacity
                  className="mt-3 bg-primary-500 rounded-xl px-4 py-2 self-start"
                  onPress={() => router.push("/(app)/(client)/profile/details")}
                >
                  <Text className="text-white font-quicksand-semibold text-sm">
                    Modifier mon profil
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Menu */}
        <View className="mx-6 mb-6">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-4 mb-3 flex-row items-center"
              onPress={() => router.push(item.route as any)}
            >
                <View className="w-12 h-12 bg-primary-100 rounded-xl justify-center items-center mr-4">
                <Ionicons name={item.icon as any} size={24} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-neutral-800 font-quicksand-semibold text-base">
                  {item.title}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <View className="px-6 mb-10">
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-red-500 py-4 rounded-2xl shadow-md border border-red-400"
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
