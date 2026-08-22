import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  Animated,
  FlatList,
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
} from "../../../../../components/ui/NotificationModal";
import LockedFeatureOverlay from "../../../../../components/enterprise/LockedFeatureOverlay";
import { useLocale } from "../../../../../contexts/LocaleContext";
import { useTheme } from "../../../../../contexts/ThemeContext";
import { Shimmer } from "../../../../../components/ui/Shimmer";
import { ErrorState } from "../../../../../components/ui/ErrorState";
import { useSubscription } from "../../../../../contexts/SubscriptionContext";
import i18n from "../../../../../i18n/i18n";
import CategoryService from "../../../../../services/api/CategoryService";
import ProductService from "../../../../../services/api/ProductService";
import {
  Category,
  Product,
} from "../../../../../types/product";

const getSortOptions = () => [
  { id: "name", name: i18n.t("enterprise.products.sort.name"), field: "name" },
  { id: "price", name: i18n.t("enterprise.products.sort.price"), field: "price" },
  { id: "stock", name: i18n.t("enterprise.products.sort.stock"), field: "stock" },
  { id: "createdAt", name: i18n.t("enterprise.products.sort.createdAt"), field: "createdAt" },
];

export default function EnterpriseProducts() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { locale } = useLocale(); // Écoute les changements de langue pour re-render automatiquement
  const { colors, isDark } = useTheme();
  const { subscription } = useSubscription();
  const isSubscriptionActive = subscription?.isActive === true;
  const sortOptions = getSortOptions();
  const params = useLocalSearchParams();
  const { notification, showNotification, hideNotification } =
    useNotification();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSort, setSelectedSort] = useState("createdAt");

  const [showSortModal, setShowSortModal] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const listAnim = useRef(new Animated.Value(1)).current;
  const toggleIconRotation = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);

  const toggleViewMode = useCallback(() => {
    const next = viewMode === "list" ? "grid" : "list";
    Animated.parallel([
      Animated.timing(listAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(toggleIconRotation, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setViewMode(next);
      toggleIconRotation.setValue(0);
      Animated.timing(listAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }, [viewMode, listAnim, toggleIconRotation]);

  const queryClient = useQueryClient();

  const { data: categories = [] as Category[] } = useQuery({
    queryKey: ['categories', 'active'],
    queryFn: async () => CategoryService.getActiveCategories() as Promise<Category[]>,
    staleTime: 1000 * 60 * 10,
  });

  const {
    data: productsPages,
    isLoading: initialLoading,
    isFetchingNextPage: loadingMore,
    fetchNextPage,
    hasNextPage: hasMoreProducts,
    error: productsQueryError,
    refetch: refetchProducts,
  } = useInfiniteQuery({
    queryKey: ['enterprise', 'products', debouncedSearchQuery, selectedCategory, selectedSort],
    queryFn: async ({ pageParam }) => {
      const filters: any = {
        sort: selectedSort === "createdAt" ? "newest" : selectedSort === "price" ? "price_desc" : "newest",
      };
      if (selectedCategory !== "all") filters.category = selectedCategory;
      if (debouncedSearchQuery.trim()) {
        return ProductService.searchEnterpriseProducts(debouncedSearchQuery.trim(), pageParam as number, 10, filters);
      }
      return ProductService.getEnterpriseProducts(pageParam as number, 10, filters);
    },
    getNextPageParam: (lastPage: any) => {
      const p = lastPage?.pagination;
      return p && p.page < p.pages ? p.page + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 2,
  });
  const products = productsPages?.pages.flatMap((p: any) => p.products || []) ?? [];
  const error = (productsQueryError as Error | null)?.message ?? null;

  // Confirmation modal
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    type: "delete" | "status_change";
    product: Product;
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
  } | null>(null);

  // Menu modal pour les actions produit en mode grid
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [selectedProductForMenu, setSelectedProductForMenu] =
    useState<Product | null>(null);

  // Auto-refresh when coming from create page
  useEffect(() => {
    if (params.refresh === "true") {
      router.replace("/(app)/(enterprise)/(tabs)/products");
      queryClient.invalidateQueries({ queryKey: ['enterprise', 'products'] });
    }
  }, [params.refresh, queryClient]);

  // Debounce search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['enterprise', 'products', debouncedSearchQuery, selectedCategory, selectedSort] });
    } finally {
      setRefreshing(false);
    }
  }, [debouncedSearchQuery, selectedCategory, selectedSort, queryClient]);

  const loadMoreProducts = useCallback(() => {
    if (loadingMore || !hasMoreProducts) return;
    fetchNextPage();
  }, [loadingMore, hasMoreProducts, fetchNextPage]);

  const handleStatusChange = (product: Product) => {
    showConfirmation("status_change", product);
  };

  const handleDeleteProduct = (product: Product) => {
    showConfirmation("delete", product);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? { color: "#10B981", bg: "#D1FAE5" }
      : { color: "#EF4444", bg: "#FEE2E2" };
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { color: "#EF4444", text: i18n.t("enterprise.products.stock.outOfStock") };
    if (stock < 10) return { color: "#F59E0B", text: i18n.t("enterprise.products.stock.low") };
    return { color: "#10B981", text: i18n.t("enterprise.products.stock.available") };
  };

  const showConfirmation = (
    type: "delete" | "status_change",
    product: Product
  ) => {
    let title = "";
    let message = "";
    let confirmText = "";
    let confirmColor = "";

    switch (type) {
      case "delete":
        title = i18n.t("enterprise.products.confirmations.delete.title");
        message = i18n.t("enterprise.products.confirmations.delete.message");
        confirmText = i18n.t("enterprise.products.confirmations.delete.confirm");
        confirmColor = "#EF4444";
        break;
      case "status_change":
        title = product.isActive
          ? i18n.t("enterprise.products.confirmations.deactivate.title")
          : i18n.t("enterprise.products.confirmations.activate.title");
        message = product.isActive
          ? i18n.t("enterprise.products.confirmations.deactivate.message")
          : i18n.t("enterprise.products.confirmations.activate.message");
        confirmText = product.isActive ? i18n.t("enterprise.products.actions.deactivate") : i18n.t("enterprise.products.actions.activate");
        confirmColor = product.isActive ? "#F59E0B" : "#10B981";
        break;
    }

    setConfirmationAction({
      type,
      product,
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

  const executeConfirmedAction = async () => {
    if (!confirmationAction) return;

    const { type, product } = confirmationAction;
    closeConfirmation();

    try {
      switch (type) {
        case "delete":
          await ProductService.deleteProduct(product._id);
          queryClient.invalidateQueries({ queryKey: ['enterprise', 'products'] });
          showNotification(
            "success",
            i18n.t("enterprise.products.notifications.deleteSuccess"),
            i18n.t("enterprise.products.notifications.deleteSuccessMessage")
          );
          break;
        case "status_change":
          await ProductService.updateProduct(product._id, {
            isActive: !product.isActive,
          });
          queryClient.invalidateQueries({ queryKey: ['enterprise', 'products'] });
          showNotification(
            "success",
            i18n.t("enterprise.products.notifications.statusSuccess"),
            product.isActive ? i18n.t("enterprise.products.notifications.statusDeactivated") : i18n.t("enterprise.products.notifications.statusActivated")
          );
          break;
      }
    } catch (err: any) {
      showNotification(
        "error",
        i18n.t("enterprise.products.notifications.error"),
        err.message ||
        (type === "delete" ? i18n.t("enterprise.products.notifications.deleteError") : i18n.t("enterprise.products.notifications.updateError"))
      );
    }
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const statusStyle = getStatusColor(item.isActive);
    const stockStatus = getStockStatus(item.stock);
    const isGrid = viewMode === "grid";

    if (isGrid) {
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
          className="rounded-2xl p-3 mb-4 mx-2 flex-1 relative"
        >
          <TouchableOpacity
            style={{
              backgroundColor: isDark ? colors.tertiary : 'rgba(255,255,255,0.9)',
              elevation: 2
            }}
            className="absolute top-2 right-2 z-10 rounded-full w-7 h-7 items-center justify-center shadow-sm"
            onPress={() => {
              setSelectedProductForMenu(item);
              setMenuModalVisible(true);
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              router.push(`/(app)/(enterprise)/(tabs)/products/${item._id}`);
            }}
          >
            <Image
              source={{
                uri:
                  item.images[0] ||
                  "https://via.placeholder.com/160x160/E5E7EB/9CA3AF?text=No+Image",
              }}
              style={{ width: "100%", height: 128, borderRadius: 12 }}
              contentFit="cover"
            />
            <View className="mt-3">
              <Text
                style={{ color: colors.textPrimary }}
                className="text-sm font-quicksand-semibold"
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text style={{ color: colors.brandPrimary }} className="text-xs font-quicksand-medium mt-1">
                {formatPrice(item.price)}
              </Text>
              <View className="flex-row items-center mt-1">
                <Ionicons name="star" size={12} color={colors.brandPrimary} />
                <Text style={{ color: colors.textSecondary }} className="text-[10px] ml-1">
                  {item.stats.averageRating.toFixed(1)} (
                  {item.stats.totalReviews})
                </Text>
              </View>
              <View className="flex-row items-center mt-1 justify-between">
                <Text
                  className="text-[10px] font-quicksand-medium"
                  style={{ color: stockStatus.color }}
                >
                  {stockStatus.text}
                </Text>
                <View
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: statusStyle.bg }}
                >
                  <Text
                    className="text-[10px] font-quicksand-semibold"
                    style={{ color: statusStyle.color }}
                  >
                    {item.isActive ? i18n.t("enterprise.products.status.active") : i18n.t("enterprise.products.status.inactive")}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={{
          backgroundColor: colors.card,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.03,
          shadowRadius: 4,
          elevation: 1,
        }}
        className="rounded-2xl p-4 mx-4 mb-4"
        onPress={() => {
          router.push(`/(app)/(enterprise)/(tabs)/products/${item._id}`);
        }}
      >
        <View className="flex-row">
          <Image
            source={{
              uri:
                item.images[0] ||
                "https://via.placeholder.com/80x80/E5E7EB/9CA3AF?text=No+Image",
            }}
            style={{ width: 80, height: 80, borderRadius: 12 }}
            contentFit="cover"
          />
          <View className="ml-4 flex-1">
            <View className="flex-row items-start justify-between mb-2">
              <View className="flex-1 pr-2">
                <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-semibold">
                  {item.name}
                </Text>
                {typeof item.category === "object" && (
                  <Text style={{ color: colors.textSecondary }} className="text-sm font-quicksand-medium">
                    {item.category.name}
                  </Text>
                )}
              </View>
              <View className="flex-row items-center gap-3">
                <View
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: statusStyle.bg }}
                >
                  <Text
                    className="text-xs font-quicksand-semibold"
                    style={{ color: statusStyle.color }}
                  >
                    {item.isActive ? i18n.t("enterprise.products.status.active") : i18n.t("enterprise.products.status.inactive")}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    handleStatusChange(item);
                  }}
                  className="p-1"
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={20}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>
            <View className="flex-row items-center mb-3">
              <Ionicons name="star" size={14} color={colors.brandPrimary} />
              <Text style={{ color: colors.textSecondary }} className="text-xs ml-1 font-quicksand-light">
                {item.stats.averageRating.toFixed(1)} ({item.stats.totalReviews}{" "}
                {i18n.t("enterprise.products.reviews")})
              </Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text style={{ color: colors.brandPrimary }} className="text-lg font-quicksand-bold">
                {formatPrice(item.price)}
              </Text>
              <View
                className="px-3 py-1.5 rounded-full"
                style={{ backgroundColor: stockStatus.color + "15" }}
              >
                <Text
                  className="text-xs font-quicksand-semibold"
                  style={{ color: stockStatus.color }}
                >
                  {stockStatus.text}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={{ borderTopColor: colors.border }} className="mt-4 pt-4 border-t">
          <TouchableOpacity
            style={{ backgroundColor: isDark ? colors.tertiary : '#FEF2F2' }}
            className="rounded-xl py-3.5 flex-row items-center justify-center"
            onPress={() => {
              handleDeleteProduct(item);
            }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
            <Text style={{ color: colors.error }} className="font-quicksand-semibold ml-2">
              {i18n.t("enterprise.products.actions.delete")}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (error) {
      return (
        <ErrorState
          variant="network"
          title={i18n.t("enterprise.products.empty.error.title")}
          message={error}
          onRetry={() => refetchProducts()}
          retryLabel={i18n.t("enterprise.products.empty.error.retry")}
          onSecondary={() => router.push("/(app)/(enterprise)/(tabs)/products/create")}
          secondaryLabel={i18n.t("enterprise.products.addProduct")}
        />
      );
    }

    // No error, just empty state
    return (
      <View className="flex-1 justify-center items-center px-6">
        <Ionicons name="cube-outline" size={80} color={colors.textTertiary} />
        <Text style={{ color: colors.textPrimary }} className="text-xl font-quicksand-bold mt-4 mb-2">
          {searchQuery.trim() || selectedCategory !== "all"
            ? i18n.t("enterprise.products.empty.noProductsFound")
            : i18n.t("enterprise.products.empty.noProducts")}
        </Text>
        <Text style={{ color: colors.textSecondary }} className="text-center font-quicksand-medium mb-6">
          {searchQuery.trim() || selectedCategory !== "all"
            ? i18n.t("enterprise.products.empty.noProductsFoundMessage")
            : i18n.t("enterprise.products.empty.noProductsMessage")}
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: colors.brandPrimary }}
          className="rounded-xl py-4 px-8"
          onPress={() => {
            router.push("/(app)/(enterprise)/(tabs)/products/create");
          }}
        >
          <Text style={{ color: colors.textOnBrand }} className="font-quicksand-semibold">
            {i18n.t("enterprise.products.addProduct")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSortModal(false)}
    >
      <TouchableOpacity
        style={{ backgroundColor: colors.overlay }}
        className="flex-1"
        activeOpacity={1}
        onPress={() => setShowSortModal(false)}
      >
        <View className="flex-1 justify-center items-center px-6">
          <View style={{ backgroundColor: colors.card }} className="rounded-2xl p-6 w-full max-w-sm">
            <Text style={{ color: colors.textPrimary }} className="text-lg font-quicksand-bold mb-4">
              {i18n.t("enterprise.products.sort.title")}
            </Text>

            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={{
                  backgroundColor: selectedSort === option.id ? colors.brandPrimary : colors.tertiary
                }}
                className="py-3 px-4 rounded-xl mb-2"
                onPress={() => {
                  setSelectedSort(option.id);
                  setShowSortModal(false);
                }}
              >
                <Text
                  style={{
                    color: selectedSort === option.id ? colors.textOnBrand : colors.textPrimary
                  }}
                  className="font-quicksand-medium"
                >
                  {option.name}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={{ backgroundColor: colors.tertiary }}
              className="mt-4 py-3 px-4 rounded-xl"
              onPress={() => setShowSortModal(false)}
            >
              <Text style={{ color: colors.textPrimary }} className="font-quicksand-medium text-center">
                {i18n.t("enterprise.products.sort.cancel")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const SkeletonCard = ({ grid = false }: { grid?: boolean }) => (
    <View className={`${grid ? "w-1/2 px-2" : "w-full px-4"} mb-4`}>
      <View
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
        className="rounded-2xl p-4 border overflow-hidden"
      >
        <Shimmer
          style={{ height: grid ? 110 : 80, borderRadius: 16, width: "100%" }}
        />
        <View className="mt-4">
          <Shimmer
            style={{
              height: 16,
              borderRadius: 8,
              width: "75%",
              marginBottom: 8,
            }}
          />
          <Shimmer
            style={{
              height: 12,
              borderRadius: 8,
              width: "50%",
              marginBottom: 8,
            }}
          />
          <Shimmer style={{ height: 16, borderRadius: 8, width: "35%" }} />
        </View>
      </View>
    </View>
  );

  const renderSkeletons = () => {
    const count = viewMode === "grid" ? 8 : 6;
    return (
      <FlatList
        data={Array.from({ length: count }).map((_, i) => i.toString())}
        key={viewMode === "grid" ? "grid-skeleton" : "list-skeleton"}
        numColumns={viewMode === "grid" ? 2 : 1}
        renderItem={() => <SkeletonCard grid={viewMode === "grid"} />}
        keyExtractor={(item) => item}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const Header = useMemo(() => (
    <LinearGradient
      colors={[colors.brandGradientStart, colors.brandGradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      className="rounded-b-[32px] shadow-lg"
      style={{ paddingTop: insets.top + 16, paddingBottom: 16 }}
    >
      {/* Title and Actions Row */}
      <View className="px-6 mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-1">
            <Text className="text-2xl font-quicksand-bold text-white">
              {i18n.t("enterprise.products.title")}
            </Text>
            <Text className="text-white/80 font-quicksand-medium mt-1 text-sm">
              {products.length} {products.length !== 1 ? i18n.t("enterprise.products.catalogPlural") : i18n.t("enterprise.products.catalog")}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/(app)/(enterprise)/(tabs)/products/create")}
            style={{ backgroundColor: isDark ? colors.card : '#FFFFFF', elevation: 3 }}
            className="rounded-2xl px-4 py-2.5 flex-row items-center shadow-md"
          >
            <Ionicons name="add" size={18} color={colors.brandPrimary} />
            <Text style={{ color: colors.brandPrimary }} className="font-quicksand-bold ml-1.5 text-sm">
              {i18n.t("enterprise.products.addButton")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="relative">
          <View
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
            style={{ transform: [{ translateY: -10 }] }}
          >
            <Ionicons name="search" size={20} color="#9CA3AF" />
          </View>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={i18n.t("enterprise.products.searchPlaceholder")}
            style={{
              backgroundColor: isDark ? colors.card : '#FFFFFF',
              color: colors.textPrimary,
              elevation: 2
            }}
            className="rounded-2xl pl-12 pr-12 py-3.5 font-quicksand-medium shadow-sm"
            placeholderTextColor={colors.textTertiary}
            blurOnSubmit={false}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={{
                backgroundColor: isDark ? colors.tertiary : '#F3F4F6',
                transform: [{ translateY: -10 }]
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1"
              onPress={() => setSearchQuery("")}
            >
              <Ionicons name="close" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Pills */}
      <View className="mb-4">
        <FlatList
          data={[{ _id: "all", name: i18n.t("enterprise.products.categories.all") }, ...categories] as any}
          horizontal
          keyExtractor={(item: any) => item._id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24 }}
          renderItem={({ item }: any) => (
            <TouchableOpacity
              style={selectedCategory === item._id ? {
                backgroundColor: isDark ? colors.card : '#FFFFFF',
                elevation: 3
              } : {
                backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.20)',
                borderColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.30)'
              }}
              className={`px-5 py-2.5 mr-2 rounded-full ${selectedCategory === item._id
                ? "shadow-md"
                : "backdrop-blur-sm border"
                }`}
              onPress={() => setSelectedCategory(item._id)}
            >
              <Text
                style={{
                  color: selectedCategory === item._id ? colors.brandPrimary : '#FFFFFF'
                }}
                className="text-sm font-quicksand-bold"
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Sort and View Toggle Row */}
      <View className="flex-row items-center justify-between px-6 pt-2">
        <TouchableOpacity
          onPress={() => setShowSortModal(true)}
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.95)',
            elevation: 2
          }}
          className="flex-row items-center backdrop-blur-sm rounded-full px-4 py-2.5 shadow-sm"
        >
          <Ionicons name="swap-vertical" size={16} color={isDark ? '#FFFFFF' : colors.brandPrimary} />
          <Text style={{ color: isDark ? '#FFFFFF' : colors.textPrimary }} className="font-quicksand-semibold ml-2 text-sm">
            {sortOptions.find((o) => o.id === selectedSort)?.name}
          </Text>
          <Ionicons name="chevron-down" size={14} color={isDark ? '#FFFFFF' : colors.textSecondary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        <View className="flex-row items-center gap-2">
          {searchQuery.trim().length > 0 && (
            <View
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.20)',
                borderColor: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.30)'
              }}
              className="backdrop-blur-sm rounded-full px-3 py-2 border"
            >
              <Text className="text-white font-quicksand-semibold text-sm">
                {products.length} {products.length !== 1 ? i18n.t("enterprise.products.resultsPlural") : i18n.t("enterprise.products.results")}
              </Text>
            </View>
          )}
          <TouchableOpacity
            onPress={toggleViewMode}
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.95)',
              elevation: 2
            }}
            className="backdrop-blur-sm rounded-full p-2.5 shadow-sm"
          >
            <Animated.View style={{ transform: [{ rotate: toggleIconRotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
              <Ionicons name={viewMode === "list" ? "grid-outline" : "list-outline"} size={18} color={isDark ? '#FFFFFF' : colors.brandPrimary} />
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  ), [searchQuery, categories, selectedCategory, viewMode, selectedSort, products.length, colors, isDark, insets.top, sortOptions, toggleViewMode, toggleIconRotation]);

  if (initialLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.secondary }}>
        <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />
        {Header}
        <View style={{ flex: 1, backgroundColor: colors.primary }}>{renderSkeletons()}</View>
        {renderSortModal()}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary, position: 'relative' }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />
      {Header}
      <Animated.View style={{ flex: 1, backgroundColor: colors.primary, opacity: listAnim, transform: [{ scale: listAnim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }] }}>
        {products.length > 0 ? (
          <FlatList
            data={products}
            renderItem={(info) => renderProduct(info)}
            keyExtractor={(item) => item._id}
            key={viewMode === "grid" ? "grid" : "list"}
            numColumns={viewMode === "grid" ? 2 : 1}
            columnWrapperStyle={
              viewMode === "grid" ? { paddingHorizontal: 8 } : undefined
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 28, paddingBottom: 120 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.brandPrimary]}
                tintColor={colors.brandPrimary}
              />
            }
            onEndReached={loadMoreProducts}
            onEndReachedThreshold={0.1}
            ListFooterComponent={
              loadingMore ? (
                <View className="py-4">
                  <ActivityIndicator size="small" color={colors.brandPrimary} />
                </View>
              ) : null
            }
          />
        ) : (
          <View className="flex-1">{renderEmptyState()}</View>
        )}
      </Animated.View>
      {renderSortModal()}

      {/* Modern Confirmation Modal */}
      <Modal
        visible={confirmationVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeConfirmation}
      >
        <TouchableOpacity
          style={{ backgroundColor: colors.overlay }}
          className="flex-1"
          activeOpacity={1}
          onPress={closeConfirmation}
        >
          <View className="flex-1 justify-center items-center px-6">
            <TouchableOpacity
              style={{ backgroundColor: colors.card }}
              className="rounded-3xl w-full max-w-sm"
              activeOpacity={1}
              onPress={() => { }}
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
                        : confirmationAction?.type === "status_change"
                          ? confirmationAction.product.isActive
                            ? "pause"
                            : "play"
                          : "help"
                    }
                    size={28}
                    color={confirmationAction?.confirmColor}
                  />
                </View>
              </View>

              {/* Content */}
              <View className="px-6 pb-6">
                <Text style={{ color: colors.textPrimary }} className="text-xl font-quicksand-bold text-center mb-2">
                  {confirmationAction?.title}
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-base font-quicksand-medium text-center leading-5">
                  {confirmationAction?.message}
                </Text>
              </View>

              {/* Actions */}
              <View className="flex-row px-6 pb-6 gap-3">
                <TouchableOpacity
                  onPress={closeConfirmation}
                  style={{ backgroundColor: colors.tertiary }}
                  className="flex-1 py-4 rounded-2xl items-center"
                >
                  <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-semibold">
                    {i18n.t("enterprise.products.actions.cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={executeConfirmedAction}
                  className="flex-1 py-4 rounded-2xl items-center"
                  style={{ backgroundColor: confirmationAction?.confirmColor }}
                >
                  <Text style={{ color: colors.textOnBrand }} className="text-base font-quicksand-semibold">
                    {confirmationAction?.confirmText}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Menu Modal pour les actions en mode grid */}
      <Modal
        visible={menuModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setMenuModalVisible(false);
          setSelectedProductForMenu(null);
        }}
      >
        <TouchableOpacity
          style={{ backgroundColor: colors.overlay }}
          className="flex-1"
          activeOpacity={1}
          onPress={() => {
            setMenuModalVisible(false);
            setSelectedProductForMenu(null);
          }}
        >
          <View className="flex-1 justify-center items-center px-6">
            <TouchableOpacity
              style={{ backgroundColor: colors.card }}
              className="rounded-3xl w-full max-w-sm overflow-hidden"
              activeOpacity={1}
              onPress={() => { }}
            >
              {/* Header du produit */}
              {selectedProductForMenu && (
                <View style={{ borderBottomColor: colors.border }} className="p-5 border-b">
                  <View className="flex-row items-center">
                    <Image
                      source={{
                        uri:
                          selectedProductForMenu.images[0] ||
                          "https://via.placeholder.com/60x60/E5E7EB/9CA3AF?text=No+Image",
                      }}
                      style={{ width: 56, height: 56, borderRadius: 12, marginRight: 12 }}
                      contentFit="cover"
                    />
                    <View className="flex-1">
                      <Text
                        style={{ color: colors.textPrimary }}
                        className="text-base font-quicksand-bold"
                        numberOfLines={2}
                      >
                        {selectedProductForMenu.name}
                      </Text>
                      <Text style={{ color: colors.brandPrimary }} className="text-sm font-quicksand-medium mt-1">
                        {formatPrice(selectedProductForMenu.price)}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Options */}
              <View className="p-3">
                {/* Voir les détails */}
                <TouchableOpacity
                  style={{ backgroundColor: colors.tertiary }}
                  className="flex-row items-center py-4 px-4 rounded-2xl mb-2"
                  onPress={() => {
                    setMenuModalVisible(false);
                    if (selectedProductForMenu) {
                      router.push(
                        `/(app)/(enterprise)/(tabs)/products/${selectedProductForMenu._id}`
                      );
                    }
                    setSelectedProductForMenu(null);
                  }}
                >
                  <View
                    style={{ backgroundColor: isDark ? colors.tertiary : '#D1FAE5' }}
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  >
                    <Ionicons name="eye" size={20} color={colors.brandPrimary} />
                  </View>
                  <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-semibold flex-1">
                    {i18n.t("enterprise.products.actions.viewDetails")}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                </TouchableOpacity>

                {/* Changer le statut */}
                {selectedProductForMenu && (
                  <TouchableOpacity
                    style={{ backgroundColor: colors.tertiary }}
                    className="flex-row items-center py-4 px-4 rounded-2xl mb-2"
                    onPress={() => {
                      setMenuModalVisible(false);
                      if (selectedProductForMenu) {
                        handleStatusChange(selectedProductForMenu);
                      }
                      setSelectedProductForMenu(null);
                    }}
                  >
                    <View
                      className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${selectedProductForMenu.isActive
                        ? "bg-warning-100"
                        : "bg-success-100"
                        }`}
                    >
                      <Ionicons
                        name={
                          selectedProductForMenu.isActive ? "pause" : "play"
                        }
                        size={20}
                        color={
                          selectedProductForMenu.isActive
                            ? "#F59E0B"
                            : "#10B981"
                        }
                      />
                    </View>
                    <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-semibold flex-1">
                      {selectedProductForMenu.isActive
                        ? i18n.t("enterprise.products.actions.deactivate")
                        : i18n.t("enterprise.products.actions.activate")}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                )}

                {/* Supprimer */}
                <TouchableOpacity
                  style={{ backgroundColor: isDark ? colors.tertiary : '#FEF2F2' }}
                  className="flex-row items-center py-4 px-4 rounded-2xl"
                  onPress={() => {
                    setMenuModalVisible(false);
                    if (selectedProductForMenu) {
                      handleDeleteProduct(selectedProductForMenu);
                    }
                    setSelectedProductForMenu(null);
                  }}
                >
                  <View
                    style={{ backgroundColor: isDark ? colors.tertiary : '#FEE2E2' }}
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  >
                    <Ionicons name="trash" size={20} color={colors.error} />
                  </View>
                  <Text style={{ color: colors.error }} className="text-base font-quicksand-semibold flex-1">
                    {i18n.t("enterprise.products.actions.delete")}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>

              {/* Bouton Annuler */}
              <View className="p-3 pt-0">
                <TouchableOpacity
                  style={{ backgroundColor: colors.tertiary }}
                  className="py-4 rounded-2xl items-center"
                  onPress={() => {
                    setMenuModalVisible(false);
                    setSelectedProductForMenu(null);
                  }}
                >
                  <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-semibold">
                    {i18n.t("enterprise.products.actions.cancel")}
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

      {!isSubscriptionActive && (
        <LockedFeatureOverlay
          itemCount={products.length}
          featureTitle={products.length === 1 ? 'produit' : 'produits'}
          teaser={"Mettez vos produits\nen avant et vendez plus."}
          benefits={[
            'Publiez autant de produits que vous voulez',
            'Gérez votre catalogue facilement',
            'Soyez visible par des milliers de clients',
          ]}
        />
      )}
    </View>
  );
}
