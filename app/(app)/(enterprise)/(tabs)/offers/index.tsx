import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
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
import NotificationModal, {
  useNotification,
} from "../../../../../components/ui/NotificationModal";
import { useLocale } from "../../../../../contexts/LocaleContext";
import { useTheme } from "../../../../../contexts/ThemeContext";
import i18n from "../../../../../i18n/i18n";
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
  {
    id: "EXPIRED" as const,
    label: i18n.t("enterprise.offers.filters.expired"),
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
  const FILTERS = getFilters();
  const VIEW_MODES = getViewModes();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 360;
  const isTablet = width >= 768;
  const barBaseHeight = isTablet ? 68 : isSmallPhone ? 58 : 62;
  const bottomSpacer = barBaseHeight + insets.bottom + 16;

  const [viewMode, setViewMode] = useState<ViewMode>("CALLS");
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [offers, setOffers] = useState<DeliveryOffer[]>([]);
  const [calls, setCalls] = useState<DeliveryCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { notification, showNotification, hideNotification } =
    useNotification();

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempExpiryDate, setTempExpiryDate] = useState<Date | null>(null);
  const [tempPickerDate, setTempPickerDate] = useState<Date>(
    new Date(Date.now() + 60 * 60 * 1000)
  );

  const activeItems = viewMode === "OFFERS" ? offers : calls;

  const fetchItems = useCallback(
    async (withSpinner = true) => {
      try {
        if (withSpinner) setLoading(true);
        setError(null);

        const status = filter === "ALL" ? undefined : filter;

        if (viewMode === "OFFERS") {
          const list = await DeliveryService.listEnterpriseOffers(status);
          setOffers(list);
        } else {
          const list = await DeliveryService.listEnterpriseCalls(status);
          setCalls(list);
        }
      } catch (e: any) {
        setError(e.message || i18n.t("enterprise.offers.error.loadError"));
      } finally {
        if (withSpinner) setLoading(false);
      }
    },
    [filter, viewMode]
  );

  useEffect(() => {
    fetchItems(true);
  }, [fetchItems]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchItems(false);
    } finally {
      setRefreshing(false);
    }
  }, [fetchItems]);

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

      const createdCall = await DeliveryService.createCall(payload);

      setCalls((prev) =>
        matchesFilter(createdCall.status, filter)
          ? [createdCall, ...prev.filter((call) => call._id !== createdCall._id)]
          : prev
      );

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
        setOffers((prev) => prev.filter((offer) => offer._id !== selectedDeletion.id));
        showNotification(
          "success",
          i18n.t("enterprise.offers.deleteModal.offerSuccessTitle"),
          i18n.t("enterprise.offers.deleteModal.offerSuccessMessage")
        );
      } else {
        await DeliveryService.deleteCall(selectedDeletion.id);
        setCalls((prev) => prev.filter((call) => call._id !== selectedDeletion.id));
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

  const ShimmerBlock = ({ style }: { style?: any }) => {
    const shimmer = useRef(new Animated.Value(0)).current;

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
      <View
        style={[
          {
            backgroundColor: isDark ? colors.tertiary : "#E5E7EB",
            overflow: "hidden",
          },
          style,
        ]}
      >
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: 120,
            transform: [{ translateX }],
            backgroundColor: isDark
              ? "rgba(255,255,255,0.05)"
              : "rgba(255,255,255,0.35)",
            opacity: 0.7,
          }}
        />
      </View>
    );
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
          <ShimmerBlock style={{ width: 40, height: 40, borderRadius: 12 }} />
          <View className="ml-3 flex-1">
            <ShimmerBlock
              style={{
                height: 16,
                borderRadius: 8,
                width: "70%",
                marginBottom: 6,
              }}
            />
            <ShimmerBlock style={{ height: 12, borderRadius: 6, width: "45%" }} />
          </View>
        </View>
        <ShimmerBlock style={{ height: 24, borderRadius: 12, width: 90 }} />
      </View>

      <ShimmerBlock style={{ height: 12, borderRadius: 6, width: "100%", marginBottom: 8 }} />
      <ShimmerBlock style={{ height: 12, borderRadius: 6, width: "82%", marginBottom: 16 }} />

      <View
        style={{ borderTopColor: colors.border }}
        className="flex-row items-center justify-between pt-3 border-t"
      >
        <ShimmerBlock style={{ height: 18, borderRadius: 8, width: 100 }} />
        <ShimmerBlock style={{ height: 34, borderRadius: 10, width: 96 }} />
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
      case "EXPIRED":
      default:
        return {
          color: "#6B7280",
          bg: "#F3F4F6",
          text: i18n.t("enterprise.offers.status.expired"),
          icon: "time",
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
                className="text-sm font-quicksand-semibold"
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
              className="text-xs font-quicksand-semibold ml-1"
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
              className="text-sm font-quicksand-medium"
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
              className="text-sm font-quicksand-semibold"
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
            className="text-base font-quicksand-bold"
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
                className="text-sm font-quicksand-semibold"
                style={{ color: colors.error }}
              >
                {i18n.t("enterprise.offers.labels.delete")}
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
                className="text-base font-quicksand-bold"
                numberOfLines={1}
              >
                {item.productName}
              </Text>
              <Text
                style={{ color: colors.textSecondary }}
                className="text-sm font-quicksand-medium mt-1"
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
              className="text-xs font-quicksand-semibold ml-1"
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
              className="text-xs font-quicksand-semibold ml-1"
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
              className="text-xs font-quicksand-semibold ml-1"
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
                className="text-xs font-quicksand-medium"
              >
                {i18n.t("enterprise.offers.calls.labels.pickup")}
              </Text>
              <Text
                style={{ color: colors.textPrimary }}
                className="text-sm font-quicksand-semibold"
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
                className="text-xs font-quicksand-medium"
              >
                {i18n.t("enterprise.offers.calls.labels.delivery")}
              </Text>
              <Text
                style={{ color: colors.textPrimary }}
                className="text-sm font-quicksand-semibold"
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
                className="text-xs font-quicksand-medium"
              >
                {i18n.t("enterprise.offers.calls.labels.customerInfo")}
              </Text>
              <Text
                style={{ color: colors.textPrimary }}
                className="text-sm font-quicksand-semibold"
              >
                {customerInfo.name || i18n.t("enterprise.offers.calls.labels.noCustomerName")}
              </Text>
              {!!customerInfo.phone && (
                <Text
                  style={{ color: colors.textSecondary }}
                  className="text-xs font-quicksand-medium mt-1"
                >
                  {customerInfo.phone}
                </Text>
              )}
              {!customerInfo.phone && (
                <Text
                  style={{ color: colors.textSecondary }}
                  className="text-xs font-quicksand-medium mt-1"
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
              className="text-xs font-quicksand-medium mb-1"
            >
              {i18n.t(
                "enterprise.messages.conversationDetail.offerForm.specialInstructions"
              )}
            </Text>
            <Text
              style={{ color: colors.textPrimary }}
              className="text-sm font-quicksand-medium"
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
            className="text-base font-quicksand-bold"
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
                className="text-sm font-quicksand-semibold"
                style={{ color: colors.error }}
              >
                {i18n.t("enterprise.offers.labels.delete")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <LinearGradient
      colors={[colors.brandGradientStart, colors.brandGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      className="rounded-b-3xl shadow-md"
      style={{
        paddingTop: insets.top + 16,
        paddingLeft: insets.left + 24,
        paddingRight: insets.right + 24,
        paddingBottom: 16,
      }}
    >
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-1 mr-3">
          <Text className="text-2xl font-quicksand-bold text-white">
            {i18n.t("enterprise.offers.title")}
          </Text>
          <Text className="text-white/80 font-quicksand-medium text-sm mt-1">
            {viewMode === "CALLS"
              ? i18n.t("enterprise.offers.calls.subtitle")
              : i18n.t("enterprise.offers.offersSubtitle")}
          </Text>
        </View>

        {viewMode === "CALLS" && (
          <TouchableOpacity
            onPress={openCreateCallModal}
            className="w-11 h-11 rounded-2xl justify-center items-center"
            style={{
              backgroundColor: isDark
                ? "rgba(255,255,255,0.18)"
                : "rgba(255,255,255,0.22)",
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 6 }}
        className="mb-3"
      >
        {VIEW_MODES.map((mode) => (
          <TouchableOpacity
            key={mode.id}
            onPress={() => setViewMode(mode.id)}
            style={{
              backgroundColor:
                viewMode === mode.id
                  ? isDark
                    ? "rgba(255,255,255,0.24)"
                    : "rgba(255,255,255,0.30)"
                  : isDark
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(255,255,255,0.18)",
            }}
            className="mr-2 px-4 py-3 rounded-2xl flex-row items-center"
            activeOpacity={0.8}
          >
            <Ionicons name={mode.icon as any} size={16} color="white" />
            <Text className="text-sm font-quicksand-semibold text-white ml-2">
              {mode.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 6 }}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            onPress={() => setFilter(f.id)}
            style={{
              backgroundColor:
                filter === f.id
                  ? isDark
                    ? "rgba(255,255,255,0.24)"
                    : "rgba(255,255,255,0.30)"
                  : isDark
                    ? "rgba(255,255,255,0.12)"
                    : "rgba(255,255,255,0.18)",
            }}
            className="mr-2 px-4 py-2 rounded-full"
            activeOpacity={0.8}
          >
            <Text className="text-sm font-quicksand-medium text-white">
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View className="flex-row justify-between items-center mt-4">
        <Text className="text-white/80 font-quicksand-medium text-sm">
          {activeItems.length}{" "}
          {viewMode === "CALLS"
            ? activeItems.length !== 1
              ? i18n.t("enterprise.offers.count.callsPlural")
              : i18n.t("enterprise.offers.count.calls")
            : activeItems.length !== 1
              ? i18n.t("enterprise.offers.count.offersPlural")
              : i18n.t("enterprise.offers.count.offers")}
        </Text>
      </View>
    </LinearGradient>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.secondary }}>
        <ExpoStatusBar style="light" translucent />
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
        <ExpoStatusBar style="light" translucent />
        {renderHeader()}
        <View
          style={{ flex: 1, backgroundColor: colors.primary }}
          className="justify-center items-center px-6"
        >
          <Ionicons name="warning" size={80} color={colors.error} />
          <Text
            style={{ color: colors.textPrimary }}
            className="font-quicksand-bold text-lg mt-4 mb-2"
          >
            {i18n.t("enterprise.offers.error.title")}
          </Text>
          <Text
            style={{ color: colors.textSecondary }}
            className="font-quicksand-medium text-center mt-1"
          >
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => fetchItems(true)}
            style={{ backgroundColor: colors.brandPrimary }}
            className="mt-4 rounded-xl px-4 py-2"
          >
            <Text
              style={{ color: colors.textOnBrand }}
              className="font-quicksand-semibold"
            >
              {i18n.t("enterprise.offers.error.retry")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      <ExpoStatusBar style="light" translucent />
      {renderHeader()}

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
                className="text-xl font-quicksand-bold mt-4 mb-2 text-center"
              >
                {viewMode === "CALLS"
                  ? i18n.t("enterprise.offers.calls.empty.title")
                  : i18n.t("enterprise.offers.empty.title")}
              </Text>
              <Text
                style={{ color: colors.textSecondary }}
                className="text-center font-quicksand-medium"
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
                  <Text className="text-white font-quicksand-bold ml-2">
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
            behavior={Platform.OS === "ios" ? "padding" : undefined}
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
                    className="text-xl font-quicksand-bold"
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
                  className="font-quicksand-medium"
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
                      className="text-sm font-quicksand-semibold mb-2"
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
                        className="px-4 py-3 font-quicksand-medium text-base"
                        style={{ color: colors.textPrimary }}
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>

                  <View className="mb-5">
                    <Text
                      style={{ color: colors.textPrimary }}
                      className="text-sm font-quicksand-semibold mb-2"
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
                        className="px-4 py-3 font-quicksand-medium text-base min-h-[96px]"
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
                      className="text-sm font-quicksand-semibold mb-2"
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
                        className="px-4 py-3 font-quicksand-medium text-base"
                        style={{ color: colors.textPrimary }}
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>

                  <View className="mb-5">
                    <Text
                      style={{ color: colors.textPrimary }}
                      className="text-sm font-quicksand-semibold mb-2"
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
                        className="px-4 py-3 font-quicksand-medium text-base"
                        style={{ color: colors.textPrimary }}
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>

                  <View className="mb-5">
                    <Text
                      style={{ color: colors.textPrimary }}
                      className="text-sm font-quicksand-semibold mb-2"
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
                        className="px-4 py-3 font-quicksand-medium text-base"
                        style={{ color: colors.textPrimary }}
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>

                  <View className="mb-5">
                    <Text
                      style={{ color: colors.textPrimary }}
                      className="text-sm font-quicksand-semibold mb-2"
                    >
                      {i18n.t("enterprise.offers.calls.form.customerPhone")}
                    </Text>
                    <View
                      style={{
                        backgroundColor: colors.secondary,
                        borderColor: colors.border,
                      }}
                      className="rounded-2xl border-2 overflow-hidden"
                    >
                      <TextInput
                        value={callForm.customerPhone}
                        onChangeText={(text) =>
                          setCallForm((prev) => ({
                            ...prev,
                            customerPhone: text,
                          }))
                        }
                        placeholder={i18n.t(
                          "enterprise.offers.calls.form.customerPhonePlaceholder"
                        )}
                        keyboardType="phone-pad"
                        className="px-4 py-3 font-quicksand-medium text-base"
                        style={{ color: colors.textPrimary }}
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>

                  <View className="mb-5">
                    <Text
                      style={{ color: colors.textPrimary }}
                      className="text-sm font-quicksand-semibold mb-2"
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
                        className="px-4 py-3 font-quicksand-medium text-base"
                        style={{ color: colors.textPrimary }}
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>

                  <View className="mb-5">
                    <Text
                      style={{ color: colors.textPrimary }}
                      className="text-sm font-quicksand-semibold mb-3"
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
                                className="font-quicksand-semibold text-xs mt-1"
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
                      className="text-sm font-quicksand-semibold mb-2"
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
                        className="font-quicksand-medium text-base"
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
                      className="text-sm font-quicksand-semibold mb-2"
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
                        className="px-4 py-3 font-quicksand-medium text-base min-h-[100px]"
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
                    className="font-quicksand-bold text-base"
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
                  <LinearGradient
                    colors={["#10B981", "#059669"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: "100%",
                      paddingVertical: 16,
                      justifyContent: "center",
                      alignItems: "center",
                      borderRadius: 16,
                    }}
                  >
                    {creatingCall ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <View className="flex-row items-center">
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#FFFFFF"
                        />
                        <Text className="text-white font-quicksand-bold text-base ml-2">
                          {i18n.t("enterprise.offers.calls.create.submit")}
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
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
                  className="text-xl font-quicksand-bold text-center mb-2"
                >
                  {i18n.t(
                    "enterprise.messages.conversationDetail.offerForm.expirationDate"
                  )}
                </Text>
                <Text
                  style={{ color: colors.textSecondary }}
                  className="text-sm font-quicksand-medium text-center"
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
                    className="font-quicksand-bold text-base text-center"
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
                  <Text className="text-white font-quicksand-bold text-base text-center">
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
              className="font-quicksand-bold"
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
              className="font-quicksand-medium"
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
                  className="font-quicksand-semibold"
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
                    className="font-quicksand-semibold"
                  >
                    {i18n.t("enterprise.offers.deleteModal.deleting")}
                  </Text>
                ) : (
                  <Text
                    style={{ color: colors.textOnBrand }}
                    className="font-quicksand-semibold"
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
    </View>
  );
}
