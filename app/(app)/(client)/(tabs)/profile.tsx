import { useLocale } from "@/contexts/LocaleContext";
import { useTheme } from "@/contexts/ThemeContext";
import i18n from "@/i18n/i18n";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Linking,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../../contexts/AuthContext";
import { useUnreadNotifications } from "../../../../hooks/useUnreadNotifications";
import FollowService from "../../../../services/api/FollowService";

export default function ProfileScreen() {
  const { user, logout, refreshUserData, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const { locale } = useLocale();
  const { colors, isDark } = useTheme();
  const { unreadCount, loadUnreadCount } = useUnreadNotifications();
  const [loading, setLoading] = useState(true);

  const { data: followingList = [] } = useQuery({
    queryKey: ['my-following'],
    queryFn: () => FollowService.getMyFollowing(),
    enabled: !!isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });
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
  useFocusEffect(
    useCallback(() => {
      loadUnreadCount();
    }, [loadUnreadCount])
  );


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
  const shimmerBg = isDark ? "#2A3441" : "#E8EAED";
  const shimmerGleam = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.65)";

  const ShimmerBlock = ({ style }: { style?: any }) => {
    const shimmer = React.useRef(new Animated.Value(0)).current;
    useEffect(() => {
      const loop = Animated.loop(
        Animated.timing(shimmer, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true })
      );
      loop.start();
      return () => loop.stop();
    }, [shimmer]);
    const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-200, 200] });
    return (
      <View style={[{ backgroundColor: shimmerBg, overflow: "hidden" }, style]}>
        <Animated.View
          style={{
            position: "absolute", top: 0, bottom: 0, width: 160,
            transform: [{ translateX }],
            backgroundColor: shimmerGleam,
          }}
        />
      </View>
    );
  };

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
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
      {/* Hero skeleton */}
      <View style={{ backgroundColor: '#065F46', paddingTop: insets.top + 16, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: -70, right: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <View style={{ position: 'absolute', bottom: -20, left: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.04)' }} />
        <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingBottom: 32, paddingTop: 8 }}>
          <ShimmerBlock style={{ width: 86, height: 86, borderRadius: 43, marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <ShimmerBlock style={{ height: 16, borderRadius: 8, width: '50%', marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <ShimmerBlock style={{ height: 12, borderRadius: 6, width: '38%', backgroundColor: 'rgba(255,255,255,0.1)' }} />
        </View>
      </View>

      {/* Stats card skeleton */}
      <View style={{ marginTop: -24, paddingHorizontal: 16, marginBottom: 16 }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 20, flexDirection: 'row', paddingVertical: 18 }}>
          <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            <ShimmerBlock style={{ width: 38, height: 20, borderRadius: 10 }} />
            <ShimmerBlock style={{ width: 70, height: 11, borderRadius: 6 }} />
          </View>
        </View>
      </View>

      {/* Menu skeleton */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 20, overflow: "hidden" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: colors.border }}>
              <ShimmerBlock style={{ width: 40, height: 40, borderRadius: 20, marginRight: 14 }} />
              <ShimmerBlock style={{ height: 14, borderRadius: 7, flex: 1 }} />
              <ShimmerBlock style={{ width: 18, height: 18, borderRadius: 9, marginLeft: 12 }} />
            </View>
          ))}
        </View>
      </View>

      {/* Bouton déconnexion skeleton */}
      <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
        <ShimmerBlock style={{ height: 52, borderRadius: 16 }} />
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

  const menuItems: Array<{ icon: string; title: string; route?: Href; onPress?: () => void }> = [
    {
      icon: "person-outline",
      title: i18n.t("client.profile.menu.personalInfo"),
      route: "/(app)/(client)/profile/details",
    },
    // { icon: "location-outline", title: "Mes adresses", route: "/(app)/(client)/profile/addresses" },
    // { icon: "bag-check-outline", title: "Mes commandes", route: "/(app)/(client)/profile/orders" },
    // { icon: "card-outline", title: "Moyens de paiement", route: "/(app)/(client)/profile/payments" },
    {
      icon: "notifications-outline",
      title: i18n.t("client.profile.menu.notifications"),
      route: "/(app)/(client)/profile/notifications",
    },
    {
      icon: "settings-outline",
      title: i18n.t("client.profile.menu.settings"),
      route: "/(app)/(client)/profile/settings",
    },
    {
      icon: "help-circle-outline",
      title: i18n.t("client.profile.menu.help"),
      onPress: () => Linking.openURL('mailto:tanguyricardo@aximarketplace.com'),
    },
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
          className="text-2xl font-poppins-bold mt-4 text-center"
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
          <Text className="text-white font-poppins-bold">Se connecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.secondary }}>
        <ExpoStatusBar style="light" />
        {renderSkeletonProfile()}
      </View>
    );
  }

  const userInitials = `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() || "?";
  const userName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : i18n.t("client.profile.placeholders.userName");

  return (
    <View className="flex-1" style={{ backgroundColor: colors.secondary }}>
      <ExpoStatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
      >
        {/* Hero Section */}
        <View style={{ backgroundColor: '#065F46', overflow: 'hidden' }}>
          {/* Decorative circles */}
          <View style={{ position: 'absolute', top: -70, right: -40, width: 230, height: 230, borderRadius: 115, backgroundColor: 'rgba(255,255,255,0.07)' }} />
          <View style={{ position: 'absolute', top: 40, right: 60, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)' }} />
          <View style={{ position: 'absolute', bottom: -30, left: -50, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.05)' }} />

          {/* Edit button */}
          <TouchableOpacity
            onPress={() => router.push("/(app)/(client)/profile/details")}
            style={{ position: 'absolute', top: insets.top + 16, right: 20, zIndex: 10, width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="create" size={17} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Avatar + name */}
          <View style={{ alignItems: 'center', paddingTop: insets.top + 20, paddingBottom: 60, paddingHorizontal: 24 }}>
            <View style={{ position: 'relative', marginBottom: 14 }}>
              <View style={{ width: 86, height: 86, borderRadius: 43, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' }}>
                {user?.profileImage ? (
                  <Image source={{ uri: user.profileImage }} style={{ width: 80, height: 80, borderRadius: 40 }} resizeMode="cover" />
                ) : (
                  <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 28, color: '#FFFFFF' }}>{userInitials}</Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 20, color: '#FFFFFF', textAlign: 'center' }} numberOfLines={1}>
              {userName}
            </Text>
            <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4 }} numberOfLines={1}>
              {user?.email || i18n.t("client.profile.placeholders.email")}
            </Text>
          </View>
        </View>

        {/* Stats card — overlap hero */}
        <View style={{ marginTop: -46, paddingHorizontal: 16 }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/(app)/(client)/marketplace')}
            style={{ backgroundColor: isDark ? colors.cardElevated : colors.card, borderRadius: 22, flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20, borderWidth: isDark ? 1 : 0, borderColor: 'rgba(255,255,255,0.08)', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: isDark ? 0.45 : 0.12, shadowRadius: 18, elevation: 8 }}
          >
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <Ionicons name="storefront-outline" size={20} color={colors.brandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 22, color: colors.textPrimary, lineHeight: 26 }}>{followingList.length}</Text>
              <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 12, color: colors.textSecondary }}>Entreprises suivies</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Menu — groupé dans une seule carte */}
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 20, overflow: "hidden" }}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 20,
                  paddingVertical: 15,
                  borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                  borderBottomColor: colors.border,
                }}
                onPress={() => item.onPress ? item.onPress() : item.route && router.push(item.route)}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: isDark ? colors.brandPrimary + "20" : "#D1FAE5",
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                  }}
                >
                  <Ionicons name={item.icon as any} size={20} color={colors.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text className="font-poppins-semibold text-base" style={{ color: colors.textPrimary }}>
                    {item.title}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {item.icon === "notifications-outline" && unreadCount > 0 && (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444", marginRight: 8 }} />
                  )}
                  <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout Button */}
        <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 10 }}>
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.card,
              borderRadius: 16,
              paddingVertical: 16,
              borderWidth: 1,
              borderColor: isDark ? "#7F1D1D" : "#FCA5A5",
              gap: 8,
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text className="font-poppins-semibold" style={{ color: "#EF4444" }}>
              {i18n.t("client.profile.logout.button")}
            </Text>
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
            <Text className="text-xl font-poppins-bold mb-2" style={{ color: colors.textPrimary }}>
              {confirmationAction?.title}
            </Text>
            <Text className="text-base font-poppins-medium mb-6" style={{ color: colors.textSecondary }}>
              {confirmationAction?.message}
            </Text>
            <View className="flex-row space-x-3">
              <TouchableOpacity
                className="flex-1 rounded-xl py-3"
                style={{ backgroundColor: colors.secondary }}
                onPress={closeConfirmation}
              >
                <Text className="font-poppins-semibold text-center" style={{ color: colors.textPrimary }}>
                  {i18n.t("client.profile.logout.modal.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 rounded-xl py-3"
                style={{ backgroundColor: confirmationAction?.confirmColor }}
                onPress={executeConfirmedAction}
              >
                <Text className="text-white font-poppins-semibold text-center">
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
