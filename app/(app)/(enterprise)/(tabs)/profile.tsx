import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
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
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// New Reanimated toast system only
import { useToast as useReanimatedToast } from "../../../../components/ui/ReanimatedToast/context";
import { useAuth } from "../../../../contexts/AuthContext";
import { useLocale } from "../../../../contexts/LocaleContext";
import { useSubscription } from "../../../../contexts/SubscriptionContext";
import { useTheme } from "../../../../contexts/ThemeContext";
import i18n from "../../../../i18n/i18n";
import EnterpriseService, {
  Enterprise,
  EnterpriseProfile,
  SocialLink,
} from "../../../../services/api/EnterpriseService";

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (userData: any, imageBase64?: string) => void;
  initialData: EnterpriseProfile;
  loading: boolean;
  colors: any;
  isDark: boolean;
}

interface EditEnterpriseModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (enterpriseData: any, logoBase64?: string) => void;
  initialData: Enterprise;
  loading: boolean;
  colors: any;
  isDark: boolean;
}

interface AddPartnerModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (partnerId: string) => void;
  loading: boolean;
}

interface EnterpriseDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  enterprise: Enterprise;
  colors: any;
  isDark: boolean;
}

// Composant pour éditer le profil utilisateur
const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  onSave,
  initialData,
  loading,
  colors,
  isDark,
}) => {
  const { showToast: showReToast } = useReanimatedToast();
  const [firstName, setFirstName] = useState(initialData.user.firstName || "");
  const [lastName, setLastName] = useState(initialData.user.lastName || "");
  const [phone, setPhone] = useState(initialData.user.phone || "");
  const [address, setAddress] = useState(initialData.user.address || "");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      showReToast({
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

  const handleSave = () => {
    const userData = {
      firstName,
      lastName,
      phone,
      address,
    };
    onSave(userData, imageBase64 || undefined);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View className="flex-1" style={{ backgroundColor: colors.card }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="px-6 pt-14 pb-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={onClose}>
                <Text className="font-quicksand-medium" style={{ color: colors.brandPrimary }}>
                  {i18n.t("enterprise.profile.modals.editProfile.cancel")}
                </Text>
              </TouchableOpacity>
              <Text className="text-lg font-quicksand-bold" style={{ color: colors.textPrimary }}>
                {i18n.t("enterprise.profile.modals.editProfile.title")}
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color={colors.brandPrimary} />
                ) : (
                  <Text className="font-quicksand-medium" style={{ color: colors.brandPrimary }}>
                    {i18n.t("enterprise.profile.modals.editProfile.save")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <KeyboardAwareScrollView className="flex-1 px-6 py-6">
            {/* Photo de profil */}
            <View className="items-center mb-6">
              <TouchableOpacity onPress={pickImage} className="relative">
                {selectedImage || initialData.user.profileImage ? (
                  <Image
                    source={{
                      uri: selectedImage || initialData.user.profileImage,
                    }}
                    className="w-24 h-24 rounded-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-24 h-24 rounded-full bg-primary-500 items-center justify-center">
                    <Text className="text-white font-quicksand-bold text-2xl">
                      {`${initialData.user.firstName?.[0] || ""}${initialData.user.lastName?.[0] || ""
                        }`.toUpperCase()}
                    </Text>
                  </View>
                )}
                <View className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary-500 rounded-full items-center justify-center">
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <Text className="text-sm mt-2" style={{ color: colors.textSecondary }}>
                {i18n.t("enterprise.profile.modals.editProfile.changePhoto")}
              </Text>
            </View>

            {/* Formulaire */}
            <View className="space-y-4">
              <View>
                <Text className="font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
                  {i18n.t("enterprise.profile.modals.editProfile.firstName")}
                </Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  className="rounded-xl px-4 py-3 font-quicksand-regular"
                  style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary }}
                  placeholder={i18n.t("enterprise.profile.modals.editProfile.placeholders.firstName")}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View>
                <Text className="font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
                  {i18n.t("enterprise.profile.modals.editProfile.lastName")}
                </Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  className="rounded-xl px-4 py-3 font-quicksand-regular"
                  style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary }}
                  placeholder={i18n.t("enterprise.profile.modals.editProfile.placeholders.lastName")}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View>
                <Text className="font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
                  {i18n.t("enterprise.profile.modals.editProfile.phone")}
                </Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  className="rounded-xl px-4 py-3 font-quicksand-regular"
                  style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary }}
                  placeholder={i18n.t("enterprise.profile.modals.editProfile.placeholders.phone")}
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad"
                />
              </View>

              <View>
                <Text className="font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
                  {i18n.t("enterprise.profile.modals.editProfile.address")}
                </Text>
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  className="rounded-xl px-4 py-3 font-quicksand-regular"
                  style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary }}
                  placeholder={i18n.t("enterprise.profile.modals.editProfile.placeholders.address")}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// Composant pour éditer les informations entreprise
