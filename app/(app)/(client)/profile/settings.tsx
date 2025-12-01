import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from "../../../../components/ui/ToastManager";
import { useLocale } from "../../../../contexts/LocaleContext";
import { useTheme } from "../../../../contexts/ThemeContext";
import i18n from "../../../../i18n/i18n";
import PreferencesService from "../../../../services/api/PreferencesService";

export default function SettingsScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { toggleTheme, isDark } = useTheme();
  const { locale, changeLocale } = useLocale();

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
    language: i18n.t("client.settings.languageModal.french"),
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
  const [languageModal, setLanguageModal] = useState(false);

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
        language: prefs.general?.language === 'fr' ? i18n.t("client.settings.languageModal.french") : i18n.t("client.settings.languageModal.english"),
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
      toast.showError(i18n.t("client.settings.errors.loadPreferences"));
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour gérer le changement de thème
  const handleThemeChange = async () => {
    try {
      setSaving(true);

      // Basculer le thème localement d'abord (pour un feedback immédiat)
      await toggleTheme();

      // Déterminer le nouveau thème
      const newTheme = isDark ? 'light' : 'dark';

      // Sauvegarder sur le serveur
      await PreferencesService.updateGeneral({
        theme: newTheme
      });

      console.log('✅ Thème changé et sauvegardé:', newTheme);
      toast.showSuccess(i18n.t("client.settings.general.themeChanged"), i18n.t(`client.settings.general.themeActivated.${newTheme}`));
    } catch (error) {
      console.error("Erreur lors du changement de thème:", error);
      toast.showError(i18n.t("client.settings.errors.saveTheme"));

      // Annuler le changement local en cas d'erreur
      await toggleTheme();
    } finally {
      setSaving(false);
    }
  };

  // Fonction pour gérer le changement de langue
  const handleLanguageChange = async (newLanguage: "fr" | "en") => {
    setLanguageModal(false);

    try {
      // Changer la locale immédiatement pour une mise à jour instantanée de l'UI
      await changeLocale(newLanguage);
      setSettings(prev => ({ ...prev, language: newLanguage === 'fr' ? i18n.t("client.settings.languageModal.french") : i18n.t("client.settings.languageModal.english") }));

      // Mettre à jour le backend en arrière-plan
      PreferencesService.updateGeneral({ language: newLanguage }).catch(
        (error) => {
          console.error("Error updating language preference:", error);
          // Ne pas afficher d'erreur à l'utilisateur car l'UI a déjà changé
        }
      );

      console.log('✅ Langue changée:', newLanguage);
      toast.showSuccess(i18n.t("client.settings.general.languageChanged"), i18n.t(`client.settings.general.languageActivated.${newLanguage}`));
    } catch (error) {
      console.error("Error changing locale:", error);
      toast.showError(i18n.t("client.settings.errors.changeLanguage"));
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
        // Appeler l'API ET mettre à jour le context local
        await PreferencesService.updateGeneral({
          theme: newValue as string
        });
        // Appliquer le changement localement
        await toggleTheme();
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
      toast.showError(i18n.t("client.settings.errors.updatePreferences"));

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

      toast.showSuccess(i18n.t("client.settings.success.dataReset"), i18n.t("client.settings.success.dataResetMessage"));
    } catch (error) {
      console.error("Erreur lors de la réinitialisation des données:", error);
      toast.showError(i18n.t("client.settings.errors.resetData"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background-secondary">
      <ExpoStatusBar style="light" translucent />
      {/* Header vert */}
      <LinearGradient colors={['#10B981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="pb-6 rounded-b-3xl shadow-md" style={{ paddingTop: insets.top + 16, paddingBottom: 16 }}>
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
                {i18n.t("client.settings.title")}
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
        {/* Section GÉNÉRAL */}
        <View className="mt-6 mx-4">
          <Text className="text-sm font-quicksand-semibold text-neutral-500 mb-2">
            {i18n.t("client.settings.sections.general")}
          </Text>
          <View className="bg-white rounded-2xl">
            <View className="px-4 py-4 flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Ionicons
                  name={isDark ? "moon" : "sunny"}
                  size={20}
                  color="#374151"
                />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  {i18n.t("client.settings.general.darkMode")}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={handleThemeChange}
                trackColor={{ false: "#E5E7EB", true: "#10B98150" }}
                thumbColor={isDark ? "#10B981" : "#9CA3AF"}
                disabled={saving}
              />
            </View>
          </View>
        </View>

        {/* Paramètres des notifications */}
        <View className="mt-6 mx-4">
          <Text className="text-sm font-quicksand-semibold text-neutral-500 mb-2">
            {i18n.t("client.settings.sections.notifications")}
          </Text>
          <View className="bg-white rounded-2xl">
            <View className="px-4 py-4 flex-row justify-between items-center border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="notifications-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  {i18n.t("client.settings.notifications.pushEnabled")}
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
                  {i18n.t("client.settings.notifications.delivery")}
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
                  {i18n.t("client.settings.notifications.messages")}
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
                  {i18n.t("client.settings.notifications.newProducts")}
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
                  {i18n.t("client.settings.notifications.advertisements")}
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
                  {i18n.t("client.settings.notifications.systemUpdates")}
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
            {i18n.t("client.settings.sections.display")}
          </Text>
          <View className="bg-white rounded-2xl">
            <View className="px-4 py-4 flex-row justify-between items-center border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="grid-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  {i18n.t("client.settings.display.gridView")}
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
                  {i18n.t("client.settings.display.highQualityImages")}
                </Text>
              </View>
              <Switch
                value={settings.highQualityImages}
                onValueChange={() => toggleSetting('highQualityImages')}
                trackColor={{ false: "#E5E7EB", true: "#10B98150" }}
                thumbColor={settings.highQualityImages ? "#10B981" : "#9CA3AF"}
              />
            </View>
            <TouchableOpacity
              className="px-4 py-4 flex-row justify-between items-center"
              onPress={() => setLanguageModal(true)}
            >
              <View className="flex-row items-center">
                <Ionicons name="language-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  {i18n.t("client.settings.display.language")}
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
            {i18n.t("client.settings.sections.privacy")}
          </Text>
          <View className="bg-white rounded-2xl">
            <View className="px-4 py-4 flex-row justify-between items-center border-b border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="eye-outline" size={20} color="#374151" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  {i18n.t("client.settings.privacy.publicProfile")}
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
                  {i18n.t("client.settings.privacy.dataAnalytics")}
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
                  {i18n.t("client.settings.privacy.privacyPolicy")}
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
                    {i18n.t("client.settings.actions.clearData")}
                  </Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </View> */}

        {/* Version de l'application */}
        <View className="mb-12 mt-9 items-center">
          <Text className="text-sm font-quicksand text-neutral-400">
            {i18n.t("client.settings.appVersion")}
          </Text>
        </View>
      </ScrollView>

      {/* Modal de sélection de langue */}
      <Modal
        visible={languageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModal(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center items-center px-4"
          activeOpacity={1}
          onPress={() => setLanguageModal(false)}
        >
          <TouchableOpacity
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-xl"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-quicksand-bold text-neutral-800">
                {i18n.t("client.settings.languageModal.title")}
              </Text>
              <TouchableOpacity
                onPress={() => setLanguageModal(false)}
                className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Options de langue */}
            <TouchableOpacity
              onPress={() => handleLanguageChange("fr")}
              className={`flex-row items-center p-4 rounded-2xl mb-3 border ${locale === 'fr' ? 'bg-emerald-50 border-emerald-500' : 'bg-gray-50 border-transparent'
                }`}
            >
              <View className="w-8 h-8 rounded-full bg-emerald-500 items-center justify-center mr-4">
                <Text className="text-white text-xs font-quicksand-bold">
                  FR
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-quicksand-bold text-neutral-800">
                  {i18n.t("client.settings.languageModal.french")}
                </Text>
                <Text className="text-sm font-quicksand-medium text-neutral-600">
                  {i18n.t("client.settings.languageModal.frenchDescription")}
                </Text>
              </View>
              {locale === 'fr' && (
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleLanguageChange("en")}
              className={`flex-row items-center p-4 rounded-2xl border ${locale === 'en' ? 'bg-emerald-50 border-emerald-500' : 'bg-gray-50 border-transparent'
                }`}
            >
              <View className="w-8 h-8 rounded-full bg-emerald-500 items-center justify-center mr-4">
                <Text className="text-white text-xs font-quicksand-bold">
                  EN
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-quicksand-bold text-neutral-800">
                  {i18n.t("client.settings.languageModal.english")}
                </Text>
                <Text className="text-sm font-quicksand-medium text-neutral-600">
                  {i18n.t("client.settings.languageModal.englishDescription")}
                </Text>
              </View>
              {locale === 'en' && (
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
              {i18n.t("client.settings.clearDataModal.title")}
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
              {i18n.t("client.settings.clearDataModal.message")}
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
                  {i18n.t("client.settings.clearDataModal.cancel")}
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
                  {i18n.t("client.settings.clearDataModal.confirm")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
