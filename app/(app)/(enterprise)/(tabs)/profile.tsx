import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// New Reanimated toast system only
import { useToast as useReanimatedToast } from "../../../../components/ui/ReanimatedToast/context";
import { useAuth } from "../../../../contexts/AuthContext";
import { useUnreadNotifications } from "../../../../hooks/useUnreadNotifications";
import { useLocale } from "../../../../contexts/LocaleContext";
import { useSubscription } from "../../../../contexts/SubscriptionContext";
import { useTheme } from "../../../../contexts/ThemeContext";
import { Shimmer } from "../../../../components/ui/Shimmer";
import i18n from "../../../../i18n/i18n";
import EnterpriseService, {
  Enterprise,
  EnterpriseProfile,
  SocialLink,
} from "../../../../services/api/EnterpriseService";
import FollowService from "../../../../services/api/FollowService";

interface AddPartnerModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (partnerId: string) => void;
  loading: boolean;
}

interface EnterpriseDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  enterprise: Enterprise;
  colors: any;
  isDark: boolean;
}


// Composant pour afficher les détails complets de l'entreprise
const EnterpriseDetailsModal: React.FC<EnterpriseDetailsModalProps> = ({
  visible,
  onClose,
  enterprise,
  colors,
  isDark,
}) => {
  const insets = useSafeAreaInsets();
  const hasContact =
    enterprise.contactInfo?.website ||
    enterprise.contactInfo?.phone ||
    enterprise.contactInfo?.whatsapp;

  const openLink = (url: string) => Linking.openURL(url).catch(() => {});

  const ContactRow = ({
    icon,
    iconColor,
    label,
    value,
    onPress,
  }: {
    icon: any;
    iconColor: string;
    label: string;
    value: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 12,
      }}
    >
      <View style={{
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: iconColor + "18",
        alignItems: "center", justifyContent: "center",
      }}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: "Poppins-Medium", fontSize: 11, color: colors.textTertiary, marginBottom: 1 }}>
          {label}
        </Text>
        <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 14, color: onPress ? iconColor : colors.textPrimary }} numberOfLines={1}>
          {value}
        </Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View style={{
          paddingTop: 16,
          paddingBottom: 14,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          backgroundColor: colors.card,
        }}>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={{ fontFamily: "Poppins-Bold", fontSize: 17, color: colors.textPrimary }}>
            Mon entreprise
          </Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
          {/* Hero : logo + nom + statut */}
          <View style={{
            backgroundColor: colors.card,
            alignItems: "center",
            paddingTop: 28,
            paddingBottom: 24,
            paddingHorizontal: 20,
            marginBottom: 12,
          }}>
            {enterprise.logo ? (
              <Image
                source={{ uri: enterprise.logo }}
                style={{ width: 88, height: 88, borderRadius: 44, marginBottom: 14 }}
                resizeMode="cover"
              />
            ) : (
              <View style={{
                width: 88, height: 88, borderRadius: 44,
                backgroundColor: "#10B981",
                alignItems: "center", justifyContent: "center",
                marginBottom: 14,
              }}>
                <Text style={{ color: "#fff", fontFamily: "Poppins-Bold", fontSize: 32 }}>
                  {enterprise.companyName?.[0]?.toUpperCase() || "E"}
                </Text>
              </View>
            )}
            <Text style={{ fontFamily: "Poppins-Bold", fontSize: 20, color: colors.textPrimary, textAlign: "center", marginBottom: 6 }}>
              {enterprise.companyName}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: enterprise.isActive ? "#10B981" : "#9CA3AF",
              }} />
              <Text style={{
                fontFamily: "Poppins-Medium", fontSize: 13,
                color: enterprise.isActive ? "#10B981" : "#9CA3AF",
              }}>
                {enterprise.isActive ? "Entreprise active" : "Inactive"}
              </Text>
            </View>

            {enterprise.description ? (
              <Text style={{
                fontFamily: "Poppins-Regular", fontSize: 14,
                color: colors.textSecondary, textAlign: "center",
                lineHeight: 20, marginTop: 14, paddingHorizontal: 8,
              }}>
                {enterprise.description}
              </Text>
            ) : (
              <Text style={{
                fontFamily: "Poppins-Regular", fontSize: 14,
                color: colors.textTertiary, fontStyle: "italic",
                marginTop: 14,
              }}>
                Aucune description ajoutée
              </Text>
            )}
          </View>

          {/* Contact */}
          <View style={{
            marginHorizontal: 16, marginBottom: 12,
            backgroundColor: colors.card,
            borderRadius: 16,
            paddingHorizontal: 16,
            overflow: "hidden",
          }}>
            <Text style={{ fontFamily: "Poppins-Bold", fontSize: 15, color: colors.textPrimary, paddingTop: 16, paddingBottom: 4 }}>
              Contact
            </Text>
            {enterprise.contactInfo?.website ? (
              <ContactRow
                icon="globe-outline"
                iconColor="#3B82F6"
                label="Site web"
                value={enterprise.contactInfo.website}
                onPress={() => openLink(enterprise.contactInfo.website!)}
              />
            ) : null}
            {enterprise.contactInfo?.phone ? (
              <ContactRow
                icon="call-outline"
                iconColor="#10B981"
                label="Téléphone"
                value={enterprise.contactInfo.phone}
                onPress={() => openLink(`tel:${enterprise.contactInfo.phone}`)}
              />
            ) : null}
            {enterprise.contactInfo?.whatsapp ? (
              <ContactRow
                icon="logo-whatsapp"
                iconColor="#25D366"
                label="WhatsApp"
                value={enterprise.contactInfo.whatsapp}
                onPress={() => openLink(`https://wa.me/${enterprise.contactInfo.whatsapp?.replace(/\D/g, "")}`)}
              />
            ) : null}
            {!hasContact && (
              <Text style={{
                fontFamily: "Poppins-Regular", fontSize: 13,
                color: colors.textTertiary, fontStyle: "italic",
                paddingVertical: 16,
              }}>
                Aucun contact renseigné — modifiez votre profil entreprise pour en ajouter.
              </Text>
            )}
          </View>

          {/* Liens sociaux */}
          {enterprise.socialLinks && enterprise.socialLinks.length > 0 && (
            <View style={{
              marginHorizontal: 16, marginBottom: 12,
              backgroundColor: colors.card,
              borderRadius: 16,
              paddingHorizontal: 16,
              overflow: "hidden",
            }}>
              <Text style={{ fontFamily: "Poppins-Bold", fontSize: 15, color: colors.textPrimary, paddingTop: 16, paddingBottom: 4 }}>
                Réseaux sociaux
              </Text>
              {enterprise.socialLinks.map((link, i) => (
                <ContactRow
                  key={i}
                  icon="link-outline"
                  iconColor="#8B5CF6"
                  label={link.platform}
                  value={link.url}
                  onPress={() => openLink(link.url)}
                />
              ))}
            </View>
          )}

          {/* Infos complémentaires */}
          <View style={{
            marginHorizontal: 16,
            backgroundColor: colors.card,
            borderRadius: 16,
            paddingHorizontal: 16,
            overflow: "hidden",
          }}>
            <Text style={{ fontFamily: "Poppins-Bold", fontSize: 15, color: colors.textPrimary, paddingTop: 16, paddingBottom: 4 }}>
              Informations
            </Text>
            <ContactRow
              icon="calendar-outline"
              iconColor={colors.textTertiary}
              label="Membre depuis"
              value={new Date(enterprise.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric", month: "long", year: "numeric",
              })}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// Composant pour ajouter un partenaire (DEPRECATED: remplacé par la page /delivery-partners)
