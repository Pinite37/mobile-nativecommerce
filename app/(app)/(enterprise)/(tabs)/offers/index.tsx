import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { router, useFocusEffect } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useRef, useState } from "react";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PhoneInput, { ICountry, getCountryByCca2 } from "react-native-international-phone-number";
import NotificationModal, {
  useNotification,
} from "../../../../../components/ui/NotificationModal";
import LockedFeatureOverlay from "../../../../../components/enterprise/LockedFeatureOverlay";
import { useLocale } from "../../../../../contexts/LocaleContext";
import { useTheme } from "../../../../../contexts/ThemeContext";
import { Shimmer } from "../../../../../components/ui/Shimmer";
import { useSubscription } from "../../../../../contexts/SubscriptionContext";
import i18n from "../../../../../i18n/i18n";
import EnterpriseService from "../../../../../services/api/EnterpriseService";
import DeliveryService, {
  CreateDeliveryCallPayload,
  DeliveryCall,
  DeliveryOffer,
  DeliveryStatus,
  UrgencyLevel,
} from "../../../../../services/api/DeliveryService";

type FilterStatus = "ALL" | DeliveryStatus;
type ViewMode = "OFFERS" | "CALLS";

interface DeliveryCallForm {
  productName: string;
  description: string;
  pickupLocation: string;
  deliveryLocation: string;
  customerName: string;
  customerPhone: string;
  deliveryFee: string;
  urgency: UrgencyLevel;
  specialInstructions: string;
  expiresAt: string;
}

const getFilters = () => [
  { id: "ALL" as const, label: i18n.t("enterprise.offers.filters.all") },
  { id: "OPEN" as const, label: i18n.t("enterprise.offers.filters.open") },
  {
    id: "ASSIGNED" as const,
    label: i18n.t("enterprise.offers.filters.assigned"),
  },
  {
    id: "CANCELLED" as const,
    label: i18n.t("enterprise.offers.filters.cancelled"),
  },
];

const getViewModes = () => [
  {
    id: "CALLS" as const,
    label: i18n.t("enterprise.offers.viewModes.calls"),
    icon: "flash",
  },
  {
    id: "OFFERS" as const,
    label: i18n.t("enterprise.offers.viewModes.offers"),
    icon: "cube",
  },
];

const createInitialCallForm = (): DeliveryCallForm => ({
  productName: "",
  description: "",
  pickupLocation: "",
  deliveryLocation: "",
  customerName: "",
  customerPhone: "",
  deliveryFee: "",
  urgency: "MEDIUM",
  specialInstructions: "",
  expiresAt: "",
});

