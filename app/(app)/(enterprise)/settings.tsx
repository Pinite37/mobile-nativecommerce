import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useToast } from "../../../components/ui/ToastManager";

export default function EnterpriseSettingsScreen() {
  const toast = useToast();
  
  // États pour les paramètres
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoAcceptOrders, setAutoAcceptOrders] = useState(false);
  const [showProductRatings, setShowProductRatings] = useState(true);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [saveLoginInfo, setSaveLoginInfo] = useState(true);

  // Fonction pour effacer les données de cache
  const handleClearCache = () => {
    Alert.alert(
      'Effacer le cache',
      'Êtes-vous sûr de vouloir effacer toutes les données de cache ? Cette action ne peut pas être annulée.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Effacer', 
          style: 'destructive', 
          onPress: () => {
            // Simulation d'effacement de cache
            setTimeout(() => {
              toast.showSuccess('Cache effacé', 'Les données de cache ont été effacées avec succès');
            }, 800);
          } 
        },
      ]
    );
  };

  // Fonction pour réinitialiser les paramètres
  const handleResetSettings = () => {
    Alert.alert(
      'Réinitialiser les paramètres',
      'Êtes-vous sûr de vouloir réinitialiser tous les paramètres à leurs valeurs par défaut ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Réinitialiser', 
          style: 'destructive', 
          onPress: () => {
            // Réinitialisation des états
            setNotificationsEnabled(true);
            setEmailNotifications(true);
            setDarkMode(false);
            setAutoAcceptOrders(false);
            setShowProductRatings(true);
            setHighContrastMode(false);
            setSaveLoginInfo(true);
            toast.showSuccess('Paramètres réinitialisés', 'Les paramètres ont été restaurés à leurs valeurs par défaut');
          } 
        },
      ]
    );
  };

  // Fonction pour changer le mot de passe
  const handleChangePassword = () => {
    toast.showInfo('Fonctionnalité à venir', 'Le changement de mot de passe sera disponible prochainement');
  };

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      <View className="flex-row items-center justify-between px-6 py-4 bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-quicksand-bold text-neutral-800">
          Paramètres
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Notifications */}
        <View className="mt-6 px-4">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3 pl-1">
            Notifications
          </Text>
          <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-neutral-100">
              <Text className="text-base font-quicksand-medium text-neutral-800">
                Notifications push
              </Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                thumbColor="#FFFFFF"
                trackColor={{ false: "#D1D5DB", true: "#FE8C00" }}
              />
            </View>
            <View className="flex-row items-center justify-between px-4 py-4">
              <Text className="text-base font-quicksand-medium text-neutral-800">
                Notifications par email
              </Text>
              <Switch
                value={emailNotifications}
                onValueChange={setEmailNotifications}
                thumbColor="#FFFFFF"
                trackColor={{ false: "#D1D5DB", true: "#FE8C00" }}
              />
            </View>
          </View>
        </View>

        {/* Paramètres de l'application */}
        <View className="mt-6 px-4">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3 pl-1">
            Application
          </Text>
          <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-neutral-100">
              <Text className="text-base font-quicksand-medium text-neutral-800">
                Mode sombre
              </Text>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                thumbColor="#FFFFFF"
                trackColor={{ false: "#D1D5DB", true: "#FE8C00" }}
              />
            </View>
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-neutral-100">
              <Text className="text-base font-quicksand-medium text-neutral-800">
                Mode contraste élevé
              </Text>
              <Switch
                value={highContrastMode}
                onValueChange={setHighContrastMode}
                thumbColor="#FFFFFF"
                trackColor={{ false: "#D1D5DB", true: "#FE8C00" }}
              />
            </View>
            <View className="flex-row items-center justify-between px-4 py-4">
              <Text className="text-base font-quicksand-medium text-neutral-800">
                Mémoriser les identifiants
              </Text>
              <Switch
                value={saveLoginInfo}
                onValueChange={setSaveLoginInfo}
                thumbColor="#FFFFFF"
                trackColor={{ false: "#D1D5DB", true: "#FE8C00" }}
              />
            </View>
          </View>
        </View>

        {/* Paramètres d'entreprise */}
        <View className="mt-6 px-4">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3 pl-1">
            Paramètres d&apos;entreprise
          </Text>
          <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-neutral-100">
              <Text className="text-base font-quicksand-medium text-neutral-800">
                Acceptation auto. des commandes
              </Text>
              <Switch
                value={autoAcceptOrders}
                onValueChange={setAutoAcceptOrders}
                thumbColor="#FFFFFF"
                trackColor={{ false: "#D1D5DB", true: "#FE8C00" }}
              />
            </View>
            <View className="flex-row items-center justify-between px-4 py-4">
              <Text className="text-base font-quicksand-medium text-neutral-800">
                Afficher évaluations des produits
              </Text>
              <Switch
                value={showProductRatings}
                onValueChange={setShowProductRatings}
                thumbColor="#FFFFFF"
                trackColor={{ false: "#D1D5DB", true: "#FE8C00" }}
              />
            </View>
          </View>
        </View>

        {/* Sécurité */}
        <View className="mt-6 px-4">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3 pl-1">
            Sécurité
          </Text>
          <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <TouchableOpacity 
              onPress={handleChangePassword}
              className="flex-row items-center justify-between px-4 py-4"
            >
              <Text className="text-base font-quicksand-medium text-neutral-800">
                Changer le mot de passe
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Gestion des données */}
        <View className="mt-6 px-4">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3 pl-1">
            Données
          </Text>
          <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <TouchableOpacity 
              onPress={handleClearCache}
              className="flex-row items-center justify-between px-4 py-4 border-b border-neutral-100"
            >
              <Text className="text-base font-quicksand-medium text-neutral-800">
                Effacer le cache
              </Text>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleResetSettings}
              className="flex-row items-center justify-between px-4 py-4"
            >
              <Text className="text-base font-quicksand-medium text-neutral-800">
                Réinitialiser les paramètres
              </Text>
              <Ionicons name="refresh-outline" size={20} color="#F59E0B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Version de l'app */}
        <View className="mt-10 pb-8 px-6">
          <Text className="text-center text-xs text-neutral-500 font-quicksand-medium">
            NativeCommerce Business v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
