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
import i18n from "../../../../i18n/i18n";
import AdvertisementService, {
  CreateAdvertisementPayload,
} from "../../../../services/api/AdvertisementService";

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
            className="bg-white rounded-t-3xl"
            activeOpacity={1}
            onPress={() => {}}
          >
            {/* Handle bar */}
            <View className="w-full items-center pt-3 pb-2">
              <View className="w-12 h-1 bg-neutral-300 rounded-full" />
            </View>

            {/* Header */}
            <View className="px-6 pb-4 border-b border-neutral-100">
              <Text className="text-lg font-quicksand-bold text-neutral-800">
                {i18n.t("enterprise.advertisementsCreate.imagePicker.title")}
              </Text>
              <Text className="text-sm text-neutral-500 font-quicksand-medium mt-1">
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
                className="flex-row items-center py-4 border-b border-neutral-50"
              >
                <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-4">
                  <Ionicons name="camera" size={20} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-quicksand-semibold text-neutral-800">
                    {i18n.t("enterprise.advertisementsCreate.imagePicker.takePhoto")}
                  </Text>
                  <Text className="text-sm text-neutral-500 font-quicksand-medium">
                    {i18n.t("enterprise.advertisementsCreate.imagePicker.takePhotoDescription")}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
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
                  <Text className="text-base font-quicksand-semibold text-neutral-800">
                    {i18n.t("enterprise.advertisementsCreate.imagePicker.pickFromGallery")}
                  </Text>
                  <Text className="text-sm text-neutral-500 font-quicksand-medium">
                    {i18n.t("enterprise.advertisementsCreate.imagePicker.pickFromGalleryDescription")}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Cancel Button */}
            <View className="px-6 pb-6 pt-2">
              <TouchableOpacity
                onPress={onClose}
                className="w-full bg-neutral-100 py-4 rounded-2xl items-center"
              >
                <Text className="text-base font-quicksand-semibold text-neutral-700">
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

  // iOS combined pickers
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Android two-phase (date -> time)
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [images, setImages] = useState<string[]>([]);
  const [imagesBase64, setImagesBase64] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);

  // Fonction pour afficher le choix d'image (Alert natif sur iOS, Modal custom sur Android)
  const showImagePickerOptions = () => {
    if (images.length >= 4) {
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
    if (images.length >= 4) {
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

      setImages((prev) => [...prev, uri]);
      const ext = uri.split(".").pop()?.toLowerCase();
      const mime = ext === "png" ? "image/png" : "image/jpeg";
      setImagesBase64((prev) => [...prev, `data:${mime};base64,${base64Data}`]);
    }
  };

  const takePhoto = async () => {
    if (images.length >= 4) {
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

      setImages((prev) => [...prev, uri]);
      setImagesBase64((prev) => [
        ...prev,
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
    <View className="flex-1 bg-background-secondary">
      <ExpoStatusBar style="light" translucent />

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
          className="-mt-6 rounded-t-[32px] bg-background-secondary flex-1 px-4 pt-8"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {/* Image Section */}
          <View>
            <Text className="text-base font-quicksand-semibold text-neutral-800 mb-3">
              {i18n.t("enterprise.advertisementsCreate.sections.images")}
            </Text>

            {/* Display selected images */}
            {images.length > 0 && (
              <View className="mb-4">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="gap-3"
                >
                  {images.map((imgUri, index) => (
                    <View key={index} className="relative mr-3">
                      <Image
                        source={{ uri: imgUri }}
                        className="w-24 h-24 rounded-2xl border border-neutral-200"
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        onPress={() => {
                          setImages((prev) =>
                            prev.filter((_, i) => i !== index)
                          );
                          setImagesBase64((prev) =>
                            prev.filter((_, i) => i !== index)
                          );
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full items-center justify-center shadow-sm"
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                      {index === 0 && (
                        <View className="absolute bottom-1 left-1 bg-emerald-500 px-1.5 py-0.5 rounded">
                          <Text className="text-xs font-quicksand-bold text-white">
                            {i18n.t("enterprise.advertisementsCreate.labels.principal")}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Add image button */}
            {images.length < 4 && (
              <TouchableOpacity
                onPress={showImagePickerOptions}
                className="w-full h-24 bg-white rounded-2xl items-center justify-center border border-dashed border-neutral-300 shadow-sm"
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={32} color="#9CA3AF" />
                <Text className="text-neutral-500 font-quicksand-medium mt-2 text-sm">
                  {i18n.t("enterprise.advertisementsCreate.labels.addImage")} ({images.length}/4)
                </Text>
              </TouchableOpacity>
            )}

            {images.length === 0 && (
              <Text className="text-neutral-400 font-quicksand-medium text-xs mt-2 text-center">
                {i18n.t("enterprise.advertisementsCreate.labels.requiredImage")}
              </Text>
            )}
          </View>

          {/* Title Section */}
          <View className="mt-6">
            <Text className="text-base font-quicksand-semibold text-neutral-800 mb-3">
              {i18n.t("enterprise.advertisementsCreate.sections.title")}
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={i18n.t("enterprise.advertisementsCreate.placeholders.title")}
              className="bg-white rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border border-neutral-200 shadow-sm"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
              multiline
              numberOfLines={2}
            />
            <Text className="text-xs text-neutral-500 font-quicksand-medium mt-2 text-right">
              {title.length}/{i18n.t("enterprise.advertisementsCreate.limits.titleMax")} {i18n.t("enterprise.advertisementsCreate.labels.characters")}
            </Text>
          </View>

          {/* Description */}
          <View className="mt-6">
            <Text className="text-base font-quicksand-semibold text-neutral-800 mb-3">
              {i18n.t("enterprise.advertisementsCreate.sections.description")}
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={i18n.t("enterprise.advertisementsCreate.placeholders.description")}
              className="bg-white rounded-2xl px-4 py-4 text-neutral-800 font-quicksand-medium border border-neutral-200 shadow-sm"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text className="text-xs text-neutral-500 font-quicksand-medium mt-2 text-right">
              {description.length}/{i18n.t("enterprise.advertisementsCreate.limits.descriptionMax")}
            </Text>
          </View>

          {/* Type & Audience */}
          <View className="mt-6 flex-row gap-3">
            <View className="flex-1">
              <Text className="text-base font-quicksand-semibold text-neutral-800 mb-3">
                {i18n.t("enterprise.advertisementsCreate.sections.type")}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {["PROMOTION", "EVENT", "ANNOUNCEMENT", "BANNER"].map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setType(t as any)}
                    className={`px-3 py-2 rounded-xl border shadow-sm ${
                      type === t
                        ? "bg-emerald-500 border-emerald-500"
                        : "bg-white border-neutral-200"
                    }`}
                    activeOpacity={1}
                  >
                    <Text
                      className={`text-xs font-quicksand-semibold ${
                        type === t ? "text-white" : "text-neutral-700"
                      }`}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-base font-quicksand-semibold text-neutral-800 mb-3">
                {i18n.t("enterprise.advertisementsCreate.sections.audience")}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {["ALL", "CLIENTS", "ENTERPRISES", "DELIVERS"].map((a) => (
                  <TouchableOpacity
                    key={a}
                    onPress={() => setAudience(a as any)}
                    className={`px-3 py-2 rounded-xl border shadow-sm ${
                      audience === a
                        ? "bg-emerald-500 border-emerald-500"
                        : "bg-white border-neutral-200"
                    }`}
                    activeOpacity={1}
                  >
                    <Text
                      className={`text-xs font-quicksand-semibold ${
                        audience === a ? "text-white" : "text-neutral-700"
                      }`}
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
            <Text className="text-base font-quicksand-semibold text-neutral-800 mb-3">
              {i18n.t("enterprise.advertisementsCreate.sections.period")}
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === "android") {
                    setShowStartDatePicker(true);
                  } else {
                    setShowStartPicker(true);
                  }
                }}
                className="flex-1 bg-white rounded-2xl px-4 py-4 border border-neutral-200 shadow-sm"
                activeOpacity={0.7}
              >
                <Text className="text-xs text-neutral-500 font-quicksand-medium mb-1">
                  {i18n.t("enterprise.advertisementsCreate.labels.start")}
                </Text>
                <Text className="text-neutral-800 font-quicksand-semibold text-sm">
                  {startDate.toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === "android") {
                    setShowEndDatePicker(true);
                  } else {
                    setShowEndPicker(true);
                  }
                }}
                className="flex-1 bg-white rounded-2xl px-4 py-4 border border-neutral-200 shadow-sm"
                activeOpacity={0.7}
              >
                <Text className="text-xs text-neutral-500 font-quicksand-medium mb-1">
                  {i18n.t("enterprise.advertisementsCreate.labels.end")}
                </Text>
                <Text className="text-neutral-800 font-quicksand-semibold text-sm">
                  {endDate.toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}
                </Text>
              </TouchableOpacity>
            </View>
            {/* iOS combined pickers */}
            {Platform.OS === "ios" && showStartPicker && (
              <DateTimePicker
                value={startDate}
                minimumDate={new Date(Date.now() + 30 * 60 * 1000)}
                mode="datetime"
                onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                  setShowStartPicker(false);
                  if (event.type === "dismissed") return;
                  if (selectedDate) {
                    setStartDate(selectedDate);
                    if (selectedDate >= endDate) {
                      setEndDate(
                        new Date(selectedDate.getTime() + 60 * 60 * 1000)
                      );
                    }
                  }
                }}
              />
            )}
            {Platform.OS === "ios" && showEndPicker && (
              <DateTimePicker
                value={endDate}
                minimumDate={new Date(startDate.getTime() + 30 * 60 * 1000)}
                mode="datetime"
                onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                  setShowEndPicker(false);
                  if (event.type === "dismissed") return;
                  if (selectedDate) setEndDate(selectedDate);
                }}
              />
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
              <Text className="text-base font-quicksand-semibold text-neutral-800 mb-3">
                {i18n.t("enterprise.advertisementsCreate.sections.preview")}
              </Text>
              <View className="bg-white rounded-2xl overflow-hidden border border-neutral-100 shadow-sm">
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
                  <View className="w-full h-32 bg-neutral-100 items-center justify-center">
                    <Text className="text-neutral-600 font-quicksand-medium">
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
          className="absolute bottom-0 left-0 right-0 bg-white border-t border-neutral-100 px-4 py-4"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
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
