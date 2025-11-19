import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../../../../components/ui/ToastManager";
import PreferencesService from "../../../../services/api/PreferencesService";

export default function EnterpriseSettingsScreen() {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  
  // États pour les paramètres réels du modèle
  const [language, setLanguage] = useState('fr');
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  
  // Notifications
  const [pushEnabled, setPushEnabled] = useState(true);
  const [notifDelivery, setNotifDelivery] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifNewProducts, setNotifNewProducts] = useState(true);
  const [notifAdvertisements, setNotifAdvertisements] = useState(true);
  const [notifSystemUpdates, setNotifSystemUpdates] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('08:00');
  
  // Display
  const [productView, setProductView] = useState<'grid' | 'list'>('grid');
  const [productsPerPage, setProductsPerPage] = useState(20);
  const [highQualityImages, setHighQualityImages] = useState(true);
  
  // Enterprise
  const [autoOnlineStatus, setAutoOnlineStatus] = useState(false);
  const [autoAcceptOrders, setAutoAcceptOrders] = useState(false);
  const [showProductRatings, setShowProductRatings] = useState(true);
  
  // Privacy
  const [publicProfile, setPublicProfile] = useState(true);
  const [allowDataAnalytics, setAllowDataAnalytics] = useState(true);
  
  // États pour les modals
  const [clearDataModal, setClearDataModal] = useState(false);
  const [languageModal, setLanguageModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Charger les préférences au démarrage
  useEffect(() => {
    loadUserPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await PreferencesService.getPreferences();

      // General
      setLanguage(prefs.general?.language || 'fr');
      setTheme((prefs.general?.theme as "light" | "dark" | "auto") || 'auto');

      // Notifications
      setPushEnabled(prefs.notifications?.pushEnabled ?? true);
      setNotifDelivery(prefs.notifications?.types?.delivery ?? true);
      setNotifMessages(prefs.notifications?.types?.messages ?? true);
      setNotifNewProducts(prefs.notifications?.types?.newProducts ?? true);
      setNotifAdvertisements(prefs.notifications?.types?.advertisements ?? true);
      setNotifSystemUpdates(prefs.notifications?.types?.systemUpdates ?? true);
      setQuietHoursEnabled(prefs.notifications?.quietHours?.enabled ?? false);
      setQuietHoursStart(prefs.notifications?.quietHours?.startTime || '22:00');
      setQuietHoursEnd(prefs.notifications?.quietHours?.endTime || '08:00');

      // Display
      setProductView(prefs.display?.productView || 'grid');
      setProductsPerPage(prefs.display?.productsPerPage || 20);
      setHighQualityImages(prefs.display?.highQualityImages ?? true);

      // Enterprise
      setAutoOnlineStatus(prefs.enterprise?.autoOnlineStatus ?? false);
      setAutoAcceptOrders(prefs.enterprise?.autoAcceptOrders ?? false);
      setShowProductRatings(prefs.enterprise?.showProductRatings ?? true);

      // Privacy
      setPublicProfile(prefs.privacy?.publicProfile ?? true);
      setAllowDataAnalytics(prefs.privacy?.allowDataAnalytics ?? true);
    } catch (error) {
      console.error("Erreur lors du chargement des préférences:", error);
      toast.showError("Erreur", "Impossible de charger vos préférences");
    } finally {
      setLoading(false);
    }
  };

  // Fonction générique pour mettre à jour un paramètre
  const toggleSetting = async (
    settingName: string,
    currentValue: boolean,
    setter: (value: boolean) => void,
    apiUpdateFn: () => Promise<void>
  ) => {
    const newValue = !currentValue;
    setter(newValue); // Optimistic update

    try {
      await apiUpdateFn();
    } catch {
      setter(currentValue); // Rollback on error
      toast.showError('Erreur', 'Impossible de mettre à jour le paramètre');
    }
  };

  // Fonction pour réinitialiser les paramètres
  const handleClearData = () => {
    setClearDataModal(true);
  };

  const confirmClearData = async () => {
    try {
      setSaving(true);
      setClearDataModal(false);
      
      await PreferencesService.resetPreferences();
      await loadUserPreferences();
      
      toast.showSuccess('Réinitialisation', 'Paramètres réinitialisés avec succès');
    } catch (error) {
      console.error("Erreur réinitialisation:", error);
      toast.showError("Erreur", "Impossible de réinitialiser");
    } finally {
      setSaving(false);
    }
  };

  // Fonction pour changer la langue
  const handleLanguageChange = async (newLanguage: 'fr' | 'en') => {
    const oldLanguage = language;
    setLanguage(newLanguage);
    setLanguageModal(false);

    try {
      await PreferencesService.updateGeneral({ language: newLanguage });
    } catch {
      setLanguage(oldLanguage); // Rollback on error
      toast.showError('Erreur', 'Impossible de changer la langue');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-background-secondary">
        <ExpoStatusBar style="light" translucent />
        <LinearGradient
          colors={['#10B981', '#34D399']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 16,
            paddingBottom: 16,
            paddingLeft: insets.left + 24,
            paddingRight: insets.right + 24,
          }}
        >
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-xl font-quicksand-bold text-white">Paramètres</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10B981" />
          <Text className="mt-4 text-neutral-600 font-quicksand-medium">Chargement...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-secondary">
      <ExpoStatusBar style="light" translucent />
      {/* Header avec gradient vert */}
      <LinearGradient
        colors={['#10B981', '#34D399']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 16,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
        }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-xl font-quicksand-bold text-white">Paramètres</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Général */}
        <View className="mt-6 px-4">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3 pl-1">
            Général
          </Text>
          <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-neutral-100">
              <View className="flex-row items-center">
                <Ionicons name="contrast-outline" size={20} color="#10B981" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Thème
                </Text>
              </View>
              <Switch
                value={theme === 'dark'}
                onValueChange={(value) =>
                  toggleSetting('theme', theme === 'dark', (v) => setTheme(v ? 'dark' : 'light'), async () => {
                    await PreferencesService.updateGeneral({ theme: value ? 'dark' : 'light' });
                  })
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={theme === 'dark' ? "#10B981" : "#9CA3AF"}
              />
            </View>
            
            <TouchableOpacity 
              className="flex-row items-center justify-between px-4 py-4"
              onPress={() => setLanguageModal(true)}
            >
              <View className="flex-row items-center">
                <Ionicons name="language-outline" size={20} color="#10B981" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Langue
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-neutral-500 font-quicksand-medium mr-2">{language === 'fr' ? 'Français' : 'English'}</Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        <View className="mt-6 px-4">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3 pl-1">
            Notifications
          </Text>
          <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-neutral-100">
              <View className="flex-row items-center">
                <Ionicons name="notifications-outline" size={20} color="#10B981" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Notifications push
                </Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={(value) =>
                  toggleSetting('pushEnabled', pushEnabled, setPushEnabled, async () => {
                    await PreferencesService.updateNotifications({ pushEnabled: value });
                  })
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={pushEnabled ? "#10B981" : "#9CA3AF"}
              />
            </View>
            
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-neutral-100">
              <View className="flex-row items-center">
                <Ionicons name="cube-outline" size={20} color="#10B981" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Livraisons
                </Text>
              </View>
              <Switch
                value={notifDelivery}
                onValueChange={(value) =>
                  toggleSetting('notifDelivery', notifDelivery, setNotifDelivery, async () => {
                    await PreferencesService.updateNotifications({ types: { delivery: value } });
                  })
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={notifDelivery ? "#10B981" : "#9CA3AF"}
              />
            </View>
            
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-neutral-100">
              <View className="flex-row items-center">
                <Ionicons name="chatbubble-outline" size={20} color="#10B981" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Messages
                </Text>
              </View>
              <Switch
                value={notifMessages}
                onValueChange={(value) =>
                  toggleSetting('notifMessages', notifMessages, setNotifMessages, async () => {
                    await PreferencesService.updateNotifications({ types: { messages: value } });
                  })
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={notifMessages ? "#10B981" : "#9CA3AF"}
              />
            </View>
            
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-neutral-100">
              <View className="flex-row items-center">
                <Ionicons name="sparkles-outline" size={20} color="#10B981" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Nouveaux produits
                </Text>
              </View>
              <Switch
                value={notifNewProducts}
                onValueChange={(value) =>
                  toggleSetting('notifNewProducts', notifNewProducts, setNotifNewProducts, async () => {
                    await PreferencesService.updateNotifications({ types: { newProducts: value } });
                  })
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={notifNewProducts ? "#10B981" : "#9CA3AF"}
              />
            </View>
            
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-neutral-100">
              <View className="flex-row items-center">
                <Ionicons name="megaphone-outline" size={20} color="#10B981" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Publicités
                </Text>
              </View>
              <Switch
                value={notifAdvertisements}
                onValueChange={(value) =>
                  toggleSetting('notifAdvertisements', notifAdvertisements, setNotifAdvertisements, async () => {
                    await PreferencesService.updateNotifications({ types: { advertisements: value } });
                  })
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={notifAdvertisements ? "#10B981" : "#9CA3AF"}
              />
            </View>
            
            <View className="flex-row items-center justify-between px-4 py-4">
              <View className="flex-row items-center">
                <Ionicons name="sync-outline" size={20} color="#10B981" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Mises à jour système
                </Text>
              </View>
              <Switch
                value={notifSystemUpdates}
                onValueChange={(value) =>
                  toggleSetting('notifSystemUpdates', notifSystemUpdates, setNotifSystemUpdates, async () => {
                    await PreferencesService.updateNotifications({ types: { systemUpdates: value } });
                  })
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={notifSystemUpdates ? "#10B981" : "#9CA3AF"}
              />
            </View>
          </View>
        </View>

        {/* Affichage */}
        <View className="mt-6 px-4">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3 pl-1">
            Affichage
          </Text>
          <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-neutral-100">
              <View className="flex-row items-center">
                <Ionicons name="grid-outline" size={20} color="#10B981" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Vue en grille
                </Text>
              </View>
              <Switch
                value={productView === 'grid'}
                onValueChange={(value) =>
                  toggleSetting('productView', productView === 'grid', (v) => setProductView(v ? 'grid' : 'list'), async () => {
                    await PreferencesService.updateDisplay({ productView: value ? 'grid' : 'list' });
                  })
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={productView === 'grid' ? "#10B981" : "#9CA3AF"}
              />
            </View>
            
            <View className="flex-row items-center justify-between px-4 py-4">
              <View className="flex-row items-center">
                <Ionicons name="image-outline" size={20} color="#10B981" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Images haute qualité
                </Text>
              </View>
              <Switch
                value={highQualityImages}
                onValueChange={(value) =>
                  toggleSetting('highQualityImages', highQualityImages, setHighQualityImages, async () => {
                    await PreferencesService.updateDisplay({ highQualityImages: value });
                  })
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={highQualityImages ? "#10B981" : "#9CA3AF"}
              />
            </View>
          </View>
        </View>

        {/* Entreprise */}
        <View className="mt-6 px-4">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3 pl-1">
            Entreprise
          </Text>
          <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-neutral-100">
              <View className="flex-row items-center">
                <Ionicons name="power-outline" size={20} color="#10B981" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Statut en ligne auto
                </Text>
              </View>
              <Switch
                value={autoOnlineStatus}
                onValueChange={(value) =>
                  toggleSetting('autoOnlineStatus', autoOnlineStatus, setAutoOnlineStatus, async () => {
                    await PreferencesService.updateEnterprise({ autoOnlineStatus: value });
                  })
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={autoOnlineStatus ? "#10B981" : "#9CA3AF"}
              />
            </View>
            
            {/* <View className="flex-row items-center justify-between px-4 py-4 border-b border-neutral-100">
              <View className="flex-row items-center">
                <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Auto-acceptation commandes
                </Text>
              </View>
              <Switch
                value={autoAcceptOrders}
                onValueChange={(value) =>
                  toggleSetting('autoAcceptOrders', autoAcceptOrders, setAutoAcceptOrders, async () => {
                    await PreferencesService.updateEnterprise({ autoAcceptOrders: value });
                  })
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={autoAcceptOrders ? "#10B981" : "#9CA3AF"}
              />
            </View> */}
            
            {/* <View className="flex-row items-center justify-between px-4 py-4">
              <View className="flex-row items-center">
                <Ionicons name="star-outline" size={20} color="#10B981" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Afficher évaluations
                </Text>
              </View>
              <Switch
                value={showProductRatings}
                onValueChange={(value) =>
                  toggleSetting('showProductRatings', showProductRatings, setShowProductRatings, async () => {
                    await PreferencesService.updateEnterprise({ showProductRatings: value });
                  })
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={showProductRatings ? "#10B981" : "#9CA3AF"}
              />
            </View> */}
          </View>
        </View>

        {/* Confidentialité */}
        <View className="mt-6 px-4">
          <Text className="text-lg font-quicksand-bold text-neutral-800 mb-3 pl-1">
            Confidentialité
          </Text>
          <View className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-neutral-100">
              <View className="flex-row items-center">
                <Ionicons name="eye-outline" size={20} color="#10B981" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Profil public
                </Text>
              </View>
              <Switch
                value={publicProfile}
                onValueChange={(value) =>
                  toggleSetting('publicProfile', publicProfile, setPublicProfile, async () => {
                    await PreferencesService.updatePrivacy({ publicProfile: value });
                  })
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={publicProfile ? "#10B981" : "#9CA3AF"}
              />
            </View>
            
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-neutral-100">
              <View className="flex-row items-center">
                <Ionicons name="analytics-outline" size={20} color="#10B981" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Analyses de données
                </Text>
              </View>
              <Switch
                value={allowDataAnalytics}
                onValueChange={(value) =>
                  toggleSetting('allowDataAnalytics', allowDataAnalytics, setAllowDataAnalytics, async () => {
                    await PreferencesService.updatePrivacy({ allowDataAnalytics: value });
                  })
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={allowDataAnalytics ? "#10B981" : "#9CA3AF"}
              />
            </View>
            
            <TouchableOpacity className="flex-row items-center justify-between px-4 py-4">
              <View className="flex-row items-center">
                <Ionicons name="document-text-outline" size={20} color="#10B981" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  Politique de confidentialité
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bouton Réinitialiser */}
        <View className="mt-6 mb-10 px-4">
          <TouchableOpacity
            onPress={handleClearData}
            className="bg-error-100 rounded-xl py-4 items-center"
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Text className="text-error-600 font-quicksand-semibold">
                Réinitialiser les paramètres
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de sélection de langue */}
      <Modal
        visible={languageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModal(false)}
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
          }}>
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
            }}>
              <Text style={{
                fontSize: 20,
                fontFamily: 'Quicksand-Bold',
                color: '#333',
              }}>
                Choisir la langue
              </Text>
              <TouchableOpacity
                onPress={() => setLanguageModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Options de langue */}
            <TouchableOpacity
              onPress={() => handleLanguageChange('fr')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: language === 'fr' ? '#C7F4DC' : '#F9FAFB',
                marginBottom: 12,
                borderWidth: language === 'fr' ? 2 : 0,
                borderColor: language === 'fr' ? '#10B981' : 'transparent',
              }}
            >
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: '#10B981',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
              }}>
                <Text style={{
                  color: 'white',
                  fontSize: 12,
                  fontFamily: 'Quicksand-Bold',
                }}>
                  FR
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontFamily: 'Quicksand-SemiBold',
                  color: '#333',
                }}>
                  Français
                </Text>
                <Text style={{
                  fontSize: 14,
                  fontFamily: 'Quicksand-Regular',
                  color: '#666',
                  marginTop: 2,
                }}>
                  French
                </Text>
              </View>
              {language === 'fr' && (
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleLanguageChange('en')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 16,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: language === 'en' ? '#C7F4DC' : '#F9FAFB',
                borderWidth: language === 'en' ? 2 : 0,
                borderColor: language === 'en' ? '#10B981' : 'transparent',
              }}
            >
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: '#10B981',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16,
              }}>
                <Text style={{
                  color: 'white',
                  fontSize: 12,
                  fontFamily: 'Quicksand-Bold',
                }}>
                  EN
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontFamily: 'Quicksand-SemiBold',
                  color: '#333',
                }}>
                  English
                </Text>
                <Text style={{
                  fontSize: 14,
                  fontFamily: 'Quicksand-Regular',
                  color: '#666',
                  marginTop: 2,
                }}>
                  Anglais
                </Text>
              </View>
              {language === 'en' && (
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmation pour réinitialiser */}
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
            {/* Icône */}
            <View style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              backgroundColor: '#FEE2E2',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}>
              <Ionicons name="trash-outline" size={32} color="#EF4444" />
            </View>

            {/* Titre */}
            <Text style={{
              fontSize: 20,
              fontFamily: 'Quicksand-Bold',
              color: '#333',
              marginBottom: 8,
              textAlign: 'center',
            }}>
              Réinitialiser les paramètres
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
              Êtes-vous sûr de vouloir réinitialiser tous les paramètres à leurs valeurs par défaut ? Cette action ne peut pas être annulée.
            </Text>

            {/* Boutons */}
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
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
    </View>
  );
}
