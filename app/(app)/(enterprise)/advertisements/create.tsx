import { Ionicons } from "@expo/vector-icons";
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
import { useToast } from "../../../../components/ui/ReanimatedToast/context";
import { useLocale } from "../../../../contexts/LocaleContext";
import { useTheme } from "../../../../contexts/ThemeContext";
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
              <Text style={{ color: colors.textPrimary }} className="text-lg font-jakarta-bold">
                {i18n.t("enterprise.advertisementsCreate.imagePicker.title")}
              </Text>
              <Text style={{ color: colors.textSecondary }} className="text-sm font-jakarta-medium mt-1">
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
                  <Text style={{ color: colors.textPrimary }} className="text-base font-jakarta-semibold">
                    {i18n.t("enterprise.advertisementsCreate.imagePicker.takePhoto")}
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="text-sm font-jakarta-medium">
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
                <Text style={{ color: colors.textPrimary }} className="text-base font-jakarta-semibold">
                  {i18n.t("enterprise.advertisementsCreate.imagePicker.pickFromGallery")}
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-jakarta-medium">
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
                <Text style={{ color: colors.textPrimary }} className="text-base font-jakarta-semibold">
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
  useLocale();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<
    "PROMOTION" | "EVENT" | "ANNOUNCEMENT" | "BANNER"
  >("PROMOTION");
  const [audience, setAudience] = useState<
    "ALL" | "CLIENTS" | "ENTERPRISES" | "DELIVERS"
  >("ALL");
  const [images, setImages] = useState<string[]>([]);
  const [imagesBase64, setImagesBase64] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);

  // Fonction pour afficher le choix d'image (Alert natif sur iOS, Modal custom sur Android)
  const showImagePickerOptions = () => {
    if (images.length >= 1) {
      showToast({
        variant: "info",
        title: i18n.t("enterprise.advertisementsCreate.warnings.limitReached"),
        subtitle: i18n.t("enterprise.advertisementsCreate.limits.maxImages"),
      });
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
      showToast({
        variant: "info",
        title: i18n.t("enterprise.advertisementsCreate.warnings.limitReached"),
        subtitle: i18n.t("enterprise.advertisementsCreate.limits.maxImages"),
      });
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showToast({
        variant: "error",
        title: i18n.t("enterprise.advertisementsCreate.permissions.galleryDenied"),
        subtitle: i18n.t("enterprise.advertisementsCreate.permissions.galleryMessage"),
      });
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
        showToast({
          variant: "error",
          title: i18n.t("enterprise.advertisementsCreate.errors.generic"),
          subtitle: i18n.t("enterprise.advertisementsCreate.errors.imageRead"),
        });
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
      showToast({
        variant: "info",
        title: i18n.t("enterprise.advertisementsCreate.warnings.limitReached"),
        subtitle: i18n.t("enterprise.advertisementsCreate.limits.maxImages"),
      });
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showToast({
        variant: "error",
        title: i18n.t("advertisementsCreate.permissions.cameraDenied"),
        subtitle: i18n.t("advertisementsCreate.permissions.cameraMessage"),
      });
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
        showToast({
          variant: "error",
          title: i18n.t("enterprise.advertisementsCreate.errors.generic"),
          subtitle: i18n.t("enterprise.advertisementsCreate.errors.photoRead"),
        });
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
    return null;
  };

  const submit = async () => {
    const error = validate();
    if (error) {
      showToast({ variant: "error", title: "Erreur", subtitle: error });
      return;
    }
    setSubmitting(true);
    try {
      const now = new Date();
      const payload: CreateAdvertisementPayload = {
        title: title.trim(),
        description: description.trim(),
        imagesBase64: imagesBase64,
        type,
        targetAudience: audience,
        startDate: now.toISOString(),
        endDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      };
      await AdvertisementService.create(payload);
      showToast({
        variant: "success",
        title: i18n.t("messages.success"),
        subtitle: i18n.t("enterprise.advertisementsCreate.success.created"),
      });
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (e: any) {
      showToast({
        variant: "error",
        title: i18n.t("enterprise.advertisementsCreate.errors.generic"),
        subtitle: e?.message || i18n.t("enterprise.advertisementsCreate.errors.creationFailed"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />

      <View style={{
        backgroundColor: colors.surface,
        paddingTop: insets.top + 8,
        paddingHorizontal: 20,
        paddingBottom: 14,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.tertiary, alignItems: 'center', justifyContent: 'center' }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 18, color: colors.textPrimary }}>
            {isEditing ? i18n.t("enterprise.advertisementsCreate.title.edit") : i18n.t("enterprise.advertisementsCreate.title.create")}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          style={{ backgroundColor: colors.secondary }}
          className="flex-1 px-4 pt-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {/* Image Section */}
          <View>
            <Text style={{ color: colors.textPrimary }} className="text-base font-jakarta-semibold mb-3">
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
                    className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full items-center justify-center"
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
                className="w-full h-32 rounded-2xl items-center justify-center border border-dashed"
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={32} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary }} className="font-jakarta-medium mt-2 text-sm">
                  {i18n.t("enterprise.advertisementsCreate.labels.addImage")}
                </Text>
              </TouchableOpacity>
            )}

            {images.length === 0 && (
              <Text style={{ color: colors.textSecondary }} className="font-jakarta-medium text-xs mt-2 text-center">
                {i18n.t("enterprise.advertisementsCreate.labels.requiredImage")}
              </Text>
            )}
          </View>

          {/* Title Section */}
          <View className="mt-6">
            <Text style={{ color: colors.textPrimary }} className="text-base font-jakarta-semibold mb-3">
              {i18n.t("enterprise.advertisementsCreate.sections.title")}
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={i18n.t("enterprise.advertisementsCreate.placeholders.title")}
              style={{ backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.border }}
              className="rounded-2xl px-4 py-4 font-jakarta-medium border"
              placeholderTextColor={colors.textSecondary}
              maxLength={100}
              multiline
              numberOfLines={2}
            />
            <Text style={{ color: colors.textSecondary }} className="text-xs font-jakarta-medium mt-2 text-right">
              {title.length}/{i18n.t("enterprise.advertisementsCreate.limits.titleMax")} {i18n.t("enterprise.advertisementsCreate.labels.characters")}
            </Text>
          </View>

          {/* Description */}
          <View className="mt-6">
            <Text style={{ color: colors.textPrimary }} className="text-base font-jakarta-semibold mb-3">
              {i18n.t("enterprise.advertisementsCreate.sections.description")}
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={i18n.t("enterprise.advertisementsCreate.placeholders.description")}
              style={{ backgroundColor: colors.card, color: colors.textPrimary, borderColor: colors.border }}
              className="rounded-2xl px-4 py-4 font-jakarta-medium border"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={{ color: colors.textSecondary }} className="text-xs font-jakarta-medium mt-2 text-right">
              {description.length}/{i18n.t("enterprise.advertisementsCreate.limits.descriptionMax")}
            </Text>
          </View>

          {/* Type & Audience */}
          <View className="mt-6 flex-row gap-3">
            <View className="flex-1">
              <Text style={{ color: colors.textPrimary }} className="text-base font-jakarta-semibold mb-3">
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
                    className="px-3 py-2 rounded-xl border"
                    activeOpacity={1}
                  >
                    <Text
                      style={{
                        color: type === t ? "#FFFFFF" : colors.textPrimary
                      }}
                      className="text-xs font-jakarta-semibold"
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View className="flex-1">
              <Text style={{ color: colors.textPrimary }} className="text-base font-jakarta-semibold mb-3">
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
                    className="px-3 py-2 rounded-xl border"
                    activeOpacity={1}
                  >
                    <Text
                      style={{
                        color: audience === a ? "#FFFFFF" : colors.textPrimary
                      }}
                      className="text-xs font-jakarta-semibold"
                    >
                      {a}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Info: la publicité démarre immédiatement et dure 24h */}
          <View className="mt-6">
            <View
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
              className="rounded-2xl px-4 py-4 border flex-row items-center"
            >
              <Ionicons name="time-outline" size={20} color="#10B981" style={{ marginRight: 12 }} />
              <Text style={{ color: colors.textSecondary }} className="font-jakarta-medium text-sm flex-1">
                {i18n.t("enterprise.advertisementsCreate.labels.autoStart", { defaultValue: "La publicité démarre immédiatement et reste active pendant 24h." })}
              </Text>
            </View>
          </View>

          {/* Preview Section */}
          {(title.trim() || images.length > 0) && (
            <View className="mt-8">
              <Text style={{ color: colors.textPrimary }} className="text-base font-jakarta-semibold mb-3">
                {i18n.t("enterprise.advertisementsCreate.sections.preview")}
              </Text>
              <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-2xl overflow-hidden border">
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
                        className="text-white font-jakarta-bold text-lg"
                        numberOfLines={2}
                      >
                        {title.trim() || i18n.t("enterprise.advertisementsCreate.preview.defaultTitle")}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ backgroundColor: colors.secondary }} className="w-full h-32 items-center justify-center">
                    <Text style={{ color: colors.textSecondary }} className="font-jakarta-medium">
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
              className={`flex-1 rounded-2xl py-4 flex-row items-center justify-center ${
                validate()
                  ? "bg-neutral-300"
                  : "bg-emerald-500"
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
                className={`font-jakarta-semibold text-base ${
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
