import { useTheme } from "@/contexts/ThemeContext";
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
import { useLocale } from "../../../../contexts/LocaleContext";
import i18n from "../../../../i18n/i18n";
import PreferencesService from "../../../../services/api/PreferencesService";

export default function EnterpriseSettingsScreen() {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { locale, changeLocale } = useLocale();
  const { theme: appTheme, colors, toggleTheme, isDark } = useTheme();

  // États pour les paramètres réels du modèle
  const [language, setLanguage] = useState<"fr" | "en">(locale as "fr" | "en");

  // Notifications
  const [pushEnabled, setPushEnabled] = useState(true);
  const [notifDelivery, setNotifDelivery] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifNewProducts, setNotifNewProducts] = useState(true);
  const [notifAdvertisements, setNotifAdvertisements] = useState(true);
  const [notifSystemUpdates, setNotifSystemUpdates] = useState(true);

  // Display
  const [productView, setProductView] = useState<"grid" | "list">("grid");
  const [highQualityImages, setHighQualityImages] = useState(true);

  // Enterprise
  const [autoOnlineStatus, setAutoOnlineStatus] = useState(false);

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
      setLanguage((prefs.general?.language || "fr") as "fr" | "en");

      // Notifications
      setPushEnabled(prefs.notifications?.pushEnabled ?? true);
      setNotifDelivery(prefs.notifications?.types?.delivery ?? true);
      setNotifMessages(prefs.notifications?.types?.messages ?? true);
      setNotifNewProducts(prefs.notifications?.types?.newProducts ?? true);
      setNotifAdvertisements(
        prefs.notifications?.types?.advertisements ?? true
      );
      setNotifSystemUpdates(prefs.notifications?.types?.systemUpdates ?? true);

      // Display
      setProductView(prefs.display?.productView || "grid");
      setHighQualityImages(prefs.display?.highQualityImages ?? true);

      // Enterprise
      setAutoOnlineStatus(prefs.enterprise?.autoOnlineStatus ?? false);

      // Privacy
      setPublicProfile(prefs.privacy?.publicProfile ?? true);
      setAllowDataAnalytics(prefs.privacy?.allowDataAnalytics ?? true);
    } catch (error) {
      console.error("Erreur lors du chargement des préférences:", error);
      toast.showError(
        i18n.t("enterprise.settings.messages.error"),
        i18n.t("enterprise.settings.messages.loadPreferencesError")
      );
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
      toast.showError(
        i18n.t("enterprise.settings.messages.error"),
        i18n.t("enterprise.settings.messages.updateSettingError")
      );
    }
  };

  // Fonction pour réinitialiser les paramètres
  const handleClearData = () => {
    setClearDataModal(true);
  };

  const confirmClearData = async () => {
    try {
      setSaving(true);

      await PreferencesService.resetPreferences();
      await loadUserPreferences();

      toast.showSuccess(
        i18n.t("enterprise.settings.messages.resetSuccess"),
        i18n.t("enterprise.settings.messages.resetSuccessMessage")
      );
      setClearDataModal(false);
    } catch (error) {
      console.error("Erreur réinitialisation:", error);
      toast.showError(
        i18n.t("enterprise.settings.messages.error"),
        i18n.t("enterprise.settings.messages.resetError")
      );
    } finally {
      setSaving(false);
    }
  };

  // Fonction pour changer la langue
  const handleLanguageChange = async (newLanguage: "fr" | "en") => {
    setLanguageModal(false);

    try {
      // Change locale immediately for instant UI update
      await changeLocale(newLanguage);
      setLanguage(newLanguage);

      // Update backend in background (don't block UI)
      PreferencesService.updateGeneral({ language: newLanguage }).catch(
        (error) => {
          console.error("Error updating language preference:", error);
          // Don't show error to user as UI already changed
        }
      );
    } catch (error) {
      console.error("Error changing locale:", error);
      toast.showError(
        i18n.t("enterprise.settings.messages.error"),
        i18n.t("enterprise.settings.messages.languageChangeError")
      );
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.secondary }}>
        <ExpoStatusBar style="light" translucent />
        <LinearGradient
          colors={[colors.brandGradientStart, colors.brandGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            paddingTop: insets.top + 16,
            paddingBottom: 32,
            paddingLeft: insets.left + 24,
            paddingRight: insets.right + 24,
          }}
        >
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text className="text-xl font-quicksand-bold text-white">
              {i18n.t("enterprise.settings.title")}
            </Text>
            <View className="w-10 h-10" />
          </View>
        </LinearGradient>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={isDark ? colors.brandPrimary : "#10B981"} />
          <Text style={{ marginTop: 16, color: colors.textSecondary }} className="font-quicksand-medium">
            {i18n.t("enterprise.settings.loading")}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      <ExpoStatusBar style="light" translucent />
      {/* Header avec gradient vert */}
      <LinearGradient
        colors={[colors.brandGradientStart, colors.brandGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 32,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
        }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-xl font-quicksand-bold text-white">
            {i18n.t("enterprise.settings.title")}
          </Text>
          <View className="w-10 h-10" />
        </View>
      </LinearGradient>

      <ScrollView
        style={{ backgroundColor: colors.secondary }}
        className="-mt-6 rounded-t-[32px] flex-1 pt-8"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* Général */}
        <View className="px-4">
          <Text style={{ color: colors.textPrimary }} className="text-lg font-quicksand-bold mb-3 pl-1">
            {i18n.t("enterprise.settings.general.title")}
          </Text>
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-2xl shadow-sm border overflow-hidden">
            <View style={{ borderColor: colors.border }} className="flex-row items-center justify-between px-4 py-4 border-b">
              <View className="flex-row items-center">
                <Ionicons name="contrast-outline" size={20} color={colors.brandPrimary} />
                <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-medium ml-3">
                  {i18n.t("enterprise.settings.general.theme")}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={async () => {
                  await toggleTheme();
                  // Update backend preferences in background
                  PreferencesService.updateGeneral({
                    theme: isDark ? "light" : "dark",
                  }).catch(console.error);
                }}
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={isDark ? "#10B981" : "#9CA3AF"}
              />
            </View>

            <TouchableOpacity
              className="flex-row items-center justify-between px-4 py-4"
              onPress={() => setLanguageModal(true)}
            >
              <View className="flex-row items-center">
                <Ionicons name="language-outline" size={20} color="#10B981" />
                <Text className="text-base font-quicksand-medium text-neutral-800 ml-3">
                  {i18n.t("enterprise.settings.general.language")}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-neutral-500 font-quicksand-medium mr-2">
                  {language === "fr" ? "Français" : "English"}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        <View className="mt-6 px-4">
          <Text style={{ color: colors.textPrimary }} className="text-lg font-quicksand-bold mb-3 pl-1">
            {i18n.t("enterprise.settings.notifications.title")}
          </Text>
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-2xl shadow-sm border overflow-hidden">
            <View style={{ borderColor: colors.border }} className="flex-row items-center justify-between px-4 py-4 border-b">
              <View className="flex-row items-center">
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={colors.brandPrimary}
                />
                <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-medium ml-3">
                  {i18n.t("enterprise.settings.notifications.pushEnabled")}
                </Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={(value) =>
                  toggleSetting(
                    "pushEnabled",
                    pushEnabled,
                    setPushEnabled,
                    async () => {
                      await PreferencesService.updateNotifications({
                        pushEnabled: value,
                      });
                    }
                  )
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={pushEnabled ? "#10B981" : "#9CA3AF"}
              />
            </View>

            <View style={{ borderColor: colors.border }} className="flex-row items-center justify-between px-4 py-4 border-b">
              <View className="flex-row items-center">
                <Ionicons name="cube-outline" size={20} color={colors.brandPrimary} />
                <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-medium ml-3">
                  {i18n.t("enterprise.settings.notifications.delivery")}
                </Text>
              </View>
              <Switch
                value={notifDelivery}
                onValueChange={(value) =>
                  toggleSetting(
                    "notifDelivery",
                    notifDelivery,
                    setNotifDelivery,
                    async () => {
                      await PreferencesService.updateNotifications({
                        types: { delivery: value },
                      });
                    }
                  )
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={notifDelivery ? "#10B981" : "#9CA3AF"}
              />
            </View>

            <View style={{ borderColor: colors.border }} className="flex-row items-center justify-between px-4 py-4 border-b">
              <View className="flex-row items-center">
                <Ionicons name="chatbubble-outline" size={20} color={colors.brandPrimary} />
                <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-medium ml-3">
                  {i18n.t("enterprise.settings.notifications.messages")}
                </Text>
              </View>
              <Switch
                value={notifMessages}
                onValueChange={(value) =>
                  toggleSetting(
                    "notifMessages",
                    notifMessages,
                    setNotifMessages,
                    async () => {
                      await PreferencesService.updateNotifications({
                        types: { messages: value },
                      });
                    }
                  )
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={notifMessages ? "#10B981" : "#9CA3AF"}
              />
            </View>

            <View style={{ borderColor: colors.border }} className="flex-row items-center justify-between px-4 py-4 border-b">
              <View className="flex-row items-center">
                <Ionicons name="sparkles-outline" size={20} color={colors.brandPrimary} />
                <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-medium ml-3">
                  {i18n.t("enterprise.settings.notifications.newProducts")}
                </Text>
              </View>
              <Switch
                value={notifNewProducts}
                onValueChange={(value) =>
                  toggleSetting(
                    "notifNewProducts",
                    notifNewProducts,
                    setNotifNewProducts,
                    async () => {
                      await PreferencesService.updateNotifications({
                        types: { newProducts: value },
                      });
                    }
                  )
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={notifNewProducts ? "#10B981" : "#9CA3AF"}
              />
            </View>

            <View style={{ borderColor: colors.border }} className="flex-row items-center justify-between px-4 py-4 border-b">
              <View className="flex-row items-center">
                <Ionicons name="megaphone-outline" size={20} color={colors.brandPrimary} />
                <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-medium ml-3">
                  {i18n.t("enterprise.settings.notifications.advertisements")}
                </Text>
              </View>
              <Switch
                value={notifAdvertisements}
                onValueChange={(value) =>
                  toggleSetting(
                    "notifAdvertisements",
                    notifAdvertisements,
                    setNotifAdvertisements,
                    async () => {
                      await PreferencesService.updateNotifications({
                        types: { advertisements: value },
                      });
                    }
                  )
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={notifAdvertisements ? "#10B981" : "#9CA3AF"}
              />
            </View>

            <View className="flex-row items-center justify-between px-4 py-4">
              <View className="flex-row items-center">
                <Ionicons name="sync-outline" size={20} color={colors.brandPrimary} />
                <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-medium ml-3">
                  {i18n.t("enterprise.settings.notifications.systemUpdates")}
                </Text>
              </View>
              <Switch
                value={notifSystemUpdates}
                onValueChange={(value) =>
                  toggleSetting(
                    "notifSystemUpdates",
                    notifSystemUpdates,
                    setNotifSystemUpdates,
                    async () => {
                      await PreferencesService.updateNotifications({
                        types: { systemUpdates: value },
                      });
                    }
                  )
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={notifSystemUpdates ? "#10B981" : "#9CA3AF"}
              />
            </View>
          </View>
        </View>

        {/* Affichage */}
        <View className="mt-6 px-4">
          <Text style={{ color: colors.textPrimary }} className="text-lg font-quicksand-bold mb-3 pl-1">
            {i18n.t("enterprise.settings.display.title")}
          </Text>
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-2xl shadow-sm border overflow-hidden">
            <View style={{ borderColor: colors.border }} className="flex-row items-center justify-between px-4 py-4 border-b">
              <View className="flex-row items-center">
                <Ionicons name="grid-outline" size={20} color={colors.brandPrimary} />
                <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-medium ml-3">
                  {i18n.t("enterprise.settings.display.gridView")}
                </Text>
              </View>
              <Switch
                value={productView === "grid"}
                onValueChange={(value) =>
                  toggleSetting(
                    "productView",
                    productView === "grid",
                    (v) => setProductView(v ? "grid" : "list"),
                    async () => {
                      await PreferencesService.updateDisplay({
                        productView: value ? "grid" : "list",
                      });
                    }
                  )
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={productView === "grid" ? "#10B981" : "#9CA3AF"}
              />
            </View>

            <View className="flex-row items-center justify-between px-4 py-4">
              <View className="flex-row items-center">
                <Ionicons name="image-outline" size={20} color={colors.brandPrimary} />
                <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-medium ml-3">
                  {i18n.t("enterprise.settings.display.highQualityImages")}
                </Text>
              </View>
              <Switch
                value={highQualityImages}
                onValueChange={(value) =>
                  toggleSetting(
                    "highQualityImages",
                    highQualityImages,
                    setHighQualityImages,
                    async () => {
                      await PreferencesService.updateDisplay({
                        highQualityImages: value,
                      });
                    }
                  )
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={highQualityImages ? "#10B981" : "#9CA3AF"}
              />
            </View>
          </View>
        </View>

        {/* Entreprise */}
        <View className="mt-6 px-4">
          <Text style={{ color: colors.textPrimary }} className="text-lg font-quicksand-bold mb-3 pl-1">
            {i18n.t("enterprise.settings.enterprise.title")}
          </Text>
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-2xl shadow-sm border overflow-hidden">
            <View style={{ borderColor: colors.border }} className="flex-row items-center justify-between px-4 py-4 border-b">
              <View className="flex-row items-center">
                <Ionicons name="power-outline" size={20} color={colors.brandPrimary} />
                <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-medium ml-3">
                  {i18n.t("enterprise.settings.enterprise.autoOnlineStatus")}
                </Text>
              </View>
              <Switch
                value={autoOnlineStatus}
                onValueChange={(value) =>
                  toggleSetting(
                    "autoOnlineStatus",
                    autoOnlineStatus,
                    setAutoOnlineStatus,
                    async () => {
                      await PreferencesService.updateEnterprise({
                        autoOnlineStatus: value,
                      });
                    }
                  )
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={autoOnlineStatus ? "#10B981" : "#9CA3AF"}
              />
            </View>
          </View>
        </View>

        {/* Confidentialité */}
        <View className="mt-6 px-4">
          <Text style={{ color: colors.textPrimary }} className="text-lg font-quicksand-bold mb-3 pl-1">
            {i18n.t("enterprise.settings.privacy.title")}
          </Text>
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-2xl shadow-sm border overflow-hidden">
            <View style={{ borderColor: colors.border }} className="flex-row items-center justify-between px-4 py-4 border-b">
              <View className="flex-row items-center">
                <Ionicons name="eye-outline" size={20} color={colors.brandPrimary} />
                <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-medium ml-3">
                  {i18n.t("enterprise.settings.privacy.publicProfile")}
                </Text>
              </View>
              <Switch
                value={publicProfile}
                onValueChange={(value) =>
                  toggleSetting(
                    "publicProfile",
                    publicProfile,
                    setPublicProfile,
                    async () => {
                      await PreferencesService.updatePrivacy({
                        publicProfile: value,
                      });
                    }
                  )
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={publicProfile ? "#10B981" : "#9CA3AF"}
              />
            </View>

            <View style={{ borderColor: colors.border }} className="flex-row items-center justify-between px-4 py-4 border-b">
              <View className="flex-row items-center">
                <Ionicons name="analytics-outline" size={20} color={colors.brandPrimary} />
                <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-medium ml-3">
                  {i18n.t("enterprise.settings.privacy.dataAnalytics")}
                </Text>
              </View>
              <Switch
                value={allowDataAnalytics}
                onValueChange={(value) =>
                  toggleSetting(
                    "allowDataAnalytics",
                    allowDataAnalytics,
                    setAllowDataAnalytics,
                    async () => {
                      await PreferencesService.updatePrivacy({
                        allowDataAnalytics: value,
                      });
                    }
                  )
                }
                trackColor={{ false: "#D1D5DB", true: "#C7F4DC" }}
                thumbColor={allowDataAnalytics ? "#10B981" : "#9CA3AF"}
              />
            </View>

            <TouchableOpacity className="flex-row items-center justify-between px-4 py-4">
              <View className="flex-row items-center">
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={colors.brandPrimary}
                />
                <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-medium ml-3">
                  {i18n.t("enterprise.settings.privacy.privacyPolicy")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bouton Réinitialiser */}
        <View className="mt-6 mb-10 px-4">
          <TouchableOpacity
            onPress={handleClearData}
            style={{
              backgroundColor: isDark ? "rgba(239, 68, 68, 0.1)" : "#FEF2F2",
              borderColor: isDark ? "rgba(239, 68, 68, 0.3)" : "#FEE2E2"
            }}
            className="rounded-2xl py-4 items-center border"
            activeOpacity={0.7}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <View className="flex-row items-center">
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color="#DC2626"
                  style={{ marginRight: 8 }}
                />
                <Text className="text-red-600 font-quicksand-bold text-base">
                  {i18n.t("enterprise.settings.reset.button")}
                </Text>
              </View>
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
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center items-center px-4"
          activeOpacity={1}
          onPress={() => setLanguageModal(false)}
        >
          <TouchableOpacity
            style={{ backgroundColor: colors.card }}
            className="rounded-3xl w-full max-w-sm p-6 shadow-xl"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <Text style={{ color: colors.textPrimary }} className="text-xl font-quicksand-bold">
                {i18n.t("enterprise.settings.languageModal.title")}
              </Text>
              <TouchableOpacity
                onPress={() => setLanguageModal(false)}
                style={{ backgroundColor: isDark ? colors.tertiary : "#F3F4F6" }}
                className="w-8 h-8 rounded-full items-center justify-center"
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Options de langue */}
            <TouchableOpacity
              onPress={() => handleLanguageChange("fr")}
              style={{
                backgroundColor: language === "fr" ? (isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5") : (isDark ? colors.tertiary : "#F9FAFB"),
                borderColor: language === "fr" ? colors.brandPrimary : "transparent"
              }}
              className={`flex-row items-center p-4 rounded-2xl mb-3 border`}
            >
              <View className="w-8 h-8 rounded-full bg-emerald-500 items-center justify-center mr-4">
                <Text className="text-white text-xs font-quicksand-bold">
                  FR
                </Text>
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-bold">
                  {i18n.t("enterprise.settings.languageModal.french")}
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-quicksand-medium">
                  {i18n.t("enterprise.settings.languageModal.frenchSubtitle")}
                </Text>
              </View>
              {language === "fr" && (
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleLanguageChange("en")}
              style={{
                backgroundColor: language === "en" ? (isDark ? "rgba(16, 185, 129, 0.1)" : "#ECFDF5") : (isDark ? colors.tertiary : "#F9FAFB"),
                borderColor: language === "en" ? colors.brandPrimary : "transparent"
              }}
              className={`flex-row items-center p-4 rounded-2xl border`}
            >
              <View className="w-8 h-8 rounded-full bg-emerald-500 items-center justify-center mr-4">
                <Text className="text-white text-xs font-quicksand-bold">
                  EN
                </Text>
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-bold">
                  {i18n.t("enterprise.settings.languageModal.english")}
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-quicksand-medium">
                  {i18n.t("enterprise.settings.languageModal.englishSubtitle")}
                </Text>
              </View>
              {language === "en" && (
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal de confirmation pour réinitialiser */}
      <Modal
        visible={clearDataModal}
        transparent
        animationType="fade"
        onRequestClose={() => setClearDataModal(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 justify-center items-center px-4"
          activeOpacity={1}
          onPress={() => setClearDataModal(false)}
        >
          <TouchableOpacity
            style={{ backgroundColor: colors.card }}
            className="rounded-3xl w-full max-w-sm p-6 shadow-xl"
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="items-center mb-6">
              <View style={{ backgroundColor: isDark ? "rgba(239, 68, 68, 0.1)" : "#FEF2F2" }} className="w-16 h-16 rounded-full items-center justify-center mb-4">
                <Ionicons name="warning" size={32} color="#EF4444" />
              </View>
              <Text style={{ color: colors.textPrimary }} className="text-xl font-quicksand-bold text-center mb-2">
                {i18n.t("enterprise.settings.reset.title")}
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-base font-quicksand-medium text-center leading-6">
                {i18n.t("enterprise.settings.reset.message")}
              </Text>
            </View>

            <View className="space-y-3">
              <TouchableOpacity
                onPress={confirmClearData}
                disabled={saving}
                className="rounded-xl py-4 items-center"
                style={{ overflow: "hidden", position: "relative" }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#EF4444", "#DC2626"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                />
                {saving ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text className="font-quicksand-bold text-white ml-2">
                      {i18n.t("enterprise.settings.reset.inProgress")}
                    </Text>
                  </View>
                ) : (
                  <Text className="font-quicksand-bold text-white">
                    {i18n.t("enterprise.settings.reset.confirm")}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setClearDataModal(false)}
                disabled={saving}
                style={{ backgroundColor: isDark ? colors.tertiary : "#F3F4F6" }}
                className="rounded-xl py-4 items-center mt-4"
                activeOpacity={0.7}
              >
                <Text style={{ color: colors.textPrimary }} className="font-quicksand-semibold">
                  {i18n.t("enterprise.settings.reset.cancel")}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