const EditEnterpriseModal: React.FC<EditEnterpriseModalProps> = ({
  visible,
  onClose,
  onSave,
  initialData,
  loading,
  colors,
  isDark,
}) => {
  const { showToast: showReToast } = useReanimatedToast();
  const [companyName, setCompanyName] = useState(initialData.companyName || "");
  const [description, setDescription] = useState(initialData.description || "");
  const [website, setWebsite] = useState(
    initialData.contactInfo?.website || ""
  );
  const [phone, setPhone] = useState(initialData.contactInfo?.phone || "");
  const [email, setEmail] = useState(initialData.contactInfo?.email || "");
  const [whatsapp, setWhatsapp] = useState(
    initialData.contactInfo?.whatsapp || ""
  );
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(
    initialData.socialLinks || []
  );
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  const pickLogo = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      showReToast({
        title: i18n.t("enterprise.profile.modals.editEnterprise.permission.title"),
        subtitle: i18n.t("enterprise.profile.modals.editEnterprise.permission.subtitle"),
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
      setSelectedLogo(result.assets[0].uri);
      setLogoBase64(result.assets[0].base64 || null);
    }
  };

  const addSocialLink = () => {
    setSocialLinks([...socialLinks, { platform: "", url: "" }]);
  };

  const updateSocialLink = (
    index: number,
    field: "platform" | "url",
    value: string
  ) => {
    const updated = [...socialLinks];
    updated[index][field] = value;
    setSocialLinks(updated);
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!companyName.trim()) {
      showReToast({
        title: i18n.t("enterprise.profile.modals.editEnterprise.errors.required"),
        subtitle: i18n.t("enterprise.profile.modals.editEnterprise.errors.companyNameRequired"),
        autodismiss: true,
      });
      return;
    }

    const enterpriseData = {
      companyName,
      description,
      contactInfo: {
        email,
        phone,
        whatsapp,
        website,
      },
      socialLinks: socialLinks.filter((link) => link.platform && link.url),
    };
    onSave(enterpriseData, logoBase64 || undefined);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View className="flex-1" style={{ backgroundColor: colors.card }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="px-6 pt-14 pb-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={onClose}>
                <Text className="font-quicksand-medium" style={{ color: colors.brandPrimary }}>
                  {i18n.t("enterprise.profile.modals.editEnterprise.cancel")}
                </Text>
              </TouchableOpacity>
              <Text className="text-lg font-quicksand-bold" style={{ color: colors.textPrimary }}>
                {i18n.t("enterprise.profile.modals.editEnterprise.title")}
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color={colors.brandPrimary} />
                ) : (
                  <Text className="font-quicksand-medium" style={{ color: colors.brandPrimary }}>
                    {i18n.t("enterprise.profile.modals.editEnterprise.save")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <KeyboardAwareScrollView className="flex-1 px-6 py-6" contentContainerStyle={{ paddingBottom: 120 }}>
            {/* Logo */}
            <View className="items-center mb-6">
              <TouchableOpacity onPress={pickLogo} className="relative">
                {selectedLogo || initialData.logo ? (
                  <Image
                    source={{ uri: selectedLogo || initialData.logo }}
                    className="w-24 h-24 rounded-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-24 h-24 rounded-full bg-primary-500 items-center justify-center">
                    <Text className="text-white font-quicksand-bold text-2xl">
                      {initialData.companyName?.[0]?.toUpperCase() || "E"}
                    </Text>
                  </View>
                )}
                <View className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 rounded-full items-center justify-center" style={{ borderWidth: 2, borderColor: colors.card }}>
                  <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
              <Text className="font-quicksand-medium mt-2" style={{ color: colors.brandPrimary }}>
                {i18n.t("enterprise.profile.modals.editEnterprise.changeLogo")}
              </Text>
            </View>

            {/* Formulaire */}
            <View className="space-y-4">
              {/* Nom de l'entreprise */}
              <View>
                <Text className="font-quicksand-semibold mb-2 pl-1" style={{ color: colors.textPrimary }}>
                  {i18n.t("enterprise.profile.modals.editEnterprise.companyName")}
                </Text>
                <TextInput
                  value={companyName}
                  onChangeText={setCompanyName}
                  className="rounded-xl px-4 py-3 font-quicksand-regular"
                  style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary }}
                  placeholder={i18n.t("enterprise.profile.modals.editEnterprise.placeholders.companyName")}
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              {/* Description */}
              <View>
                <Text className="font-quicksand-semibold mb-2 pl-1" style={{ color: colors.textPrimary }}>
                  {i18n.t("enterprise.profile.modals.editEnterprise.description")}
                </Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder={i18n.t("enterprise.profile.modals.editEnterprise.placeholders.description")}
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={4}
                  className="rounded-xl px-4 py-3 font-quicksand-regular"
                  style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary }}
                  textAlignVertical="top"
                />
              </View>

              {/* Coordonnées */}
              <View className="pt-2">
                <Text className="text-lg font-quicksand-bold mb-3 pl-1" style={{ color: colors.textPrimary }}>
                  {i18n.t("enterprise.profile.modals.editEnterprise.contactInfo")}
                </Text>

                <View className="mb-4">
                  <Text className="font-quicksand-semibold mb-2 pl-1" style={{ color: colors.textPrimary }}>
                    {i18n.t("enterprise.profile.modals.editEnterprise.website")}
                  </Text>
                  <TextInput
                    value={website}
                    onChangeText={setWebsite}
                    placeholder={i18n.t("enterprise.profile.modals.editEnterprise.placeholders.website")}
                    placeholderTextColor={colors.textTertiary}
                    className="rounded-xl px-4 py-3 font-quicksand-regular"
                    style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary }}
                  />
                </View>

                <View className="mb-4">
                  <Text className="font-quicksand-semibold mb-2 pl-1" style={{ color: colors.textPrimary }}>
                    {i18n.t("enterprise.profile.modals.editEnterprise.phone")}
                  </Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder={i18n.t("enterprise.profile.modals.editEnterprise.placeholders.phone")}
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="phone-pad"
                    className="rounded-xl px-4 py-3 font-quicksand-regular"
                    style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary }}
                  />
                </View>

                <View className="mb-4">
                  <Text className="font-quicksand-semibold mb-2 pl-1" style={{ color: colors.textPrimary }}>
                    {i18n.t("enterprise.profile.modals.editEnterprise.email")}
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder={i18n.t("enterprise.profile.modals.editEnterprise.placeholders.email")}
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="rounded-xl px-4 py-3 font-quicksand-regular"
                    style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary }}
                  />
                </View>

                <View className="mb-4">
                  <Text className="font-quicksand-semibold mb-2 pl-1" style={{ color: colors.textPrimary }}>
                    {i18n.t("enterprise.profile.modals.editEnterprise.whatsapp")}
                  </Text>
                  <TextInput
                    value={whatsapp}
                    onChangeText={setWhatsapp}
                    placeholder={i18n.t("enterprise.profile.modals.editEnterprise.placeholders.whatsapp")}
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="phone-pad"
                    className="rounded-xl px-4 py-3 font-quicksand-regular"
                    style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary }}
                  />
                </View>
              </View>

              {/* Liens sociaux */}
              <View className="pt-2">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-lg font-quicksand-bold pl-1" style={{ color: colors.textPrimary }}>
                    {i18n.t("enterprise.profile.modals.editEnterprise.socialNetworks")}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={addSocialLink}
                    className="flex-row items-center"
                  >
                    <Ionicons name="add-circle" size={20} color={colors.brandPrimary} />
                    <Text className="font-quicksand-medium ml-1" style={{ color: colors.brandPrimary }}>
                      {i18n.t("enterprise.profile.modals.editEnterprise.addSocial")}
                    </Text>
                  </TouchableOpacity>
                </View>

                {socialLinks.map((link, index) => (
                  <View key={index} className="flex-row items-center mb-3">
                    <TextInput
                      value={link.platform}
                      onChangeText={(value) =>
                        updateSocialLink(index, "platform", value)
                      }
                      placeholder={i18n.t("enterprise.profile.modals.editEnterprise.placeholders.platform")}
                      placeholderTextColor={colors.textTertiary}
                      className="flex-1 rounded-l-xl px-4 py-3 font-quicksand-regular"
                      style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary }}
                    />
                    <TextInput
                      value={link.url}
                      onChangeText={(value) =>
                        updateSocialLink(index, "url", value)
                      }
                      placeholder={i18n.t("enterprise.profile.modals.editEnterprise.placeholders.url")}
                      placeholderTextColor={colors.textTertiary}
                      className="flex-2 rounded-r-xl px-4 py-3 font-quicksand-regular"
                      style={{ flex: 2, backgroundColor: colors.card, borderTopWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.border, color: colors.textPrimary }}
                    />
                    <TouchableOpacity
                      onPress={() => removeSocialLink(index)}
                      className="ml-2 w-8 h-8 rounded-full justify-center items-center"
                      style={{ backgroundColor: isDark ? colors.error + '20' : '#FEE2E2' }}
                    >
                      <Ionicons name="close" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}

                {socialLinks.length === 0 && (
                  <Text className="font-quicksand-regular italic pl-1 mb-4" style={{ color: colors.textTertiary }}>
                    {i18n.t("enterprise.profile.modals.editEnterprise.noSocial")}
                  </Text>
                )}
              </View>
            </View>
          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

