import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
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
import { useTheme } from "../../../../contexts/ThemeContext";
import i18n from "../../../../i18n/i18n";
import AdvertisementService, {
  CreateAdvertisementPayload,
} from "../../../../services/api/AdvertisementService";

// DateTimePicker custom iOS avec support du mode sombre
const IOSLightDateTimePicker = ({
  value,
  onChange,
  colors,
}: {
  value: Date;
  onChange: (date: Date) => void;
  colors: any;
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  const formatNumber = (n: number) => n.toString().padStart(2, "0");

  const handleHourChange = (hour: number) => {
    const next = new Date(value);
    next.setHours(hour);
    onChange(next);
  };

  const handleMinuteChange = (minute: number) => {
    const next = new Date(value);
    next.setMinutes(minute);
    onChange(next);
  };

  return (
    <View
      style={{
        backgroundColor: colors.card,
        paddingVertical: 16,
        paddingHorizontal: 12,
      }}
    >
      {/* Date affichée */}
      <Text
        style={{
          textAlign: "center",
          color: colors.textPrimary,
          fontFamily: "Quicksand-Bold",
          fontSize: 18,
          marginBottom: 12,
        }}
      >
        {value.toLocaleDateString("fr-FR", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </Text>

      {/* Sélecteur date (calendrier) + heures / minutes */}

      {/* Calendrier personnalisé */}
      <View
        style={{
          marginBottom: 16,
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 16,
        }}
      >
        {/* En-tête du mois */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              const prev = new Date(value);
              prev.setMonth(prev.getMonth() - 1);
              onChange(prev);
            }}
            style={{ padding: 8 }}
          >
            <Text style={{ fontSize: 18, color: colors.textPrimary }}>‹</Text>
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 16,
              fontFamily: "Quicksand-Bold",
              color: colors.textPrimary,
            }}
          >
            {value.toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            })}
          </Text>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              const next = new Date(value);
              next.setMonth(next.getMonth() + 1);
              onChange(next);
            }}
            style={{ padding: 8 }}
          >
            <Text style={{ fontSize: 18, color: colors.textPrimary }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Jours de la semaine */}
        <View style={{ flexDirection: "row", marginBottom: 8 }}>
          {["L", "M", "M", "J", "V", "S", "D"].map((day, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Quicksand-Medium",
                  color: colors.textSecondary,
                }}
              >
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Grille des dates */}
        <View>
          {(() => {
            const year = value.getFullYear();
            const month = value.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Lundi = 0
            const daysInMonth = lastDay.getDate();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const weeks = [];
            let days = [];

            // Jours vides avant le début du mois
            for (let i = 0; i < startDayOfWeek; i++) {
              days.push(
                <View key={`empty-${i}`} style={{ flex: 1, height: 40 }} />
              );
            }

            // Jours du mois
            for (let day = 1; day <= daysInMonth; day++) {
              const date = new Date(year, month, day);
              date.setHours(0, 0, 0, 0);
              const isSelected =
                date.getDate() === value.getDate() &&
                date.getMonth() === value.getMonth() &&
                date.getFullYear() === value.getFullYear();
              const isPast = date < today;
              const isToday = date.getTime() === today.getTime();

              days.push(
                <TouchableOpacity
                  key={day}
                  activeOpacity={1}
                  disabled={isPast}
                  onPress={() => {
                    if (!isPast) {
                      const next = new Date(value);
                      next.setDate(day);
                      onChange(next);
                    }
                  }}
                  style={{
                    flex: 1,
                    height: 40,
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 8,
                    backgroundColor: isSelected ? "#10B981" : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Quicksand-Medium",
                      color: isPast
                        ? colors.textSecondary + "60"
                        : isSelected
                        ? "#FFFFFF"
                        : isToday
                        ? "#10B981"
                        : colors.textPrimary,
                    }}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );

              if (days.length === 7) {
                weeks.push(
                  <View
                    key={`week-${weeks.length}`}
                    style={{ flexDirection: "row", marginBottom: 4 }}
                  >
                    {days}
                  </View>
                );
                days = [];
              }
            }

            // Compléter la dernière semaine si nécessaire
            if (days.length > 0) {
              while (days.length < 7) {
                days.push(
                  <View
                    key={`empty-end-${days.length}`}
                    style={{ flex: 1, height: 40 }}
                  />
                );
              }
              weeks.push(
                <View
                  key={`week-${weeks.length}`}
                  style={{ flexDirection: "row", marginBottom: 4 }}
                >
                  {days}
                </View>
              );
            }

            return weeks;
          })()}
        </View>
      </View>

      {/* Sélecteur heures / minutes */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 24 }}>
        {/* Heures */}
        <View>
          <Text
            style={{
              textAlign: "center",
              color: colors.textSecondary,
              fontFamily: "Quicksand-Medium",
              marginBottom: 8,
            }}
          >
            Heure
          </Text>
          <View
            style={{
              height: 140,
              width: 80,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: "hidden",
            }}
          >
            <ScrollView
              contentContainerStyle={{ paddingVertical: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {hours.map((h) => {
                const selected = h === value.getHours();
                return (
                  <TouchableOpacity
                    key={h}
                    onPress={() => handleHourChange(h)}
                    style={{
                      paddingVertical: 6,
                      alignItems: "center",
                      backgroundColor: selected ? (colors.textPrimary === "#111827" ? "#ECFDF5" : "rgba(16, 185, 129, 0.15)") : "transparent",
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        color: selected ? "#10B981" : colors.textPrimary,
                        fontFamily: selected
                          ? "Quicksand-Bold"
                          : "Quicksand-Medium",
                        fontSize: 16,
                      }}
                    >
                      {formatNumber(h)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Minutes */}
        <View>
          <Text
            style={{
              textAlign: "center",
              color: colors.textSecondary,
              fontFamily: "Quicksand-Medium",
              marginBottom: 8,
            }}
          >
            Minutes
          </Text>
          <View
            style={{
              height: 140,
              width: 80,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: "hidden",
            }}
          >
            <ScrollView
              contentContainerStyle={{ paddingVertical: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {minutes.map((m) => {
                const selected = m === value.getMinutes();
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => handleMinuteChange(m)}
                    style={{
                      paddingVertical: 6,
                      alignItems: "center",
                      backgroundColor: selected ? (colors.textPrimary === "#111827" ? "#ECFDF5" : "rgba(16, 185, 129, 0.15)") : "transparent",
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        color: selected ? "#10B981" : colors.textPrimary,
                        fontFamily: selected
                          ? "Quicksand-Bold"
                          : "Quicksand-Medium",
                        fontSize: 16,
                      }}
                    >
                      {formatNumber(m)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>
    </View>
  );
};

// Image Picker Modal Component (Android uniquement)
interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onPickImage: () => void;
}

function ImagePickerModal({
  visible,
  onClose,
  onTakePhoto,
  onPickImage,
}: ImagePickerModalProps) {
  const { colors } = useTheme();
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 bg-black/50"
        activeOpacity={1}
        onPress={onClose}
      >
        <View className="flex-1 justify-end">
          <TouchableOpacity
            style={{ backgroundColor: colors.card }}
            className="rounded-t-3xl"
            activeOpacity={1}
            onPress={() => {}}
          >
            {/* Handle bar */}
            <View className="w-full items-center pt-3 pb-2">
              <View style={{ backgroundColor: colors.border }} className="w-12 h-1 rounded-full" />
            </View>

            {/* Header */}
            <View style={{ borderBottomColor: colors.border }} className="px-6 pb-4 border-b">
              <Text style={{ color: colors.textPrimary }} className="text-lg font-quicksand-bold">
                {i18n.t("enterprise.advertisementsCreate.imagePicker.title")}
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-sm font-quicksand-medium mt-1">
                {i18n.t("enterprise.advertisementsCreate.imagePicker.subtitle")}
              </Text>
            </View>

            {/* Options */}
            <View className="px-6 py-2">
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  // Petit délai pour laisser le modal se fermer
                  setTimeout(() => {
                    onTakePhoto();
                  }, 100);
                }}
                className="flex-row items-center py-4"
                style={{ borderBottomColor: colors.border }}
              >
              
                <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-4">
                  <Ionicons name="camera" size={20} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-semibold">
                    {i18n.t("enterprise.advertisementsCreate.imagePicker.takePhoto")}
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="text-sm font-quicksand-medium">
                    {i18n.t("enterprise.advertisementsCreate.imagePicker.takePhotoDescription")}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  onClose();
                  // Petit délai pour laisser le modal se fermer
                  setTimeout(() => {
                    onPickImage();
                  }, 100);
                }}
                className="flex-row items-center py-4"
              >
              <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mr-4">
                <Ionicons name="images" size={20} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-semibold">
                  {i18n.t("enterprise.advertisementsCreate.imagePicker.pickFromGallery")}
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-quicksand-medium">
                  {i18n.t("enterprise.advertisementsCreate.imagePicker.pickFromGalleryDescription")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <View className="px-6 pb-6 pt-2">
              <TouchableOpacity
                onPress={onClose}
                style={{ backgroundColor: colors.secondary }}
                className="w-full py-4 rounded-2xl items-center"
              >
                <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-semibold">
                  {i18n.t("enterprise.advertisementsCreate.imagePicker.cancel")}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

export default function CreateAdvertisement() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!params.id;
  const { locale } = useLocale();
  const { colors, isDark } = useTheme();
  const { notification, showNotification, hideNotification } =
    useNotification();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<
    "PROMOTION" | "EVENT" | "ANNOUNCEMENT" | "BANNER"
  >("PROMOTION");
  const [audience, setAudience] = useState<
    "ALL" | "CLIENTS" | "ENTERPRISES" | "DELIVERS"
  >("ALL");
  const [startDate, setStartDate] = useState<Date>(
    new Date(Date.now() + 60 * 60 * 1000)
  ); // +1h
  const [endDate, setEndDate] = useState<Date>(
    new Date(Date.now() + 24 * 60 * 60 * 1000)
  ); // +1 day

  // Android two-phase (date -> time)
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [images, setImages] = useState<string[]>([]);
  const [imagesBase64, setImagesBase64] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);

  // États pour les modals personnalisés iOS
  const [showCustomStartPicker, setShowCustomStartPicker] = useState(false);
  const [showCustomEndPicker, setShowCustomEndPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date>(startDate);
  const [tempEndDate, setTempEndDate] = useState<Date>(endDate);

  // Fonction pour afficher le choix d'image (Alert natif sur iOS, Modal custom sur Android)
  const showImagePickerOptions = () => {
    if (images.length >= 1) {
      showNotification(
        "info",
        i18n.t("enterprise.advertisementsCreate.warnings.limitReached"),
        i18n.t("enterprise.advertisementsCreate.limits.maxImages")
      );
      return;
    }

    if (Platform.OS === "ios") {
      // Sur iOS : utiliser Alert natif (pas de conflit modal)
      Alert.alert(
        i18n.t("enterprise.advertisementsCreate.imagePicker.title"),
        i18n.t("enterprise.advertisementsCreate.imagePicker.subtitle"),
        [
          {
            text: i18n.t("enterprise.advertisementsCreate.imagePicker.takePhoto"),
            onPress: () => takePhoto(),
          },
          {
            text: i18n.t("enterprise.advertisementsCreate.imagePicker.pickFromGallery"),
            onPress: () => pickImage(),
          },
          {
            text: i18n.t("enterprise.advertisementsCreate.imagePicker.cancel"),
            style: "cancel",
          },
        ],
        { cancelable: true }
      );
    } else {
      // Sur Android : utiliser le beau modal custom
      setImagePickerVisible(true);
    }
  };

  const pickImage = async () => {
    if (images.length >= 1) {
      showNotification(
        "info",
        i18n.t("enterprise.advertisementsCreate.warnings.limitReached"),
        i18n.t("enterprise.advertisementsCreate.limits.maxImages")
      );
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showNotification(
        "error",
        i18n.t("enterprise.advertisementsCreate.permissions.galleryDenied"),
        i18n.t("enterprise.advertisementsCreate.permissions.galleryMessage")
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 1], // Ratio pour bannière
      quality: 0.8,
      base64: true, // Important pour iOS !
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.uri;
      const base64Data = asset.base64 || "";

      if (!base64Data) {
        showNotification("error", i18n.t("enterprise.advertisementsCreate.errors.generic"), i18n.t("enterprise.advertisementsCreate.errors.imageRead"));
        return;
      }

      setImages([uri]);
      const ext = uri.split(".").pop()?.toLowerCase();
      const mime = ext === "png" ? "image/png" : "image/jpeg";
      setImagesBase64([`data:${mime};base64,${base64Data}`]);
    }
  };

  const takePhoto = async () => {
    if (images.length >= 1) {
      showNotification(
        "info",
        i18n.t("enterprise.advertisementsCreate.warnings.limitReached"),
        i18n.t("enterprise.advertisementsCreate.limits.maxImages")
      );
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showNotification(
        "error",
        i18n.t("advertisementsCreate.permissions.cameraDenied"),
        i18n.t("advertisementsCreate.permissions.cameraMessage")
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 1],
      quality: 0.8,
      base64: true, // Important pour iOS !
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.uri;
      const base64Data = asset.base64 || "";

      if (!base64Data) {
        showNotification("error", i18n.t("enterprise.advertisementsCreate.errors.generic"), i18n.t("enterprise.advertisementsCreate.errors.photoRead"));
        return;
      }

      setImages([uri]);
      setImagesBase64([
        `data:image/jpeg;base64,${base64Data}`,
      ]);
    }
  };

  const validate = () => {
    if (!title.trim()) return i18n.t("enterprise.advertisementsCreate.errors.titleRequired");
    if (!description.trim()) return i18n.t("enterprise.advertisementsCreate.errors.descriptionRequired");
    if (imagesBase64.length === 0) return i18n.t("enterprise.advertisementsCreate.errors.imageRequired");
    if (endDate <= startDate)
      return i18n.t("enterprise.advertisementsCreate.errors.endBeforeStart");
    if (startDate.getTime() < Date.now())
      return i18n.t("enterprise.advertisementsCreate.errors.startInPast");
    return null;
  };

  const submit = async () => {
    const error = validate();
    if (error) {
      showNotification("error", "Erreur", error);
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateAdvertisementPayload = {
        title: title.trim(),
        description: description.trim(),
        imagesBase64: imagesBase64,
        type,
        targetAudience: audience,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
      await AdvertisementService.create(payload);
      showNotification("success", i18n.t("messages.success"), i18n.t("enterprise.advertisementsCreate.success.created"));
      // Delay navigation to let the user see the notification
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (e: any) {
      showNotification("error", i18n.t("enterprise.advertisementsCreate.errors.generic"), e?.message || i18n.t("enterprise.advertisementsCreate.errors.creationFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />

      {/* Header */}
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
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-xl font-quicksand-bold text-white">
            {isEditing ? i18n.t("enterprise.advertisementsCreate.title.edit") : i18n.t("enterprise.advertisementsCreate.title.create")}
          </Text>
          <View className="w-10 h-10" />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          style={{ backgroundColor: colors.secondary }}
          className="-mt-6 rounded-t-[32px] flex-1 px-4 pt-8"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {/* Image Section */}
          <View>
            <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-semibold mb-3">
              {i18n.t("enterprise.advertisementsCreate.sections.images")}
            </Text>

            {/* Display selected image */}
            {images.length > 0 && (
              <View className="mb-4">
                <View className="relative">
                  <Image
                    source={{ uri: images[0] }}
                    style={{ borderColor: colors.border }}
                    className="w-full h-48 rounded-2xl border"
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() => {
                      setImages([]);
                      setImagesBase64([]);
                    }}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full items-center justify-center shadow-sm"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Add image button */}
            {images.length === 0 && (
              <TouchableOpacity
                onPress={showImagePickerOptions}
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                className="w-full h-32 rounded-2xl items-center justify-center border border-dashed shadow-sm"
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={32} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary }} className="font-quicksand-medium mt-2 text-sm">
                  {i18n.t("enterprise.advertisementsCreate.labels.addImage")}
                </Text>
              </TouchableOpacity>
            )}

            {images.length === 0 && (
              <Text style={{ color: colors.textSecondary }} className="font-quicksand-medium text-xs mt-2 text-center">
                {i18n.t("enterprise.advertisementsCreate.labels.requiredImage")}
              </Text>
            )}
          </View>

          {/* Title Section */}
          <View className="mt-6">
            <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-semibold mb-3">
              {i18n.t("enterprise.advertisementsCreate.sections.title")}
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={i18n.t("enterprise.advertisementsCreate.placeholders.title")}
              style={{ backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.border }}
              className="rounded-2xl px-4 py-4 font-quicksand-medium border shadow-sm"
              placeholderTextColor={colors.textSecondary}
              maxLength={100}
              multiline
              numberOfLines={2}
            />
            <Text style={{ color: colors.textSecondary }} className="text-xs font-quicksand-medium mt-2 text-right">
              {title.length}/{i18n.t("enterprise.advertisementsCreate.limits.titleMax")} {i18n.t("enterprise.advertisementsCreate.labels.characters")}
            </Text>
          </View>

          {/* Description */}
          <View className="mt-6">
            <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-semibold mb-3">
              {i18n.t("enterprise.advertisementsCreate.sections.description")}
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={i18n.t("enterprise.advertisementsCreate.placeholders.description")}
              style={{ backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.border }}
              className="rounded-2xl px-4 py-4 font-quicksand-medium border shadow-sm"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={{ color: colors.textSecondary }} className="text-xs font-quicksand-medium mt-2 text-right">
              {description.length}/{i18n.t("enterprise.advertisementsCreate.limits.descriptionMax")}
            </Text>
          </View>

          {/* Type & Audience */}
          <View className="mt-6 flex-row gap-3">
            <View className="flex-1">
              <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-semibold mb-3">
                {i18n.t("enterprise.advertisementsCreate.sections.type")}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {["PROMOTION", "EVENT", "ANNOUNCEMENT", "BANNER"].map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setType(t as any)}
                    style={{
                      backgroundColor: type === t ? "#10B981" : colors.card,
                      borderColor: type === t ? "#10B981" : colors.border
                    }}
                    className="px-3 py-2 rounded-xl border shadow-sm"
                    activeOpacity={1}
                  >
                    <Text
                      style={{
                        color: type === t ? "#FFFFFF" : colors.textPrimary
                      }}
                      className="text-xs font-quicksand-semibold"
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View className="flex-1">
              <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-semibold mb-3">
                {i18n.t("enterprise.advertisementsCreate.sections.audience")}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {["ALL", "CLIENTS", "ENTERPRISES", "DELIVERS"].map((a) => (
                  <TouchableOpacity
                    key={a}
                    onPress={() => setAudience(a as any)}
                    style={{
                      backgroundColor: audience === a ? "#10B981" : colors.card,
                      borderColor: audience === a ? "#10B981" : colors.border
                    }}
                    className="px-3 py-2 rounded-xl border shadow-sm"
                    activeOpacity={1}
                  >
                    <Text
                      style={{
                        color: audience === a ? "#FFFFFF" : colors.textPrimary
                      }}
                      className="text-xs font-quicksand-semibold"
                    >
                      {a}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Dates */}
          <View className="mt-6">
            <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-semibold mb-3">
              {i18n.t("enterprise.advertisementsCreate.sections.period")}
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === "android") {
                    setShowStartDatePicker(true);
                  } else {
                    setTempStartDate(startDate);
                    setShowCustomStartPicker(true);
                  }
                }}
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                className="flex-1 rounded-2xl px-4 py-4 border shadow-sm"
                activeOpacity={0.7}
              >
                <Text style={{ color: colors.textSecondary }} className="text-xs font-quicksand-medium mb-1">
                  {i18n.t("enterprise.advertisementsCreate.labels.start")}
                </Text>
                <Text style={{ color: colors.textPrimary }} className="font-quicksand-semibold text-sm">
                  {startDate.toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === "android") {
                    setShowEndDatePicker(true);
                  } else {
                    setTempEndDate(endDate);
                    setShowCustomEndPicker(true);
                  }
                }}
                style={{ backgroundColor: colors.card, borderColor: colors.border }}
                className="flex-1 rounded-2xl px-4 py-4 border shadow-sm"
                activeOpacity={0.7}
              >
                <Text style={{ color: colors.textSecondary }} className="text-xs font-quicksand-medium mb-1">
                  {i18n.t("enterprise.advertisementsCreate.labels.end")}
                </Text>
                <Text style={{ color: colors.textPrimary }} className="font-quicksand-semibold text-sm">
                  {endDate.toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}
                </Text>
              </TouchableOpacity>
            </View>
            {/* iOS custom start date picker */}
            {Platform.OS === "ios" && showCustomStartPicker && (
              <Modal
                visible={showCustomStartPicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowCustomStartPicker(false)}
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
                    {/* Header */}
                    <View className="px-6 pt-6 pb-4">
                      <Text style={{ color: colors.textPrimary }} className="text-xl font-quicksand-bold text-center mb-2">
                        Date de début
                      </Text>
                      <Text style={{ color: colors.textSecondary }} className="text-sm font-quicksand-medium text-center">
                        Choisissez la date et l&apos;heure de début
                      </Text>
                    </View>

                    {/* DateTimePicker custom iOS */}
                    <View
                      style={{
                        marginHorizontal: 16,
                        borderRadius: 16,
                        overflow: "hidden",
                        backgroundColor: colors.card,
                      }}
                    >
                      <IOSLightDateTimePicker
                        value={tempStartDate}
                        colors={colors}
                        onChange={(nextDate) => {
                          // Empêcher la sélection d'une date passée
                          const now = new Date();
                          if (nextDate > now) {
                            setTempStartDate(nextDate);
                          }
                        }}
                      />
                    </View>

                    {/* Actions */}
                    <View className="flex-row px-6 py-6 gap-3">
                      <TouchableOpacity
                        onPress={() => setShowCustomStartPicker(false)}
                        style={{ backgroundColor: colors.secondary }}
                        className="flex-1 py-4 rounded-2xl"
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: colors.textPrimary }} className="font-quicksand-bold text-base text-center">
                          Annuler
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setStartDate(tempStartDate);
                          if (tempStartDate >= endDate) {
                            setEndDate(
                              new Date(tempStartDate.getTime() + 60 * 60 * 1000)
                            );
                          }
                          setShowCustomStartPicker(false);
                        }}
                        className="flex-1 py-4 rounded-2xl"
                        style={{ backgroundColor: "#10B981" }}
                        activeOpacity={0.7}
                      >
                        <Text className="text-white font-quicksand-bold text-base text-center">
                          Confirmer
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            )}
            {/* iOS custom end date picker */}
            {Platform.OS === "ios" && showCustomEndPicker && (
              <Modal
                visible={showCustomEndPicker}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowCustomEndPicker(false)}
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
                    {/* Header */}
                    <View className="px-6 pt-6 pb-4">
                      <Text style={{ color: colors.textPrimary }} className="text-xl font-quicksand-bold text-center mb-2">
                        Date de fin
                      </Text>
                      <Text style={{ color: colors.textSecondary }} className="text-sm font-quicksand-medium text-center">
                        Choisissez la date et l&apos;heure de fin
                      </Text>
                    </View>

                    {/* DateTimePicker custom iOS */}
                    <View
                      style={{
                        marginHorizontal: 16,
                        borderRadius: 16,
                        overflow: "hidden",
                        backgroundColor: colors.card,
                      }}
                    >
                      <IOSLightDateTimePicker
                        value={tempEndDate}
                        colors={colors}
                        onChange={(nextDate) => {
                          // Empêcher la sélection d'une date passée ou avant la date de début
                          const minDate = new Date(startDate.getTime() + 30 * 60 * 1000);
                          if (nextDate > minDate) {
                            setTempEndDate(nextDate);
                          }
                        }}
                      />
                    </View>

                    {/* Actions */}
                    <View className="flex-row px-6 py-6 gap-3">
                      <TouchableOpacity
                        onPress={() => setShowCustomEndPicker(false)}
                        style={{ backgroundColor: colors.secondary }}
                        className="flex-1 py-4 rounded-2xl"
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: colors.textPrimary }} className="font-quicksand-bold text-base text-center">
                          Annuler
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setEndDate(tempEndDate);
                          setShowCustomEndPicker(false);
                        }}
                        className="flex-1 py-4 rounded-2xl"
                        style={{ backgroundColor: "#10B981" }}
                        activeOpacity={0.7}
                      >
                        <Text className="text-white font-quicksand-bold text-base text-center">
                          Confirmer
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            )}

            {/* Android: date -> time sequence for start */}
            {Platform.OS === "android" && showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                minimumDate={new Date(Date.now() + 30 * 60 * 1000)}
                mode="date"
                onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                  if (event.type === "dismissed") {
                    setShowStartDatePicker(false);
                    return;
                  }
                  if (selectedDate) {
                    const updated = new Date(selectedDate);
                    updated.setHours(
                      startDate.getHours(),
                      startDate.getMinutes(),
                      0,
                      0
                    );
                    setStartDate(updated);
                    setShowStartDatePicker(false);
                    setShowStartTimePicker(true);
                  }
                }}
              />
            )}
            {Platform.OS === "android" && showStartTimePicker && (
              <DateTimePicker
                value={startDate}
                mode="time"
                onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                  setShowStartTimePicker(false);
                  if (event.type === "dismissed") return;
                  if (selectedDate) {
                    const updated = new Date(startDate);
                    updated.setHours(
                      selectedDate.getHours(),
                      selectedDate.getMinutes(),
                      0,
                      0
                    );
                    setStartDate(updated);
                    if (updated >= endDate) {
                      setEndDate(new Date(updated.getTime() + 60 * 60 * 1000));
                    }
                  }
                }}
              />
            )}

            {/* Android: date -> time sequence for end */}
            {Platform.OS === "android" && showEndDatePicker && (
              <DateTimePicker
                value={endDate}
                minimumDate={new Date(startDate.getTime() + 30 * 60 * 1000)}
                mode="date"
                onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                  if (event.type === "dismissed") {
                    setShowEndDatePicker(false);
                    return;
                  }
                  if (selectedDate) {
                    const updated = new Date(selectedDate);
                    updated.setHours(
                      endDate.getHours(),
                      endDate.getMinutes(),
                      0,
                      0
                    );
                    setEndDate(updated);
                    setShowEndDatePicker(false);
                    setShowEndTimePicker(true);
                  }
                }}
              />
            )}
            {Platform.OS === "android" && showEndTimePicker && (
              <DateTimePicker
                value={endDate}
                mode="time"
                onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                  setShowEndTimePicker(false);
                  if (event.type === "dismissed") return;
                  if (selectedDate) {
                    const updated = new Date(endDate);
                    updated.setHours(
                      selectedDate.getHours(),
                      selectedDate.getMinutes(),
                      0,
                      0
                    );
                    if (updated <= startDate) {
                      showNotification(
                        "info",
                        i18n.t("enterprise.advertisementsCreate.warnings.endBeforeStartTitle"),
                        i18n.t("enterprise.advertisementsCreate.warnings.endBeforeStart")
                      );
                      return;
                    }
                    setEndDate(updated);
                  }
                }}
              />
            )}
          </View>

          {/* Preview Section */}
          {(title.trim() || images.length > 0) && (
            <View className="mt-8">
              <Text style={{ color: colors.textPrimary }} className="text-base font-quicksand-semibold mb-3">
                {i18n.t("enterprise.advertisementsCreate.sections.preview")}
              </Text>
              <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-2xl overflow-hidden border shadow-sm">
                {images.length > 0 ? (
                  <View className="relative">
                    <Image
                      source={{ uri: images[0] }}
                      className="w-full h-32"
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.4)"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      className="absolute inset-0"
                    />
                    <View className="absolute bottom-3 left-3 right-3">
                      <Text
                        className="text-white font-quicksand-bold text-lg"
                        numberOfLines={2}
                      >
                        {title.trim() || i18n.t("enterprise.advertisementsCreate.preview.defaultTitle")}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ backgroundColor: colors.secondary }} className="w-full h-32 items-center justify-center">
                    <Text style={{ color: colors.textSecondary }} className="font-quicksand-medium">
                      {title.trim() || i18n.t("enterprise.advertisementsCreate.preview.defaultText")}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Actions */}
        <View
          style={{ backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }}
          className="absolute bottom-0 left-0 right-0 border-t px-4 py-4"
        >
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={submit}
              disabled={submitting}
              className={`flex-1 rounded-2xl py-4 flex-row items-center justify-center shadow-lg ${
                validate()
                  ? "bg-neutral-300 shadow-neutral-300/20"
                  : "bg-emerald-500 shadow-emerald-500/20"
              }`}
              activeOpacity={0.8}
            >
              {submitting && (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
              )}
              <Text
                className={`font-quicksand-semibold text-base ${
                  !validate() ? "text-white" : "text-neutral-500"
                }`}
              >
                {submitting ? i18n.t("enterprise.advertisementsCreate.buttons.submitting") : i18n.t("enterprise.advertisementsCreate.buttons.create")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

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

      {/* Image Picker Modal (Android uniquement) */}
      {Platform.OS === "android" && (
        <ImagePickerModal
          visible={imagePickerVisible}
          onClose={() => setImagePickerVisible(false)}
          onTakePhoto={takePhoto}
          onPickImage={pickImage}
        />
      )}
    </View>
  );
}
