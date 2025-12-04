import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NotificationModal, {
  useNotification,
} from "../../../../components/ui/NotificationModal";
import { useLocale } from "../../../../contexts/LocaleContext";
import { useTheme } from "../../../../contexts/ThemeContext";
import i18n from "../../../../i18n/i18n";
import AdvertisementService, {
  Advertisement,
} from "../../../../services/api/AdvertisementService";

// Shimmer components
const Shimmer: React.FC<{ style?: any }> = ({ style }) => {
  const { colors } = useTheme();
  const translateX = React.useRef(new Animated.Value(-150)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateX, {
          toValue: 300,
          duration: 1300,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(translateX, {
          toValue: -150,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [translateX]);
  return (
    <View style={[{ backgroundColor: colors.border, overflow: "hidden" }, style]}>
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 150,
          transform: [{ translateX }],
        }}
      >
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.65)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
    </View>
  );
};

const SkeletonDetail: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: colors.secondary }}
      className="-mt-6 rounded-t-[32px]"
      contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Image Skeleton */}
      <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="mx-4 mt-8 rounded-3xl overflow-hidden border shadow-sm">
        <Shimmer style={{ height: 224, width: "100%" }} />
        <View className="p-6 gap-4">
          <Shimmer style={{ height: 24, borderRadius: 8, width: "80%" }} />
          <Shimmer style={{ height: 16, borderRadius: 6, width: "100%" }} />
          <Shimmer style={{ height: 16, borderRadius: 6, width: "60%" }} />
          <View className="flex-row gap-2 mt-2">
            <Shimmer style={{ height: 28, borderRadius: 14, width: 80 }} />
            <Shimmer style={{ height: 28, borderRadius: 14, width: 120 }} />
          </View>
          <View style={{ borderTopColor: colors.border }} className="border-t pt-5 flex-row justify-between mt-2">
            <View className="items-center">
              <Shimmer style={{ height: 12, borderRadius: 4, width: 40 }} />
              <Shimmer
                style={{ height: 16, borderRadius: 4, width: 80, marginTop: 6 }}
              />
            </View>
            <View className="items-center">
              <Shimmer style={{ height: 12, borderRadius: 4, width: 30 }} />
              <Shimmer
                style={{ height: 16, borderRadius: 4, width: 80, marginTop: 6 }}
              />
            </View>
          </View>
          <View className="flex-row gap-4 mt-2">
            <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="flex-1 rounded-2xl p-4 border shadow-sm">
              <Shimmer style={{ height: 12, borderRadius: 4, width: 30 }} />
              <Shimmer
                style={{ height: 24, borderRadius: 6, width: 40, marginTop: 6 }}
              />
            </View>
            <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="flex-1 rounded-2xl p-4 border shadow-sm">
              <Shimmer style={{ height: 12, borderRadius: 4, width: 25 }} />
              <Shimmer
                style={{ height: 24, borderRadius: 6, width: 35, marginTop: 6 }}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Actions Skeleton */}
      <View className="mx-4 mt-6">
        <View className="flex-row gap-3">
          <Shimmer style={{ height: 56, borderRadius: 16, flex: 1 }} />
          <Shimmer style={{ height: 56, borderRadius: 16, width: 56 }} />
        </View>
      </View>
    </ScrollView>
  );
};

