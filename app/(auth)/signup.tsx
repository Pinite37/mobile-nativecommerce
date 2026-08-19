import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Image, Linking, Text, TextInput, TouchableOpacity, View } from "react-native";
import PhoneInput, {
  ICountry,
  getCountryByCca2,
} from "react-native-international-phone-number";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LocationConsentBanner } from "../../components/ui/LocationConsentBanner";
import { useToast } from "../../components/ui/ReanimatedToast/context";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useLocationForRegistration } from "../../hooks/useLocationForRegistration";
import { ErrorHandler } from "../../utils/ErrorHandler";
import { RegistrationHelper } from "../../utils/RegistrationHelper";

const DEFAULT_COUNTRY_CCA2 = "BJ";

export default function SignUpScreen() {
  const { role } = useLocalSearchParams<{ role: string }>();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<ICountry | null>(
    getCountryByCca2(DEFAULT_COUNTRY_CCA2) ?? null,
  );
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const {
    status: locationStatus,
    coords,
    detectedCity,
    requestLocation,
    skip: skipLocation,
    reset: resetLocation,
  } = useLocationForRegistration();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const {
    redirectToRoleBasedHome,
    handlePostRegistration,
    logout,
    isAuthenticated,
    userRole,
    isLoading: authLoading,
  } = useAuth();

  // Bloquer l'accès si déjà connecté
  useEffect(() => {
    if (!authLoading && isAuthenticated && userRole) {
      console.log("🚫 Utilisateur déjà connecté, redirection depuis signup");
      if (userRole === "CLIENT") {
        router.replace("/(app)/(client)/(tabs)");
      } else if (userRole === "ENTERPRISE") {
        router.replace("/(app)/(enterprise)/(tabs)");
      }
    }
  }, [authLoading, isAuthenticated, userRole]);

  // Ne rien afficher pendant le chargement ou si déjà connecté
  if (authLoading || isAuthenticated) {
    return null;
  }

  const handleSignUp = async () => {
    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !address ||
      !password ||
      !confirmPassword
    ) {
      toast.showToast({
        title: "Erreur",
        subtitle: "Veuillez remplir tous les champs",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast.showToast({
        title: "Erreur",
        subtitle: "Les mots de passe ne correspondent pas",
      });
      return;
    }

    if (password.length < 6) {
      toast.showToast({
        title: "Erreur",
        subtitle: "Le mot de passe doit contenir au moins 6 caractères",
      });
      return;
    }

    if (!agreedToTerms) {
      toast.showToast({
        title: "Erreur",
        subtitle: "Veuillez accepter les termes et conditions",
      });
      return;
    }

    setIsLoading(true);
    try {
      const digits = phone.replace(/[^\d]/g, "");
      const root = phoneCountry?.idd?.root ?? "";
      const suffix = phoneCountry?.idd?.suffixes?.[0] ?? "";
      const formattedPhone = `${root}${suffix}${digits}`;
      console.log("📱 Numéro formaté pour inscription:", formattedPhone);

      const userData = {
        firstName,
        lastName,
        email,
        phone: formattedPhone,
        address,
        password,
        agreedToTerms,
        role: (role || "CLIENT") as "CLIENT" | "ENTERPRISE",
        ...(coords && { latitude: coords.latitude, longitude: coords.longitude }),
      };

      console.log("🚀 Début de l'inscription...");

      // Utiliser l'utilitaire d'inscription avec connexion automatique
      const response = await RegistrationHelper.registerWithAutoLogin(
        userData,
        false,
      );

      if (response.success && response.data) {
        console.log("✅ Inscription réussie, traitement de l'état...");

        // Check if role is supported
        const userRole = response.data.user.role;
        if ((userRole as string) === "DELIVER") {
          toast.showToast({
            title: "Profil non supporté",
            subtitle:
              "Cette application ne gère que les profils clients et entreprises. Veuillez utiliser l'application dédiée aux livreurs.",
          });

          // Clear any stored session data
          await logout();
          return;
        }

        // Afficher l'état d'authentification pour debug
        await RegistrationHelper.logAuthenticationState();

        const successMessage = ErrorHandler.getSuccessMessage("register");
        toast.showToast({
          title: successMessage.title,
          subtitle: successMessage.message,
        });

        // Check if email needs verification BEFORE setting full auth state
        if (!response.data.user.emailVerified) {
          console.log(
            "📧 Email non vérifié, redirection IMMÉDIATE vers la vérification OTP",
          );
          console.log(
            "⚠️ handlePostRegistration NON appelé - sera appelé après vérification OTP",
          );
          // Ne PAS appeler handlePostRegistration ici !
          // Cela évite de déclencher isAuthenticated=true, le modal notification, le chargement index.tsx, etc.
          // On redirige directement vers l'OTP sans passer par le home
          router.replace("/(auth)/verify-email");
          return;
        }

        // Email déjà vérifié : activer la session complète
        console.log("🎯 Email vérifié, activation de la session complète...");
        await handlePostRegistration(
          response.data.user,
          response.data.user.role,
        );

        // Rediriger vers l'interface correspondant au rôle avec un délai optimisé
        setTimeout(() => {
          redirectToRoleBasedHome(response.data.user.role);
        }, 1200);
      }
    } catch (error: any) {
      console.error("❌ Erreur inscription:", error);
      const errorMessage = ErrorHandler.parseApiError(error);
      toast.showToast({
        title: errorMessage.title,
        subtitle: errorMessage.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Background Shapes */}
      <View className="absolute top-[-100] right-[-80] w-[300px] h-[300px] rounded-full bg-primary/10" />
      <View
        className="absolute top-[30%] left-[-140] w-[280px] h-[350px] bg-primary/20"
        style={{ borderTopRightRadius: 150, borderBottomRightRadius: 150 }}
      />

      {/* Fixed Header with Back Button */}
      <View
        className="absolute top-0 left-0 right-0 z-10 px-6"
        style={{
          paddingTop: Math.max(insets.top, 16) + 16,
          paddingBottom: 16,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-11 h-11 rounded-full shadow-sm items-center justify-center border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        className="flex-1"
        style={{ paddingTop: Math.max(insets.top, 16) + 60 }}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={150}
        enableAutomaticScroll={true}
        extraHeight={150}
        resetScrollToCoords={{ x: 0, y: 0 }}
        scrollEnabled={true}
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 30) + 60,
        }}
      >
        {/* Header */}
        <View className="px-6 pb-6 mt-4">
          <Image
            source={require('../../assets/images/axiLogoo.png')}
            style={{ width: 120, height: 40 }}
            resizeMode="contain"
            className="mb-4"
          />
          <Text className="text-3xl font-quicksand-bold mb-2" style={{ color: colors.textPrimary }}>
            Créer un compte
          </Text>
          <Text className="text-base font-quicksand" style={{ color: colors.textSecondary }}>
            Inscrivez-vous pour commencer
          </Text>
        </View>

        {/* Form */}
        <View className="px-6">
          {/* Name Inputs */}
          <View className="flex-row mb-4">
            <View className="flex-1 mr-2">
              <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
                Prénom
              </Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Prénom"
                placeholderTextColor={colors.textTertiary}
                className="border rounded-2xl px-5 py-4 text-base font-quicksand shadow-sm"
                style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }}
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
                Nom
              </Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Nom"
                placeholderTextColor={colors.textTertiary}
                className="border rounded-2xl px-5 py-4 text-base font-quicksand shadow-sm"
                style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }}
              />
            </View>
          </View>

          {/* Email Input */}
          <View className="mb-4">
            <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              className="border rounded-2xl px-5 py-4 text-base font-quicksand shadow-sm"
              style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }}
            />
          </View>

          {/* Phone Input */}
          <View className="mb-4">
            <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
              Numéro de téléphone
            </Text>
            <PhoneInput
              value={phone}
              onChangePhoneNumber={setPhone}
              selectedCountry={phoneCountry}
              onChangeSelectedCountry={setPhoneCountry}
              defaultCountry={DEFAULT_COUNTRY_CCA2}
              placeholder="XX XX XX XX"
              phoneInputStyles={{
                container: {
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 16,
                  paddingVertical: 4,
                },
                flagContainer: {
                  backgroundColor: colors.card,
                  borderTopLeftRadius: 16,
                  borderBottomLeftRadius: 16,
                },
                input: {
                  color: colors.textPrimary,
                },
                callingCode: {
                  color: colors.textPrimary,
                },
              }}
            />
          </View>

          {/* Address Input */}
          <View className="mb-4">
            <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
              Adresse
            </Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Adresse complète"
              placeholderTextColor={colors.textTertiary}
              className="border rounded-2xl px-5 py-4 text-base font-quicksand shadow-sm"
              style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }}
            />
          </View>

          {/* Password Input */}
          <View className="mb-4">
            <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
              Mot de passe
            </Text>
            <View className="relative">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Mot de passe"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showPassword}
                className="border rounded-2xl px-5 py-4 pr-12 text-base font-quicksand shadow-sm"
                style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-5"
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View className="mb-6">
            <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
              Confirmer le mot de passe
            </Text>
            <View className="relative">
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirmez le mot de passe"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry={!showConfirmPassword}
                className="border rounded-2xl px-5 py-4 pr-12 text-base font-quicksand shadow-sm"
                style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-5"
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Location Detection */}
          <LocationConsentBanner
            status={locationStatus}
            detectedCity={detectedCity}
            onRequest={requestLocation}
            onSkip={skipLocation}
            onReset={resetLocation}
          />

          {/* Terms and Conditions Checkbox */}
          <View className="mb-6">
            <TouchableOpacity
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              className="flex-row items-start"
              activeOpacity={1}
            >
              <View
                className="w-5 h-5 border-2 rounded mr-3 mt-0.5 justify-center items-center"
                style={agreedToTerms
                  ? { backgroundColor: '#10B981', borderColor: '#10B981' }
                  : { borderColor: colors.border, backgroundColor: colors.card }}
              >
                {agreedToTerms && (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                )}
              </View>
              <Text className="text-sm font-quicksand flex-1" style={{ color: colors.textSecondary }}>
                J&#39;accepte les{" "}
                <Text
                  className="text-primary font-quicksand-medium"
                  onPress={() =>
                    Linking.openURL("https://nativecommerce.com/terms")
                  }
                >
                  « termes et conditions »
                </Text>{" "}
                et la{" "}
                <Text
                  className="text-primary font-quicksand-medium"
                  onPress={() =>
                    Linking.openURL("https://nativecommerce.com/privacy")
                  }
                >
                  « politique de confidentialité »
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            onPress={handleSignUp}
            disabled={isLoading}
            activeOpacity={0.8}
            className={`rounded-2xl py-4 mb-6 shadow-sm ${
              isLoading ? "bg-primary/70" : "bg-primary"
            }`}
          >
            <Text className="text-white font-quicksand-semibold text-base text-center">
              {isLoading ? "Création du compte..." : "Créer le compte"}
            </Text>
          </TouchableOpacity>

          {/* Sign In Link */}
          <View className="flex-row justify-center items-center pb-6 mt-2">
            <Text className="font-quicksand text-sm" style={{ color: colors.textSecondary }}>
              Vous avez déjà un compte ?{" "}
            </Text>
            <TouchableOpacity onPress={handleSignIn}>
              <Text className="text-primary font-quicksand-bold text-sm underline">
                Se connecter
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