// Composant pour afficher les détails complets de l'entreprise
const EnterpriseDetailsModal: React.FC<EnterpriseDetailsModalProps> = ({
  visible,
  onClose,
  enterprise,
  colors,
  isDark,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View className="flex-1" style={{ backgroundColor: colors.card }}>
        <View className="px-6 pt-14 pb-4" style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose}>
              <Text className="font-quicksand-medium" style={{ color: colors.brandPrimary }}>
                {i18n.t("enterprise.profile.modals.enterpriseDetails.close")}
              </Text>
            </TouchableOpacity>
            <Text className="text-lg font-quicksand-bold" style={{ color: colors.textPrimary }}>
              {i18n.t("enterprise.profile.modals.enterpriseDetails.title")}
            </Text>
            <View style={{ width: 70 }} />
          </View>
        </View>

        <ScrollView className="flex-1 px-6 py-6">
          {/* Logo et nom */}
          <View className="items-center mb-6">
            {enterprise.logo ? (
              <Image
                source={{ uri: enterprise.logo }}
                className="w-24 h-24 rounded-full mb-4"
                resizeMode="cover"
              />
            ) : (
              <View className="w-24 h-24 rounded-full bg-primary-500 items-center justify-center mb-4">
                <Text className="text-white font-quicksand-bold text-2xl">
                  {enterprise.companyName?.[0]?.toUpperCase() || "E"}
                </Text>
              </View>
            )}
            <Text className="text-xl font-quicksand-bold text-center" style={{ color: colors.textPrimary }}>
              {enterprise.companyName}
            </Text>
            <View className="flex-row items-center mt-2">
              <View
                className={`w-3 h-3 rounded-full mr-2 ${enterprise.isActive ? "bg-success-500" : "bg-neutral-400"
                  }`}
              />
              <Text
                className={`${enterprise.isActive ? "text-success-500" : "text-neutral-500"
                  } font-quicksand-medium`}
              >
                {enterprise.isActive
                  ? i18n.t("enterprise.profile.modals.enterpriseDetails.active")
                  : i18n.t("enterprise.profile.modals.enterpriseDetails.inactive")}
              </Text>
            </View>
          </View>

          {/* Informations */}
          <View className="mb-6">
            <Text className="text-lg font-quicksand-bold mb-3" style={{ color: colors.textPrimary }}>
              {i18n.t("enterprise.profile.modals.enterpriseDetails.about")}
            </Text>
            <View className="rounded-xl p-4" style={{ backgroundColor: colors.tertiary }}>
              <Text className="font-quicksand-regular" style={{ color: colors.textPrimary }}>
                {enterprise.description ||
                  i18n.t("enterprise.profile.modals.enterpriseDetails.noDescription")}
              </Text>
            </View>
          </View>

          {/* Coordonnées */}
          <View className="mb-6">
            <Text className="text-lg font-quicksand-bold mb-3" style={{ color: colors.textPrimary }}>
              {i18n.t("enterprise.profile.modals.enterpriseDetails.contact")}
            </Text>
            <View className="rounded-xl p-4 space-y-3" style={{ backgroundColor: colors.tertiary }}>
              {enterprise.contactInfo?.website && (
                <View className="flex-row items-center">
                  <Ionicons name="globe-outline" size={20} color={colors.brandPrimary} />
                  <Text className="font-quicksand-medium ml-3" style={{ color: colors.textPrimary }}>
                    {enterprise.contactInfo.website}
                  </Text>
                </View>
              )}

              {enterprise.contactInfo?.phone && (
                <View className="flex-row items-center">
                  <Ionicons name="call-outline" size={20} color={colors.brandPrimary} />
                  <Text className="font-quicksand-medium ml-3" style={{ color: colors.textPrimary }}>
                    {enterprise.contactInfo.phone}
                  </Text>
                </View>
              )}

              {!enterprise.contactInfo?.website &&
                !enterprise.contactInfo?.phone && (
                  <Text className="font-quicksand-regular italic" style={{ color: colors.textSecondary }}>
                    {i18n.t("enterprise.profile.modals.enterpriseDetails.noContact")}
                  </Text>
                )}
            </View>
          </View>

          {/* Statistiques */}
          <View className="mb-6">
            <Text className="text-lg font-quicksand-bold mb-3" style={{ color: colors.textPrimary }}>
              {i18n.t("enterprise.profile.modals.enterpriseDetails.stats")}
            </Text>
            <View className="rounded-xl p-4 space-y-3" style={{ backgroundColor: colors.tertiary }}>
              <View className="flex-row justify-between">
                <Text className="font-quicksand-medium" style={{ color: colors.textSecondary }}>
                  {i18n.t("enterprise.profile.modals.enterpriseDetails.totalSales")}
                </Text>
                <Text className="text-primary-500 font-quicksand-bold">
                  {enterprise.stats?.totalSales
                    ? new Intl.NumberFormat("fr-FR").format(
                      enterprise.stats.totalSales
                    ) + " FCFA"
                    : "0 FCFA"}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="font-quicksand-medium" style={{ color: colors.textSecondary }}>
                  {i18n.t("enterprise.profile.modals.enterpriseDetails.orders")}
                </Text>
                <Text className="text-success-500 font-quicksand-bold">
                  {enterprise.stats?.totalOrders || 0}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="font-quicksand-medium" style={{ color: colors.textSecondary }}>
                  {i18n.t("enterprise.profile.modals.enterpriseDetails.averageRating")}
                </Text>
                <View className="flex-row items-center">
                  <Ionicons name="star" size={16} color="#F59E0B" />
                  <Text className="text-warning-500 font-quicksand-bold ml-1">
                    {enterprise.stats?.averageRating || 0}
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-between">
                <Text className="font-quicksand-medium" style={{ color: colors.textSecondary }}>
                  {i18n.t("enterprise.profile.modals.enterpriseDetails.reviews")}
                </Text>
                <Text className="text-secondary-500 font-quicksand-bold">
                  {enterprise.stats?.totalReviews || 0}
                </Text>
              </View>
            </View>
          </View>

          {/* Liens sociaux */}
          {enterprise.socialLinks && enterprise.socialLinks.length > 0 && (
            <View className="mb-6">
              <Text className="text-lg font-quicksand-bold mb-3" style={{ color: colors.textPrimary }}>
                {i18n.t("enterprise.profile.modals.enterpriseDetails.socialLinks")}
              </Text>
              <View className="rounded-xl p-4 space-y-3" style={{ backgroundColor: colors.tertiary }}>
                {enterprise.socialLinks.map((link, index) => (
                  <View key={index} className="flex-row justify-between">
                    <Text className="font-quicksand-medium" style={{ color: colors.textSecondary }}>
                      {link.platform}
                    </Text>
                    <Text className="font-quicksand-medium" style={{ color: colors.brandPrimary }}>
                      {link.url}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Date de création */}
          <View className="mb-6">
            <Text className="text-lg font-quicksand-bold mb-3" style={{ color: colors.textPrimary }}>
              {i18n.t("enterprise.profile.modals.enterpriseDetails.additionalInfo")}
            </Text>
            <View className="rounded-xl p-4 space-y-3" style={{ backgroundColor: colors.tertiary }}>
              <View className="flex-row justify-between">
                <Text className="font-quicksand-medium" style={{ color: colors.textSecondary }}>
                  {i18n.t("enterprise.profile.modals.enterpriseDetails.creationDate")}
                </Text>
                <Text className="font-quicksand-medium" style={{ color: colors.textPrimary }}>
                  {new Date(enterprise.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="font-quicksand-medium" style={{ color: colors.textSecondary }}>
                  {i18n.t("enterprise.profile.modals.enterpriseDetails.enterpriseId")}
                </Text>
                <Text className="font-quicksand-medium" style={{ color: colors.textPrimary }}>
                  {enterprise._id?.substring(0, 8) || "N/A"}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// Composant pour ajouter un partenaire (DEPRECATED: remplacé par la page /delivery-partners)
const AddPartnerModal: React.FC<AddPartnerModalProps> = ({
  visible,
  onClose,
  onAdd,
  loading,
}) => {
  const { showToast: showReToast } = useReanimatedToast();
  const [partnerId, setPartnerId] = useState("");

  const handleAdd = () => {
    if (partnerId.trim()) {
      onAdd(partnerId.trim());
      setPartnerId("");
    } else {
      showReToast({
        title: i18n.t("messages.error"),
        subtitle: i18n.t("enterprise.profile.modals.addPartner.error"),
        autodismiss: true,
      });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View className="flex-1 bg-white">
        <View className="px-6 pt-6 pb-4 border-b border-neutral-200">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose}>
              <Text className="text-primary-500 font-quicksand-medium">
                {i18n.t("enterprise.profile.modals.addPartner.cancel")}
              </Text>
            </TouchableOpacity>
            <Text className="text-lg font-quicksand-bold">
              {i18n.t("enterprise.profile.modals.addPartner.title")}
            </Text>
            <TouchableOpacity
              onPress={handleAdd}
              disabled={loading || !partnerId.trim()}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <Text className="text-primary-500 font-quicksand-medium">
                  {i18n.t("enterprise.profile.modals.addPartner.add")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-6 py-6">
          <View>
            <Text className="text-neutral-700 font-quicksand-medium mb-2">
              {i18n.t("enterprise.profile.modals.addPartner.partnerId")}
            </Text>
            <TextInput
              value={partnerId}
              onChangeText={setPartnerId}
              className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 font-quicksand-regular"
              placeholder={i18n.t("enterprise.profile.modals.addPartner.placeholder")}
            />
            <Text className="text-neutral-500 text-sm mt-2">
              {i18n.t("enterprise.profile.modals.addPartner.helpText")}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Composant principal du profil entreprise
function EnterpriseProfilePage() {
  const { logout } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { locale } = useLocale(); // Écoute les changements de langue pour re-render automatiquement
  const { showToast: showReToast } = useReanimatedToast();
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<EnterpriseProfile | null>(
    null
  );

  // Modals
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showEditEnterprise, setShowEditEnterprise] = useState(false);
  // const [showAddPartner, setShowAddPartner] = useState(false); // supprimé (ancienne modal d'ajout partenaire)
  const [showEnterpriseDetails, setShowEnterpriseDetails] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    type: "toggle_status" | "logout";
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
    onConfirm: () => void;
  } | null>(null);

  // Abonnement et restrictions
  const { subscription, canUseFeature } = useSubscription();

  // Responsive dimensions
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmallPhone = width < 360;
  const isTablet = width >= 768 && width < 1024;
  const isLargeTablet = width >= 1024;
  const isIosBillingRestricted = Platform.OS === "ios";

  // Header bottom padding (augmenté pour laisser plus d'espace)
  const headerBottomPadding = isLargeTablet
    ? 80
    : isTablet
      ? 72
      : isSmallPhone
        ? 56
        : 64;

  // Overlay lift (réduit pour ne pas cacher le contenu du header)
  const overlayLift = isLargeTablet
    ? -48
    : isTablet
      ? -40
      : isSmallPhone
        ? -32
        : -36;

  // Logo size
  const logoSize = isLargeTablet ? 104 : isTablet ? 88 : isSmallPhone ? 72 : 80;

  // Marketing layout (row vs column)
  const stackMarketing = true; // Toujours afficher verticalement pour une meilleure lisibilité

  // Chips overlay wrapping for small widths
  const wrapOverlayChips = width < 420;

  // Dashboard columns and card width
  const dashboardColumns = isLargeTablet
    ? 4
    : isTablet
      ? 3
      : isSmallPhone
        ? 1
        : 2;
  const dashboardCardWidth =
    dashboardColumns === 1
      ? "100%"
      : dashboardColumns === 2
        ? "48%"
        : dashboardColumns === 3
          ? "31.5%"
          : "23%";

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
      <View style={[{ backgroundColor: isDark ? colors.tertiary : "#E5E7EB", overflow: "hidden" }, style]}>
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: 120,
            transform: [{ translateX }],
            backgroundColor: "rgba(255,255,255,0.35)",
            opacity: isDark ? 0.15 : 0.7,
          }}
        />
      </View>
    );
  };

  const SkeletonCard = ({ style }: { style?: any }) => (
    <View
      className="rounded-2xl shadow-sm overflow-hidden"
      style={[{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }, style]}
    >
      <ShimmerBlock style={{ height: 120, borderRadius: 16, width: "100%" }} />
    </View>
  );

  const renderSkeletonProfile = () => (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* Gradient Header Skeleton */}
      <LinearGradient
        colors={["#047857", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="px-6"
        style={{
          paddingTop: insets.top + 16,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
          paddingBottom: headerBottomPadding,
        }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <ShimmerBlock
              style={{
                height: 28,
                borderRadius: 14,
                width: "70%",
                marginBottom: 12,
              }}
            />
            <View className="flex-row items-center mt-3">
              <ShimmerBlock
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  marginRight: 8,
                }}
              />
              <ShimmerBlock
                style={{ height: 14, borderRadius: 7, width: "40%" }}
              />
            </View>
            <View className="flex-row items-center mt-2">
              <ShimmerBlock
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  marginRight: 8,
                }}
              />
              <ShimmerBlock
                style={{ height: 12, borderRadius: 6, width: "30%" }}
              />
            </View>
          </View>
          <ShimmerBlock style={{ width: 40, height: 40, borderRadius: 20 }} />
        </View>
      </LinearGradient>

      {/* Overlay Card Skeleton */}
      <View className="px-4" style={{ marginTop: overlayLift }}>
        <View
          className="rounded-2xl p-4"
          style={{
            backgroundColor: colors.card,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.03,
            shadowRadius: 4,
            elevation: 1,
          }}
        >
          <View className="flex-row items-start">
            <ShimmerBlock
              style={{
                width: logoSize,
                height: logoSize,
                borderRadius: logoSize / 2,
              }}
            />
            <View className="flex-1 ml-5">
              <ShimmerBlock
                style={{
                  height: 16,
                  borderRadius: 8,
                  width: "80%",
                  marginBottom: 8,
                }}
              />
              <ShimmerBlock
                style={{
                  height: 14,
                  borderRadius: 7,
                  width: "60%",
                  marginBottom: 16,
                }}
              />
              <View className="flex-row mt-4 space-x-3">
                <ShimmerBlock
                  style={{ width: 60, height: 28, borderRadius: 14 }}
                />
                <ShimmerBlock
                  style={{ width: 60, height: 28, borderRadius: 14 }}
                />
                <ShimmerBlock
                  style={{ width: 60, height: 28, borderRadius: 14 }}
                />
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Marketing Skeleton */}
      <View className="px-4 pt-6">
        <ShimmerBlock
          style={{
            height: 20,
            borderRadius: 10,
            width: "50%",
            marginBottom: 16,
            marginLeft: 4,
          }}
        />
        <View
          className="flex-row"
          style={{ flexDirection: stackMarketing ? "column" : "row" }}
        >
          <View
            className="flex-1 rounded-2xl overflow-hidden"
            style={{
              marginRight: stackMarketing ? 0 : 8,
              marginBottom: stackMarketing ? 8 : 0,
            }}
          >
            <ShimmerBlock
              style={{ height: 120, borderRadius: 16, width: "100%" }}
            />
          </View>
          <View
            className="flex-1 rounded-2xl overflow-hidden"
            style={{
              marginLeft: stackMarketing ? 0 : 8,
              marginTop: stackMarketing ? 8 : 0,
            }}
          >
            <ShimmerBlock
              style={{ height: 120, borderRadius: 16, width: "100%" }}
            />
          </View>
        </View>
      </View>

      {/* Contact & Owner Cards Skeleton */}
      <View className="px-4 pt-6 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </View>

      {/* Dashboard Skeleton */}
      <View className="px-4 py-4">
        <ShimmerBlock
          style={{
            height: 20,
            borderRadius: 10,
            width: "40%",
            marginBottom: 16,
            marginLeft: 4,
          }}
        />
        <View className="flex-row flex-wrap justify-between">
          {Array.from({ length: dashboardColumns }).map((_, index) => (
            <View
              key={index}
              style={{ width: dashboardCardWidth, marginBottom: 12 }}
            >
              <SkeletonCard />
            </View>
          ))}
        </View>
      </View>

      {/* Actions rapides Skeleton */}
      <View className="px-4 py-4">
        <ShimmerBlock
          style={{
            height: 20,
            borderRadius: 10,
            width: "45%",
            marginBottom: 16,
            marginLeft: 4,
          }}
        />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>

      {/* Gestion Skeleton */}
      <View className="px-4 py-4">
        <ShimmerBlock
          style={{
            height: 20,
            borderRadius: 10,
            width: "50%",
            marginBottom: 16,
            marginLeft: 4,
          }}
        />
        <SkeletonCard />
        <SkeletonCard />
      </View>

      {/* Paramètres Skeleton */}
      <View className="px-4 py-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>

      {/* Bouton de déconnexion Skeleton */}
      <View className="px-4 py-6">
        <ShimmerBlock style={{ height: 48, borderRadius: 16, width: "100%" }} />
      </View>
    </ScrollView>
  );

  // Unified toast helpers (reanimated only)
  const notifySuccess = React.useCallback(
    (title: string, message?: string) => {
      try {
        showReToast({ title, subtitle: message, autodismiss: true });
      } catch { }
    },
    [showReToast]
  );
  const notifyError = React.useCallback(
    (title: string, message?: string) => {
      try {
        showReToast({ title, subtitle: message, autodismiss: true });
      } catch { }
    },
    [showReToast]
  );
  const notifyInfo = React.useCallback(
    (title: string, message?: string) => {
      try {
        showReToast({ title, subtitle: message, autodismiss: true });
      } catch { }
    },
    [showReToast]
  );

  // Charger les données du profil
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await EnterpriseService.getProfile();
      setProfileData(data);
    } catch (error: any) {
      console.error("❌ Erreur chargement profil:", error);
      notifyError(i18n.t("messages.error"), error.message || i18n.t("enterprise.profile.messages.loadError"));
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  // Rafraîchir les données
  const refreshProfile = async () => {
    try {
      setRefreshing(true);
      const data = await EnterpriseService.getProfile();
      setProfileData(data);
    } catch (error: any) {
      console.error("❌ Erreur refresh profil:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Charger les données au montage
  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // loadProfile retiré des dépendances pour éviter la boucle infinie

  // Gérer la mise à jour du profil utilisateur
  const handleUpdateProfile = async (userData: any, imageBase64?: string) => {
    try {
      setEditLoading(true);
      const updatedUser = await EnterpriseService.updateUserProfileWithImage(
        userData,
        imageBase64
      );

      // Mettre à jour les données locales
      if (profileData) {
        setProfileData({
          ...profileData,
          user: updatedUser,
        });
      }

      setShowEditProfile(false);
      notifySuccess(i18n.t("enterprise.profile.modals.editProfile.success"));
    } catch (error: any) {
      console.error("❌ Erreur mise à jour profil:", error);
      notifyError(
        i18n.t("messages.error"),
        error.message || i18n.t("enterprise.profile.modals.editProfile.error")
      );
    } finally {
      setEditLoading(false);
    }
  };

  // Gérer la mise à jour des informations entreprise
  const handleUpdateEnterprise = async (
    enterpriseData: any,
    logoBase64?: string
  ) => {
    try {
      setEditLoading(true);
      const updatedEnterprise =
        await EnterpriseService.updateEnterpriseInfoWithLogo(
          enterpriseData,
          logoBase64
        );

      // Mettre à jour les données locales
      if (profileData) {
        setProfileData({
          ...profileData,
          enterprise: updatedEnterprise,
        });
      }

      setShowEditEnterprise(false);
      notifySuccess(
        i18n.t("enterprise.profile.modals.editEnterprise.success")
      );
    } catch (error: any) {
      console.error("❌ Erreur mise à jour entreprise:", error);
      notifyError(
        i18n.t("messages.error"),
        error.message ||
        i18n.t("enterprise.profile.modals.editEnterprise.error")
      );
    } finally {
      setEditLoading(false);
    }
  };

  // Gérer l'ajout d'un partenaire
  // Ancienne fonction d'ajout direct d'un partenaire (remplacée par le flux via la page dédiée)
  const handleAddPartner = async (_partnerId: string) => {
    notifyInfo(
      i18n.t("enterprise.profile.modals.addPartner.redirectTitle"),
      i18n.t("enterprise.profile.modals.addPartner.redirectMessage")
    );
  };

  // NOTE: suppression partenaire gérée future (liste partenaires). Fonction retirée pour éviter code mort.

  // Fonctions de confirmation modal
  const showConfirmation = (
    type: "toggle_status" | "logout",
    onConfirm: () => void
  ) => {
    let title = "";
    let message = "";
    let confirmText = "";
    let confirmColor = "";

    switch (type) {
      case "toggle_status":
        const newStatus = profileData?.enterprise.isActive
          ? i18n.t("enterprise.profile.messages.statusConfirm.deactivate")
          : i18n.t("enterprise.profile.messages.statusConfirm.activate");
        title = i18n.t("enterprise.profile.messages.statusConfirm.title");
        message = i18n.t("enterprise.profile.messages.statusConfirm.message", { action: newStatus });
        confirmText = i18n.t("enterprise.profile.messages.statusConfirm.confirm");
        confirmColor = profileData?.enterprise.isActive ? "#F59E0B" : "#10B981";
        break;
      case "logout":
        title = i18n.t("enterprise.profile.messages.logoutConfirm.title");
        message = i18n.t("enterprise.profile.messages.logoutConfirm.message");
        confirmText = i18n.t("enterprise.profile.messages.logoutConfirm.confirm");
        confirmColor = "#EF4444";
        break;
    }

    setConfirmationAction({
      type,
      title,
      message,
      confirmText,
      confirmColor,
      onConfirm,
    });
    setConfirmationVisible(true);
  };

  const closeConfirmation = () => {
    setConfirmationVisible(false);
    setConfirmationAction(null);
  };

  const executeConfirmedAction = () => {
    if (confirmationAction?.onConfirm) {
      confirmationAction.onConfirm();
    }
    closeConfirmation();
  };

  // Gérer la déconnexion
  const handleLogout = () => {
    showConfirmation("logout", () => {
      logout();
      notifyInfo(i18n.t("enterprise.profile.messages.logoutConfirm.title"), i18n.t("enterprise.profile.messages.logoutSuccess"));
      router.replace("/(auth)/welcome");
    });
  };

  // Gérer la navigation vers les partenaires
  const handleNavigateToPartners = () => {
    // Navigation directe: le dossier (enterprise)/delivery-partners contient index.tsx
    router.push("/(app)/(enterprise)/delivery-partners");
  };

  if (loading && !profileData) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.secondary }}>
        <ExpoStatusBar style={isDark ? "light" : "dark"} translucent />
        {renderSkeletonProfile()}
      </View>
    );
  }

  if (!profileData) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.secondary }}>
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text className="mt-4 font-quicksand-bold text-lg text-center" style={{ color: colors.textPrimary }}>
            {i18n.t("enterprise.profile.messages.loadError")}
          </Text>
          <Text className="mt-2 font-quicksand-medium text-center" style={{ color: colors.textSecondary }}>
            {i18n.t("enterprise.profile.messages.loadErrorMessage")}
          </Text>
          <TouchableOpacity
            onPress={loadProfile}
            className="mt-6 px-6 py-3 rounded-xl"
            style={{ backgroundColor: colors.brandPrimary }}
          >
            <Text className="font-quicksand-semibold" style={{ color: colors.textOnBrand }}>
              {i18n.t("enterprise.profile.actions.retry")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.secondary }}>
      <ExpoStatusBar style="light" translucent />

      {/* Fixed Gradient Header */}
      <LinearGradient
        colors={["#047857", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="px-6"
        style={{
          paddingTop: insets.top + 16,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
          paddingBottom: 20,
        }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text
              className="text-2xl font-quicksand-bold text-white"
              numberOfLines={2}
            >
              {profileData.enterprise.companyName}
            </Text>
            <View className="flex-row items-center mt-2">
              <Ionicons
                name="location"
                size={16}
                color="rgba(255,255,255,0.85)"
              />
              <Text
                className="text-sm font-quicksand-medium text-white/90 ml-1"
                numberOfLines={1}
              >
                {profileData.enterprise.location.district},{" "}
                {profileData.enterprise.location.city}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => setShowEditEnterprise(true)}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center"
          >
            <Ionicons name="create" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshProfile}
            colors={[colors.brandPrimary]}
            tintColor={colors.brandPrimary}
            progressViewOffset={insets.top + 80}
          />
        }
      >

        {/* Overlay Card */}
        <View className="px-4 pt-4">
          <View
            className="rounded-2xl p-4 flex-row items-start"
            style={{
              backgroundColor: colors.card,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <View className="relative">
              {profileData.enterprise.logo ? (
                <Image
                  source={{ uri: profileData.enterprise.logo }}
                  className="rounded-2xl"
                  resizeMode="cover"
                  style={{ width: logoSize, height: logoSize }}
                />
              ) : (
                <View
                  className="rounded-2xl bg-primary-500 items-center justify-center"
                  style={{ width: logoSize, height: logoSize }}
                >
                  <Text className="text-white font-quicksand-bold text-2xl">
                    {profileData.enterprise.companyName?.[0]?.toUpperCase() ||
                      "E"}
                  </Text>
                </View>
              )}
              {profileData.enterprise.isActive && (
                <View className="absolute -top-1 -right-1 w-6 h-6 bg-success-500 rounded-full justify-center items-center">
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </View>
              )}
            </View>

            <View
              className="flex-1"
              style={{ marginLeft: isSmallPhone ? 12 : 20 }}
            >
              {profileData.enterprise.description ? (
                <Text
                  className="font-quicksand-medium text-sm"
                  style={{ color: colors.textPrimary }}
                  numberOfLines={3}
                >
                  {profileData.enterprise.description}
                </Text>
              ) : (
                <Text className="font-quicksand-regular text-sm italic" style={{ color: colors.textTertiary }}>
                  {i18n.t("enterprise.profile.placeholders.noDescription")}
                </Text>
              )}
              <View
                className="flex-row mt-4 space-x-3"
                style={{ flexWrap: wrapOverlayChips ? "wrap" : "nowrap" }}
              >
                <TouchableOpacity
                  onPress={() => setShowEditProfile(true)}
                  className="px-3 py-2 rounded-xl flex-row items-center"
                  style={{
                    marginBottom: wrapOverlayChips ? 8 : 0,
                    flexShrink: 1,
                    backgroundColor: isDark ? colors.brandPrimary + '20' : '#D1FAE5',
                  }}
                >
                  <Ionicons name="person" size={14} color={colors.brandPrimary} />
                  <Text className="font-quicksand-semibold text-xs ml-1" style={{ color: colors.brandPrimary }}>
                    {i18n.t("enterprise.profile.actions.profile")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  // Ancien bouton modal d'ajout partenaire retiré : redirection uniquement depuis la section gestion
                  onPress={handleNavigateToPartners}
                  className="px-3 py-2 rounded-xl flex-row items-center"
                  style={{
                    marginBottom: wrapOverlayChips ? 8 : 0,
                    flexShrink: 1,
                    backgroundColor: isDark ? '#8B5CF620' : '#EDE9FE',
                  }}
                >
                  <Ionicons name="people" size={14} color="#8B5CF6" />
                  <Text className="font-quicksand-semibold text-xs ml-1" style={{ color: '#8B5CF6' }}>
                    {i18n.t("enterprise.profile.actions.partners")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowEnterpriseDetails(true)}
                  className="px-3 py-2 rounded-xl flex-row items-center"
                  style={{
                    marginBottom: wrapOverlayChips ? 8 : 0,
                    backgroundColor: colors.tertiary,
                    flexShrink: 1,
                  }}
                >
                  <Ionicons
                    name="information-circle"
                    size={14}
                    color={colors.textSecondary}
                  />
                  <Text className="font-quicksand-semibold text-xs ml-1" style={{ color: colors.textSecondary }}>
                    {i18n.t("enterprise.profile.actions.details")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Marketing & Abonnements (UI Only) */}
        <View className="px-4 pt-6">
          <Text className="text-lg font-quicksand-bold mb-4 pl-1" style={{ color: colors.textPrimary }}>
            {i18n.t("enterprise.profile.sections.marketing")}
          </Text>
          <View
            className="flex-row"
            style={{ flexDirection: stackMarketing ? "column" : "row" }}
          >
            {/* Card Publicités avec restriction */}
            {canUseFeature("advertisements") ? (
              <TouchableOpacity
                className="flex-1 rounded-2xl overflow-hidden shadow-sm"
                style={{
                  marginRight: stackMarketing ? 0 : 8,
                  marginBottom: stackMarketing ? 8 : 0,
                }}
                activeOpacity={0.85}
                onPress={() =>
                  router.push("/(app)/(enterprise)/advertisements" as any)
                }
              >
                <LinearGradient
                  colors={["#047857", "#10B981"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ padding: isSmallPhone ? 16 : 20 }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="mr-3 flex-1">
                      <Text
                        className="text-white font-quicksand-semibold text-base"
                        numberOfLines={1}
                      >
                        {i18n.t("enterprise.profile.features.advertisements.title")}
                      </Text>
                      <Text
                        className="text-white/80 font-quicksand-medium text-[12px] mt-1"
                        numberOfLines={2}
                      >
                        {i18n.t("enterprise.profile.features.advertisements.description")}
                      </Text>
                    </View>
                    <View className="w-10 h-10 rounded-xl bg-white/25 items-center justify-center">
                      <Ionicons name="megaphone" size={isSmallPhone ? 18 : 20} color="#FFFFFF" />
                    </View>
                  </View>
                  <View className="mt-4 flex-row items-center">
                    <Text className="text-white font-quicksand-medium text-xs">
                      {i18n.t("enterprise.profile.features.advertisements.configure")}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={isSmallPhone ? 12 : 14}
                      color="#FFFFFF"
                      style={{ marginLeft: 4 }}
                    />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <View
                className="flex-1 rounded-2xl overflow-hidden shadow-sm"
                style={{
                  marginRight: stackMarketing ? 0 : 8,
                  marginBottom: stackMarketing ? 8 : 0,
                }}
              >
                <View
                  style={{ padding: isSmallPhone ? 16 : 20 }}
                  className="bg-neutral-100 border-2 border-dashed border-neutral-300 rounded-2xl"
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="mr-3 flex-1">
                      <View className="flex-row items-center">
                        <Text
                          className="text-neutral-800 font-quicksand-semibold text-base"
                          numberOfLines={1}
                        >
                          {i18n.t("enterprise.profile.features.advertisements.title")}
                        </Text>
                        <View className="ml-2 bg-amber-100 px-2 py-0.5 rounded-full">
                          <Text className="text-amber-700 font-quicksand-bold text-[9px]">
                            {i18n.t("enterprise.profile.features.advertisements.premium")}
                          </Text>
                        </View>
                      </View>
                      <Text
                        className="font-quicksand-medium text-[12px] mt-1"
                        style={{ color: colors.textTertiary }}
                        numberOfLines={2}
                      >
                        {i18n.t("enterprise.profile.features.advertisements.notAvailable")}
                      </Text>
                    </View>
                    <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: colors.tertiary }}>
                      <Ionicons name="lock-closed" size={isSmallPhone ? 18 : 20} color={colors.textTertiary} />
                    </View> 
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      if (!isIosBillingRestricted) {
                        router.push("/(app)/(enterprise)/subscriptions" as any);
                      }
                    }}
                    className="rounded-xl py-2 px-3"
                    style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, width: '100%' }}
                    activeOpacity={isIosBillingRestricted ? 1 : 0.7}
                  >
                    <View className="flex-row items-center justify-center">
                      {isIosBillingRestricted ? (
                        <Text className="font-quicksand-bold text-xs" style={{ color: colors.textSecondary }}>
                          Fonction réservée aux comptes actifs
                        </Text>
                      ) : (
                        <>
                          <Ionicons
                            name="arrow-up-circle"
                            size={isSmallPhone ? 12 : 14}
                            color={colors.brandPrimary}
                          />
                          <Text className="font-quicksand-bold text-xs ml-1.5" style={{ color: colors.brandPrimary }}>
                            {i18n.t("enterprise.profile.features.advertisements.upgrade")}
                          </Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Card Abonnements */}
            <TouchableOpacity
              className="flex-1 rounded-2xl shadow-sm"
              style={{
                marginLeft: stackMarketing ? 0 : 8,
                marginTop: stackMarketing ? 8 : 0,
                padding: isSmallPhone ? 16 : 20,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              activeOpacity={isIosBillingRestricted ? 1 : 0.85}
              onPress={() => {
                if (!isIosBillingRestricted) {
                  router.push("/(app)/(enterprise)/subscriptions" as any);
                }
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="mr-3 flex-1">
                  <Text
                    className="font-quicksand-semibold text-base"
                    style={{ color: colors.textPrimary }}
                    numberOfLines={1}
                  >
                    {i18n.t("enterprise.profile.features.subscriptions.title")}
                  </Text>
                  <Text
                    className="font-quicksand-medium text-[12px] mt-1"
                    style={{ color: colors.textSecondary }}
                    numberOfLines={2}
                  >
                    {subscription
                      ? subscription.plan.name
                      : "Akwaba • Cauris • Lissa"}
                  </Text>
                </View>
                <View className="w-10 h-10 rounded-xl bg-primary-100 items-center justify-center">
                  <Ionicons name="layers" size={isSmallPhone ? 18 : 20} color="#10B981" />
                </View>
              </View>
              <View className="mt-4 flex-row items-center">
                <Text className="text-primary-600 font-quicksand-semibold text-xs">
                  {isIosBillingRestricted
                    ? "Fonctionnalité réservée aux comptes actifs"
                    : subscription
                      ? i18n.t("enterprise.profile.features.subscriptions.manage")
                      : i18n.t("enterprise.profile.features.subscriptions.viewOffers")}
                </Text>
                {!isIosBillingRestricted && (
                  <Ionicons
                    name="chevron-forward"
                    size={isSmallPhone ? 12 : 14}
                    color="#10B981"
                    style={{ marginLeft: 4 }}
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact & Owner Cards */}
        <View className="px-4 pt-6 space-y-4">
          <View className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <Text className="text-sm font-quicksand-semibold mb-4" style={{ color: colors.textPrimary }}>
              {i18n.t("enterprise.profile.sections.contact")}
            </Text>
            <View className="space-y-3">
              {profileData.enterprise.contactInfo?.email && (
                <View className="flex-row items-center py-2">
                  <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: isDark ? colors.brandSecondary + '20' : '#FFF4E5' }}>
                    <Ionicons name="mail" size={18} color={colors.brandSecondary} />
                  </View>
                  <Text
                    className="text-sm ml-4 font-quicksand-medium flex-1"
                    style={{ color: colors.textPrimary }}
                    numberOfLines={1}
                  >
                    {profileData.enterprise.contactInfo.email}
                  </Text>
                </View>
              )}
              {profileData.enterprise.contactInfo?.phone && (
                <View className="flex-row items-center py-2">
                  <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: isDark ? colors.brandSecondary + '20' : '#FFF4E5' }}>
                    <Ionicons name="call" size={18} color={colors.brandSecondary} />
                  </View>
                  <Text
                    className="text-sm ml-4 font-quicksand-medium flex-1"
                    style={{ color: colors.textPrimary }}
                    numberOfLines={1}
                  >
                    {profileData.enterprise.contactInfo.phone}
                  </Text>
                </View>
              )}
              {profileData.enterprise.contactInfo?.whatsapp && (
                <View className="flex-row items-center py-2">
                  <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: isDark ? '#10B98120' : '#D1FAE5' }}>
                    <Ionicons name="logo-whatsapp" size={18} color="#10B981" />
                  </View>
                  <Text
                    className="text-sm ml-4 font-quicksand-medium flex-1"
                    style={{ color: colors.textPrimary }}
                    numberOfLines={1}
                  >
                    {profileData.enterprise.contactInfo.whatsapp}
                  </Text>
                </View>
              )}
              {profileData.enterprise.contactInfo?.website && (
                <View className="flex-row items-center py-2">
                  <View className="w-9 h-9 rounded-xl items-center justify-center" style={{ backgroundColor: isDark ? '#2563EB20' : '#DBEAFE' }}>
                    <Ionicons name="globe" size={18} color="#2563EB" />
                  </View>
                  <Text
                    className="text-sm ml-4 font-quicksand-medium flex-1"
                    style={{ color: colors.textPrimary }}
                    numberOfLines={1}
                  >
                    {profileData.enterprise.contactInfo.website}
                  </Text>
                </View>
              )}
              {!profileData.enterprise.contactInfo?.email &&
                !profileData.enterprise.contactInfo?.phone &&
                !profileData.enterprise.contactInfo?.whatsapp &&
                !profileData.enterprise.contactInfo?.website && (
                  <Text className="text-sm font-quicksand-regular italic" style={{ color: colors.textTertiary }}>
                    {i18n.t("enterprise.profile.contact.noInfo")}
                  </Text>
                )}
            </View>
          </View>

          <View className="rounded-2xl p-5 shadow-sm" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-quicksand-semibold" style={{ color: colors.textPrimary }}>
                {i18n.t("enterprise.profile.sections.owner")}
              </Text>
              <TouchableOpacity
                onPress={() => setShowEditProfile(true)}
                className="flex-row items-center"
              >
                <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                <Text className="text-xs font-quicksand-medium ml-1" style={{ color: colors.textSecondary }}>
                  {i18n.t("enterprise.profile.actions.edit")}
                </Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center">
              {profileData.user.profileImage ? (
                <Image
                  source={{ uri: profileData.user.profileImage }}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <View className="w-12 h-12 rounded-full items-center justify-center" style={{ backgroundColor: colors.tertiary }}>
                  <Text className="font-quicksand-bold text-sm" style={{ color: colors.textSecondary }}>
                    {`${profileData.user.firstName?.[0] || ""}${profileData.user.lastName?.[0] || ""
                      }`.toUpperCase()}
                  </Text>
                </View>
              )}
              <View className="ml-4 flex-1">
                <Text
                  className="text-base font-quicksand-semibold"
                  style={{ color: colors.textPrimary }}
                  numberOfLines={1}
                >
                  {profileData.user.firstName} {profileData.user.lastName}
                </Text>
                <Text
                  className="text-sm font-quicksand-light"
                  style={{ color: colors.textSecondary }}
                  numberOfLines={1}
                >
                  {profileData.user.email}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Menu de gestion */}
        <View className="px-4 py-4">
          <Text className="text-lg font-quicksand-bold mb-4 pl-1" style={{ color: colors.textPrimary }}>
            {i18n.t("enterprise.profile.management.title")}
          </Text>
          <View className="rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
            {/* Partenaires de livraison */}
            <TouchableOpacity
              onPress={handleNavigateToPartners}
              className="flex-row items-center justify-between px-4 py-5"
              style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full justify-center items-center" style={{ backgroundColor: isDark ? '#6366F120' : '#E0E7FF' }}>
                  <Ionicons name="people-outline" size={20} color="#6366F1" />
                </View>
                <View className="ml-4">
                  <Text className="text-base font-quicksand-medium" style={{ color: colors.textPrimary }}>
                    {i18n.t("enterprise.profile.management.partners")}
                  </Text>
                  {profileData.enterprise.deliveryPartners &&
                    profileData.enterprise.deliveryPartners.length > 0 && (
                      <Text className="text-sm font-quicksand-light" style={{ color: colors.textSecondary }}>
                        {i18n.t("enterprise.profile.management.partnersCount", { count: profileData.enterprise.deliveryPartners.length })}
                      </Text>
                    )}
                </View>
              </View>

              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* Paramètres */}
            <TouchableOpacity
              onPress={() =>
                router.push("/(app)/(enterprise)/profile/settings" as any)
              }
              className="flex-row items-center justify-between px-4 py-5"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full justify-center items-center" style={{ backgroundColor: isDark ? colors.brandPrimary + '20' : '#D1FAE5' }}>
                  <Ionicons name="settings-outline" size={20} color={colors.brandPrimary} />
                </View>
                <View className="ml-4">
                  <Text className="text-base font-quicksand-medium" style={{ color: colors.textPrimary }}>
                    {i18n.t("enterprise.profile.management.settings")}
                  </Text>
                  <Text className="text-sm font-quicksand-light" style={{ color: colors.textSecondary }}>
                    {i18n.t("enterprise.profile.management.settingsDescription")}
                  </Text>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bouton de déconnexion */}
        <View className="px-4 py-6">
          <TouchableOpacity
            className="rounded-2xl py-4"
            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
            onPress={handleLogout}
          >
            <View className="flex-row items-center justify-center">
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
              <Text className="font-quicksand-semibold ml-2" style={{ color: colors.error }}>
                {i18n.t("enterprise.profile.management.logout")}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View className="px-6 py-4">
          <Text className="text-center text-xs font-quicksand-medium" style={{ color: colors.textTertiary }}>
            {i18n.t("enterprise.profile.appInfo")}
          </Text>
        </View>

        {/* Espace supplémentaire pour la navbar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modals */}
      {profileData && (
        <>
          <EditProfileModal
            visible={showEditProfile}
            onClose={() => setShowEditProfile(false)}
            onSave={handleUpdateProfile}
            initialData={profileData}
            loading={editLoading}
            colors={colors}
            isDark={isDark}
          />

          <EditEnterpriseModal
            visible={showEditEnterprise}
            onClose={() => setShowEditEnterprise(false)}
            onSave={handleUpdateEnterprise}
            initialData={profileData.enterprise}
            loading={editLoading}
            colors={colors}
            isDark={isDark}
          />

          <AddPartnerModal
            // Modal AddPartner retirée : ne plus rendre (placeholder pour éviter rupture si import conservé)
            visible={false}
            onClose={() => { }}
            onAdd={handleAddPartner}
            loading={editLoading}
          />

          <EnterpriseDetailsModal
            visible={showEnterpriseDetails}
            onClose={() => setShowEnterpriseDetails(false)}
            enterprise={profileData.enterprise}
            colors={colors}
            isDark={isDark}
          />

          {/* Modal de confirmation */}
          <Modal
            visible={confirmationVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={closeConfirmation}
          >
            <View className="flex-1 justify-center items-center px-4" style={{ backgroundColor: colors.overlay }}>
              <View className="rounded-2xl p-6 w-full max-w-sm" style={{ backgroundColor: colors.card }}>
                <Text className="text-xl font-quicksand-bold mb-2" style={{ color: colors.textPrimary }}>
                  {confirmationAction?.title}
                </Text>
                <Text className="text-base font-quicksand-medium mb-6" style={{ color: colors.textSecondary }}>
                  {confirmationAction?.message}
                </Text>
                <View className="flex-row space-x-3">
                  <TouchableOpacity
                    className="flex-1 rounded-xl py-3"
                    style={{ backgroundColor: colors.tertiary }}
                    onPress={closeConfirmation}
                  >
                    <Text className="font-quicksand-semibold text-center" style={{ color: colors.textPrimary }}>
                      Annuler
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 rounded-xl py-3"
                    style={{
                      backgroundColor: confirmationAction?.confirmColor,
                    }}
                    onPress={executeConfirmedAction}
                  >
                    <Text className="font-quicksand-semibold text-center" style={{ color: colors.textOnBrand }}>
                      {confirmationAction?.confirmText}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
}

export default EnterpriseProfilePage;
