import { AppHeader } from "@/components/ui/AppHeader";
import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useToast as useReanimatedToast } from "../../../../components/ui/ReanimatedToast/context";
import i18n from "../../../../i18n/i18n";
import EnterpriseService from "../../../../services/api/EnterpriseService";

export default function EditProfilePage() {
  const { colors, isDark } = useTheme();
  const { showToast } = useReanimatedToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  useEffect(() => {
    EnterpriseService.getProfile()
      .then((data) => {
        setFirstName(data.user.firstName || "");
        setLastName(data.user.lastName || "");
        setPhone(data.user.phone || "");
        setAddress(data.user.address || "");
        setCurrentImage(data.user.profileImage || null);
      })
      .catch(() => {
        showToast({ title: i18n.t("messages.error"), autodismiss: true });
      })
      .finally(() => setLoading(false));
  }, []);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast({
        title: i18n.t("enterprise.profile.modals.editProfile.permission.title"),
        subtitle: i18n.t("enterprise.profile.modals.editProfile.permission.subtitle"),
        autodismiss: true,
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await EnterpriseService.updateUserProfileWithImage(
        { firstName, lastName, phone, address },
        imageBase64 || undefined
      );
      showToast({
        title: i18n.t("enterprise.profile.modals.editProfile.success"),
        autodismiss: true,
      });
      router.back();
    } catch (err: any) {
      showToast({
        title: i18n.t("messages.error"),
        subtitle: err.message || i18n.t("enterprise.profile.modals.editProfile.error"),
        autodismiss: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const avatarUri = selectedImage || currentImage;
  const initials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "?";

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} />
      <AppHeader
        title={i18n.t("enterprise.profile.modals.editProfile.title")}
        onBack={() => router.back()}
        rightElement={
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: colors.brandPrimary,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 13, color: "#FFFFFF" }}>
                  {i18n.t("enterprise.profile.modals.editProfile.save")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : (
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar picker */}
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <TouchableOpacity onPress={pickImage} style={{ position: "relative" }}>
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={{ width: 100, height: 100, borderRadius: 50 }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: colors.brandPrimary,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontFamily: "Poppins-Bold", fontSize: 34, color: "#FFFFFF" }}>
                    {initials}
                  </Text>
                </View>
              )}
              <View
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.brandPrimary,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: colors.secondary,
                }}
              >
                <Ionicons name="camera" size={15} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={{ fontFamily: "Poppins-Medium", fontSize: 13, color: colors.textSecondary, marginTop: 10 }}>
              {i18n.t("enterprise.profile.modals.editProfile.changePhoto")}
            </Text>
          </View>

          {/* Form */}
          <View style={{ gap: 16 }}>
            <View>
              <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 13, color: colors.textPrimary, marginBottom: 8 }}>
                {i18n.t("enterprise.profile.modals.editProfile.firstName")}
              </Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder={i18n.t("enterprise.profile.modals.editProfile.placeholders.firstName")}
                placeholderTextColor={colors.textTertiary}
                style={{
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: Platform.OS === "ios" ? 14 : 10,
                  fontFamily: "Poppins-Regular",
                  fontSize: 15,
                  color: colors.textPrimary,
                }}
              />
            </View>

            <View>
              <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 13, color: colors.textPrimary, marginBottom: 8 }}>
                {i18n.t("enterprise.profile.modals.editProfile.lastName")}
              </Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder={i18n.t("enterprise.profile.modals.editProfile.placeholders.lastName")}
                placeholderTextColor={colors.textTertiary}
                style={{
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: Platform.OS === "ios" ? 14 : 10,
                  fontFamily: "Poppins-Regular",
                  fontSize: 15,
                  color: colors.textPrimary,
                }}
              />
            </View>

            <View>
              <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 13, color: colors.textPrimary, marginBottom: 8 }}>
                {i18n.t("enterprise.profile.modals.editProfile.phone")}
              </Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder={i18n.t("enterprise.profile.modals.editProfile.placeholders.phone")}
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
                style={{
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: Platform.OS === "ios" ? 14 : 10,
                  fontFamily: "Poppins-Regular",
                  fontSize: 15,
                  color: colors.textPrimary,
                }}
              />
            </View>

            <View>
              <Text style={{ fontFamily: "Poppins-SemiBold", fontSize: 13, color: colors.textPrimary, marginBottom: 8 }}>
                {i18n.t("enterprise.profile.modals.editProfile.address")}
              </Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder={i18n.t("enterprise.profile.modals.editProfile.placeholders.address")}
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={{
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontFamily: "Poppins-Regular",
                  fontSize: 15,
                  color: colors.textPrimary,
                  minHeight: 90,
                }}
              />
            </View>
          </View>
        </KeyboardAwareScrollView>
      )}
    </View>
  );
}
