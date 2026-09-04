import { Ionicons } from "@expo/vector-icons";
import AuthTransitionScreen from "../../components/ui/AuthTransitionScreen";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Text, TextInput, TouchableOpacity, View } from "react-native";
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

  // Le temps que la redirection ci-dessus se déclenche (les effets courent
  // après le rendu) — un écran de transition plutôt qu'un flash blanc.
  if (authLoading || isAuthenticated) {
    return <AuthTransitionScreen />;
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

  const inputRow = (
    icon: string,
    content: React.ReactNode,
  ) => (
    <View style={{
      flexDirection: "row", alignItems: "center",
      backgroundColor: colors.card, borderWidth: 1,
      borderColor: colors.border, borderRadius: 14,
      paddingHorizontal: 16, minHeight: 56,
    }}>
      <Ionicons name={icon as any} size={18} color={colors.textTertiary} style={{ marginRight: 12 }} />
      {content}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Background Shapes */}
      <View className="absolute top-[-100] right-[-80] w-[300px] h-[300px] rounded-full bg-primary/10" />
      <View
        className="absolute top-[30%] left-[-140] w-[280px] h-[350px] bg-primary/20"
        style={{ borderTopRightRadius: 150, borderBottomRightRadius: 150 }}
      />

      {/* Back Button */}
      <View style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
        paddingHorizontal: 20, paddingTop: Math.max(insets.top, 16) + 10, paddingBottom: 8,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 42, height: 42, borderRadius: 21,
            alignItems: "center", justifyContent: "center",
            backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
          }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        style={{ flex: 1, paddingTop: Math.max(insets.top, 16) + 62 }}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={150}
        enableAutomaticScroll={true}
        extraHeight={150}
        resetScrollToCoords={{ x: 0, y: 0 }}
        scrollEnabled={true}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 30) + 60, paddingHorizontal: 24 }}
      >
        {/* Logo + Titre */}
        <Image
          source={require('../../assets/images/axiLogoo.png')}
          style={{ width: 110, height: 36, marginBottom: 22 }}
          resizeMode="contain"
        />
        <Text style={{ fontFamily: "PlusJakartaSans-Bold", fontSize: 28, color: colors.textPrimary, marginBottom: 4 }}>
          Créer un compte
        </Text>
        <Text style={{ fontFamily: "PlusJakartaSans-Regular", fontSize: 15, color: colors.textSecondary, marginBottom: 28 }}>
          Inscrivez-vous pour commencer
        </Text>

        {/* Prénom / Nom */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "PlusJakartaSans-SemiBold", fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>Prénom</Text>
            {inputRow("person-outline",
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Prénom"
                placeholderTextColor={colors.textTertiary}
                style={{ flex: 1, fontFamily: "PlusJakartaSans-Medium", fontSize: 15, color: colors.textPrimary }}
              />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "PlusJakartaSans-SemiBold", fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>Nom</Text>
            {inputRow("person-outline",
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Nom"
                placeholderTextColor={colors.textTertiary}
                style={{ flex: 1, fontFamily: "PlusJakartaSans-Medium", fontSize: 15, color: colors.textPrimary }}
              />
            )}
          </View>
        </View>

        {/* Email */}
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontFamily: "PlusJakartaSans-SemiBold", fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>Email</Text>
          {inputRow("mail-outline",
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="votre@email.com"
              placeholderTextColor={colors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ flex: 1, fontFamily: "PlusJakartaSans-Medium", fontSize: 15, color: colors.textPrimary }}
            />
          )}
        </View>

        {/* Téléphone */}
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontFamily: "PlusJakartaSans-SemiBold", fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>Téléphone</Text>
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
                borderRadius: 14,
                paddingVertical: 4,
              },
              flagContainer: {
                backgroundColor: colors.card,
                borderTopLeftRadius: 14,
                borderBottomLeftRadius: 14,
              },
              input: { color: colors.textPrimary, fontFamily: "PlusJakartaSans-Medium" },
              callingCode: { color: colors.textPrimary },
            }}
          />
        </View>

        {/* Adresse */}
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontFamily: "PlusJakartaSans-SemiBold", fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>Adresse</Text>
          {inputRow("location-outline",
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Adresse complète"
              placeholderTextColor={colors.textTertiary}
              style={{ flex: 1, fontFamily: "PlusJakartaSans-Medium", fontSize: 15, color: colors.textPrimary }}
            />
          )}
        </View>

        {/* Mot de passe */}
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontFamily: "PlusJakartaSans-SemiBold", fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>Mot de passe</Text>
          <View style={{
            flexDirection: "row", alignItems: "center",
            backgroundColor: colors.card, borderWidth: 1,
            borderColor: colors.border, borderRadius: 14,
            paddingHorizontal: 16, height: 56,
          }}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} style={{ marginRight: 12 }} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry={!showPassword}
              style={{ flex: 1, fontFamily: "PlusJakartaSans-Medium", fontSize: 15, color: colors.textPrimary }}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirmer mot de passe */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontFamily: "PlusJakartaSans-SemiBold", fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>Confirmer le mot de passe</Text>
          <View style={{
            flexDirection: "row", alignItems: "center",
            backgroundColor: colors.card, borderWidth: 1,
            borderColor: colors.border, borderRadius: 14,
            paddingHorizontal: 16, height: 56,
          }}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} style={{ marginRight: 12 }} />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              secureTextEntry={!showConfirmPassword}
              style={{ flex: 1, fontFamily: "PlusJakartaSans-Medium", fontSize: 15, color: colors.textPrimary }}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} activeOpacity={0.7}>
              <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Localisation */}
        <LocationConsentBanner
          status={locationStatus}
          detectedCity={detectedCity}
          onRequest={requestLocation}
          onSkip={skipLocation}
          onReset={resetLocation}
        />

        {/* CGU */}
        <View style={{ marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => setAgreedToTerms(!agreedToTerms)}
            style={{ flexDirection: "row", alignItems: "flex-start" }}
            activeOpacity={1}
          >
            <View style={{
              width: 20, height: 20, borderRadius: 6, marginRight: 12, marginTop: 1,
              justifyContent: "center", alignItems: "center", borderWidth: 2,
              backgroundColor: agreedToTerms ? "#10B981" : colors.card,
              borderColor: agreedToTerms ? "#10B981" : colors.border,
            }}>
              {agreedToTerms && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
            <Text style={{ fontFamily: "PlusJakartaSans-Regular", fontSize: 13, color: colors.textSecondary, flex: 1, lineHeight: 20 }}>
              J&#39;accepte les{" "}
              <Text style={{ color: "#10B981", fontFamily: "PlusJakartaSans-SemiBold" }} onPress={() => Linking.openURL("https://nativecommerce.com/terms")}>
                termes et conditions
              </Text>{" "}
              et la{" "}
              <Text style={{ color: "#10B981", fontFamily: "PlusJakartaSans-SemiBold" }} onPress={() => Linking.openURL("https://nativecommerce.com/privacy")}>
                politique de confidentialité
              </Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bouton créer compte */}
        <TouchableOpacity
          onPress={handleSignUp}
          disabled={isLoading}
          activeOpacity={0.85}
          style={{
            height: 54, borderRadius: 14, backgroundColor: "#10B981",
            alignItems: "center", justifyContent: "center",
            marginBottom: 20, opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />}
          <Text style={{ fontFamily: "PlusJakartaSans-Bold", fontSize: 16, color: "#fff" }}>
            {isLoading ? null : "Créer le compte"}
          </Text>
        </TouchableOpacity>

        {/* Lien connexion */}
        <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontFamily: "PlusJakartaSans-Regular", fontSize: 14, color: colors.textSecondary }}>
            Vous avez déjà un compte ?{" "}
          </Text>
          <TouchableOpacity onPress={handleSignIn}>
            <Text style={{ fontFamily: "PlusJakartaSans-Bold", fontSize: 14, color: "#10B981" }}>
              Se connecter
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
