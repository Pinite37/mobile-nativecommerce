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
import EnterpriseService, { SocialLink } from "../../../../services/api/EnterpriseService";

export default function EditEnterprisePage() {
  const { colors, isDark } = useTheme();
  const { showToast } = useReanimatedToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [currentLogo, setCurrentLogo] = useState<string | null>(null);
  const [selectedLogo, setSelectedLogo] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  useEffect(() => {
    EnterpriseService.getProfile()
      .then((data) => {
        const e = data.enterprise;
        setCompanyName(e.companyName || "");
        setDescription(e.description || "");
        setWebsite(e.contactInfo?.website || "");
        setPhone(e.contactInfo?.phone || "");
        setEmail(e.contactInfo?.email || "");
        setWhatsapp(e.contactInfo?.whatsapp || "");
        setSocialLinks(e.socialLinks || []);
        setCurrentLogo(e.logo || null);
      })
      .catch(() => showToast({ title: i18n.t("messages.error"), autodismiss: true }))
      .finally(() => setLoading(false));
  }, []);

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showToast({
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

  const addSocialLink = () => setSocialLinks([...socialLinks, { platform: "", url: "" }]);

  const updateSocialLink = (index: number, field: "platform" | "url", value: string) => {
    const updated = [...socialLinks];
    updated[index][field] = value;
    setSocialLinks(updated);
  };

  const removeSocialLink = (index: number) =>
    setSocialLinks(socialLinks.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!companyName.trim()) {
      showToast({
        title: i18n.t("enterprise.profile.modals.editEnterprise.errors.required"),
        subtitle: i18n.t("enterprise.profile.modals.editEnterprise.errors.companyNameRequired"),
        autodismiss: true,
      });
      return;
    }
    try {
      setSaving(true);
      await EnterpriseService.updateEnterpriseInfoWithLogo(
        {
          companyName,
          description,
          contactInfo: { email, phone, whatsapp, website },
          socialLinks: socialLinks.filter((l) => l.platform && l.url),
        },
        logoBase64 || undefined
      );
      showToast({
        title: i18n.t("enterprise.profile.modals.editEnterprise.success"),
        autodismiss: true,
      });
      router.back();
    } catch (err: any) {
      showToast({
        title: i18n.t("messages.error"),
        subtitle: err.message || i18n.t("enterprise.profile.modals.editEnterprise.error"),
        autodismiss: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const logoUri = selectedLogo || currentLogo;

  const inputStyle = {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    fontFamily: "PlusJakartaSans-Regular",
    fontSize: 15,
    color: colors.textPrimary,
  };

  const labelStyle = {
    fontFamily: "PlusJakartaSans-SemiBold",
    fontSize: 13,
    color: colors.textPrimary,
    marginBottom: 8,
  };

  const sectionTitleStyle = {
    fontFamily: "PlusJakartaSans-Bold",
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 14,
    marginTop: 8,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} />
      <AppHeader
        title={i18n.t("enterprise.profile.modals.editEnterprise.title")}
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
                <Text style={{ fontFamily: "PlusJakartaSans-SemiBold", fontSize: 13, color: "#FFFFFF" }}>
                  {i18n.t("enterprise.profile.modals.editEnterprise.save")}
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
          {/* Logo picker */}
          <View style={{ alignItems: "center", marginBottom: 32 }}>
            <TouchableOpacity onPress={pickLogo} style={{ position: "relative" }}>
              {logoUri ? (
                <Image
                  source={{ uri: logoUri }}
                  style={{ width: 100, height: 100, borderRadius: 50 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontFamily: "PlusJakartaSans-Bold", fontSize: 34, color: "#FFFFFF" }}>
                    {companyName?.[0]?.toUpperCase() || "E"}
                  </Text>
                </View>
              )}
              <View style={{ position: "absolute", bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.secondary }}>
                <Ionicons name="camera" size={15} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={{ fontFamily: "PlusJakartaSans-Medium", fontSize: 13, color: colors.brandPrimary, marginTop: 10 }}>
              {i18n.t("enterprise.profile.modals.editEnterprise.changeLogo")}
            </Text>
          </View>

          {/* Infos générales */}
          <View style={{ gap: 16 }}>
            <View>
              <Text style={labelStyle}>{i18n.t("enterprise.profile.modals.editEnterprise.companyName")}</Text>
              <TextInput
                value={companyName}
                onChangeText={setCompanyName}
                placeholder={i18n.t("enterprise.profile.modals.editEnterprise.placeholders.companyName")}
                placeholderTextColor={colors.textTertiary}
                style={inputStyle}
              />
            </View>

            <View>
              <Text style={labelStyle}>{i18n.t("enterprise.profile.modals.editEnterprise.description")}</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={i18n.t("enterprise.profile.modals.editEnterprise.placeholders.description")}
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={[inputStyle, { minHeight: 100, paddingVertical: 14 }]}
              />
            </View>
          </View>

          {/* Coordonnées */}
          <Text style={sectionTitleStyle}>{i18n.t("enterprise.profile.modals.editEnterprise.contactInfo")}</Text>
          <View style={{ gap: 16 }}>
            <View>
              <Text style={labelStyle}>{i18n.t("enterprise.profile.modals.editEnterprise.website")}</Text>
              <TextInput
                value={website}
                onChangeText={setWebsite}
                placeholder={i18n.t("enterprise.profile.modals.editEnterprise.placeholders.website")}
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                keyboardType="url"
                style={inputStyle}
              />
            </View>

            <View>
              <Text style={labelStyle}>{i18n.t("enterprise.profile.modals.editEnterprise.phone")}</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder={i18n.t("enterprise.profile.modals.editEnterprise.placeholders.phone")}
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
                style={inputStyle}
              />
            </View>

            <View>
              <Text style={labelStyle}>{i18n.t("enterprise.profile.modals.editEnterprise.email")}</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={i18n.t("enterprise.profile.modals.editEnterprise.placeholders.email")}
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                style={inputStyle}
              />
            </View>

            <View>
              <Text style={labelStyle}>{i18n.t("enterprise.profile.modals.editEnterprise.whatsapp")}</Text>
              <TextInput
                value={whatsapp}
                onChangeText={setWhatsapp}
                placeholder={i18n.t("enterprise.profile.modals.editEnterprise.placeholders.whatsapp")}
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
                style={inputStyle}
              />
            </View>
          </View>

          {/* Réseaux sociaux */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 28, marginBottom: 14 }}>
            <Text style={sectionTitleStyle}>{i18n.t("enterprise.profile.modals.editEnterprise.socialNetworks")}</Text>
            <TouchableOpacity onPress={addSocialLink} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="add-circle" size={20} color={colors.brandPrimary} />
              <Text style={{ fontFamily: "PlusJakartaSans-Medium", fontSize: 13, color: colors.brandPrimary }}>
                {i18n.t("enterprise.profile.modals.editEnterprise.addSocial")}
              </Text>
            </TouchableOpacity>
          </View>

          {socialLinks.length === 0 ? (
            <Text style={{ fontFamily: "PlusJakartaSans-Regular", fontSize: 13, color: colors.textTertiary, fontStyle: "italic", marginBottom: 16 }}>
              {i18n.t("enterprise.profile.modals.editEnterprise.noSocial")}
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {socialLinks.map((link, index) => (
                <View key={index} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TextInput
                    value={link.platform}
                    onChangeText={(v) => updateSocialLink(index, "platform", v)}
                    placeholder={i18n.t("enterprise.profile.modals.editEnterprise.placeholders.platform")}
                    placeholderTextColor={colors.textTertiary}
                    style={[inputStyle, { flex: 1 }]}
                  />
                  <TextInput
                    value={link.url}
                    onChangeText={(v) => updateSocialLink(index, "url", v)}
                    placeholder={i18n.t("enterprise.profile.modals.editEnterprise.placeholders.url")}
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                    style={[inputStyle, { flex: 2 }]}
                  />
                  <TouchableOpacity
                    onPress={() => removeSocialLink(index)}
                    style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: isDark ? colors.error + "20" : "#FEE2E2" }}
                  >
                    <Ionicons name="close" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </KeyboardAwareScrollView>
      )}
    </View>
  );
}