export default function AdvertisementDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { notification, showNotification, hideNotification } =
    useNotification();
  const { locale } = useLocale();
  const { colors } = useTheme();
  const [ad, setAd] = useState<Advertisement | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    type: "pause" | "delete" | "activate";
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
  } | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await AdvertisementService.getById(id);
      setAd(data);
    } catch (e: any) {
      showNotification(
        "error",
        i18n.t("enterprise.advertisementDetail.loading.error"),
        i18n.t("enterprise.advertisementDetail.loading.message")
      );
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, showNotification]);

  const loadRef = useRef(load);

  // Update ref when load changes
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      loadRef.current();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
  };

  const showConfirmation = (type: "pause" | "delete" | "activate") => {
    let title = "";
    let message = "";
    let confirmText = "";
    let confirmColor = "";

    switch (type) {
      case "pause":
        title = i18n.t("enterprise.advertisementDetail.confirmations.pause.title");
        message = i18n.t("enterprise.advertisementDetail.confirmations.pause.message");
        confirmText = i18n.t("enterprise.advertisementDetail.confirmations.pause.confirm");
        confirmColor = "#F59E0B";
        break;
      case "delete":
        title = i18n.t("enterprise.advertisementDetail.confirmations.delete.title");
        message = i18n.t("enterprise.advertisementDetail.confirmations.delete.message");
        confirmText = i18n.t("enterprise.advertisementDetail.confirmations.delete.confirm");
        confirmColor = "#EF4444";
        break;
      case "activate":
        title = i18n.t("enterprise.advertisementDetail.confirmations.activate.title");
        message = i18n.t("enterprise.advertisementDetail.confirmations.activate.message");
        confirmText = i18n.t("enterprise.advertisementDetail.confirmations.activate.confirm");
        confirmColor = "#10B981";
        break;
    }

    setConfirmationAction({ type, title, message, confirmText, confirmColor });
    setConfirmationVisible(true);
  };

  const closeConfirmation = () => {
    setConfirmationVisible(false);
    setConfirmationAction(null);
  };

  const executeConfirmedAction = async () => {
    if (!confirmationAction || !ad) return;

    const { type } = confirmationAction;
    closeConfirmation();

    try {
      switch (type) {
        case "pause":
          const pauseRes = await AdvertisementService.deactivate(ad._id);
          setAd(pauseRes);
          break;
        case "delete":
          await AdvertisementService.delete(ad._id);
          showNotification(
            "success",
            i18n.t("enterprise.advertisementDetail.success.deleted"),
            i18n.t("enterprise.advertisementDetail.success.deletedMessage")
          );
          router.back();
          break;
        case "activate":
          const activateRes = await AdvertisementService.activate(ad._id);
          setAd(activateRes);
          break;
      }
    } catch (err: any) {
      showNotification("error", i18n.t("enterprise.advertisementDetail.errors.generic"), err?.message || i18n.t("enterprise.advertisementDetail.errors.actionFailed"));
    }
  };

  const statusInfo = React.useMemo(() => {
    if (!ad) return null;
    const now = Date.now();
    const end = new Date(ad.endDate).getTime();
    let label = i18n.t("enterprise.advertisementDetail.status.active");
    let color = "#047857";
    if (end < now) {
      label = i18n.t("enterprise.advertisementDetail.status.expired");
      color = "#6B7280";
    } else if (!ad.isActive) {
      label = i18n.t("enterprise.advertisementDetail.status.paused");
      color = "#B45309";
    }
    return { label, color };
  }, [ad]);

  return (
    <View className="flex-1 bg-background-secondary">
      <ExpoStatusBar style="light" translucent />
      <LinearGradient
        colors={["#047857", "#10B981"]}
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
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text
            className="text-xl font-quicksand-bold text-white"
            numberOfLines={1}
          >
            {i18n.t("enterprise.advertisementDetail.header.title")}
          </Text>
          <View className="w-10 h-10" />
        </View>
      </LinearGradient>

      {loading ? (
        <SkeletonDetail />
      ) : !ad ? null : (
        <ScrollView
          style={{ backgroundColor: colors.secondary }}
          className="-mt-6 rounded-t-[32px]"
          contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#10B981"]}
              tintColor="#10B981"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Image */}
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="mx-4 mt-8 rounded-3xl overflow-hidden border shadow-sm">
            {ad.images && ad.images.length > 0 ? (
              <View className="relative">
                <Image
                  source={{ uri: ad.images[0] }}
                  className="w-full h-56"
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.3)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  className="absolute inset-0"
                />
                {statusInfo && (
                  <View className="absolute top-4 left-4 px-3 py-1.5 rounded-full backdrop-blur-md bg-white/90 shadow-sm">
                    <Text
                      className="text-xs font-quicksand-bold"
                      style={{ color: statusInfo.color }}
                    >
                      {statusInfo.label}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={{ backgroundColor: colors.secondary, borderBottomColor: colors.border }} className="w-full h-56 items-center justify-center border-b">
                <Ionicons name="image-outline" size={48} color={colors.textSecondary} />
              </View>
            )}
            <View className="p-6">
              <Text
                className="text-xl font-quicksand-bold leading-7"
                style={{ color: colors.textPrimary }}
                numberOfLines={3}
              >
                {ad.title}
              </Text>
              <Text className="mt-3 font-quicksand-medium leading-relaxed text-base" style={{ color: colors.textSecondary }}>
                {ad.description}
              </Text>
              <View className="mt-6 flex-row flex-wrap gap-2">
                <View style={{ backgroundColor: colors.secondary, borderColor: colors.border }} className="px-3.5 py-1.5 rounded-full border">
                  <Text className="font-quicksand-bold text-xs" style={{ color: colors.textPrimary }}>
                    {ad.type}
                  </Text>
                </View>
                <View style={{ backgroundColor: colors.secondary, borderColor: colors.border }} className="px-3.5 py-1.5 rounded-full border">
                  <Text className="font-quicksand-bold text-xs" style={{ color: colors.textPrimary }}>
                    Audience: {ad.targetAudience}
                  </Text>
                </View>
              </View>
              <View style={{ borderTopColor: colors.border }} className="mt-6 border-t pt-5 flex-row justify-between">
                <View>
                  <Text className="text-xs font-quicksand-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                    {i18n.t("enterprise.advertisementDetail.info.start")}
                  </Text>
                  <Text className="text-base font-quicksand-bold mt-1" style={{ color: colors.textPrimary }}>
                    {new Date(ad.startDate).toLocaleString("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-xs font-quicksand-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                    {i18n.t("enterprise.advertisementDetail.info.end")}
                  </Text>
                  <Text className="text-base font-quicksand-bold mt-1" style={{ color: colors.textPrimary }}>
                    {new Date(ad.endDate).toLocaleString("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </Text>
                </View>
              </View>
              <View className="mt-6 flex-row gap-4">
                <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="flex-1 rounded-2xl p-4 border shadow-sm">
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name="eye-outline"
                      size={16}
                      color="#059669"
                      style={{ marginRight: 6 }}
                    />
                    <Text className="text-xs font-quicksand-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                      {i18n.t("enterprise.advertisementDetail.info.views")}
                    </Text>
                  </View>
                  <Text className="text-2xl font-quicksand-bold" style={{ color: colors.textPrimary }}>
                    {ad.views ?? 0}
                  </Text>
                </View>
                <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="flex-1 rounded-2xl p-4 border shadow-sm">
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name="finger-print-outline"
                      size={16}
                      color="#D97706"
                      style={{ marginRight: 6 }}
                    />
                    <Text className="text-xs font-quicksand-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                      {i18n.t("enterprise.advertisementDetail.info.clicks")}
                    </Text>
                  </View>
                  <Text className="text-2xl font-quicksand-bold" style={{ color: colors.textPrimary }}>
                    {ad.clicks ?? 0}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View className="mx-4 mt-6">
            <View className="flex-row gap-4">
              {ad.isActive ? (
                <TouchableOpacity
                  onPress={() => showConfirmation("pause")}
                  className="flex-1 rounded-2xl py-4 items-center shadow-lg"
                  style={{ backgroundColor: "#F59E0B", shadowColor: "#F59E0B" }}
                  activeOpacity={0.8}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name="pause"
                      size={20}
                      color="#FFFFFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text className="text-white font-quicksand-bold text-base">
                      {i18n.t("enterprise.advertisementDetail.actions.pause")}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => showConfirmation("activate")}
                  className="flex-1 rounded-2xl py-4 items-center shadow-lg"
                  style={{ backgroundColor: "#10B981", shadowColor: "#10B981" }}
                  activeOpacity={0.8}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name="play"
                      size={20}
                      color="#FFFFFF"
                      style={{ marginRight: 8 }}
                    />
                    <Text className="text-white font-quicksand-bold text-base">
                      {i18n.t("enterprise.advertisementDetail.actions.activate")}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => showConfirmation("delete")}
                className="w-16 rounded-2xl items-center justify-center shadow-lg"
                style={{ backgroundColor: "#EF4444", shadowColor: "#EF4444" }}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Modern Confirmation Modal */}
      <Modal
        visible={confirmationVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeConfirmation}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={closeConfirmation}
        >
          <View className="flex-1 justify-center items-center px-6">
            <TouchableOpacity
              style={{ backgroundColor: colors.card }}
              className="rounded-3xl w-full max-w-sm"
              activeOpacity={1}
              onPress={() => {}}
            >
              {/* Icon */}
              <View className="items-center pt-8 pb-4">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: confirmationAction?.confirmColor + "20",
                  }}
                >
                  <Ionicons
                    name={
                      confirmationAction?.type === "delete"
                        ? "trash"
                        : confirmationAction?.type === "pause"
                        ? "pause"
                        : "play"
                    }
                    size={28}
                    color={confirmationAction?.confirmColor}
                  />
                </View>
              </View>

              {/* Content */}
              <View className="px-6 pb-6">
                <Text className="text-xl font-quicksand-bold text-center mb-2" style={{ color: colors.textPrimary }}>
                  {confirmationAction?.title}
                </Text>
                <Text className="text-base font-quicksand-medium text-center leading-5" style={{ color: colors.textSecondary }}>
                  {confirmationAction?.message}
                </Text>
              </View>

              {/* Actions */}
              <View className="flex-row px-6 pb-6 gap-3">
                <TouchableOpacity
                  onPress={closeConfirmation}
                  style={{ backgroundColor: colors.secondary }}
                  className="flex-1 py-4 rounded-2xl items-center"
                >
                  <Text className="text-base font-quicksand-semibold" style={{ color: colors.textPrimary }}>
                    {i18n.t("enterprise.advertisementDetail.buttons.cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={executeConfirmedAction}
                  className="flex-1 py-4 rounded-2xl items-center"
                  style={{ backgroundColor: confirmationAction?.confirmColor }}
                >
                  <Text className="text-base font-quicksand-semibold text-white">
                    {confirmationAction?.confirmText}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Notification Modal */}
      {notification && (
        <NotificationModal
          visible={notification.visible}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={hideNotification}
        />
      )}
    </View>
  );
}