function formatPrice(n?: number) {
  if (!n && n !== 0) return "—";
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDefaultExpiry() {
  return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

function matchesFilter(status: DeliveryStatus, filter: FilterStatus) {
  return filter === "ALL" || filter === status;
}

export default function EnterpriseOffersScreen() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { locale } = useLocale();
  const { colors, isDark } = useTheme();
  const { subscription } = useSubscription();
  const isSubscriptionActive = subscription?.isActive === true;
  const FILTERS = getFilters();
  const VIEW_MODES = getViewModes();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 360;
  const isTablet = width >= 768;
  const barBaseHeight = isTablet ? 68 : isSmallPhone ? 58 : 62;
  const bottomSpacer = barBaseHeight + insets.bottom + 16;

  const [viewMode, setViewMode] = useState<ViewMode>("CALLS");

  // Une entreprise sans point de retrait ne peut plus publier de livraison :
  // le backend refuse désormais une mission dont on ignore d'où part le colis.
  // On l'annonce ICI plutôt que de la laisser remplir tout un formulaire pour
  // se heurter à une erreur à l'envoi.
  const [hasPickupPoint, setHasPickupPoint] = useState<boolean | null>(null);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      EnterpriseService.listPickupPoints().then((points) => {
        if (!cancelled) setHasPickupPoint(points.some((p) => p.isActive !== false));
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const [switcherWidth, setSwitcherWidth] = useState(0);
  const segmentAnim = useRef(new Animated.Value(0)).current;

  const handleSetViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    Animated.spring(segmentAnim, {
      toValue: mode === 'CALLS' ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
      tension: 120,
    }).start();
  }, [segmentAnim]);
  const { notification, showNotification, hideNotification } =
    useNotification();

  const queryClient = useQueryClient();

  const { data: offers = [], isLoading: loadingOffers, error: offersError, refetch: refetchOffers } = useQuery({
    queryKey: ['delivery', 'offers', filter],
    queryFn: async () => { const s = filter === "ALL" ? undefined : filter; return DeliveryService.listEnterpriseOffers(s); },
    staleTime: 30_000,
  });

  const { data: calls = [], isLoading: loadingCalls, error: callsError, refetch: refetchCalls } = useQuery({
    queryKey: ['delivery', 'calls', filter],
    queryFn: async () => { const s = filter === "ALL" ? undefined : filter; return DeliveryService.listEnterpriseCalls(s); },
    staleTime: 30_000,
  });

  const loading = viewMode === "OFFERS" ? loadingOffers : loadingCalls;
  const error = ((viewMode === "OFFERS" ? offersError : callsError) as Error | null)?.message ?? null;
  const activeItems = viewMode === "OFFERS" ? offers : calls;

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [selectedDeletion, setSelectedDeletion] = useState<{
    id: string;
    type: "offer" | "call";
  } | null>(null);

  const [callModalVisible, setCallModalVisible] = useState(false);
  const [creatingCall, setCreatingCall] = useState(false);
  const [callForm, setCallForm] = useState<DeliveryCallForm>(
    createInitialCallForm()
  );
  const [phoneCountry, setPhoneCountry] = useState<ICountry | null>(
    getCountryByCca2("BJ") ?? null
  );
  const [rawPhoneNumber, setRawPhoneNumber] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempExpiryDate, setTempExpiryDate] = useState<Date | null>(null);
  const [tempPickerDate, setTempPickerDate] = useState<Date>(
    new Date(Date.now() + 60 * 60 * 1000)
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['delivery', 'offers', filter] }),
        queryClient.invalidateQueries({ queryKey: ['delivery', 'calls', filter] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [filter, queryClient]);

  const openCreateCallModal = () => {
    if (!callForm.expiresAt) {
      const defaultExpiry = getDefaultExpiry();
      setCallForm((prev) => ({ ...prev, expiresAt: defaultExpiry }));
      setTempPickerDate(new Date(defaultExpiry));
    } else {
      setTempPickerDate(new Date(callForm.expiresAt));
    }
    setCallModalVisible(true);
  };

  const closeCreateCallModal = () => {
    if (creatingCall) return;
    setCallModalVisible(false);
  };

  const resetCallForm = () => {
    setCallForm(createInitialCallForm());
    setRawPhoneNumber("");
    setPhoneCountry(getCountryByCca2("BJ") ?? null);
    setTempExpiryDate(null);
    setTempPickerDate(new Date(Date.now() + 60 * 60 * 1000));
  };

  const submitCall = async () => {
    try {
      if (
        !callForm.productName.trim() ||
        !callForm.pickupLocation.trim() ||
        !callForm.deliveryLocation.trim() ||
        !callForm.customerName.trim() ||
        !callForm.customerPhone.trim() ||
        !callForm.deliveryFee ||
        !callForm.expiresAt
      ) {
        showNotification(
          "warning",
          i18n.t("enterprise.offers.calls.validation.requiredTitle"),
          i18n.t("enterprise.offers.calls.validation.requiredMessage")
        );
        return;
      }

      const fee = Number(callForm.deliveryFee);
      if (Number.isNaN(fee) || fee <= 0) {
        showNotification(
          "warning",
          i18n.t("enterprise.offers.calls.validation.invalidFeeTitle"),
          i18n.t("enterprise.offers.calls.validation.invalidFeeMessage")
        );
        return;
      }

      const expires = new Date(callForm.expiresAt);
      if (Number.isNaN(expires.getTime()) || expires <= new Date()) {
        showNotification(
          "warning",
          i18n.t("enterprise.offers.calls.validation.invalidExpiryTitle"),
          i18n.t("enterprise.offers.calls.validation.invalidExpiryMessage")
        );
        return;
      }

      setCreatingCall(true);

      // Le point de retrait n'est plus capturé ici : le backend lit
      // désormais l'emplacement précis de la boutique, défini une fois pour
      // toutes par l'entreprise (Profil > Emplacement de ma boutique) — pas
      // le GPS live du téléphone au moment de créer l'appel.
      const payload: CreateDeliveryCallPayload = {
        productName: callForm.productName.trim(),
        description: callForm.description.trim(),
        pickupLocation: callForm.pickupLocation.trim(),
        deliveryLocation: callForm.deliveryLocation.trim(),
        customerInfo: {
          name: callForm.customerName.trim(),
          phone: callForm.customerPhone.trim(),
        },
        deliveryFee: fee,
        urgency: callForm.urgency,
        specialInstructions: callForm.specialInstructions.trim(),
        expiresAt: expires.toISOString(),
      };

      await DeliveryService.createCall(payload);

      queryClient.invalidateQueries({ queryKey: ['delivery', 'calls', filter] });

      setCallModalVisible(false);
      resetCallForm();
      showNotification(
        "success",
        i18n.t("enterprise.offers.calls.create.successTitle"),
        i18n.t("enterprise.offers.calls.create.successMessage")
      );
    } catch (error: any) {
      showNotification(
        "error",
        i18n.t("enterprise.offers.calls.create.errorTitle"),
        error.message || i18n.t("enterprise.offers.calls.create.errorMessage")
      );
    } finally {
      setCreatingCall(false);
    }
  };

  const openDeleteModal = (id: string, type: "offer" | "call") => {
    setSelectedDeletion({ id, type });
    setConfirmVisible(true);
  };

  const closeDeleteModal = () => {
    if (confirmLoading) return;
    setConfirmVisible(false);
    setTimeout(() => setSelectedDeletion(null), 250);
  };

  const handleDelete = async () => {
    if (!selectedDeletion || confirmLoading) return;

    setConfirmLoading(true);
    try {
      if (selectedDeletion.type === "offer") {
        await DeliveryService.deleteOffer(selectedDeletion.id);
        queryClient.invalidateQueries({ queryKey: ['delivery', 'offers', filter] });
        showNotification(
          "success",
          i18n.t("enterprise.offers.deleteModal.offerSuccessTitle"),
          i18n.t("enterprise.offers.deleteModal.offerSuccessMessage")
        );
      } else {
        await DeliveryService.deleteCall(selectedDeletion.id);
        queryClient.invalidateQueries({ queryKey: ['delivery', 'calls', filter] });
        showNotification(
          "success",
          i18n.t("enterprise.offers.deleteModal.callSuccessTitle"),
          i18n.t("enterprise.offers.deleteModal.callSuccessMessage")
        );
      }

      setConfirmVisible(false);
      setTimeout(() => setSelectedDeletion(null), 250);
    } catch (e: any) {
      showNotification(
        "error",
        i18n.t("enterprise.offers.deleteModal.errorTitle"),
        e.message || i18n.t("enterprise.offers.deleteModal.errorMessage")
      );
    } finally {
      setConfirmLoading(false);
    }
  };

  const SkeletonCard = () => (
    <View
      style={{
        backgroundColor: colors.card,
        borderColor: colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
      }}
      className="rounded-2xl p-4 mx-4 mb-4 border"
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1 mr-3">
          <Shimmer style={{ width: 40, height: 40, borderRadius: 12 }} />
          <View className="ml-3 flex-1">
            <Shimmer
              style={{
                height: 16,
                borderRadius: 8,
                width: "70%",
                marginBottom: 6,
              }}
            />
            <Shimmer style={{ height: 12, borderRadius: 6, width: "45%" }} />
          </View>
        </View>
        <Shimmer style={{ height: 24, borderRadius: 12, width: 90 }} />
      </View>

      <Shimmer style={{ height: 12, borderRadius: 6, width: "100%", marginBottom: 8 }} />
      <Shimmer style={{ height: 12, borderRadius: 6, width: "82%", marginBottom: 16 }} />

      <View
        style={{ borderTopColor: colors.border }}
        className="flex-row items-center justify-between pt-3 border-t"
      >
        <Shimmer style={{ height: 18, borderRadius: 8, width: 100 }} />
        <Shimmer style={{ height: 34, borderRadius: 10, width: 96 }} />
      </View>
    </View>
  );

  const renderSkeletons = () => (
    <FlatList
      data={Array.from({ length: 4 }).map((_, i) => i.toString())}
      renderItem={() => <SkeletonCard />}
      keyExtractor={(item) => item}
      contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    />
  );

  const getStatusPill = (status: DeliveryStatus) => {
    switch (status) {
      case "OPEN":
        return {
          color: "#10B981",
          bg: "#D1FAE5",
          text: i18n.t("enterprise.offers.status.open"),
          icon: "alert-circle",
        };
      case "ASSIGNED":
        return {
          color: "#3B82F6",
          bg: "#DBEAFE",
          text: i18n.t("enterprise.offers.status.assigned"),
          icon: "person",
        };
      case "CANCELLED":
        return {
          color: "#EF4444",
          bg: "#FEE2E2",
          text: i18n.t("enterprise.offers.status.cancelled"),
          icon: "close-circle",
        };
      case "COMPLETED":
      default:
        return {
          color: "#6B7280",
          bg: "#F3F4F6",
          text: i18n.t("enterprise.offers.status.completed"),
          icon: "checkmark-circle",
        };
    }
  };

  const getUrgencyPill = (urgency: UrgencyLevel) => {
    switch (urgency) {
      case "HIGH":
        return {
          color: "#EF4444",
          bg: isDark ? "rgba(239,68,68,0.16)" : "#FEE2E2",
          icon: "rocket",
          text: i18n.t("enterprise.messages.conversationDetail.offerForm.urgencyHigh"),
        };
      case "LOW":
        return {
          color: "#10B981",
          bg: isDark ? "rgba(16,185,129,0.16)" : "#D1FAE5",
          icon: "leaf",
          text: i18n.t("enterprise.messages.conversationDetail.offerForm.urgencyLow"),
        };
      case "MEDIUM":
      default:
        return {
          color: "#F59E0B",
          bg: isDark ? "rgba(245,158,11,0.16)" : "#FEF3C7",
          icon: "flash",
          text: i18n.t("enterprise.messages.conversationDetail.offerForm.urgencyMedium"),
        };
    }
  };

  const renderOfferItem = ({ item }: { item: DeliveryOffer }) => {
    const productData = (item as any).productData || {};
    const customer = (item as any).customer || {};
    const statusPill = getStatusPill(item.status);

    return (
      <View
        style={{
          backgroundColor: colors.card,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.03,
          shadowRadius: 4,
          elevation: 1,
        }}
        className="rounded-2xl p-4 mx-4 mb-4"
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1 mr-3">
            <Image
              source={{
                uri:
                  productData.images?.[0] ||
                  "https://via.placeholder.com/40x40/CCCCCC/FFFFFF?text=PD",
              }}
              className="w-10 h-10 rounded-lg"
            />
            <View className="ml-3 flex-1">
              <Text
                style={{ color: colors.textPrimary }}
                className="text-sm font-jakarta-semibold"
                numberOfLines={1}
              >
                {productData.name || i18n.t("enterprise.offers.labels.product")}
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-xs">
                {formatPrice(productData.price)}
              </Text>
            </View>
          </View>
          <View
            className="flex-row items-center px-3 py-1 rounded-full"
            style={{ backgroundColor: statusPill.bg }}
          >
            <Ionicons
              name={statusPill.icon as any}
              size={14}
              color={statusPill.color}
            />
            <Text
              className="text-xs font-jakarta-semibold ml-1"
              style={{ color: statusPill.color }}
            >
              {statusPill.text}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <Text style={{ color: colors.textTertiary }} className="text-xs">
              {i18n.t("enterprise.offers.labels.client")}
            </Text>
            <Text
              style={{ color: colors.textPrimary }}
              className="text-sm font-jakarta-medium"
              numberOfLines={1}
            >
              {customer.firstName || customer.lastName
                ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
                : customer._id || i18n.t("enterprise.offers.labels.client")}
            </Text>
          </View>
          <View className="items-end">
            <Text style={{ color: colors.textTertiary }} className="text-xs">
              {i18n.t("enterprise.offers.labels.expires")}
            </Text>
            <Text
              style={{ color: colors.textPrimary }}
              className="text-sm font-jakarta-semibold"
            >
              {formatDateTime(item.expiresAt)}
            </Text>
          </View>
        </View>

        <View
          style={{ borderTopColor: colors.border }}
          className="flex-row items-center justify-between mt-4 pt-3 border-t"
        >
          <Text
            style={{ color: colors.brandPrimary }}
            className="text-base font-jakarta-bold"
          >
            {formatPrice(item.deliveryFee)}
          </Text>
          {item.status === "OPEN" && (
            <TouchableOpacity
              style={{ backgroundColor: isDark ? colors.tertiary : "#FEF2F2" }}
              className="rounded-lg px-3 py-2"
              activeOpacity={0.8}
              onPress={() => openDeleteModal(item._id, "offer")}
            >
              <Text
                className="text-sm font-jakarta-semibold"
                style={{ color: colors.error }}
              >
                {i18n.t("enterprise.offers.labels.delete")}
              </Text>
            </TouchableOpacity>
          )}
          {item.status === "ASSIGNED" && (
            <TouchableOpacity
              style={{ backgroundColor: colors.brandPrimary }}
              className="rounded-lg px-3 py-2 flex-row items-center"
              activeOpacity={0.8}
              onPress={() => router.push(`/(app)/(enterprise)/tracking/${item._id}` as any)}
            >
              <Ionicons name="navigate" size={14} color="#FFFFFF" />
              <Text className="text-sm font-jakarta-semibold text-white ml-1">
                Suivre en direct
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderCallItem = ({ item }: { item: DeliveryCall }) => {
    const statusPill = getStatusPill(item.status);
    const urgencyPill = getUrgencyPill(item.urgency);
    const customerInfo =
      typeof item.customerInfo === "string"
        ? { name: item.customerInfo, phone: "" }
        : item.customerInfo || {};

    return (
      <View
        style={{
          backgroundColor: colors.card,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.03,
          shadowRadius: 4,
          elevation: 1,
        }}
        className="rounded-2xl p-4 mx-4 mb-4"
      >
        <View className="flex-row items-start justify-between mb-3">
          <View className="flex-row flex-1 mr-3">
            <View
              style={{
                backgroundColor: isDark ? colors.tertiary : "#ECFDF5",
              }}
              className="w-12 h-12 rounded-2xl items-center justify-center"
            >
              <Ionicons name="cube" size={22} color={colors.brandPrimary} />
            </View>
            <View className="ml-3 flex-1">
              <Text
                style={{ color: colors.textPrimary }}
                className="text-base font-jakarta-bold"
                numberOfLines={1}
              >
                {item.productName}
              </Text>
              <Text
                style={{ color: colors.textSecondary }}
                className="text-sm font-jakarta-medium mt-1"
                numberOfLines={2}
              >
                {item.description?.trim() ||
                  i18n.t("enterprise.offers.calls.labels.noDescription")}
              </Text>
            </View>
          </View>
          <View
            className="flex-row items-center px-3 py-1 rounded-full"
            style={{ backgroundColor: statusPill.bg }}
          >
            <Ionicons
              name={statusPill.icon as any}
              size={14}
              color={statusPill.color}
            />
            <Text
              className="text-xs font-jakarta-semibold ml-1"
              style={{ color: statusPill.color }}
            >
              {statusPill.text}
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap mb-3">
          <View
            className="flex-row items-center px-3 py-1 rounded-full mr-2 mb-2"
            style={{ backgroundColor: urgencyPill.bg }}
          >
            <Ionicons
              name={urgencyPill.icon as any}
              size={14}
              color={urgencyPill.color}
            />
            <Text
              className="text-xs font-jakarta-semibold ml-1"
              style={{ color: urgencyPill.color }}
            >
              {urgencyPill.text}
            </Text>
          </View>
          <View
            className="flex-row items-center px-3 py-1 rounded-full mb-2"
            style={{
              backgroundColor: isDark ? colors.tertiary : "#EFF6FF",
            }}
          >
            <Ionicons name="time" size={14} color="#3B82F6" />
            <Text
              className="text-xs font-jakarta-semibold ml-1"
              style={{ color: "#3B82F6" }}
            >
              {formatDateTime(item.expiresAt)}
            </Text>
          </View>
        </View>

        <View
          style={{ backgroundColor: isDark ? colors.secondary : "#F8FAFC" }}
          className="rounded-2xl px-4 py-3 mb-3"
        >
          <View className="flex-row items-start mb-3">
            <Ionicons
              name="navigate-circle"
              size={18}
              color={colors.brandPrimary}
              style={{ marginTop: 2 }}
            />
            <View className="ml-3 flex-1">
              <Text
                style={{ color: colors.textTertiary }}
                className="text-xs font-jakarta-medium"
              >
                {i18n.t("enterprise.offers.calls.labels.pickup")}
              </Text>
              <Text
                style={{ color: colors.textPrimary }}
                className="text-sm font-jakarta-semibold"
              >
                {item.pickupLocation}
              </Text>
            </View>
          </View>

          <View className="flex-row items-start mb-3">
            <Ionicons
              name="location"
              size={18}
              color={colors.brandPrimary}
              style={{ marginTop: 2 }}
            />
            <View className="ml-3 flex-1">
              <Text
                style={{ color: colors.textTertiary }}
                className="text-xs font-jakarta-medium"
              >
                {i18n.t("enterprise.offers.calls.labels.delivery")}
              </Text>
              <Text
                style={{ color: colors.textPrimary }}
                className="text-sm font-jakarta-semibold"
              >
                {item.deliveryLocation}
              </Text>
            </View>
          </View>

          <View className="flex-row items-start">
            <Ionicons
              name="call"
              size={18}
              color={colors.brandPrimary}
              style={{ marginTop: 2 }}
            />
            <View className="ml-3 flex-1">
              <Text
                style={{ color: colors.textTertiary }}
                className="text-xs font-jakarta-medium"
              >
                {i18n.t("enterprise.offers.calls.labels.customerInfo")}
              </Text>
              <Text
                style={{ color: colors.textPrimary }}
                className="text-sm font-jakarta-semibold"
              >
                {customerInfo.name || i18n.t("enterprise.offers.calls.labels.noCustomerName")}
              </Text>
              {!!customerInfo.phone && (
                <Text
                  style={{ color: colors.textSecondary }}
                  className="text-xs font-jakarta-medium mt-1"
                >
                  {customerInfo.phone}
                </Text>
              )}
              {!customerInfo.phone && (
                <Text
                  style={{ color: colors.textSecondary }}
                  className="text-xs font-jakarta-medium mt-1"
                >
                  {i18n.t("enterprise.offers.calls.labels.noCustomerPhone")}
                </Text>
              )}
            </View>
          </View>
        </View>

        {!!item.specialInstructions?.trim() && (
          <View
            style={{
              backgroundColor: isDark ? colors.secondary : "#FFF7ED",
            }}
            className="rounded-2xl px-4 py-3 mb-3"
          >
            <Text
              style={{ color: colors.textTertiary }}
              className="text-xs font-jakarta-medium mb-1"
            >
              {i18n.t(
                "enterprise.messages.conversationDetail.offerForm.specialInstructions"
              )}
            </Text>
            <Text
              style={{ color: colors.textPrimary }}
              className="text-sm font-jakarta-medium"
            >
              {item.specialInstructions}
            </Text>
          </View>
        )}

        <View
          style={{ borderTopColor: colors.border }}
          className="flex-row items-center justify-between mt-1 pt-3 border-t"
        >
          <Text
            style={{ color: colors.brandPrimary }}
            className="text-base font-jakarta-bold"
          >
            {formatPrice(item.deliveryFee)}
          </Text>
          {item.status === "OPEN" && (
            <TouchableOpacity
              style={{ backgroundColor: isDark ? colors.tertiary : "#FEF2F2" }}
              className="rounded-lg px-3 py-2"
              activeOpacity={0.8}
              onPress={() => openDeleteModal(item._id, "call")}
            >
              <Text
                className="text-sm font-jakarta-semibold"
                style={{ color: colors.error }}
              >
                {i18n.t("enterprise.offers.labels.delete")}
              </Text>
            </TouchableOpacity>
          )}
          {item.status === "ASSIGNED" && (
            <TouchableOpacity
              style={{ backgroundColor: colors.brandPrimary }}
              className="rounded-lg px-3 py-2 flex-row items-center"
              activeOpacity={0.8}
              onPress={() => router.push(`/(app)/(enterprise)/tracking/${item._id}` as any)}
            >
              <Ionicons name="navigate" size={14} color="#FFFFFF" />
              <Text className="text-sm font-jakarta-semibold text-white ml-1">
                Suivre en direct
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={{
      backgroundColor: colors.surface,
      paddingTop: insets.top + 16,
      paddingHorizontal: 20,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    }}>
      {/* Titre + compteur + bouton créer */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ fontSize: 24, fontFamily: 'PlusJakartaSans-Bold', color: colors.textPrimary }}>
            {i18n.t("enterprise.offers.title")}
          </Text>
          <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: colors.textSecondary, marginTop: 3 }}>
            {activeItems.length}{' '}
            {viewMode === "CALLS"
              ? activeItems.length !== 1 ? i18n.t("enterprise.offers.count.callsPlural") : i18n.t("enterprise.offers.count.calls")
              : activeItems.length !== 1 ? i18n.t("enterprise.offers.count.offersPlural") : i18n.t("enterprise.offers.count.offers")}
          </Text>
        </View>
        {viewMode === "CALLS" && (
          <TouchableOpacity
            onPress={openCreateCallModal}
            style={{ backgroundColor: colors.brandPrimary, width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Segmented control animé — switcher de mode */}
      <View
        style={{ flexDirection: 'row', backgroundColor: colors.tertiary, borderRadius: 14, padding: 3, marginBottom: 12, position: 'relative' }}
        onLayout={(e) => setSwitcherWidth(e.nativeEvent.layout.width)}
      >
        {/* Pill glissante */}
        {switcherWidth > 0 && (
          <Animated.View style={{
            position: 'absolute',
            top: 3,
            bottom: 3,
            width: (switcherWidth - 6) / 2,
            left: segmentAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [3, 3 + (switcherWidth - 6) / 2],
            }),
            backgroundColor: colors.surface,
            borderRadius: 11,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 3,
            elevation: 2,
          }} />
        )}
        {VIEW_MODES.map((mode) => {
          const isActive = viewMode === mode.id;
          return (
            <TouchableOpacity
              key={mode.id}
              onPress={() => handleSetViewMode(mode.id)}
              style={{ flex: 1, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
              activeOpacity={0.8}
            >
              <Ionicons name={mode.icon as any} size={14} color={isActive ? colors.brandPrimary : colors.textSecondary} />
              <Text style={{ color: isActive ? colors.brandPrimary : colors.textSecondary, fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 13, marginLeft: 5 }}>
                {mode.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Pills de filtre */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 6 }}>
        {FILTERS.map((f) => {
          const isActive = filter === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={{
                backgroundColor: isActive ? colors.brandPrimary : colors.tertiary,
                borderRadius: 20,
                paddingHorizontal: 14,
                paddingVertical: 7,
                marginRight: 8,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ color: isActive ? '#FFFFFF' : colors.textSecondary, fontFamily: isActive ? 'PlusJakartaSans-SemiBold' : 'PlusJakartaSans-Medium', fontSize: 13 }}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.secondary }}>
        <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />
        {renderHeader()}
        <View style={{ flex: 1, backgroundColor: colors.primary }}>
          {renderSkeletons()}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.secondary }}>
        <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />
        {renderHeader()}
        <View
          style={{ flex: 1, backgroundColor: colors.primary }}
          className="justify-center items-center px-6"
        >
          <Ionicons name="warning" size={80} color={colors.error} />
          <Text
            style={{ color: colors.textPrimary }}
            className="font-jakarta-bold text-lg mt-4 mb-2"
          >
            {i18n.t("enterprise.offers.error.title")}
          </Text>
          <Text
            style={{ color: colors.textSecondary }}
            className="font-jakarta-medium text-center mt-1"
          >
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => viewMode === "OFFERS" ? refetchOffers() : refetchCalls()}
            style={{ backgroundColor: colors.brandPrimary }}
            className="mt-4 rounded-xl px-4 py-2"
          >
            <Text
              style={{ color: colors.textOnBrand }}
              className="font-jakarta-semibold"
            >
              {i18n.t("enterprise.offers.error.retry")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary, position: 'relative' }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />
      {renderHeader()}

      {hasPickupPoint === false && (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push("/(app)/(enterprise)/profile/location-picker" as any)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginHorizontal: 16,
            marginTop: 12,
            padding: 14,
            borderRadius: 16,
            backgroundColor: isDark ? "rgba(245,158,11,0.12)" : "#FEF6E7",
            borderWidth: 1,
            borderColor: isDark ? "rgba(245,158,11,0.3)" : "#F7E0B5",
          }}
        >
          <Ionicons name="storefront-outline" size={20} color={colors.warning} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ color: colors.textPrimary }} className="font-jakarta-bold text-sm">
              Définissez votre point de retrait
            </Text>
            <Text style={{ color: colors.textSecondary }} className="font-jakarta text-xs mt-0.5">
              Sans lui, le livreur ne sait pas où venir chercher le colis — vous ne pouvez pas
              publier de livraison.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      <View style={{ flex: 1, backgroundColor: colors.primary }}>
        <FlatList
          data={activeItems}
          key={viewMode}
          keyExtractor={(item) => item._id}
          renderItem={
            viewMode === "OFFERS"
              ? ({ item }) => renderOfferItem({ item: item as DeliveryOffer })
              : ({ item }) => renderCallItem({ item: item as DeliveryCall })
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.brandPrimary]}
              tintColor={colors.brandPrimary}
            />
          }
          ListFooterComponent={
            activeItems.length > 0 ? <View style={{ height: bottomSpacer }} /> : null
          }
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center px-6 mt-20">
              <Ionicons
                name={viewMode === "CALLS" ? "flash" : "cube"}
                size={80}
                color={colors.textTertiary}
              />
              <Text
                style={{ color: colors.textPrimary }}
                className="text-xl font-jakarta-bold mt-4 mb-2 text-center"
              >
                {viewMode === "CALLS"
                  ? i18n.t("enterprise.offers.calls.empty.title")
                  : i18n.t("enterprise.offers.empty.title")}
              </Text>
              <Text
                style={{ color: colors.textSecondary }}
                className="text-center font-jakarta-medium"
              >
                {viewMode === "CALLS"
                  ? i18n.t("enterprise.offers.calls.empty.message")
                  : i18n.t("enterprise.offers.empty.message")}
              </Text>

              {viewMode === "CALLS" && (
                <TouchableOpacity
                  onPress={openCreateCallModal}
                  activeOpacity={0.85}
                  className="mt-5 rounded-2xl px-5 py-3 flex-row items-center"
                  style={{ backgroundColor: colors.brandPrimary }}
                >
                  <Ionicons name="add-circle" size={18} color="white" />
                  <Text className="text-white font-jakarta-bold ml-2">
                    {i18n.t("enterprise.offers.calls.create.button")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: 8,
            paddingBottom: 8,
          }}
        />
      </View>

      <Modal
        visible={callModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeCreateCallModal}
      >
        <View style={{ flex: 1, backgroundColor: colors.overlay }}>
          <KeyboardAvoidingView
            behavior="padding"
            style={{ flex: 1, justifyContent: "flex-end" }}
          >
            <View
              style={{
                backgroundColor: colors.card,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                maxHeight: "92%",
              }}
            >
              <View
                className="px-6 pt-5 pb-4"
                style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text
                    style={{ color: colors.textPrimary }}
                    className="text-xl font-jakarta-bold"
                  >
                    {i18n.t("enterprise.offers.calls.create.title")}
                  </Text>
                  <TouchableOpacity
                    onPress={closeCreateCallModal}
                    disabled={creatingCall}
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.secondary }}
                  >
                    <Ionicons name="close" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
                <Text
                  style={{ color: colors.textSecondary }}
                  className="font-jakarta-medium"
                >
                  {i18n.t("enterprise.offers.calls.create.subtitle")}
                </Text>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View className="px-6 pt-5 pb-6">
                  <View className="mb-5">
                    <Text
                      style={{ color: colors.textPrimary }}
                      className="text-sm font-jakarta-semibold mb-2"
                    >
                      {i18n.t("enterprise.offers.calls.form.productName")}
                    </Text>
                    <View
                      style={{
                        backgroundColor: colors.secondary,
                        borderColor: colors.border,
                      }}
                      className="rounded-2xl border-2 overflow-hidden"
                    >
                      <TextInput
                        value={callForm.productName}
                        onChangeText={(text) =>
                          setCallForm((prev) => ({ ...prev, productName: text }))
                        }
                        placeholder={i18n.t(
                          "enterprise.offers.calls.form.productNamePlaceholder"
                        )}
                        className="px-4 py-3 font-jakarta-medium text-base"
                        style={{ color: colors.textPrimary }}
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>

                  <View className="mb-5">
                    <Text
                      style={{ color: colors.textPrimary }}
                      className="text-sm font-jakarta-semibold mb-2"
                    >
                      {i18n.t("enterprise.offers.calls.form.description")}
                    </Text>
                    <View
                      style={{
                        backgroundColor: colors.secondary,
                        borderColor: colors.border,
                      }}
                      className="rounded-2xl border-2 overflow-hidden"
                    >
                      <TextInput
                        value={callForm.description}
                        onChangeText={(text) =>
                          setCallForm((prev) => ({ ...prev, description: text }))
                        }
                        placeholder={i18n.t(
                          "enterprise.offers.calls.form.descriptionPlaceholder"
                        )}
                        className="px-4 py-3 font-jakarta-medium text-base min-h-[96px]"
                        style={{ color: colors.textPrimary }}
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        textAlignVertical="top"
                      />
                    </View>
                  </View>

                  <View className="mb-5">
                    <Text
                      style={{ color: colors.textPrimary }}
                      className="text-sm font-jakarta-semibold mb-2"
                    >
                      {i18n.t("enterprise.offers.calls.form.pickupLocation")}
                    </Text>
                    <View
                      style={{
                        backgroundColor: colors.secondary,
                        borderColor: colors.border,
                      }}
                      className="rounded-2xl border-2 overflow-hidden"
                    >
                      <TextInput
                        value={callForm.pickupLocation}
                        onChangeText={(text) =>
                          setCallForm((prev) => ({
                            ...prev,
                            pickupLocation: text,
                          }))
                        }
                        placeholder={i18n.t(
                          "enterprise.offers.calls.form.pickupLocationPlaceholder"
                        )}
                        className="px-4 py-3 font-jakarta-medium text-base"
                        style={{ color: colors.textPrimary }}
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>

                  <View className="mb-5">
                    <Text
                      style={{ color: colors.textPrimary }}
                      className="text-sm font-jakarta-semibold mb-2"
                    >
                      {i18n.t("enterprise.offers.calls.form.deliveryLocation")}
                    </Text>
                    <View
                      style={{
                        backgroundColor: colors.secondary,
                        borderColor: colors.border,
                      }}
                      className="rounded-2xl border-2 overflow-hidden"
                    >
                      <TextInput
                        value={callForm.deliveryLocation}
                        onChangeText={(text) =>
                          setCallForm((prev) => ({
                            ...prev,
                            deliveryLocation: text,
                          }))
                        }
                        placeholder={i18n.t(
                          "enterprise.offers.calls.form.deliveryLocationPlaceholder"
                        )}
                        className="px-4 py-3 font-jakarta-medium text-base"
                        style={{ color: colors.textPrimary }}
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>

                  <View className="mb-5">
                    <Text
                      style={{ color: colors.textPrimary }}
                      className="text-sm font-jakarta-semibold mb-2"
                    >
                      {i18n.t("enterprise.offers.calls.form.customerName")}
                    </Text>
                    <View
                      style={{
                        backgroundColor: colors.secondary,
                        borderColor: colors.border,
                      }}
                      className="rounded-2xl border-2 overflow-hidden"
                    >
                      <TextInput
                        value={callForm.customerName}
                        onChangeText={(text) =>
                          setCallForm((prev) => ({
                            ...prev,
                            customerName: text,
                          }))
                        }
                        placeholder={i18n.t(
                          "enterprise.offers.calls.form.customerNamePlaceholder"
                        )}
                        className="px-4 py-3 font-jakarta-medium text-base"
                        style={{ color: colors.textPrimary }}
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>

                  <View className="mb-5">
                    <Text
                      style={{ color: colors.textPrimary }}
                      className="text-sm font-jakarta-semibold mb-2"
                    >
                      {i18n.t("enterprise.offers.calls.form.customerPhone")}
                    </Text>
                    <PhoneInput
                      value={rawPhoneNumber}
                      onChangePhoneNumber={(text) => {
                        setRawPhoneNumber(text);
                        const callingCode = phoneCountry?.callingCode ?? "+229";
                        setCallForm((prev) => ({ ...prev, customerPhone: `${callingCode} ${text}`.trim() }));
                      }}
                      selectedCountry={phoneCountry}
                      onChangeSelectedCountry={(country) => {
                        setPhoneCountry(country);
                        setCallForm((prev) => ({ ...prev, customerPhone: `${country.callingCode} ${rawPhoneNumber}`.trim() }));
                      }}
                      defaultCountry="BJ"
                      placeholder="XX XX XX XX"
                      phoneInputStyles={{
                        container: {
                          backgroundColor: colors.card,
                          borderWidth: 1,
                          borderColor: colors.border,
                          borderRadius: 14,
                          paddingVertical: 4,
                        },
                        flagContainer: {
                          backgroundColor: colors.card,
                          borderTopLeftRadius: 14,
                          borderBottomLeftRadius: 14,
                        },
                        input: { color: colors.textPrimary, fontFamily: "PlusJakartaSans-Medium" },
                        callingCode: { color: colors.textPrimary },
                      }}
                    />
                  </View>

                  <View className="mb-5">
                    <Text
                      style={{ color: colors.textPrimary }}
                      className="text-sm font-jakarta-semibold mb-2"
                    >
                      {i18n.t(
                        "enterprise.messages.conversationDetail.offerForm.deliveryFee"
                      )}
                    </Text>
                    <View
                      style={{
                        backgroundColor: colors.secondary,
                        borderColor: colors.border,
                      }}
                      className="rounded-2xl border-2 overflow-hidden"
                    >
                      <TextInput
                        value={callForm.deliveryFee}
                        onChangeText={(text) =>
                          setCallForm((prev) => ({ ...prev, deliveryFee: text }))
                        }
                        placeholder="2500"
                        keyboardType="numeric"
                        className="px-4 py-3 font-jakarta-medium text-base"
                        style={{ color: colors.textPrimary }}
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>

                  <View className="mb-5">
                    <Text
                      style={{ color: colors.textPrimary }}
                      className="text-sm font-jakarta-semibold mb-3"
                    >
                      {i18n.t(
                        "enterprise.messages.conversationDetail.offerForm.urgencyLevel"
                      )}
                    </Text>
                    <View className="flex-row gap-2">
                      {(["LOW", "MEDIUM", "HIGH"] as UrgencyLevel[]).map(
                        (level) => {
                          const urgencyPill = getUrgencyPill(level);
                          const active = callForm.urgency === level;

                          return (
                            <TouchableOpacity
                              key={level}
                              onPress={() =>
                                setCallForm((prev) => ({ ...prev, urgency: level }))
                              }
                              style={{
                                backgroundColor: active
                                  ? urgencyPill.bg
                                  : colors.secondary,
                                borderColor: active
                                  ? urgencyPill.color
                                  : colors.border,
                                borderWidth: 2,
                              }}
                              className="flex-1 rounded-2xl px-3 py-4 justify-center items-center"
                              activeOpacity={0.9}
                            >
                              <Ionicons
                                name={urgencyPill.icon as any}
                                size={18}
                                color={
                                  active ? urgencyPill.color : colors.textSecondary
                                }
                              />
                              <Text
                                style={{
                                  color: active
                                    ? urgencyPill.color
                                    : colors.textSecondary,
                                }}
                                className="font-jakarta-semibold text-xs mt-1"
                              >
                                {urgencyPill.text}
                              </Text>
                            </TouchableOpacity>
                          );
                        }
                      )}
                    </View>
                  </View>

                  <View className="mb-5">
                    <Text
                      style={{ color: colors.textPrimary }}
                      className="text-sm font-jakarta-semibold mb-2"
                    >
                      {i18n.t(
                        "enterprise.messages.conversationDetail.offerForm.expirationDate"
                      )}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        if (Platform.OS === "ios") {
                          const nextDate = callForm.expiresAt
                            ? new Date(callForm.expiresAt)
                            : new Date(Date.now() + 60 * 60 * 1000);
                          setTempPickerDate(nextDate);
                          setCallModalVisible(false);
                          setTimeout(() => setShowDatePicker(true), 300);
                        } else {
                          setShowDatePicker(true);
                        }
                      }}
                      style={{
                        backgroundColor: colors.secondary,
                        borderColor: colors.border,
                      }}
                      className="rounded-2xl border-2 px-4 py-3 flex-row items-center justify-between"
                    >
                      <Text
                        style={{
                          color: callForm.expiresAt
                            ? colors.textPrimary
                            : colors.textSecondary,
                        }}
                        className="font-jakarta-medium text-base"
                      >
                        {callForm.expiresAt
                          ? new Date(callForm.expiresAt).toLocaleString("fr-FR", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : i18n.t(
                              "enterprise.messages.conversationDetail.offerForm.chooseDateTime"
                            )}
                      </Text>
                      <Ionicons name="calendar" size={18} color="#10B981" />
                    </TouchableOpacity>

                    {Platform.OS === "android" && showDatePicker && (
                      <DateTimePicker
                        value={
                          callForm.expiresAt
                            ? new Date(callForm.expiresAt)
                            : new Date(Date.now() + 60 * 60 * 1000)
                        }
                        mode="date"
                        display="default"
                        minimumDate={new Date()}
                        onChange={(
                          event: DateTimePickerEvent,
                          selectedDate?: Date
                        ) => {
                          setShowDatePicker(false);
                          if ((event as any).type === "dismissed") return;
                          const picked = selectedDate || new Date();
                          setTempExpiryDate(picked);
                          setShowTimePicker(true);
                        }}
                      />
                    )}

                    {Platform.OS === "android" && showTimePicker && (
                      <DateTimePicker
                        value={tempExpiryDate || new Date()}
                        mode="time"
                        display="default"
                        onChange={(
                          event: DateTimePickerEvent,
                          selectedTime?: Date
                        ) => {
                          setShowTimePicker(false);
                          if ((event as any).type === "dismissed") return;

                          const base = tempExpiryDate || new Date();
                          const time = selectedTime || new Date();
                          const final = new Date(base);

                          final.setHours(time.getHours(), time.getMinutes(), 0, 0);
                          setCallForm((prev) => ({
                            ...prev,
                            expiresAt: final.toISOString(),
                          }));
                          setTempExpiryDate(null);
                        }}
                      />
                    )}
                  </View>

                  <View className="mb-2">
                    <Text
                      style={{ color: colors.textPrimary }}
                      className="text-sm font-jakarta-semibold mb-2"
                    >
                      {i18n.t(
                        "enterprise.messages.conversationDetail.offerForm.specialInstructions"
                      )}
                    </Text>
                    <View
                      style={{
                        backgroundColor: colors.secondary,
                        borderColor: colors.border,
                      }}
                      className="rounded-2xl border-2 overflow-hidden"
                    >
                      <TextInput
                        value={callForm.specialInstructions}
                        onChangeText={(text) =>
                          setCallForm((prev) => ({
                            ...prev,
                            specialInstructions: text,
                          }))
                        }
                        placeholder={i18n.t(
                          "enterprise.messages.conversationDetail.offerForm.specialInstructionsPlaceholder"
                        )}
                        className="px-4 py-3 font-jakarta-medium text-base min-h-[100px]"
                        style={{ color: colors.textPrimary }}
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        textAlignVertical="top"
                      />
                    </View>
                  </View>
                </View>
              </ScrollView>

              <View
                className="px-6 py-4 flex-row gap-3"
                style={{
                  paddingBottom: Math.max(insets.bottom, 16),
                  backgroundColor: colors.card,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <TouchableOpacity
                  onPress={closeCreateCallModal}
                  style={{ backgroundColor: colors.secondary }}
                  className="flex-1 py-4 rounded-2xl justify-center items-center"
                  disabled={creatingCall}
                >
                  <Text
                    style={{ color: colors.textPrimary }}
                    className="font-jakarta-bold text-base"
                  >
                    {i18n.t("enterprise.messages.conversationDetail.cancel")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={submitCall}
                  disabled={creatingCall}
                  className="flex-1"
                  style={{
                    opacity: creatingCall ? 0.7 : 1,
                    borderRadius: 16,
                    overflow: "hidden",
                  }}
                  activeOpacity={0.9}
                >
                  <View style={{ width: "100%", paddingVertical: 16, justifyContent: "center", alignItems: "center", borderRadius: 16, backgroundColor: colors.brandPrimary }}>
                    {creatingCall ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <View className="flex-row items-center">
                        <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                        <Text className="text-white font-jakarta-bold text-base ml-2">
                          {i18n.t("enterprise.offers.calls.create.submit")}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {Platform.OS === "ios" && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setShowDatePicker(false);
            setTimeout(() => setCallModalVisible(true), 300);
          }}
        >
          <View className="flex-1 bg-black/60 justify-center items-center px-6">
            <View
              className="rounded-3xl w-full"
              style={{
                backgroundColor: colors.card,
                maxWidth: 400,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <View className="px-6 pt-6 pb-4">
                <Text
                  style={{ color: colors.textPrimary }}
                  className="text-xl font-jakarta-bold text-center mb-2"
                >
                  {i18n.t(
                    "enterprise.messages.conversationDetail.offerForm.expirationDate"
                  )}
                </Text>
                <Text
                  style={{ color: colors.textSecondary }}
                  className="text-sm font-jakarta-medium text-center"
                >
                  {i18n.t(
                    "enterprise.messages.conversationDetail.offerForm.chooseDateTimeDescription"
                  )}
                </Text>
              </View>

              <View
                style={{
                  marginHorizontal: 16,
                  borderRadius: 16,
                  overflow: "hidden",
                  backgroundColor: colors.card,
                }}
              >
                <DateTimePicker
                  value={tempPickerDate}
                  mode="datetime"
                  display="spinner"
                  minimumDate={new Date()}
                  onChange={(_, selectedDate) => {
                    if (!selectedDate) return;
                    if (selectedDate > new Date()) {
                      setTempPickerDate(selectedDate);
                    }
                  }}
                  style={{ alignSelf: "center" }}
                />
              </View>

              <View className="flex-row px-6 py-6 gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowDatePicker(false);
                    setTimeout(() => setCallModalVisible(true), 300);
                  }}
                  style={{ backgroundColor: colors.secondary }}
                  className="flex-1 py-4 rounded-2xl"
                  activeOpacity={0.8}
                >
                  <Text
                    style={{ color: colors.textPrimary }}
                    className="font-jakarta-bold text-base text-center"
                  >
                    {i18n.t("enterprise.messages.conversationDetail.cancel")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setCallForm((prev) => ({
                      ...prev,
                      expiresAt: tempPickerDate.toISOString(),
                    }));
                    setShowDatePicker(false);
                    setTimeout(() => setCallModalVisible(true), 300);
                  }}
                  className="flex-1 py-4 rounded-2xl"
                  style={{ backgroundColor: "#10B981" }}
                  activeOpacity={0.8}
                >
                  <Text className="text-white font-jakarta-bold text-base text-center">
                    {i18n.t("common.actions.understood")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {confirmVisible && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.overlay,
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 20,
              padding: 24,
              margin: 20,
              maxWidth: 400,
              width: "90%",
            }}
          >
            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: isDark ? colors.tertiary : "#FEE2E2",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="warning" size={32} color={colors.error} />
              </View>
            </View>

            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 20,
                textAlign: "center",
                marginBottom: 8,
              }}
              className="font-jakarta-bold"
            >
              {selectedDeletion?.type === "call"
                ? i18n.t("enterprise.offers.deleteModal.callTitle")
                : i18n.t("enterprise.offers.deleteModal.offerTitle")}
            </Text>

            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                textAlign: "center",
                marginBottom: 24,
              }}
              className="font-jakarta-medium"
            >
              {selectedDeletion?.type === "call"
                ? i18n.t("enterprise.offers.deleteModal.callMessage")
                : i18n.t("enterprise.offers.deleteModal.offerMessage")}
            </Text>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={closeDeleteModal}
                style={{
                  flex: 1,
                  backgroundColor: colors.tertiary,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                }}
                disabled={confirmLoading}
              >
                <Text
                  style={{ color: colors.textPrimary }}
                  className="font-jakarta-semibold"
                >
                  {i18n.t("enterprise.offers.deleteModal.cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDelete}
                style={{
                  flex: 1,
                  backgroundColor: confirmLoading
                    ? isDark
                      ? "#DC2626"
                      : "#FCA5A5"
                    : colors.error,
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                }}
                disabled={confirmLoading}
              >
                {confirmLoading ? (
                  <Text
                    style={{ color: colors.textOnBrand }}
                    className="font-jakarta-semibold"
                  >
                    {i18n.t("enterprise.offers.deleteModal.deleting")}
                  </Text>
                ) : (
                  <Text
                    style={{ color: colors.textOnBrand }}
                    className="font-jakarta-semibold"
                  >
                    {i18n.t("enterprise.offers.deleteModal.confirm")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <NotificationModal
        visible={!!notification}
        type={notification?.type || "info"}
        title={notification?.title || ""}
        message={notification?.message || ""}
        onClose={hideNotification}
      />

      {!isSubscriptionActive && (
        <LockedFeatureOverlay
          featureTitle="offre de livraison"
          teaser={"Développez votre activité\navec la livraison."}
          benefits={[
            'Émettez des offres de livraison pour vos clients',
            'Suivez vos commandes en temps réel',
            'Augmentez vos ventes grâce à la livraison rapide',
          ]}
        />
      )}
    </View>
  );
}
