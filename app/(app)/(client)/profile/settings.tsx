import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useToast } from "../../../../components/ui/ToastManager";
import PreferencesService from "../../../../services/api/PreferencesService";

export default function SettingsScreen() {
  const navigation = useNavigation();
  const router = useRouter();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  
  // État local pour les paramètres
  const [settings, setSettings] = useState({
    // Général
    language: "Français",
    theme: "auto" as "light" | "dark" | "auto",
    
    // Notifications
    pushEnabled: true,
    notifDelivery: true,
    notifMessages: true,
    notifNewProducts: false,
    notifAdvertisements: true,
    notifSystemUpdates: true,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    
    // Affichage
    productView: "grid" as "grid" | "list",
    productsPerPage: 20,
    highQualityImages: true,
    
    // Livraison
    defaultInstructions: "",
    preferredTimeSlot: "anytime" as "morning" | "afternoon" | "evening" | "anytime",
    
    // Confidentialité
    publicProfile: true,
    allowDataAnalytics: true,
  });

  // État pour le modal de confirmation de réinitialisation
  const [clearDataModal, setClearDataModal] = useState(false);

  // Charger les paramètres utilisateur depuis l'API
  useEffect(() => {
    loadUserPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserPreferences = async () => {
    try {
      setLoading(true);
      
      const prefs = await PreferencesService.getPreferences();
      
      setSettings({
        // Général
        language: prefs.general?.language === 'fr' ? 'Français' : 'English',
        theme: (prefs.general?.theme as "light" | "dark" | "auto") || 'auto',
        
        // Notifications
        pushEnabled: prefs.notifications?.pushEnabled ?? true,
        notifDelivery: prefs.notifications?.types?.delivery ?? true,
        notifMessages: prefs.notifications?.types?.messages ?? true,
        notifNewProducts: prefs.notifications?.types?.newProducts ?? false,
        notifAdvertisements: prefs.notifications?.types?.advertisements ?? true,
        notifSystemUpdates: prefs.notifications?.types?.systemUpdates ?? true,
        quietHoursEnabled: prefs.notifications?.quietHours?.enabled ?? false,
        quietHoursStart: prefs.notifications?.quietHours?.startTime || "22:00",
        quietHoursEnd: prefs.notifications?.quietHours?.endTime || "08:00",
        
        // Affichage
        productView: prefs.display?.productView || 'grid',
        productsPerPage: prefs.display?.productsPerPage || 20,
        highQualityImages: prefs.display?.highQualityImages ?? true,
        
        // Livraison
        defaultInstructions: prefs.delivery?.defaultInstructions || "",
        preferredTimeSlot: prefs.delivery?.preferredTimeSlot || 'anytime',
        
        // Confidentialité
        publicProfile: prefs.privacy?.publicProfile ?? true,
        allowDataAnalytics: prefs.privacy?.allowDataAnalytics ?? true,
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
    const currentValue = settings[setting];
    const newValue = typeof currentValue === 'boolean' ? !currentValue : currentValue;
    
    // Mise à jour optimiste de l'UI
    setSettings(prev => ({ ...prev, [setting]: newValue }));

    try {
      setSaving(true);

      // Appel API selon le type de préférence
      if (setting === 'pushEnabled') {
        await PreferencesService.updateNotifications({
          pushEnabled: newValue as boolean,
        });
      } else if (setting.startsWith('notif')) {
        // Notifications types
        const typeMap: Record<string, string> = {
          notifDelivery: 'delivery',
          notifMessages: 'messages',
          notifNewProducts: 'newProducts',
          notifAdvertisements: 'advertisements',
          notifSystemUpdates: 'systemUpdates',
        };
        const typeKey = typeMap[setting];
        if (typeKey) {
          await PreferencesService.updateNotifications({
            types: {
              [typeKey]: newValue as boolean,
            }
          });
        }
      } else if (setting === 'quietHoursEnabled') {
        await PreferencesService.updateNotifications({
          quietHours: {
            enabled: newValue as boolean,
            startTime: settings.quietHoursStart,
            endTime: settings.quietHoursEnd,
          }
        });
      } else if (setting === 'theme') {
        await PreferencesService.updateGeneral({
          theme: newValue as string
        });
      } else if (setting === 'productView' || setting === 'highQualityImages') {
        await PreferencesService.updateDisplay({
          [setting]: newValue
        });
      } else if (setting === 'publicProfile' || setting === 'allowDataAnalytics') {
        await PreferencesService.updatePrivacy({
          [setting]: newValue as boolean
        });
      }

      console.log('✅ Préférence mise à jour:', setting, newValue);
    } catch (error) {
      console.error("Erreur lors de la mise à jour des préférences:", error);
      toast.showError("Erreur", "Impossible de mettre à jour vos préférences");
      
      // Rollback en cas d'erreur
      setSettings(prev => ({ ...prev, [setting]: currentValue }));
    } finally {
      setSaving(false);
    }
  };

  // Fonction pour effacer les données
  const handleClearData = () => {
    setClearDataModal(true);
  };

  const confirmClearData = async () => {
    try {
      setSaving(true);
      setClearDataModal(false);
      
      // Appeler l'API pour réinitialiser les préférences
      await PreferencesService.resetPreferences();
      
      // Recharger les préférences depuis l'API
      await loadUserPreferences();
      
      toast.showSuccess("Données réinitialisées", "Vos préférences ont été remises à zéro");
    } catch (error) {
      console.error("Erreur lors de la réinitialisation des données:", error);
      toast.showError("Erreur", "Impossible de réinitialiser vos données");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-secondary">
      {/* Header vert */}
      <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="pt-16 pb-6 rounded-b-3xl shadow-md">
        <View className="px-6">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 bg-white/20 rounded-full justify-center items-center"
            >
              <Ionicons name="chevron-back" size={20} color="white" />
            </TouchableOpacity>
            <View className="flex-1 mx-4">
              <Text className="text-lg font-quicksand-bold text-white text-center">
                Paramètres
              </Text>
            </View>
            <View className="w-10 h-10">
              {loading && (
                <ActivityIndicator size="small" color="white" />
              )}
            </View>
          </View>
        </View>
      </LinearGradient>

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
                value={settings.pushEnabled}
                onValueChange={() => toggleSetting('pushEnabled')}
                trackColor={{ false: "#E5E7EB", true: "#10B98150" }}
                thumbColor={settings.pushEnabled ? "#10B981" : "#9CA3AF"}
              />
            </View>
            <View className="px-4 py-4 flex-row justify-between items-center border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="cube-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Livraisons
                </Text>
              </View>
              <Switch
                value={settings.notifDelivery}
                onValueChange={() => toggleSetting('notifDelivery')}
                trackColor={{ false: "#E5E7EB", true: "#10B98150" }}
                thumbColor={settings.notifDelivery ? "#10B981" : "#9CA3AF"}
              />
            </View>
            <View className="px-4 py-4 flex-row justify-between items-center border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="chatbubble-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Messages
                </Text>
              </View>
              <Switch
                value={settings.notifMessages}
                onValueChange={() => toggleSetting('notifMessages')}
                trackColor={{ false: "#E5E7EB", true: "#10B98150" }}
                thumbColor={settings.notifMessages ? "#10B981" : "#9CA3AF"}
              />
            </View>
            <View className="px-4 py-4 flex-row justify-between items-center border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="sparkles-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Nouveaux produits
                </Text>
              </View>
              <Switch
                value={settings.notifNewProducts}
                onValueChange={() => toggleSetting('notifNewProducts')}
                trackColor={{ false: "#E5E7EB", true: "#10B98150" }}
                thumbColor={settings.notifNewProducts ? "#10B981" : "#9CA3AF"}
              />
            </View>
            <View className="px-4 py-4 flex-row justify-between items-center border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="megaphone-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Publicités
                </Text>
              </View>
              <Switch
                value={settings.notifAdvertisements}
                onValueChange={() => toggleSetting('notifAdvertisements')}
                trackColor={{ false: "#E5E7EB", true: "#10B98150" }}
                thumbColor={settings.notifAdvertisements ? "#10B981" : "#9CA3AF"}
              />
            </View>
            <View className="px-4 py-4 flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Ionicons name="sync-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Mises à jour système
                </Text>
              </View>
              <Switch
                value={settings.notifSystemUpdates}
                onValueChange={() => toggleSetting('notifSystemUpdates')}
                trackColor={{ false: "#E5E7EB", true: "#10B98150" }}
                thumbColor={settings.notifSystemUpdates ? "#10B981" : "#9CA3AF"}
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
                <Ionicons name="grid-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Affichage grille
                </Text>
              </View>
              <Switch
                value={settings.productView === 'grid'}
                onValueChange={() => toggleSetting('productView')}
                trackColor={{ false: "#E5E7EB", true: "#10B98150" }}
                thumbColor={settings.productView === 'grid' ? "#10B981" : "#9CA3AF"}
              />
            </View>
            <View className="px-4 py-4 flex-row justify-between items-center border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="image-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Images haute qualité
                </Text>
              </View>
              <Switch
                value={settings.highQualityImages}
                onValueChange={() => toggleSetting('highQualityImages')}
                trackColor={{ false: "#E5E7EB", true: "#10B98150" }}
                thumbColor={settings.highQualityImages ? "#10B981" : "#9CA3AF"}
              />
            </View>
            <TouchableOpacity className="px-4 py-4 flex-row justify-between items-center">
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
                <Ionicons name="eye-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Profil public
                </Text>
              </View>
              <Switch
                value={settings.publicProfile}
                onValueChange={() => toggleSetting('publicProfile')}
                trackColor={{ false: "#E5E7EB", true: "#10B98150" }}
                thumbColor={settings.publicProfile ? "#10B981" : "#9CA3AF"}
              />
            </View>
            <View className="px-4 py-4 flex-row justify-between items-center border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="analytics-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Analyse des données
                </Text>
              </View>
              <Switch
                value={settings.allowDataAnalytics}
                onValueChange={() => toggleSetting('allowDataAnalytics')}
                trackColor={{ false: "#E5E7EB", true: "#10B98150" }}
                thumbColor={settings.allowDataAnalytics ? "#10B981" : "#9CA3AF"}
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
        {/* <View className="mt-8 mx-4 mb-8">
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
        </View> */}

        {/* Version de l'application */}
        <View className="mb-12 mt-9 items-center">
          <Text className="text-sm font-quicksand text-neutral-400">
            Axi Market 1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* Modal de confirmation pour effacer les données */}
      <Modal
        visible={clearDataModal}
        transparent
        animationType="fade"
        onRequestClose={() => setClearDataModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 400,
            alignItems: 'center',
          }}>
            {/* Icône d'alerte */}
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: '#FEE2E2',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Ionicons name="trash" size={32} color="#EF4444" />
            </View>

            {/* Titre */}
            <Text style={{
              fontSize: 20,
              fontFamily: 'Quicksand-Bold',
              color: '#333',
              marginBottom: 8,
              textAlign: 'center',
            }}>
              Effacer les données
            </Text>

            {/* Message */}
            <Text style={{
              fontSize: 14,
              fontFamily: 'Quicksand-Regular',
              color: '#666',
              textAlign: 'center',
              marginBottom: 24,
              lineHeight: 20,
            }}>
              Êtes-vous sûr de vouloir effacer toutes vos données ? Cette action réinitialisera toutes vos préférences.
            </Text>

            {/* Boutons */}
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              {/* Bouton Annuler */}
              <TouchableOpacity
                onPress={() => setClearDataModal(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#F3F4F6',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                activeOpacity={0.7}
              >
                <Text style={{
                  color: '#666',
                  fontSize: 16,
                  fontFamily: 'Quicksand-SemiBold',
                }}>
                  Annuler
                </Text>
              </TouchableOpacity>

              {/* Bouton Effacer */}
              <TouchableOpacity
                onPress={confirmClearData}
                style={{
                  flex: 1,
                  backgroundColor: '#EF4444',
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                activeOpacity={0.7}
              >
                <Text style={{
                  color: 'white',
                  fontSize: 16,
                  fontFamily: 'Quicksand-SemiBold',
                }}>
                  Effacer
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
