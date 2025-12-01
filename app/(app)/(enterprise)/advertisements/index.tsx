import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NotificationModal, {
  useNotification,
} from "../../../../components/ui/NotificationModal";
import { useLocale } from "../../../../contexts/LocaleContext";
import i18n from "../../../../i18n/i18n";
import AdvertisementService, {
  Advertisement,
} from "../../../../services/api/AdvertisementService";

interface UIAd {
  id: string;
  title: string;
  status: "active" | "paused" | "expired";
  preview?: string;
  createdAt: string;
  raw: Advertisement;
}

const statusStyles: Record<
  UIAd["status"],
  { label: string; bg: string; text: string }
> = {
  active: { label: "Active", bg: "#D1FAE5", text: "#047857" },
  paused: { label: "Coupée", bg: "#FEF3C7", text: "#B45309" },
  expired: { label: "Expirée", bg: "#F3F4F6", text: "#6B7280" },
};

function mapToUI(ad: Advertisement): UIAd {
  const expired = new Date(ad.endDate).getTime() < Date.now();
  return {
    id: ad._id,
    title: ad.title,
    status: expired ? "expired" : ad.isActive ? "active" : "paused",
    preview: ad.images && ad.images.length > 0 ? ad.images[0] : undefined,
    createdAt: ad.createdAt,
    raw: ad,
  };
}

