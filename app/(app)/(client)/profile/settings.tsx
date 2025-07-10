import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useToast } from "../../../../components/ui/ToastManager";
import { useAuth } from "../../../../contexts/AuthContext";
import CustomerService, { UpdatePreferencesRequest } from "../../../../services/api/CustomerService";

export default function SettingsScreen() {
  const router = useRouter();
  const { user, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  
  // État local pour les paramètres
  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailNotifications: false,
    darkMode: false,
    locationServices: true,
    biometricAuth: true,
    language: "Français",
    currency: "FCFA",
  });

  // Charger les paramètres utilisateur depuis l'API
  useEffect(() => {
    loadUserPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserPreferences = async () => {
    if (!user || !user.preferences) return;
    
    try {
      setLoading(true);
      
      setSettings({
        pushNotifications: user.preferences.notifications?.push || false,
        emailNotifications: user.preferences.notifications?.email || false,
        darkMode: false, // Non géré par l'API
        locationServices: true, // Non géré par l'API
        biometricAuth: true, // Non géré par l'API
        language: user.preferences.language || "Français",
        currency: user.preferences.currency || "FCFA",
      });
    } catch (error) {
      console.error("Erreur lors du chargement des préférences:", error);
      toast.showError("Erreur", "Impossible de charger vos préférences");
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour mettre à jour un paramètre booléen
  const toggleSetting = async (setting: keyof typeof settings) => {
    try {
      const newValue = !settings[setting];
      setSettings(prev => ({ ...prev, [setting]: newValue }));
      
      // Mettre à jour les préférences via l'API si nécessaire
      if (setting === 'pushNotifications' || setting === 'emailNotifications') {
        setSaving(true);
        
        const updateData: UpdatePreferencesRequest = {
          notifications: {
            push: setting === 'pushNotifications' ? newValue : settings.pushNotifications,
            email: setting === 'emailNotifications' ? newValue : settings.emailNotifications,
          }
        };
        
        await CustomerService.updatePreferences(updateData);
        await refreshUserData();
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour des préférences:", error);
      toast.showError("Erreur", "Impossible de mettre à jour vos préférences");
      // Remettre l'état précédent en cas d'erreur
      setSettings(prev => ({ ...prev, [setting]: !prev[setting] }));
    } finally {
      setSaving(false);
    }
  };

  // Fonction pour effacer les données
  const handleClearData = () => {
    Alert.alert(
      "Effacer les données",
      "Êtes-vous sûr de vouloir effacer toutes vos données ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Effacer", 
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              
              // Dans un vrai scénario, il faudrait appeler une API pour supprimer les données
              // Pour l'instant, nous allons simplement réinitialiser les préférences
              const resetPrefs: UpdatePreferencesRequest = {
                notifications: {
                  push: false,
                  email: false,
                  sms: false
                },
                language: "fr",
                currency: "XOF"
              };
              
              await CustomerService.updatePreferences(resetPrefs);
              await refreshUserData();
              
              toast.showSuccess("Données réinitialisées", "Vos préférences ont été remises à zéro");
              loadUserPreferences(); // Recharger les paramètres
            } catch (error) {
              console.error("Erreur lors de la réinitialisation des données:", error);
              toast.showError("Erreur", "Impossible de réinitialiser vos données");
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      {/* Header avec bouton retour */}
      <View className="bg-white px-4 pt-16 pb-4 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-gray-100 justify-center items-center mr-4"
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
        <Text className="text-xl font-quicksand-bold text-neutral-800">
          Paramètres
        </Text>
        {loading && (
          <ActivityIndicator size="small" color="#FE8C00" style={{ marginLeft: 10 }} />
        )}
      </View>

      <ScrollView className="flex-1">
        {/* Paramètres des notifications */}
        <View className="mt-6 mx-4">
          <Text className="text-sm font-quicksand-semibold text-neutral-500 mb-2">
            NOTIFICATIONS
          </Text>
          <View className="bg-white rounded-2xl">
            <View className="px-4 py-4 flex-row justify-between items-center border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="notifications-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Notifications push
                </Text>
              </View>
              <Switch
                value={settings.pushNotifications}
                onValueChange={() => toggleSetting('pushNotifications')}
                trackColor={{ false: "#E5E7EB", true: "#FE8C0050" }}
                thumbColor={settings.pushNotifications ? "#FE8C00" : "#9CA3AF"}
              />
            </View>
            <View className="px-4 py-4 flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Ionicons name="mail-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Notifications par email
                </Text>
              </View>
              <Switch
                value={settings.emailNotifications}
                onValueChange={() => toggleSetting('emailNotifications')}
                trackColor={{ false: "#E5E7EB", true: "#FE8C0050" }}
                thumbColor={settings.emailNotifications ? "#FE8C00" : "#9CA3AF"}
              />
            </View>
          </View>
        </View>

        {/* Paramètres d'affichage */}
        <View className="mt-6 mx-4">
          <Text className="text-sm font-quicksand-semibold text-neutral-500 mb-2">
            AFFICHAGE
          </Text>
          <View className="bg-white rounded-2xl">
            <View className="px-4 py-4 flex-row justify-between items-center border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="moon-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Mode sombre
                </Text>
              </View>
              <Switch
                value={settings.darkMode}
                onValueChange={() => toggleSetting('darkMode')}
                trackColor={{ false: "#E5E7EB", true: "#FE8C0050" }}
                thumbColor={settings.darkMode ? "#FE8C00" : "#9CA3AF"}
              />
            </View>
            <TouchableOpacity className="px-4 py-4 flex-row justify-between items-center border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="language-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Langue
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-base font-quicksand text-neutral-500 mr-2">
                  {settings.language}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity className="px-4 py-4 flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Ionicons name="cash-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Devise
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-base font-quicksand text-neutral-500 mr-2">
                  {settings.currency}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Paramètres de confidentialité */}
        <View className="mt-6 mx-4">
          <Text className="text-sm font-quicksand-semibold text-neutral-500 mb-2">
            CONFIDENTIALITÉ
          </Text>
          <View className="bg-white rounded-2xl">
            <View className="px-4 py-4 flex-row justify-between items-center border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="location-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Services de localisation
                </Text>
              </View>
              <Switch
                value={settings.locationServices}
                onValueChange={() => toggleSetting('locationServices')}
                trackColor={{ false: "#E5E7EB", true: "#FE8C0050" }}
                thumbColor={settings.locationServices ? "#FE8C00" : "#9CA3AF"}
              />
            </View>
            <View className="px-4 py-4 flex-row justify-between items-center border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="finger-print-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Authentification biométrique
                </Text>
              </View>
              <Switch
                value={settings.biometricAuth}
                onValueChange={() => toggleSetting('biometricAuth')}
                trackColor={{ false: "#E5E7EB", true: "#FE8C0050" }}
                thumbColor={settings.biometricAuth ? "#FE8C00" : "#9CA3AF"}
              />
            </View>
            <TouchableOpacity className="px-4 py-4">
              <View className="flex-row items-center">
                <Ionicons name="document-text-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Politique de confidentialité
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bouton pour effacer les données */}
        <View className="mt-8 mx-4 mb-8">
          <TouchableOpacity
            onPress={handleClearData}
            className="bg-red-500/10 py-4 rounded-xl"
            disabled={saving}
          >
            <View className="flex-row items-center justify-center">
              {saving ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text className="text-red-500 font-quicksand-bold ml-2">
                    Effacer toutes les données
                  </Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Version de l'application */}
        <View className="mb-12 items-center">
          <Text className="text-sm font-quicksand text-neutral-400">
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
