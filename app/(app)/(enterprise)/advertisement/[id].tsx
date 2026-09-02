import { AppHeader } from "@/components/ui/AppHeader";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../../../contexts/ThemeContext";
import { ErrorState } from "../../../../components/ui/ErrorState";
import i18n from "../../../../i18n/i18n";
import AdvertisementService, {
  Advertisement,
} from "../../../../services/api/AdvertisementService";
import { createPublicAdvertisementShareUrl } from "../../../../utils/AppLinks";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function AdvertisementDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [advertisement, setAdvertisement] = useState<Advertisement | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  // État pour le modal d'erreur
  const [errorModal, setErrorModal] = useState(false);

  useEffect(() => {
    const loadAdvertisementDetails = async () => {
      try {
        setLoading(true);
        const adData = await AdvertisementService.getActiveAdvertisementById(
          id!,
        );
        console.log("✅ Publicité chargée:", JSON.stringify(adData, null, 2));
        setAdvertisement(adData);
      } catch (error) {
        console.error("❌ Erreur chargement publicité:", error);
        setErrorModal(true);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadAdvertisementDetails();
    }
  }, [id, router]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const handleShare = async () => {
    if (!advertisement) return;

    try {
      const message = `${i18n.t(
        "enterprise.advertisementDetails.share.message",
        {
          title: advertisement.title,
          description: advertisement.description,
          date: formatDate(advertisement.endDate),
        },
      )}\n${createPublicAdvertisementShareUrl(advertisement._id)}`;

      await Share.share({
        message,
      });
    } catch (error) {
      console.error("Erreur partage:", error);
    }
  };

  const handleContact = () => {
    if (!advertisement || !advertisement.createdBy?.enterprise) return;

    // Navigate to the enterprise page
    router.push(
      `/(app)/(enterprise)/(tabs)/enterprise/${advertisement.createdBy.enterprise}`,
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

  if (loading) {
    return (
      <View style={{ backgroundColor: colors.background }} className="flex-1">
        <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />

        <AppHeader title={i18n.t("enterprise.advertisementDetails.header.title")} />

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
    );
  }

  if (!advertisement) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />
        <ErrorState
          variant="notFound"
          title={i18n.t("enterprise.advertisementDetails.notFound.title")}
          message={i18n.t("enterprise.advertisementDetails.notFound.message")}
          onSecondary={() => router.back()}
          secondaryLabel={i18n.t("enterprise.advertisementDetails.notFound.backButton")}
        />
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: colors.background }} className="flex-1">
      <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />

      <AppHeader
        title={i18n.t("enterprise.advertisementDetails.header.title")}
        rightElement={
          <TouchableOpacity
            onPress={handleShare}
            style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.tertiary, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="share-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        }
      />

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
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.95}
                  onPress={() => {
                    setCurrentImageIndex(index);
                    setImageModalVisible(true);
                  }}
                >
                  <Image
                    source={{ uri: imageUri }}
                    className="w-screen h-64"
                    resizeMode="cover"
                  />
                </TouchableOpacity>
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
                  className="mt-2 font-jakarta-medium"
                  style={{ color: colors.textSecondary }}
                >
                  {i18n.t("enterprise.advertisementDetails.imageUnavailable")}
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
            <Text className="text-white text-xs font-jakarta-bold uppercase tracking-wider">
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
              <Text className="text-white text-xs font-jakarta-semibold ml-1">
                {formatDate(advertisement.endDate)}
              </Text>
            </View>
          </View>

          {advertisement.images && advertisement.images.length > 0 && (
            <TouchableOpacity
              onPress={() => setImageModalVisible(true)}
              className="absolute bottom-4 right-4 bg-black/60 px-3 py-2 rounded-full flex-row items-center"
              activeOpacity={0.8}
            >
              <Ionicons name="images-outline" size={14} color="#FFFFFF" />
              <Text className="text-white text-xs font-jakarta-semibold ml-1">
                Voir
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Contenu */}
        <View style={{ paddingHorizontal: 20, paddingTop: 24, gap: 20 }}>
          {/* Titre */}
          <View>
            <Text style={{ color: colors.textPrimary, fontFamily: 'PlusJakartaSans-Bold', fontSize: 22, lineHeight: 30 }}>
              {advertisement.title}
            </Text>
            <View style={{ height: 3, width: 48, backgroundColor: '#10B981', borderRadius: 2, marginTop: 10 }} />
          </View>

          {/* Description */}
          <Text style={{ color: colors.textSecondary, fontFamily: 'PlusJakartaSans-Medium', fontSize: 15, lineHeight: 24 }}>
            {advertisement.description}
          </Text>

          {/* Informations */}
          <View style={{ backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#10B98118', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name="information-circle" size={18} color="#10B981" />
              </View>
              <Text style={{ color: colors.textPrimary, fontFamily: 'PlusJakartaSans-Bold', fontSize: 15 }}>
                {i18n.t("enterprise.advertisementDetails.info.title")}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#10B98118', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name="calendar-outline" size={17} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textSecondary, fontFamily: 'PlusJakartaSans-Medium', fontSize: 12, marginBottom: 2 }}>
                  {i18n.t("enterprise.advertisementDetails.info.validity")}
                </Text>
                <Text style={{ color: colors.textPrimary, fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 14 }}>
                  {i18n.t("enterprise.advertisementDetails.info.validUntil", { date: formatDate(advertisement.endDate) })}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#3B82F618', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Ionicons name="eye-outline" size={17} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textSecondary, fontFamily: 'PlusJakartaSans-Medium', fontSize: 12, marginBottom: 2 }}>
                  {i18n.t("enterprise.advertisementDetails.info.views")}
                </Text>
                <Text style={{ color: colors.textPrimary, fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 14 }}>
                  {i18n.t("enterprise.advertisementDetails.info.viewsCount", { count: advertisement.views || 0 })}
                </Text>
              </View>
            </View>
          </View>

          {/* Boutons d'action */}
          <View style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={handleContact}
              style={{ backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
              activeOpacity={0.85}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={{ color: '#FFFFFF', fontFamily: 'PlusJakartaSans-Bold', fontSize: 15 }}>
                {i18n.t("enterprise.advertisementDetails.actions.contact")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleShare}
              style={{ backgroundColor: colors.card, borderRadius: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#10B981' }}
              activeOpacity={0.85}
            >
              <Ionicons name="share-outline" size={18} color="#10B981" style={{ marginRight: 8 }} />
              <Text style={{ color: '#10B981', fontFamily: 'PlusJakartaSans-Bold', fontSize: 15 }}>
                {i18n.t("enterprise.advertisementDetails.actions.share")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Note */}
          <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#10B98118', alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 }}>
              <Ionicons name="time-outline" size={17} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontFamily: 'PlusJakartaSans-Bold', fontSize: 14, marginBottom: 6 }}>
                {i18n.t("enterprise.advertisementDetails.limitedOffer.title")}
              </Text>
              <Text style={{ color: colors.textSecondary, fontFamily: 'PlusJakartaSans-Medium', fontSize: 13, lineHeight: 20 }}>
                {i18n.t("enterprise.advertisementDetails.limitedOffer.message")}
              </Text>
            </View>
          </View>
        </View>

        {/* Espace pour la navigation bottom */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Modal d'erreur */}
      <Modal
        visible={errorModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setErrorModal(false);
          router.back();
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {
            setErrorModal(false);
            router.back();
          }}
          className="flex-1 bg-black/50 justify-center items-center px-6"
        >
          <TouchableOpacity
            activeOpacity={1}
            style={{ backgroundColor: colors.card }}
            className="rounded-3xl p-6 w-full max-w-sm"
          >
            {/* Icon d'erreur */}
            <View className="items-center mb-4">
              <View
                className="w-16 h-16 rounded-full justify-center items-center"
                style={{ backgroundColor: "#EF444420" }}
              >
                <Ionicons name="alert-circle" size={32} color="#EF4444" />
              </View>
            </View>

            {/* Titre */}
            <Text
              className="text-xl font-jakarta-bold text-center mb-2"
              style={{ color: colors.textPrimary }}
            >
              {i18n.t("enterprise.advertisementDetails.errorModal.title")}
            </Text>

            {/* Message */}
            <Text
              className="text-base font-jakarta-medium text-center mb-6"
              style={{ color: colors.textSecondary }}
            >
              {i18n.t("enterprise.advertisementDetails.errorModal.message")}
            </Text>

            {/* Bouton OK */}
            <TouchableOpacity
              onPress={() => {
                setErrorModal(false);
                router.back();
              }}
              className="py-3 rounded-xl"
              style={{ backgroundColor: "#10B981" }}
              activeOpacity={0.7}
            >
              <Text className="text-white font-jakarta-bold text-center">
                {i18n.t("enterprise.advertisementDetails.errorModal.ok")}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Visionneur d'images */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View className="flex-1 bg-black/95">
          <View
            className="absolute top-0 left-0 right-0"
            style={{ paddingTop: insets.top + 8, zIndex: 10 }}
          >
            <View className="flex-row justify-between items-center px-4 pb-2">
              <TouchableOpacity
                onPress={() => setImageModalVisible(false)}
                className="w-10 h-10 bg-white/15 rounded-full justify-center items-center"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text className="text-white font-jakarta-medium">
                {currentImageIndex + 1}/{advertisement?.images?.length || 0}
              </Text>
              <View className="w-10" />
            </View>
          </View>

          <FlatList
            data={advertisement?.images || []}
            renderItem={({ item }) => (
              <View
                style={{
                  width: screenWidth,
                  alignItems: "center",
                  justifyContent: "center",
                  height: screenHeight,
                }}
              >
                <Image
                  source={{ uri: item }}
                  style={{ width: screenWidth, height: screenWidth }}
                  resizeMode="contain"
                />
              </View>
            )}
            keyExtractor={(item, index) => `full-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={currentImageIndex}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(
                e.nativeEvent.contentOffset.x / screenWidth,
              );
              setCurrentImageIndex(newIndex);
            }}
            onScrollToIndexFailed={() => {
              setTimeout(() => {}, 100);
            }}
          />
        </View>
      </Modal>
    </View>
  );
}
