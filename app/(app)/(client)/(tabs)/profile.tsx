import { useLocale } from "@/contexts/LocaleContext";
import { useTheme } from "@/contexts/ThemeContext";
import i18n from "@/i18n/i18n";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../../../contexts/AuthContext";

export default function ProfileScreen() {
  const { user, logout, refreshUserData, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const { locale } = useLocale();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    type: "logout";
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
    onConfirm: () => void;
  } | null>(null);

  // Responsive dimensions
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 360;
  const isTablet = width >= 768 && width < 1024;
  const isLargeTablet = width >= 1024;

  // Header bottom padding (augmenté pour laisser plus d'espace)
  const headerBottomPadding = isLargeTablet
    ? 80
    : isTablet
    ? 72
    : isSmallPhone
    ? 56
    : 64;

  // Overlay lift (réduit pour ne pas cacher le contenu du header)
  const overlayLift = isLargeTablet
    ? -48
    : isTablet
    ? -40
    : isSmallPhone
    ? -32
    : -36;

  // Rafraîchir les données utilisateur au chargement de la page
  useEffect(() => {
    const loadUserData = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      try {
        await refreshUserData();
      } catch (error) {
        console.error(
          "Erreur lors du chargement des données utilisateur:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // refreshUserData retiré des dépendances pour éviter la boucle infinie

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
    const translateX = shimmer.interpolate({
      inputRange: [0, 1],
      outputRange: [-150, 150],
    });
    return (
      <View style={[{ backgroundColor: colors.card, overflow: "hidden" }, style]}>
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: 120,
            transform: [{ translateX }],
            backgroundColor: "rgba(255,255,255,0.35)",
            opacity: 0.7,
          }}
        />
      </View>
    );
  };

  const SkeletonMenuItem = () => (
    <View className="rounded-2xl shadow-sm p-4 mb-3" style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}>
      <View className="flex-row items-center">
        <ShimmerBlock style={{ width: 48, height: 48, borderRadius: 12 }} />
        <View className="ml-4 flex-1">
          <ShimmerBlock
            style={{
              height: 16,
              borderRadius: 8,
              width: "70%",
              marginBottom: 8,
            }}
          />
          <ShimmerBlock style={{ height: 14, borderRadius: 6, width: "50%" }} />
        </View>
        <ShimmerBlock style={{ width: 20, height: 20, borderRadius: 2 }} />
      </View>
    </View>
  );

  // Fonctions de confirmation modal
  const showConfirmation = (type: "logout", onConfirm: () => void) => {
    let title = "";
    let message = "";
    let confirmText = "";
    let confirmColor = "";

    switch (type) {
      case "logout":
        title = i18n.t("client.profile.logout.modal.title");
        message = i18n.t("client.profile.logout.modal.message");
        confirmText = i18n.t("client.profile.logout.modal.confirm");
        confirmColor = "#EF4444";
        break;
    }

    setConfirmationAction({
      type,
      title,
      message,
      confirmText,
      confirmColor,
      onConfirm,
    });
    setConfirmationVisible(true);
  };

  const closeConfirmation = () => {
    setConfirmationVisible(false);
    setConfirmationAction(null);
  };

  const executeConfirmedAction = () => {
    if (confirmationAction?.onConfirm) {
      confirmationAction.onConfirm();
    }
    closeConfirmation();
  };

  const renderSkeletonProfile = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 90 }}
    >
      {/* Header Skeleton */}
      <LinearGradient
        colors={["#047857", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="px-6"
        style={{
          paddingTop: insets.top + 16,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
          paddingBottom: headerBottomPadding,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <ShimmerBlock
              style={{
                height: 24,
                borderRadius: 12,
                width: "60%",
                marginBottom: 8,
              }}
            />
            <ShimmerBlock
              style={{ height: 14, borderRadius: 7, width: "40%" }}
            />
          </View>
          <ShimmerBlock style={{ width: 24, height: 24, borderRadius: 12 }} />
        </View>
      </LinearGradient>

      {/* User Profile Skeleton */}
      <View className="px-4" style={{ marginTop: overlayLift }}>
        <View className="rounded-2xl p-4 flex-row items-start shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}>
          <View className="p-6">
            <View className="flex-row items-center">
              <ShimmerBlock
                style={{ width: 80, height: 80, borderRadius: 40 }}
              />
              <View className="ml-4 flex-1">
                <ShimmerBlock
                  style={{
                    height: 20,
                    borderRadius: 10,
                    width: "80%",
                    marginBottom: 8,
                  }}
                />
                <ShimmerBlock
                  style={{
                    height: 14,
                    borderRadius: 7,
                    width: "60%",
                    marginBottom: 16,
                  }}
                />
                <ShimmerBlock
                  style={{ height: 32, borderRadius: 16, width: "40%" }}
                />
              </View>
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
        <ShimmerBlock style={{ height: 48, borderRadius: 16, width: "100%" }} />
      </View>
    </ScrollView>
  );

  const handleLogout = () => {
    showConfirmation("logout", handleConfirmLogout);
  };

  const handleConfirmLogout = async () => {
    try {
      console.log("🚪 Début de la déconnexion...");

      console.log("🚪 Déconnexion en cours...");

      // Effectuer la déconnexion
      await logout();

      console.log("🚪 Déconnexion terminée avec succès");
    } catch (error) {
      console.error("❌ Erreur lors de la déconnexion:", error);

      // En cas d'erreur, afficher une alerte simple
      alert(
        "Une erreur s'est produite lors de la déconnexion. Veuillez réessayer."
      );
    }
  };

  const menuItems = [
    {
      icon: "person-outline",
      title: i18n.t("client.profile.menu.personalInfo"),
      route: "/(app)/(client)/profile/details",
    },
    // { icon: "location-outline", title: "Mes adresses", route: "/(app)/(client)/profile/addresses" },
    // { icon: "bag-check-outline", title: "Mes commandes", route: "/(app)/(client)/profile/orders" },
    // { icon: "card-outline", title: "Moyens de paiement", route: "/(app)/(client)/profile/payments" },
    {
      icon: "settings-outline",
      title: i18n.t("client.profile.menu.settings"),
      route: "/(app)/(client)/profile/settings",
    },
    // { icon: "help-circle-outline", title: "Aide et support", route: "/(app)/(client)/profile/help" },
  ];

  if (!isAuthenticated) {
    return (
      <View
        className="flex-1 justify-center items-center p-6"
        style={{ backgroundColor: colors.secondary }}
      >
        <Ionicons name="person-circle-outline" size={72} color="#10B981" />
        <Text
          style={{ color: colors.textPrimary }}
          className="text-2xl font-quicksand-bold mt-4 text-center"
        >
          Connexion requise
        </Text>
        <Text
          style={{ color: colors.textSecondary }}
          className="text-base font-quicksand mt-2 text-center"
        >
          Connectez-vous pour accéder a votre profil.
        </Text>
        <TouchableOpacity
          className="mt-6 bg-primary rounded-2xl px-6 py-3"
          onPress={() => router.push("/(auth)/signin")}
        >
          <Text className="text-white font-quicksand-bold">Se connecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.secondary }}>
        <ExpoStatusBar style="light" translucent />
        {renderSkeletonProfile()}
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.secondary }}>
      <ExpoStatusBar style="light" translucent />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }} // Add bottom padding to ensure content isn't hidden by tab bar
      >
        {/* Header */}
        <LinearGradient
          colors={["#047857", "#10B981"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="px-6"
          style={{
            paddingTop: insets.top + 16,
            paddingLeft: insets.left + 24,
            paddingRight: insets.right + 24,
            paddingBottom: headerBottomPadding,
          }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-quicksand-bold text-white">
                {i18n.t("client.profile.title")}
              </Text>
              {user && (
                <View className="flex-row items-center mt-1">
                  <Ionicons
                    name="person"
                    size={14}
                    color="rgba(255,255,255,0.85)"
                  />
                  <Text className="text-sm font-quicksand-medium text-white/90 ml-1">
                    {user.firstName} {user.lastName}
                  </Text>
                </View>
              )}
            </View>
            {/* <TouchableOpacity className="relative">
              <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
              <View className="absolute -top-1 -right-1 w-3 h-3 bg-error-500 rounded-full" />
            </TouchableOpacity> */}
          </View>
        </LinearGradient>

        {/* User Profile */}
        <View className="px-4" style={{ marginTop: overlayLift }}>
          <View className="rounded-2xl p-4 flex-row items-start shadow-sm" style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}>
            <View className="flex-row items-center w-full">
              {user?.profileImage ? (
                <Image
                  source={{ uri: user.profileImage }}
                  className="w-20 h-20 rounded-full mr-4"
                  style={{ borderWidth: 3, borderColor: colors.brandPrimary }}
                />
              ) : (
                <View className="w-20 h-20 rounded-full items-center justify-center mr-4" style={{ backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 2 }}>
                  <Ionicons name="person" size={32} color={colors.brandPrimary} />
                </View>
              )}
              <View className="flex-1">
                <Text className="text-xl font-quicksand-bold" style={{ color: colors.textPrimary }}>
                  {user ? `${user.firstName} ${user.lastName}` : i18n.t("client.profile.placeholders.userName")}
                </Text>
                <Text className="font-quicksand mt-1" style={{ color: colors.textSecondary }}>
                  {user?.email || i18n.t("client.profile.placeholders.email")}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Menu */}
        <View className="mx-6 mb-6 mt-5">
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              className="rounded-2xl shadow-sm p-4 mb-2 flex-row items-center"
              style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
              onPress={() => router.push(item.route as any)}
            >
              <View className="w-12 h-12 rounded-xl justify-center items-center mr-4" style={{ backgroundColor: colors.secondary }}>
                <Ionicons name={item.icon as any} size={24} color={colors.brandPrimary} />
              </View>
              <View className="flex-1">
                <Text className="font-quicksand-semibold text-base" style={{ color: colors.textPrimary }}>
                  {item.title}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
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
              <Ionicons
                name="log-out-outline"
                size={20}
                color="white"
                style={{ marginRight: 8 }}
              />
              <Text className="text-white font-quicksand-semibold">
                {i18n.t("client.profile.logout.button")}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal de confirmation */}
      <Modal
        visible={confirmationVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeConfirmation}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View className="rounded-2xl p-6 w-full max-w-sm" style={{ backgroundColor: colors.card }}>
            <Text className="text-xl font-quicksand-bold mb-2" style={{ color: colors.textPrimary }}>
              {confirmationAction?.title}
            </Text>
            <Text className="text-base font-quicksand-medium mb-6" style={{ color: colors.textSecondary }}>
              {confirmationAction?.message}
            </Text>
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 rounded-xl py-3"
                style={{ backgroundColor: colors.secondary }}
                onPress={closeConfirmation}
              >
                <Text className="font-quicksand-semibold text-center" style={{ color: colors.textPrimary }}>
                  {i18n.t("client.profile.logout.modal.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 rounded-xl py-3"
                style={{ backgroundColor: confirmationAction?.confirmColor }}
                onPress={executeConfirmedAction}
              >
                <Text className="text-white font-quicksand-semibold text-center">
                  {confirmationAction?.confirmText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
