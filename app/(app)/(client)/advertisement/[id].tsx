import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    Image,
    Modal,
    ScrollView,
    Share,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocale } from "../../../../contexts/LocaleContext";
import { useTheme } from "../../../../contexts/ThemeContext";
import i18n from "../../../../i18n/i18n";
import AdvertisementService, {
    Advertisement,
} from "../../../../services/api/AdvertisementService";
import { createPublicAdvertisementShareUrl } from "../../../../utils/AppLinks";

const { width: screenWidth } = Dimensions.get("window");

export default function AdvertisementDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locale } = useLocale();
  const { colors } = useTheme();
  const [advertisement, setAdvertisement] = useState<Advertisement | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const loadAdvertisementDetails = async () => {
      try {
        setLoading(true);
        const adData = await AdvertisementService.getActiveAdvertisementById(
          id!,
        );
        console.log(
          "✅ Advertisement loaded:",
          JSON.stringify(adData, null, 2),
        );
        setAdvertisement(adData);
      } catch (error) {
        console.error("❌ Error loading advertisement:", error);
        setShowErrorModal(true);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadAdvertisementDetails();
    }
  }, [id, router]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      locale === "fr" ? "fr-FR" : "en-US",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      },
    );
  };

  const handleShare = async () => {
    if (!advertisement) return;

    try {
      const message = `${i18n.t("client.advertisement.share.message", {
        title: advertisement.title,
        description: advertisement.description,
        date: formatDate(advertisement.endDate),
      })}\n${createPublicAdvertisementShareUrl(advertisement._id)}`;

      await Share.share({
        message,
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handleContact = () => {
    if (!advertisement || !advertisement.createdBy?.enterprise) return;

    // Navigate to the enterprise page
    router.push(
      `/(app)/(client)/enterprise/${advertisement.createdBy.enterprise}`,
    );
  };

  const handleScroll = (event: any) => {
    const slideSize = screenWidth;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    setCurrentImageIndex(roundIndex);
  };

  const scrollToImage = (index: number) => {
    if (scrollViewRef.current && advertisement?.images) {
      scrollViewRef.current.scrollTo({
        x: index * screenWidth,
        animated: true,
      });
    }
  };

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
        }),
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
        style={[{ backgroundColor: colors.border, overflow: "hidden" }, style]}
      >
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

  return (
    <>
      {loading ? (
        <View style={{ backgroundColor: colors.background }} className="flex-1">
          <ExpoStatusBar style="light" translucent />

          {/* Header Skeleton */}
          <LinearGradient
            colors={["#10B981", "#34D399"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="px-6"
            style={{
              paddingTop: insets.top + 8,
              paddingLeft: insets.left + 24,
              paddingRight: insets.right + 24,
              paddingBottom: 12,
            }}
          >
            <View className="flex-row items-center justify-between">
              <ShimmerBlock
                style={{ width: 40, height: 40, borderRadius: 20 }}
              />
              <ShimmerBlock
                style={{ width: 150, height: 20, borderRadius: 10 }}
              />
              <ShimmerBlock
                style={{ width: 40, height: 40, borderRadius: 20 }}
              />
            </View>
          </LinearGradient>

          {/* Image Skeleton */}
          <ShimmerBlock style={{ width: "100%", height: 280 }} />

          {/* Content Skeleton */}
          <View className="px-4 py-6">
            <ShimmerBlock
              style={{
                width: "80%",
                height: 28,
                borderRadius: 14,
                marginBottom: 12,
              }}
            />
            <ShimmerBlock
              style={{
                width: "100%",
                height: 16,
                borderRadius: 8,
                marginBottom: 8,
              }}
            />
            <ShimmerBlock
              style={{
                width: "60%",
                height: 16,
                borderRadius: 8,
                marginBottom: 24,
              }}
            />

            <View
              style={{ backgroundColor: colors.secondary }}
              className="rounded-2xl p-4 mb-6"
            >
              <ShimmerBlock
                style={{
                  width: "40%",
                  height: 20,
                  borderRadius: 10,
                  marginBottom: 16,
                }}
              />
              <ShimmerBlock
                style={{
                  width: "70%",
                  height: 16,
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              />
              <ShimmerBlock
                style={{
                  width: "50%",
                  height: 16,
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              />
              <ShimmerBlock
                style={{ width: "60%", height: 16, borderRadius: 8 }}
              />
            </View>

            <View className="space-y-3">
              <ShimmerBlock
                style={{ width: "100%", height: 56, borderRadius: 16 }}
              />
              <ShimmerBlock
                style={{ width: "100%", height: 56, borderRadius: 16 }}
              />
            </View>
          </View>
        </View>
      ) : !advertisement ? (
        <View style={{ backgroundColor: colors.background }} className="flex-1">
          <ExpoStatusBar style="light" translucent />
          <View className="flex-1 justify-center items-center px-6">
            <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
            <Text
              className="text-lg font-quicksand-bold mt-4"
              style={{ color: colors.textPrimary }}
            >
              {i18n.t("client.advertisement.error.notFound")}
            </Text>
            <Text
              className="font-quicksand-medium text-center mt-2"
              style={{ color: colors.textSecondary }}
            >
              {i18n.t("client.advertisement.error.notFoundMessage")}
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              className="mt-6 bg-primary-500 py-3 rounded-full"
            >
              <Text className="text-white font-quicksand-bold">
                {i18n.t("client.advertisement.error.back")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ backgroundColor: colors.background }} className="flex-1">
          <ExpoStatusBar style="light" translucent />

          {/* Header amélioré */}
          <LinearGradient
            colors={["#10B981", "#34D399"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              paddingTop: insets.top + 8,
              paddingLeft: insets.left + 24,
              paddingRight: insets.right + 24,
              paddingBottom: 12,
            }}
          >
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
              >
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <Text className="text-lg font-quicksand-bold text-white flex-1 text-center">
                {i18n.t("client.advertisement.header.title")}
              </Text>

              <TouchableOpacity
                onPress={handleShare}
                className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
              >
                <Ionicons name="share-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          >
            {/* Carrousel d'images */}
            <View className="relative">
              <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                className="h-64"
              >
                {advertisement.images && advertisement.images.length > 0 ? (
                  advertisement.images.map((imageUri, index) => (
                    <Image
                      key={index}
                      source={{ uri: imageUri }}
                      className="w-screen h-64"
                      resizeMode="cover"
                    />
                  ))
                ) : (
                  <View
                    style={{ backgroundColor: colors.secondary }}
                    className="w-screen h-64 items-center justify-center"
                  >
                    <Ionicons
                      name="image-outline"
                      size={64}
                      color={colors.textSecondary}
                    />
                    <Text
                      className="mt-2 font-quicksand-medium"
                      style={{ color: colors.textSecondary }}
                    >
                      {i18n.t("client.advertisement.image.notAvailable")}
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Indicateurs d'images */}
              {advertisement.images && advertisement.images.length > 1 && (
                <View className="flex-row justify-center absolute bottom-4 left-0 right-0">
                  {advertisement.images.map((_, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => scrollToImage(index)}
                      className={`w-2 h-2 rounded-full mx-1 ${
                        index === currentImageIndex ? "bg-white" : "bg-white/50"
                      }`}
                    />
                  ))}
                </View>
              )}

              {/* Badge type avec design amélioré */}
              <View
                className="absolute top-4 left-4 bg-primary-500 px-4 py-2 rounded-full shadow-lg"
                style={{ elevation: 3 }}
              >
                <Text className="text-white text-xs font-quicksand-bold uppercase tracking-wider">
                  {advertisement.type}
                </Text>
              </View>

              {/* Badge expiration avec design moderne */}
              <View
                className="absolute top-4 right-4 bg-black/70 px-3 py-2 rounded-full backdrop-blur-sm shadow-lg"
                style={{ elevation: 3 }}
              >
                <View className="flex-row items-center">
                  <Ionicons name="calendar" size={12} color="#FFFFFF" />
                  <Text className="text-white text-xs font-quicksand-semibold ml-1">
                    {formatDate(advertisement.endDate)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Contenu */}
            <View className="px-5 py-6">
              {/* Titre avec design amélioré */}
              <View className="mb-5">
                <Text
                  className="text-2xl font-quicksand-bold leading-tight"
                  style={{ color: colors.textPrimary }}
                >
                  {advertisement.title}
                </Text>
                <View className="h-1 w-16 bg-primary-500 rounded-full mt-3" />
              </View>

              {/* Description avec meilleur espacement */}
              <Text
                className="text-base font-quicksand-medium leading-7 mb-7"
                style={{ color: colors.textSecondary }}
              >
                {advertisement.description}
              </Text>

              {/* Informations avec design carte moderne */}
              <View
                style={{
                  backgroundColor: colors.secondary,
                  borderColor: colors.border,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
                className="rounded-3xl p-5 mb-6 border"
              >
                <View className="flex-row items-center mb-5">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: "#10B98120" }}
                  >
                    <Ionicons
                      name="information-circle"
                      size={20}
                      color="#10B981"
                    />
                  </View>
                  <Text
                    className="text-lg font-quicksand-bold"
                    style={{ color: colors.textPrimary }}
                  >
                    {i18n.t("client.advertisement.info.title")}
                  </Text>
                </View>

                <View>
                  <View
                    style={{ backgroundColor: colors.card }}
                    className="flex-row items-center rounded-xl p-3 shadow-sm mb-3"
                  >
                    <View
                      className="w-9 h-9 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: "#10B98120" }}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color="#10B981"
                      />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-xs font-quicksand-medium mb-1"
                        style={{ color: colors.textSecondary }}
                      >
                        {i18n.t("client.advertisement.info.validity")}
                      </Text>
                      <Text
                        className="text-sm font-quicksand-semibold"
                        numberOfLines={1}
                        style={{ color: colors.textPrimary }}
                      >
                        {i18n.t("client.advertisement.info.validUntil", {
                          date: formatDate(advertisement.endDate),
                        })}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={{ backgroundColor: colors.card }}
                    className="flex-row items-center rounded-xl p-3 shadow-sm"
                  >
                    <View
                      className="w-9 h-9 rounded-full items-center justify-center mr-3"
                      style={{ backgroundColor: "#3B82F620" }}
                    >
                      <Ionicons name="eye-outline" size={18} color="#3B82F6" />
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-xs font-quicksand-medium mb-1"
                        style={{ color: colors.textSecondary }}
                      >
                        {i18n.t("client.advertisement.info.views")}
                      </Text>
                      <Text
                        className="text-sm font-quicksand-semibold"
                        numberOfLines={1}
                        style={{ color: colors.textPrimary }}
                      >
                        {i18n.t("client.advertisement.info.viewsCount", {
                          count: advertisement.views || 0,
                        })}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Boutons d'action avec design moderne et espacement */}
              <View className="mb-6">
                <TouchableOpacity
                  onPress={handleContact}
                  className="bg-primary-500 py-4 rounded-2xl flex-row items-center justify-center shadow-lg mb-3"
                  style={{ elevation: 5 }}
                  activeOpacity={0.8}
                >
                  <View className="w-8 h-8 bg-white/20 rounded-full items-center justify-center mr-2">
                    <Ionicons
                      name="chatbubble-outline"
                      size={16}
                      color="white"
                    />
                  </View>
                  <Text className="text-white font-quicksand-bold text-base">
                    {i18n.t("client.advertisement.actions.contactCompany")}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleShare}
                  style={{
                    backgroundColor: colors.card,
                    borderColor: "#10B981",
                  }}
                  className="py-4 rounded-2xl flex-row items-center justify-center border-2"
                  activeOpacity={0.8}
                >
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center mr-2"
                    style={{ backgroundColor: "#10B98120" }}
                  >
                    <Ionicons name="share-outline" size={16} color="#10B981" />
                  </View>
                  <Text
                    className="font-quicksand-bold text-base"
                    style={{ color: "#10B981" }}
                  >
                    {i18n.t("client.advertisement.actions.shareOffer")}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Note avec design élégant */}
              <View
                style={{
                  backgroundColor: colors.secondary,
                  borderLeftColor: "#F59E0B",
                  borderLeftWidth: 4,
                }}
                className="rounded-2xl p-4 shadow-sm"
              >
                <View className="flex-row items-start">
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center mr-3 mt-0.5"
                    style={{ backgroundColor: "#F59E0B20" }}
                  >
                    <Ionicons name="time-outline" size={16} color="#F59E0B" />
                  </View>
                  <View className="flex-1 pr-1">
                    <Text
                      className="font-quicksand-bold text-base mb-2"
                      style={{ color: colors.textPrimary }}
                    >
                      {i18n.t("client.advertisement.limitedTime.title")}
                    </Text>
                    <Text
                      className="font-quicksand-medium text-sm leading-6"
                      style={{ color: colors.textSecondary }}
                    >
                      {i18n.t("client.advertisement.limitedTime.message")}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Espace pour la navigation bottom */}
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      )}

      {/* Modal d'erreur - Toujours rendu */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-4">
          <View
            style={{ backgroundColor: colors.card }}
            className="rounded-2xl p-6 w-full max-w-sm"
          >
            {/* Icône */}
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-red-100 rounded-full justify-center items-center">
                <Ionicons name="alert-circle" size={32} color="#EF4444" />
              </View>
            </View>

            {/* Titre */}
            <Text
              className="text-xl font-quicksand-bold mb-2 text-center"
              style={{ color: colors.textPrimary }}
            >
              {i18n.t("messages.error")}
            </Text>

            {/* Message */}
            <Text
              className="text-base font-quicksand-medium mb-6 text-center"
              style={{ color: colors.textSecondary }}
            >
              {i18n.t("client.advertisement.error.loading")}
            </Text>

            {/* Bouton */}
            <TouchableOpacity
              className="bg-red-500 rounded-xl py-3"
              onPress={() => {
                setShowErrorModal(false);
                router.back();
              }}
            >
              <Text className="text-white font-quicksand-semibold text-center">
                {i18n.t("client.advertisement.error.modalOk")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
