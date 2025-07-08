import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from '../../../../contexts/AuthContext';
import EnterpriseService, { EnterpriseProfile } from '../../../../services/api/EnterpriseService';

// Données fictives pour les tendances (à remplacer par de vraies données plus tard)
const growthData = {
  monthlyGrowth: 12.5,
  orderGrowth: 8.3,
  ratingGrowth: 5.2,
  reviewGrowth: 6.7,
};

export default function EnterpriseDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<EnterpriseProfile | null>(null);
  const { user } = useAuth();

  // Charger les données du profil au montage
  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const data = await EnterpriseService.getProfile();
      setProfileData(data);
    } catch (error) {
      console.error('❌ Erreur chargement profil dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);
      const data = await EnterpriseService.getProfile();
      setProfileData(data);
    } catch (error) {
      console.error('❌ Erreur refresh dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  // Fonction pour saluer l'utilisateur en fonction de l'heure
  const greetUser = () => {
    const hours = new Date().getHours();
    if (hours < 12) {
      return "Bonjour";
    } else if (hours < 18) {
      return "Bon après-midi";
    } else {
      return "Bonsoir";
    }
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

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshData}
            colors={['#FE8C00']}
            tintColor="#FE8C00"
          />
        }
      >
        {/* Header */}
        <View className="bg-white px-6 py-4 pt-16">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-quicksand-medium text-neutral-600">
                {greetUser()},
              </Text>
              <Text className="text-lg font-quicksand-bold text-neutral-800">
                {user ? `${user.firstName} ${user.lastName}` : 'Entreprise'}
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
          {loading ? (
            <View className="flex-1 justify-center items-center py-8">
              <ActivityIndicator size="large" color="#FE8C00" />
              <Text className="mt-4 text-neutral-600 font-quicksand-medium">Chargement...</Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {renderStatCard(
                "Ventes totales", 
                formatPrice(profileData?.enterprise?.stats?.totalSales || 0), 
                growthData.monthlyGrowth, 
                "trending-up"
              )}
              {renderStatCard(
                "Commandes", 
                (profileData?.enterprise?.stats?.totalOrders || 0).toString(), 
                growthData.orderGrowth, 
                "receipt"
              )}
              {renderStatCard(
                "Note moyenne", 
                (profileData?.enterprise?.stats?.averageRating || 0).toFixed(1), 
                growthData.ratingGrowth, 
                "star"
              )}
              {renderStatCard(
                "Avis clients", 
                (profileData?.enterprise?.stats?.totalReviews || 0).toString(), 
                growthData.reviewGrowth, 
                "people"
              )}
            </View>
          )}
        </View>

        {/* Actions rapides */}
        <View className="px-6 py-4">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-4">
            Actions rapides
          </Text>
          <View className="flex-row flex-wrap justify-between">
            <TouchableOpacity className="w-[48%] bg-white rounded-2xl p-4 mb-3 shadow-sm border border-neutral-100">
              <View className="w-12 h-12 bg-primary-100 rounded-full justify-center items-center mb-3">
                <Ionicons name="add-circle" size={24} color="#10B981" />
              </View>
              <Text className="text-base font-quicksand-semibold text-neutral-800 mb-1">
                Ajouter produit
              </Text>
              <Text className="text-sm text-neutral-600">
                Nouveau produit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity className="w-[48%] bg-white rounded-2xl p-4 mb-3 shadow-sm border border-neutral-100">
              <View className="w-12 h-12 bg-success-100 rounded-full justify-center items-center mb-3">
                <Ionicons name="receipt" size={24} color="#3B82F6" />
              </View>
              <Text className="text-base font-quicksand-semibold text-neutral-800 mb-1">
                Commandes
              </Text>
              <Text className="text-sm text-neutral-600">
                Gérer les commandes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity className="w-[48%] bg-white rounded-2xl p-4 mb-3 shadow-sm border border-neutral-100">
              <View className="w-12 h-12 bg-warning-100 rounded-full justify-center items-center mb-3">
                <Ionicons name="bar-chart" size={24} color="#8B5CF6" />
              </View>
              <Text className="text-base font-quicksand-semibold text-neutral-800 mb-1">
                Statistiques
              </Text>
              <Text className="text-sm text-neutral-600">
                Voir les analyses
              </Text>
            </TouchableOpacity>

            <TouchableOpacity className="w-[48%] bg-white rounded-2xl p-4 mb-3 shadow-sm border border-neutral-100">
              <View className="w-12 h-12 bg-secondary-100 rounded-full justify-center items-center mb-3">
                <Ionicons name="car" size={24} color="#F59E0B" />
              </View>
              <Text className="text-base font-quicksand-semibold text-neutral-800 mb-1">
                Livraisons
              </Text>
              <Text className="text-sm text-neutral-600">
                Gérer les livraisons
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Statut de l'entreprise */}
        {profileData?.enterprise && (
          <View className="px-6 py-4">
            <View className={`${profileData.enterprise.isActive ? 'bg-success-500' : 'bg-neutral-500'} rounded-2xl p-4 shadow-sm`}>
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <View className={`w-3 h-3 rounded-full mr-2 ${profileData.enterprise.isActive ? 'bg-white' : 'bg-neutral-300'}`} />
                    <Text className="text-white font-quicksand-bold text-lg">
                      {profileData.enterprise.isActive ? 'Entreprise Active' : 'Entreprise Inactive'}
                    </Text>
                  </View>
                  <Text className="text-white opacity-90 text-sm ml-5">
                    {profileData.enterprise.isActive ? 'Visible aux clients' : 'Invisible aux clients'}
                  </Text>
                </View>
                <View className="bg-white bg-opacity-20 rounded-xl px-4 py-2">
                  <Text className="text-white font-quicksand-semibold text-sm">
                    {profileData.enterprise.companyName}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ...existing code... */}
      </ScrollView>
    </SafeAreaView>
  );
}