// Shimmer components
const Shimmer: React.FC<{ style?: any }> = ({ style }) => {
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
    <View style={[{ backgroundColor: "#E5E7EB", overflow: "hidden" }, style]}>
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

const SkeletonCard: React.FC = () => (
  <View className="bg-white rounded-3xl overflow-hidden mb-5 border border-neutral-100 shadow-sm">
    <Shimmer style={{ height: 160, width: "100%" }} />
    <View className="p-5 gap-3">
      <View className="flex-row justify-between items-center">
        <Shimmer style={{ height: 20, borderRadius: 6, width: "60%" }} />
        <Shimmer style={{ height: 32, borderRadius: 16, width: 32 }} />
      </View>
      <Shimmer style={{ height: 14, borderRadius: 4, width: "40%" }} />
    </View>
  </View>
);

export default function EnterpriseAdvertisements() {
  const insets = useSafeAreaInsets();
  const { locale } = useLocale();
  const { notification, showNotification, hideNotification } =
    useNotification();
  const [ads, setAds] = useState<UIAd[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | UIAd["status"]>(
    "all"
  );
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedAd, setSelectedAd] = useState<UIAd | null>(null);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    type: "pause" | "delete" | "activate";
    ad: UIAd;
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
  } | null>(null);

  const loadPage = useCallback(
    async (requestedPage = 1, replace = false, isRefreshing = false) => {
      try {
        if (requestedPage === 1 && !isRefreshing) setInitialLoading(true);
        const res = await AdvertisementService.listMine(requestedPage, 10);
        const mapped = res.advertisements.map(mapToUI);
        setPages(res.pagination.pages || 1);
        setPage(res.pagination.page || requestedPage);
        setAds((prev) => (replace ? mapped : [...prev, ...mapped]));
      } catch (e: any) {
        showNotification(
          "error",
          i18n.t("enterprise.advertisements.errors.loading"),
          e?.message || i18n.t("enterprise.advertisements.errors.loadingMessage")
        );
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
        setFetchingMore(false);
      }
    },
    [showNotification]
  );

  const loadPageRef = useRef(loadPage);

  // Update ref when loadPage changes
  useEffect(() => {
    loadPageRef.current = loadPage;
  }, [loadPage]);

  useFocusEffect(
    useCallback(() => {
      loadPageRef.current(1, true);
    }, [])
  );

  const filteredAds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ads.filter((ad) => {
      const okStatus =
        filterStatus === "all" ? true : ad.status === filterStatus;
      const okQuery =
        q.length === 0 ? true : ad.title.toLowerCase().includes(q);
      return okStatus && okQuery;
    });
  }, [ads, searchQuery, filterStatus]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPage(1, true, true);
  };

  const handlePauseAd = (ad: UIAd) => {
    showConfirmation("pause", ad);
  };

  const handleDeleteAd = (ad: UIAd) => {
    showConfirmation("delete", ad);
  };

  const handleActivateAd = (ad: UIAd) => {
    showConfirmation("activate", ad);
  };

  const executeConfirmedAction = async () => {
    if (!confirmationAction) return;

    const { type, ad } = confirmationAction;
    closeConfirmation();

    try {
      switch (type) {
        case "pause":
          const pauseRes = await AdvertisementService.deactivate(ad.id);
          setAds((prev) =>
            prev.map((a) => (a.id === ad.id ? mapToUI(pauseRes) : a))
          );
          break;
        case "delete":
          await AdvertisementService.delete(ad.id);
          setAds((prev) => prev.filter((a) => a.id !== ad.id));
          break;
        case "activate":
          const activateRes = await AdvertisementService.activate(ad.id);
          setAds((prev) =>
            prev.map((a) => (a.id === ad.id ? mapToUI(activateRes) : a))
          );
          break;
      }
    } catch (err: any) {
      showNotification("error", i18n.t("enterprise.advertisements.errors.action"), err?.message || i18n.t("enterprise.advertisements.errors.actionMessage"));
    }
  };

  const handleCreateAd = () => {
    router.push("/(app)/(enterprise)/advertisements/create");
  };

  const openMenu = (ad: UIAd) => {
    setSelectedAd(ad);
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setSelectedAd(null);
  };

  const showConfirmation = (
    type: "pause" | "delete" | "activate",
    ad: UIAd
  ) => {
    let title = "";
    let message = "";
    let confirmText = "";
    let confirmColor = "";

    switch (type) {
      case "pause":
        title = i18n.t("enterprise.advertisements.confirmations.pause.title");
        message = i18n.t("enterprise.advertisements.confirmations.pause.message");
        confirmText = i18n.t("enterprise.advertisements.confirmations.pause.confirm");
        confirmColor = "#F59E0B";
        break;
      case "delete":
        title = i18n.t("enterprise.advertisements.confirmations.delete.title");
        message = i18n.t("enterprise.advertisements.confirmations.delete.message");
        confirmText = i18n.t("enterprise.advertisements.confirmations.delete.confirm");
        confirmColor = "#EF4444";
        break;
      case "activate":
        title = i18n.t("enterprise.advertisements.confirmations.activate.title");
        message = i18n.t("enterprise.advertisements.confirmations.activate.message");
        confirmText = i18n.t("enterprise.advertisements.confirmations.activate.confirm");
        confirmColor = "#10B981";
        break;
    }

    setConfirmationAction({
      type,
      ad,
      title,
      message,
      confirmText,
      confirmColor,
    });
    setConfirmationVisible(true);
  };

  const closeConfirmation = () => {
    setConfirmationVisible(false);
    setConfirmationAction(null);
  };

  const renderAd = ({ item }: { item: UIAd }) => {
    const style = statusStyles[item.status];
    return (
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/(app)/(enterprise)/advertisements/[id]",
            params: { id: item.id },
          } as any)
        }
        className="bg-white rounded-3xl overflow-hidden mb-5 border border-neutral-100 shadow-sm"
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`${i18n.t("enterprise.advertisements.card.open")} ${item.title}`}
      >
        {item.preview ? (
          <View className="relative">
            <Image
              source={{ uri: item.preview }}
              className="w-full h-40"
              resizeMode="cover"
            />
            <LinearGradient
              colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.4)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              className="absolute inset-0"
            />
            <View className="absolute top-4 left-4 px-2.5 py-1 rounded-full backdrop-blur-md bg-white/90 shadow-sm">
              <Text
                style={{
                  fontFamily: "Quicksand-Bold",
                  fontSize: 11,
                  color: style.text,
                }}
              >
                {style.label}
              </Text>
            </View>
          </View>
        ) : (
          <View className="w-full h-40 bg-neutral-50 items-center justify-center border-b border-neutral-100">
            <Ionicons name="image-outline" size={32} color="#9CA3AF" />
          </View>
        )}

        <View className="p-5">
          <View className="flex-row items-start justify-between">
            <Text
              className="flex-1 text-lg font-quicksand-bold text-neutral-800 mr-4 leading-6"
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <TouchableOpacity
              onPress={() => openMenu(item)}
              className="w-8 h-8 rounded-full bg-neutral-50 items-center justify-center border border-neutral-100"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-horizontal" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center mt-3">
            <Ionicons
              name="calendar-outline"
              size={14}
              color="#9CA3AF"
              style={{ marginRight: 6 }}
            />
            <Text className="text-xs font-quicksand-medium text-neutral-500">
              {i18n.t("enterprise.advertisements.card.created")}{" "}
              {new Date(item.createdAt).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
          <Text className="text-xl font-quicksand-bold text-white">
            {i18n.t("enterprise.advertisements.title")}
          </Text>
          <View className="w-10 h-10" />
        </View>

        <View className="mt-8">
          <TouchableOpacity
            onPress={handleCreateAd}
            className="w-full bg-white rounded-2xl py-3.5 flex-row items-center justify-center shadow-lg shadow-black/10"
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color="#059669" />
            <Text className="text-emerald-700 font-quicksand-bold ml-2 text-sm">
              {i18n.t("enterprise.advertisements.create")}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mt-6">
          <View className="relative">
            <View className="absolute left-4 top-3.5 z-10">
              <Ionicons name="search" size={20} color="#9CA3AF" />
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={i18n.t("enterprise.advertisements.search.placeholder")}
              style={{ fontFamily: "Quicksand-Medium" }}
              className="bg-white rounded-2xl pl-12 pr-10 py-3.5 text-neutral-800 text-sm shadow-sm"
              placeholderTextColor="#9CA3AF"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                className="absolute right-3 top-3"
                onPress={() => setSearchQuery("")}
              >
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      <View
        className="flex-1 -mt-6 rounded-t-[32px] bg-background-secondary px-4 pt-8"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        {initialLoading ? (
          <View
            className="-mt-2"
            accessibilityLabel={i18n.t("enterprise.advertisements.search.loading")}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </View>
        ) : (
          <FlatList
            data={filteredAds}
            keyExtractor={(item) => item.id}
            renderItem={renderAd}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#10B981"]}
                tintColor="#10B981"
              />
            }
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (!fetchingMore && page < pages) {
                setFetchingMore(true);
                loadPage(page + 1);
              }
            }}
            ListHeaderComponent={
              <View className="mb-6">
                <Text className="text-neutral-400 font-quicksand-bold text-xs uppercase tracking-wider mb-3">
                  {i18n.t("enterprise.advertisements.summary.title")}
                </Text>
                <View className="flex-row gap-3">
                  <View className="flex-1 bg-white rounded-2xl p-4 border border-neutral-100 shadow-sm">
                    <View className="flex-row items-center mb-2">
                      <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                      <Text className="text-xs text-neutral-500 font-quicksand-bold">
                        {i18n.t("enterprise.advertisements.summary.active")}
                      </Text>
                    </View>
                    <Text className="text-2xl font-quicksand-bold text-neutral-800">
                      {ads.filter((a) => a.status === "active").length}
                    </Text>
                  </View>
                  <View className="flex-1 bg-white rounded-2xl p-4 border border-neutral-100 shadow-sm">
                    <View className="flex-row items-center mb-2">
                      <View className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                      <Text className="text-xs text-neutral-500 font-quicksand-bold">
                        {i18n.t("enterprise.advertisements.summary.paused")}
                      </Text>
                    </View>
                    <Text className="text-2xl font-quicksand-bold text-neutral-800">
                      {ads.filter((a) => a.status === "paused").length}
                    </Text>
                  </View>
                  <View className="flex-1 bg-white rounded-2xl p-4 border border-neutral-100 shadow-sm">
                    <View className="flex-row items-center mb-2">
                      <View className="w-2 h-2 rounded-full bg-neutral-400 mr-2" />
                      <Text className="text-xs text-neutral-500 font-quicksand-bold">
                        {i18n.t("enterprise.advertisements.summary.expired")}
                      </Text>
                    </View>
                    <Text className="text-2xl font-quicksand-bold text-neutral-800">
                      {ads.filter((a) => a.status === "expired").length}
                    </Text>
                  </View>
                </View>

                <View className="mt-6">
                  <Text className="text-neutral-400 font-quicksand-bold text-xs uppercase tracking-wider mb-3">
                    {i18n.t("enterprise.advertisements.filters.title")}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {[
                      { key: "all", label: i18n.t("enterprise.advertisements.filters.all") },
                      { key: "active", label: i18n.t("enterprise.advertisements.filters.active") },
                      { key: "paused", label: i18n.t("enterprise.advertisements.filters.paused") },
                      { key: "expired", label: i18n.t("enterprise.advertisements.filters.expired") },
                    ].map((s: any) => (
                      <TouchableOpacity
                        key={s.key}
                        onPress={() => setFilterStatus(s.key)}
                        className={`px-4 py-2 rounded-xl border ${
                          filterStatus === s.key
                            ? "bg-neutral-900 border-neutral-900"
                            : "bg-white border-neutral-200"
                        }`}
                        activeOpacity={1}
                      >
                        <Text
                          className={`text-xs font-quicksand-bold ${
                            filterStatus === s.key
                              ? "text-white"
                              : "text-neutral-600"
                          }`}
                        >
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View className="mt-4 flex-row items-center justify-between">
                  <Text className="text-xs font-quicksand-medium text-neutral-400">
                    {filteredAds.length} {filteredAds.length > 1 ? i18n.t("enterprise.advertisements.results.plural") : i18n.t("enterprise.advertisements.results.singular")}
                  </Text>
                  {searchQuery.length > 0 && (
                    <Text className="text-xs font-quicksand-medium text-primary-600">
                      {i18n.t("enterprise.advertisements.results.search")} &ldquo;{searchQuery}&rdquo;
                    </Text>
                  )}
                </View>
              </View>
            }
            ListFooterComponent={
              page < pages ? (
                <View className="py-6 items-center">
                  {fetchingMore ? (
                    <ActivityIndicator color="#10B981" />
                  ) : (
                    <Text
                      style={{ fontFamily: "Quicksand-Regular" }}
                      className="text-neutral-400 text-xs"
                    >
                      {i18n.t("enterprise.advertisements.loadMore")}
                    </Text>
                  )}
                </View>
              ) : (
                <View className="py-6" />
              )
            }
            ListEmptyComponent={
              <View className="items-center mt-20 px-8">
                <Ionicons name="image-outline" size={46} color="#9CA3AF" />
                <Text
                  style={{ fontFamily: "Quicksand-SemiBold" }}
                  className="mt-4 text-neutral-700"
                >
                  {searchQuery || filterStatus !== "all"
                    ? i18n.t("enterprise.advertisements.empty.noResults")
                    : i18n.t("enterprise.advertisements.empty.noAds")}
                </Text>
                <Text
                  style={{ fontFamily: "Quicksand-Regular" }}
                  className="mt-2 text-neutral-500 text-center text-sm"
                >
                  {searchQuery || filterStatus !== "all"
                    ? i18n.t("enterprise.advertisements.empty.noResultsMessage")
                    : i18n.t("enterprise.advertisements.empty.noAdsMessage")}
                </Text>
                <TouchableOpacity
                  onPress={handleCreateAd}
                  className="mt-6 bg-primary-500 px-6 py-3 rounded-xl"
                >
                  <Text
                    style={{ fontFamily: "Quicksand-SemiBold" }}
                    className="text-white"
                  >
                    {i18n.t("enterprise.advertisements.empty.createAd")}
                  </Text>
                </TouchableOpacity>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}
          />
        )}
      </View>

      {/* Modern Action Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={closeMenu}
        >
          <View className="flex-1 justify-end">
            <TouchableOpacity
              className="bg-white rounded-t-3xl"
              activeOpacity={1}
              onPress={() => {}}
            >
              {/* Handle bar */}
              <View className="w-full items-center pt-3 pb-2">
                <View className="w-12 h-1 bg-neutral-300 rounded-full" />
              </View>

              {/* Menu Header */}
              <View className="px-6 pb-4 border-b border-neutral-100">
                <Text className="text-lg font-quicksand-bold text-neutral-800">
                  {i18n.t("enterprise.advertisements.menu.title")}
                </Text>
                <Text
                  className="text-sm text-neutral-500 font-quicksand-medium mt-1"
                  numberOfLines={1}
                >
                  {selectedAd?.title}
                </Text>
              </View>

              {/* Menu Options */}
              <View className="px-6 py-2">
                {selectedAd?.status === "active" && (
                  <TouchableOpacity
                    onPress={() => {
                      closeMenu();
                      handlePauseAd(selectedAd);
                    }}
                    className="flex-row items-center py-4 border-b border-neutral-50"
                  >
                    <View className="w-10 h-10 rounded-full bg-amber-50 items-center justify-center mr-4">
                      <Ionicons name="pause" size={20} color="#F59E0B" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-quicksand-semibold text-neutral-800">
                        {i18n.t("enterprise.advertisements.menu.pause")}
                      </Text>
                      <Text className="text-sm text-neutral-500 font-quicksand-medium">
                        {i18n.t("enterprise.advertisements.menu.pauseDescription")}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                )}

                {selectedAd?.status === "paused" && (
                  <TouchableOpacity
                    onPress={() => {
                      closeMenu();
                      handleActivateAd(selectedAd);
                    }}
                    className="flex-row items-center py-4 border-b border-neutral-50"
                  >
                    <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center mr-4">
                      <Ionicons name="play" size={20} color="#10B981" />
                    </View>
                    <View className="flex-1">
                      <Text
                        style={{ fontFamily: "Quicksand-SemiBold" }}
                        className="text-base text-neutral-800"
                      >
                        {i18n.t("enterprise.advertisements.menu.activate")}
                      </Text>
                      <Text
                        style={{ fontFamily: "Quicksand-Regular" }}
                        className="text-sm text-neutral-500"
                      >
                        {i18n.t("enterprise.advertisements.menu.activateDescription")}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() => {
                    closeMenu();
                    handleDeleteAd(selectedAd!);
                  }}
                  className="flex-row items-center py-4"
                >
                  <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center mr-4">
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </View>
                  <View className="flex-1">
                    <Text
                      style={{ fontFamily: "Quicksand-SemiBold" }}
                      className="text-base text-red-600"
                    >
                      {i18n.t("enterprise.advertisements.menu.delete")}
                    </Text>
                    <Text
                      style={{ fontFamily: "Quicksand-Regular" }}
                      className="text-sm text-neutral-500"
                    >
                      {i18n.t("enterprise.advertisements.menu.deleteDescription")}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {/* Cancel Button */}
              <View className="px-6 pb-6 pt-2">
                <TouchableOpacity
                  onPress={closeMenu}
                  className="w-full bg-neutral-100 py-4 rounded-2xl items-center"
                >
                  <Text
                    style={{ fontFamily: "Quicksand-SemiBold" }}
                    className="text-base text-neutral-700"
                  >
                    {i18n.t("enterprise.advertisements.cancel")}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
              className="bg-white rounded-3xl w-full max-w-sm"
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
                <Text className="text-xl font-quicksand-bold text-neutral-800 text-center mb-2">
                  {confirmationAction?.title}
                </Text>
                <Text className="text-base text-neutral-600 font-quicksand-medium text-center leading-5">
                  {confirmationAction?.message}
                </Text>
              </View>

              {/* Actions */}
              <View className="flex-row px-6 pb-6 gap-3">
                <TouchableOpacity
                  onPress={closeConfirmation}
                  className="flex-1 bg-neutral-100 py-4 rounded-2xl items-center"
                >
                  <Text className="text-base font-quicksand-semibold text-neutral-700">
                    {i18n.t("enterprise.advertisements.cancel")}
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