const AddPartnerModal: React.FC<AddPartnerModalProps> = ({
  visible,
  onClose,
  onAdd,
  loading,
}) => {
  const { showToast: showReToast } = useReanimatedToast();
  const [partnerId, setPartnerId] = useState("");

  const handleAdd = () => {
    if (partnerId.trim()) {
      onAdd(partnerId.trim());
      setPartnerId("");
    } else {
      showReToast({
        title: i18n.t("messages.error"),
        subtitle: i18n.t("enterprise.profile.modals.addPartner.error"),
        autodismiss: true,
      });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View className="flex-1 bg-white">
        <View className="px-6 pt-6 pb-4 border-b border-neutral-200">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose}>
              <Text className="text-primary-500 font-poppins-medium">
                {i18n.t("enterprise.profile.modals.addPartner.cancel")}
              </Text>
            </TouchableOpacity>
            <Text className="text-lg font-poppins-bold">
              {i18n.t("enterprise.profile.modals.addPartner.title")}
            </Text>
            <TouchableOpacity
              onPress={handleAdd}
              disabled={loading || !partnerId.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <Text className="text-primary-500 font-poppins-medium">
                  {i18n.t("enterprise.profile.modals.addPartner.add")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-6 py-6">
          <View>
            <Text className="text-neutral-700 font-poppins-medium mb-2">
              {i18n.t("enterprise.profile.modals.addPartner.partnerId")}
            </Text>
            <TextInput
              value={partnerId}
              onChangeText={setPartnerId}
              className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 font-quicksand-regular"
              placeholder={i18n.t("enterprise.profile.modals.addPartner.placeholder")}
            />
            <Text className="text-neutral-500 text-sm mt-2">
              {i18n.t("enterprise.profile.modals.addPartner.helpText")}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Composant principal du profil entreprise
function EnterpriseProfilePage() {
  const { logout } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { locale } = useLocale();

  const { data: followingList = [] } = useQuery({
    queryKey: ['my-following'],
    queryFn: () => FollowService.getMyFollowing(),
    staleTime: 1000 * 60 * 5,
  }); // Écoute les changements de langue pour re-render automatiquement
  const { showToast: showReToast } = useReanimatedToast();
  const { colors, isDark } = useTheme();
  const { unreadCount, loadUnreadCount } = useUnreadNotifications();

  useFocusEffect(
    useCallback(() => {
      loadUnreadCount();
    }, [loadUnreadCount])
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<EnterpriseProfile | null>(
    null
  );

  // Modals
  // const [showAddPartner, setShowAddPartner] = useState(false); // supprimé (ancienne modal d'ajout partenaire)
  const [showEnterpriseDetails, setShowEnterpriseDetails] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    type: "toggle_status" | "logout";
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
    onConfirm: () => void;
  } | null>(null);

  const [followerCount, setFollowerCount] = useState(0);

  // Abonnement et restrictions
  const { subscription, canUseFeature } = useSubscription();

  const insets = useSafeAreaInsets();
  const isIosBillingRestricted = Platform.OS === "ios";


  const SkeletonCard = ({ style }: { style?: any }) => (
    <View
      className="rounded-2xl shadow-sm overflow-hidden"
      style={[{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }, style]}
    >
      <Shimmer style={{ height: 120, borderRadius: 16, width: "100%" }} />
    </View>
  );

  const renderSkeletonProfile = () => (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Hero Skeleton */}
      <View style={{ backgroundColor: '#065F46', paddingTop: insets.top + 16, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: -80, right: -50, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.06)' }} />
        <View style={{ position: 'absolute', bottom: -20, left: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)' }} />
        <View style={{ alignItems: 'center', paddingHorizontal: 20, paddingBottom: 60, paddingTop: 8 }}>
          <Shimmer style={{ width: 88, height: 88, borderRadius: 44, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <Shimmer style={{ height: 18, borderRadius: 9, width: '55%', marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <Shimmer style={{ height: 13, borderRadius: 7, width: '40%', backgroundColor: 'rgba(255,255,255,0.1)' }} />
        </View>
      </View>

      {/* Stats Card Skeleton */}
      <View style={{ marginTop: -46, paddingHorizontal: 16, marginBottom: 16, backgroundColor: colors.secondary }}>
        <View style={{ backgroundColor: colors.card, borderRadius: 20, flexDirection: 'row', paddingVertical: 18 }}>
          {[0, 1, 2].map((i) => (
            <React.Fragment key={i}>
              {i > 0 && <View style={{ width: 1, backgroundColor: colors.border, marginVertical: 4 }} />}
              <View style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                <Shimmer style={{ width: 38, height: 22, borderRadius: 11 }} />
                <Shimmer style={{ width: 52, height: 12, borderRadius: 6 }} />
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Description + Actions Skeleton */}
      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <Shimmer style={{ height: 13, borderRadius: 7, width: '90%' }} />
        <Shimmer style={{ height: 13, borderRadius: 7, width: '70%' }} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <Shimmer style={{ flex: 1, height: 42, borderRadius: 12 }} />
          <Shimmer style={{ flex: 1, height: 42, borderRadius: 12 }} />
          <Shimmer style={{ flex: 1, height: 42, borderRadius: 12 }} />
        </View>
      </View>

      {/* Marketing Skeleton */}
      <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
        <Shimmer style={{ height: 11, borderRadius: 6, width: '35%', marginBottom: 12, marginLeft: 4 }} />
        <View style={{ backgroundColor: colors.card, borderRadius: 20, overflow: 'hidden' }}>
          <View style={{ height: 58, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Shimmer style={{ width: 38, height: 38, borderRadius: 12 }} />
            <View style={{ gap: 6 }}>
              <Shimmer style={{ width: 120, height: 13, borderRadius: 7 }} />
              <Shimmer style={{ width: 80, height: 11, borderRadius: 6 }} />
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <View style={{ height: 58, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Shimmer style={{ width: 38, height: 38, borderRadius: 12 }} />
            <View style={{ gap: 6 }}>
              <Shimmer style={{ width: 110, height: 13, borderRadius: 7 }} />
              <Shimmer style={{ width: 70, height: 11, borderRadius: 6 }} />
            </View>
          </View>
        </View>
      </View>

      {/* Contact & Owner Cards Skeleton */}
      <View className="px-4 pt-6 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </View>

      {/* Gestion Skeleton */}
      <View className="px-4 py-4">
        <Shimmer style={{ height: 20, borderRadius: 10, width: "50%", marginBottom: 16, marginLeft: 4 }} />
        <SkeletonCard />
      </View>

      {/* Bouton de déconnexion Skeleton */}
      <View className="px-4 py-6">
        <Shimmer style={{ height: 48, borderRadius: 16, width: "100%" }} />
      </View>
    </ScrollView>
  );

  // Unified toast helpers (reanimated only)
  const notifySuccess = React.useCallback(
    (title: string, message?: string) => {
      try {
        showReToast({ title, subtitle: message, autodismiss: true });
      } catch { }
    },
    [showReToast]
  );
  const notifyError = React.useCallback(
    (title: string, message?: string) => {
      try {
        showReToast({ title, subtitle: message, autodismiss: true });
      } catch { }
    },
    [showReToast]
  );
  const notifyInfo = React.useCallback(
    (title: string, message?: string) => {
      try {
        showReToast({ title, subtitle: message, autodismiss: true });
      } catch { }
    },
    [showReToast]
  );

  // Charger les données du profil
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await EnterpriseService.getProfile();
      setProfileData(data);
      FollowService.getMyFollowers().then(r => setFollowerCount(r.total)).catch(() => {});
    } catch (error: any) {
      console.error("❌ Erreur chargement profil:", error);
      notifyError(i18n.t("messages.error"), error.message || i18n.t("enterprise.profile.messages.loadError"));
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  // Rafraîchir les données
  const refreshProfile = async () => {
    try {
      setRefreshing(true);
      const data = await EnterpriseService.getProfile();
      setProfileData(data);
    } catch (error: any) {
      console.error("❌ Erreur refresh profil:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Charger les données au montage
  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // loadProfile retiré des dépendances pour éviter la boucle infinie

  // Gérer l'ajout d'un partenaire
  // Ancienne fonction d'ajout direct d'un partenaire (remplacée par le flux via la page dédiée)
  const handleAddPartner = async (_partnerId: string) => {
    notifyInfo(
      i18n.t("enterprise.profile.modals.addPartner.redirectTitle"),
      i18n.t("enterprise.profile.modals.addPartner.redirectMessage")
    );
  };

  // NOTE: suppression partenaire gérée future (liste partenaires). Fonction retirée pour éviter code mort.

  // Fonctions de confirmation modal
  const showConfirmation = (
    type: "toggle_status" | "logout",
    onConfirm: () => void
  ) => {
    let title = "";
    let message = "";
    let confirmText = "";
    let confirmColor = "";

    switch (type) {
      case "toggle_status":
        const newStatus = profileData?.enterprise.isActive
          ? i18n.t("enterprise.profile.messages.statusConfirm.deactivate")
          : i18n.t("enterprise.profile.messages.statusConfirm.activate");
        title = i18n.t("enterprise.profile.messages.statusConfirm.title");
        message = i18n.t("enterprise.profile.messages.statusConfirm.message", { action: newStatus });
        confirmText = i18n.t("enterprise.profile.messages.statusConfirm.confirm");
        confirmColor = profileData?.enterprise.isActive ? "#F59E0B" : "#10B981";
        break;
      case "logout":
        title = i18n.t("enterprise.profile.messages.logoutConfirm.title");
        message = i18n.t("enterprise.profile.messages.logoutConfirm.message");
        confirmText = i18n.t("enterprise.profile.messages.logoutConfirm.confirm");
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

  // Gérer la déconnexion
  const handleLogout = () => {
    showConfirmation("logout", () => {
      logout();
      notifyInfo(i18n.t("enterprise.profile.messages.logoutConfirm.title"), i18n.t("enterprise.profile.messages.logoutSuccess"));
      router.replace("/(auth)/welcome");
    });
  };

  // Gérer la navigation vers les partenaires
  const handleNavigateToPartners = () => {
    // Navigation directe: le dossier (enterprise)/delivery-partners contient index.tsx
    router.push("/(app)/(enterprise)/delivery-partners");
  };

  if (loading && !profileData) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.secondary }}>
        <ExpoStatusBar style="light" />
        {renderSkeletonProfile()}
      </View>
    );
  }

  if (!profileData) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.secondary }}>
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text className="mt-4 font-poppins-bold text-lg text-center" style={{ color: colors.textPrimary }}>
            {i18n.t("enterprise.profile.messages.loadError")}
          </Text>
          <Text className="mt-2 font-poppins-medium text-center" style={{ color: colors.textSecondary }}>
            {i18n.t("enterprise.profile.messages.loadErrorMessage")}
          </Text>
          <TouchableOpacity
            onPress={loadProfile}
            className="mt-6 px-6 py-3 rounded-xl"
            style={{ backgroundColor: colors.brandPrimary }}
          >
            <Text className="font-poppins-semibold" style={{ color: colors.textOnBrand }}>
              {i18n.t("enterprise.profile.actions.retry")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.secondary }}>
      <ExpoStatusBar style="light" />

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshProfile}
            colors={[colors.brandPrimary]}
            tintColor={'rgba(255,255,255,0.8)'}
            progressViewOffset={insets.top + 20}
          />
        }
      >

        {/* Hero Section */}
        <View style={{ backgroundColor: '#065F46', overflow: 'hidden' }}>
          {/* Decorative circles */}
          <View style={{ position: 'absolute', top: -80, right: -50, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.07)' }} />
          <View style={{ position: 'absolute', top: 50, right: 70, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.05)' }} />
          <View style={{ position: 'absolute', bottom: -30, left: -60, width: 210, height: 210, borderRadius: 105, backgroundColor: 'rgba(255,255,255,0.05)' }} />
          <View style={{ position: 'absolute', top: 80, left: -20, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.04)' }} />

          {/* Edit button */}
          <TouchableOpacity
            onPress={() => router.push('/(app)/(enterprise)/profile/edit-enterprise')}
            style={{ position: 'absolute', top: insets.top + 16, right: 20, zIndex: 10, width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="create" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Avatar + name */}
          <View style={{ alignItems: 'center', paddingTop: insets.top + 20, paddingBottom: 60, paddingHorizontal: 24 }}>
            <View style={{ position: 'relative', marginBottom: 16 }}>
              <View style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' }}>
                {profileData.enterprise.logo ? (
                  <Image source={{ uri: profileData.enterprise.logo }} style={{ width: 84, height: 84, borderRadius: 42 }} resizeMode="cover" />
                ) : (
                  <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 32, color: '#FFFFFF' }}>
                      {profileData.enterprise.companyName?.[0]?.toUpperCase() || 'E'}
                    </Text>
                  </View>
                )}
              </View>
              {profileData.enterprise.isActive && (
                <View style={{ position: 'absolute', bottom: 3, right: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: '#4ADE80', borderWidth: 2.5, borderColor: '#065F46' }} />
              )}
            </View>

            <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 22, color: '#FFFFFF', textAlign: 'center' }} numberOfLines={2}>
              {profileData.enterprise.companyName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Ionicons name="location" size={13} color="rgba(255,255,255,0.65)" />
              <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginLeft: 4 }} numberOfLines={1}>
                {profileData.enterprise.location.district}, {profileData.enterprise.location.city}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats card — overlap hero */}
        <View style={{ marginTop: -46, paddingHorizontal: 16 }}>
          <View style={{ backgroundColor: isDark ? colors.cardElevated : colors.card, borderRadius: 22, flexDirection: 'row', borderWidth: isDark ? 1 : 0, borderColor: 'rgba(255,255,255,0.08)', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: isDark ? 0.45 : 0.12, shadowRadius: 18, elevation: 8 }}>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 18 }}>
              <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 22, color: colors.textPrimary }}>{followerCount}</Text>
              <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                Abonné{followerCount !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.border, marginVertical: 12 }} />
            <TouchableOpacity style={{ flex: 1, alignItems: 'center', paddingVertical: 18 }} onPress={() => router.push('/(app)/(enterprise)/marketplace')} activeOpacity={0.7}>
              <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 22, color: colors.textPrimary }}>{followingList.length}</Text>
              <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                Suivi{followingList.length !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
            <View style={{ width: 1, backgroundColor: colors.border, marginVertical: 12 }} />
            <TouchableOpacity style={{ flex: 1, alignItems: 'center', paddingVertical: 18 }} onPress={handleNavigateToPartners} activeOpacity={0.7}>
              <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 22, color: colors.textPrimary }}>
                {profileData.enterprise.deliveryPartners?.length || 0}
              </Text>
              <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>Partenaires</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Description + action buttons */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20, gap: 14, backgroundColor: colors.secondary }}>
          {profileData.enterprise.description ? (
            <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 14, color: colors.textSecondary, lineHeight: 22 }} numberOfLines={3}>
              {profileData.enterprise.description}
            </Text>
          ) : (
            <Text style={{ fontFamily: 'Poppins-Regular', fontSize: 14, color: colors.textTertiary, fontStyle: 'italic' }}>
              {i18n.t("enterprise.profile.placeholders.noDescription")}
            </Text>
          )}

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => router.push('/(app)/(enterprise)/profile/edit-profile')}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tertiary, borderRadius: 12, paddingVertical: 12, gap: 6 }}
            >
              <Ionicons name="person-outline" size={15} color={colors.textPrimary} />
              <Text style={{ fontFamily: 'Poppins-SemiBold', fontSize: 12, color: colors.textPrimary }}>
                {i18n.t("enterprise.profile.actions.profile")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNavigateToPartners}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tertiary, borderRadius: 12, paddingVertical: 12, gap: 6 }}
            >
              <Ionicons name="people-outline" size={15} color={colors.textPrimary} />
              <Text style={{ fontFamily: 'Poppins-SemiBold', fontSize: 12, color: colors.textPrimary }}>
                {i18n.t("enterprise.profile.actions.partners")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowEnterpriseDetails(true)}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.tertiary, borderRadius: 12, paddingVertical: 12, gap: 6 }}
            >
              <Ionicons name="information-circle-outline" size={15} color={colors.textPrimary} />
              <Text style={{ fontFamily: 'Poppins-SemiBold', fontSize: 12, color: colors.textPrimary }}>
                {i18n.t("enterprise.profile.actions.details")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Marketing & Abonnements — liste propre */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24, backgroundColor: colors.secondary }}>
          <Text style={{ fontFamily: 'Poppins-SemiBold', fontSize: 11, color: colors.textTertiary, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, paddingLeft: 4 }}>
            {i18n.t("enterprise.profile.sections.marketing")}
          </Text>
          <View style={{ backgroundColor: colors.card, borderRadius: 20, overflow: 'hidden' }}>
            {/* Publicités */}
            {canUseFeature("advertisements") ? (
              <TouchableOpacity
                onPress={() => router.push("/(app)/(enterprise)/advertisements")}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : '#ECFDF5', borderBottomWidth: 1, borderBottomColor: colors.border }}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                    <Ionicons name="megaphone-outline" size={18} color={colors.brandPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: 'Poppins-SemiBold', fontSize: 14, color: colors.textPrimary }}>
                      {i18n.t("enterprise.profile.features.advertisements.title")}
                    </Text>
                    <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                      {i18n.t("enterprise.profile.features.advertisements.configure")}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => { if (!isIosBillingRestricted) router.push("/(app)/(enterprise)/subscriptions"); }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: isDark ? 'rgba(251,191,36,0.08)' : '#FFFBEB', borderBottomWidth: 1, borderBottomColor: colors.border }}
                activeOpacity={isIosBillingRestricted ? 1 : 0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.tertiary, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                    <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                      <Text style={{ fontFamily: 'Poppins-SemiBold', fontSize: 14, color: colors.textPrimary }}>
                        {i18n.t("enterprise.profile.features.advertisements.title")}
                      </Text>
                      <View style={{ backgroundColor: isDark ? 'rgba(251,191,36,0.15)' : '#FEF3C7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 }}>
                        <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 9, color: '#D97706' }}>
                          {i18n.t("enterprise.profile.features.advertisements.premium")}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 12, color: colors.textSecondary }}>
                      {isIosBillingRestricted ? "Fonction réservée aux comptes actifs" : i18n.t("enterprise.profile.features.advertisements.upgrade")}
                    </Text>
                  </View>
                </View>
                {!isIosBillingRestricted && <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
              </TouchableOpacity>
            )}

            {/* Abonnements */}
            <TouchableOpacity
              onPress={() => { if (!isIosBillingRestricted) router.push("/(app)/(enterprise)/subscriptions"); }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : '#ECFDF5' }}
              activeOpacity={isIosBillingRestricted ? 1 : 0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Ionicons name="layers-outline" size={18} color={colors.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Poppins-SemiBold', fontSize: 14, color: colors.textPrimary }}>
                    {i18n.t("enterprise.profile.features.subscriptions.title")}
                  </Text>
                  <Text style={{ fontFamily: 'Poppins-Medium', fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    {subscription
                      ? subscription.plan.name
                      : isIosBillingRestricted
                        ? "Fonctionnalité réservée aux comptes actifs"
                        : i18n.t("enterprise.profile.features.subscriptions.viewOffers")}
                  </Text>
                </View>
              </View>
              {!isIosBillingRestricted && <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact & Owner Cards */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
          {/* Contact */}
          <View style={{ backgroundColor: colors.card, borderRadius: 20, overflow: "hidden" }}>
            <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 }}>
              <Text className="text-sm font-poppins-semibold" style={{ color: colors.textPrimary }}>
                {i18n.t("enterprise.profile.sections.contact")}
              </Text>
            </View>
            {profileData.enterprise.contactInfo?.email && (
              <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.border }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? "#431407" : "#FFF7ED", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                  <Ionicons name="mail" size={17} color="#EA580C" />
                </View>
                <Text className="text-sm font-poppins-medium flex-1" style={{ color: colors.textPrimary }} numberOfLines={1}>
                  {profileData.enterprise.contactInfo.email}
                </Text>
              </View>
            )}
            {profileData.enterprise.contactInfo?.phone && (
              <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.border }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? "#052e16" : "#F0FDF4", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                  <Ionicons name="call" size={17} color="#16A34A" />
                </View>
                <Text className="text-sm font-poppins-medium flex-1" style={{ color: colors.textPrimary }} numberOfLines={1}>
                  {profileData.enterprise.contactInfo.phone}
                </Text>
              </View>
            )}
            {profileData.enterprise.contactInfo?.whatsapp && (
              <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.border }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? "#052e16" : "#F0FDF4", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                  <Ionicons name="logo-whatsapp" size={17} color="#16A34A" />
                </View>
                <Text className="text-sm font-poppins-medium flex-1" style={{ color: colors.textPrimary }} numberOfLines={1}>
                  {profileData.enterprise.contactInfo.whatsapp}
                </Text>
              </View>
            )}
            {profileData.enterprise.contactInfo?.website && (
              <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.border }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? "#1e3a5f" : "#EFF6FF", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                  <Ionicons name="globe" size={17} color="#3B82F6" />
                </View>
                <Text className="text-sm font-poppins-medium flex-1" style={{ color: colors.textPrimary }} numberOfLines={1}>
                  {profileData.enterprise.contactInfo.website}
                </Text>
              </View>
            )}
            {!profileData.enterprise.contactInfo?.email &&
              !profileData.enterprise.contactInfo?.phone &&
              !profileData.enterprise.contactInfo?.whatsapp &&
              !profileData.enterprise.contactInfo?.website && (
                <View style={{ paddingHorizontal: 20, paddingBottom: 18, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 14 }}>
                  <Text className="text-sm font-quicksand-regular italic" style={{ color: colors.textTertiary }}>
                    {i18n.t("enterprise.profile.contact.noInfo")}
                  </Text>
                </View>
              )}
          </View>

          {/* Propriétaire */}
          <View style={{ backgroundColor: colors.card, borderRadius: 20, padding: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <Text className="text-sm font-poppins-semibold" style={{ color: colors.textPrimary }}>
                {i18n.t("enterprise.profile.sections.owner")}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(app)/(enterprise)/profile/edit-profile')}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Ionicons name="create-outline" size={15} color={colors.textSecondary} />
                <Text className="text-xs font-poppins-medium" style={{ color: colors.textSecondary }}>
                  {i18n.t("enterprise.profile.actions.edit")}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {profileData.user.profileImage ? (
                <Image
                  source={{ uri: profileData.user.profileImage }}
                  style={{ width: 48, height: 48, borderRadius: 24, marginRight: 14 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: isDark ? "#1f2937" : "#F3F4F6", alignItems: "center", justifyContent: "center", marginRight: 14 }}>
                  <Text className="font-poppins-bold text-sm" style={{ color: colors.textSecondary }}>
                    {(`${profileData.user.firstName?.[0] || ""}${profileData.user.lastName?.[0] || ""}` || profileData.enterprise.companyName?.[0] || "E").toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text className="text-base font-poppins-semibold" style={{ color: colors.textPrimary }} numberOfLines={1}>
                  {profileData.user.firstName || profileData.user.lastName
                    ? `${profileData.user.firstName || ""} ${profileData.user.lastName || ""}`.trim()
                    : profileData.enterprise.companyName}
                </Text>
                <Text className="text-sm font-poppins-medium mt-0.5" style={{ color: colors.textSecondary }} numberOfLines={1}>
                  {profileData.user.email}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Menu de gestion */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 }}>
          <Text className="text-lg font-poppins-bold mb-4 pl-1" style={{ color: colors.textPrimary }}>
            {i18n.t("enterprise.profile.management.title")}
          </Text>
          <View style={{ backgroundColor: colors.card, borderRadius: 20, overflow: "hidden" }}>
            {/* Partenaires de livraison */}
            <TouchableOpacity
              onPress={handleNavigateToPartners}
              className="flex-row items-center justify-between px-4 py-5"
              style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full justify-center items-center" style={{ backgroundColor: isDark ? '#6366F120' : '#E0E7FF' }}>
                  <Ionicons name="people-outline" size={20} color="#6366F1" />
                </View>
                <View className="ml-4">
                  <Text className="text-base font-poppins-medium" style={{ color: colors.textPrimary }}>
                    {i18n.t("enterprise.profile.management.partners")}
                  </Text>
                  {profileData.enterprise.deliveryPartners &&
                    profileData.enterprise.deliveryPartners.length > 0 && (
                      <Text className="text-sm font-poppins-light" style={{ color: colors.textSecondary }}>
                        {i18n.t("enterprise.profile.management.partnersCount", { count: profileData.enterprise.deliveryPartners.length })}
                      </Text>
                    )}
                </View>
              </View>

              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* Notifications */}
            <TouchableOpacity
              onPress={() =>
                router.push("/(app)/(enterprise)/profile/notifications")
              }
              className="flex-row items-center justify-between px-4 py-5"
              style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full justify-center items-center" style={{ backgroundColor: isDark ? colors.brandPrimary + '20' : '#D1FAE5' }}>
                  <Ionicons name="notifications-outline" size={20} color={colors.brandPrimary} />
                </View>
                <View className="ml-4">
                  <Text className="text-base font-poppins-medium" style={{ color: colors.textPrimary }}>
                    {i18n.t("enterprise.profile.management.notifications")}
                  </Text>
                  <Text className="text-sm font-poppins-light" style={{ color: colors.textSecondary }}>
                    {i18n.t("enterprise.profile.management.notificationsDescription")}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center">
                {unreadCount > 0 && (
                  <View className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: colors.error }} />
                )}
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>

            {/* Paramètres */}
            <TouchableOpacity
              onPress={() =>
                router.push("/(app)/(enterprise)/profile/settings")
              }
              className="flex-row items-center justify-between px-4 py-5"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full justify-center items-center" style={{ backgroundColor: isDark ? colors.brandPrimary + '20' : '#D1FAE5' }}>
                  <Ionicons name="settings-outline" size={20} color={colors.brandPrimary} />
                </View>
                <View className="ml-4">
                  <Text className="text-base font-poppins-medium" style={{ color: colors.textPrimary }}>
                    {i18n.t("enterprise.profile.management.settings")}
                  </Text>
                  <Text className="text-sm font-poppins-light" style={{ color: colors.textSecondary }}>
                    {i18n.t("enterprise.profile.management.settingsDescription")}
                  </Text>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* Aide & Support */}
            <TouchableOpacity
              onPress={() => Linking.openURL('mailto:tanguyricardo@aximarketplace.com')}
              className="flex-row items-center justify-between px-4 py-5"
              style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full justify-center items-center" style={{ backgroundColor: isDark ? colors.brandPrimary + '20' : '#D1FAE5' }}>
                  <Ionicons name="help-circle-outline" size={20} color={colors.brandPrimary} />
                </View>
                <View className="ml-4">
                  <Text className="text-base font-poppins-medium" style={{ color: colors.textPrimary }}>
                    {i18n.t("enterprise.profile.management.help")}
                  </Text>
                  <Text className="text-sm font-poppins-light" style={{ color: colors.textSecondary }}>
                    {i18n.t("enterprise.profile.management.helpDescription")}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* Site web Axi Marketplace */}
            <TouchableOpacity
              onPress={() => Linking.openURL('https://aximarketplace.com')}
              className="flex-row items-center justify-between px-4 py-5"
              style={{ backgroundColor: isDark ? 'rgba(59,130,246,0.08)' : '#EFF6FF' }}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full justify-center items-center" style={{ backgroundColor: isDark ? "#1e3a5f" : "#DBEAFE" }}>
                  <Ionicons name="globe-outline" size={20} color="#3B82F6" />
                </View>
                <View className="ml-4">
                  <Text className="text-base font-poppins-medium" style={{ color: colors.textPrimary }}>
                    Axi Marketplace
                  </Text>
                  <Text className="text-sm font-poppins-light" style={{ color: colors.textSecondary }}>
                    aximarketplace.com
                  </Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bouton de déconnexion */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
          <TouchableOpacity
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
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text className="font-poppins-semibold" style={{ color: "#EF4444" }}>
              {i18n.t("enterprise.profile.management.logout")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View className="px-6 py-4">
          <Text className="text-center text-xs font-poppins-medium" style={{ color: colors.textTertiary }}>
            {i18n.t("enterprise.profile.appInfo")}
          </Text>
        </View>

        {/* Espace supplémentaire pour la navbar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modals */}
      {profileData && (
        <>
          <AddPartnerModal
            // Modal AddPartner retirée : ne plus rendre (placeholder pour éviter rupture si import conservé)
            visible={false}
            onClose={() => { }}
            onAdd={handleAddPartner}
            loading={editLoading}
          />

          <EnterpriseDetailsModal
            visible={showEnterpriseDetails}
            onClose={() => setShowEnterpriseDetails(false)}
            enterprise={profileData.enterprise}
            colors={colors}
            isDark={isDark}
          />

          {/* Modal de confirmation */}
          <Modal
            visible={confirmationVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={closeConfirmation}
          >
            <View className="flex-1 justify-center items-center px-4" style={{ backgroundColor: colors.overlay }}>
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
                    style={{ backgroundColor: colors.tertiary }}
                    onPress={closeConfirmation}
                  >
                    <Text className="font-poppins-semibold text-center" style={{ color: colors.textPrimary }}>
                      Annuler
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 rounded-xl py-3"
                    style={{
                      backgroundColor: confirmationAction?.confirmColor,
                    }}
                    onPress={executeConfirmedAction}
                  >
                    <Text className="font-poppins-semibold text-center" style={{ color: colors.textOnBrand }}>
                      {confirmationAction?.confirmText}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
}

export default EnterpriseProfilePage;
