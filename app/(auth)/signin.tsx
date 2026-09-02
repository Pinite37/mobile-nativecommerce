import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useToast } from "../../components/ui/ReanimatedToast/context";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import AuthService from "../../services/api/AuthService";
import { ErrorHandler } from "../../utils/ErrorHandler";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const { colors, isDark } = useTheme();
  const {
    checkAuthStatus,
    redirectToRoleBasedHome,
    logout,
    isAuthenticated,
    userRole,
    isLoading: authLoading,
  } = useAuth();

  // Bloquer l'accès si déjà connecté
  useEffect(() => {
    if (!authLoading && isAuthenticated && userRole) {
      console.log("🚫 Utilisateur déjà connecté, redirection depuis signin");
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

  const handleSignIn = async () => {
    Keyboard.dismiss();
    if (!email || !password) {
      toast.showToast({
        title: "Erreur",
        subtitle: "Veuillez remplir tous les champs",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await AuthService.login({ email, password });

      if (response.success) {
        const userRole = response.data.user.role;

        // Check if role is supported
        if ((userRole as string) === "DELIVER") {
          toast.showToast({
            title: "Profil non supporté",
            subtitle:
              "Cette application ne gère que les profils clients et entreprises. Veuillez utiliser l'application dédiée aux livreurs.",
          });

          // Clear any stored session data
          await logout();

          // Add a longer delay to ensure toast is visible before any navigation
          return;
        }

        // Check if email needs verification BEFORE refreshing auth status
        if (!response.data.user.emailVerified) {
          console.log(
            "📧 Email non vérifié, redirection IMMÉDIATE vers la vérification OTP",
          );
          console.log(
            "⚠️ checkAuthStatus NON appelé - sera appelé après vérification OTP",
          );
          // Ne PAS appeler checkAuthStatus ici !
          // Cela évite de déclencher isAuthenticated=true, le modal notification, le chargement index.tsx, etc.
          toast.showToast({
            title: "Vérification requise",
            subtitle: "Veuillez vérifier votre adresse email",
          });
          router.replace("/(auth)/verify-email");
          return;
        }

        const successMessage = ErrorHandler.getSuccessMessage("login");
        toast.showToast({
          title: successMessage.title,
          subtitle: successMessage.message,
        });

        // Email vérifié : activer la session complète
        await checkAuthStatus();

        setTimeout(() => {
          redirectToRoleBasedHome(userRole);
        }, 1000);
      }
    } catch (error: any) {
      // Détecter l'erreur spécifique "Email non vérifié" (401)
      const errorMsg = error?.response?.data?.message || error?.message || "";
      if (
        errorMsg.toLowerCase().includes("email non vérifié") ||
        errorMsg.toLowerCase().includes("email not verified")
      ) {
        console.log(
          "📧 Erreur 401 - Email non vérifié, redirection vers vérification OTP",
        );
        toast.showToast({
          title: "Vérification requise",
          subtitle:
            "Veuillez vérifier votre adresse email avant de vous connecter",
        });
        router.replace({
          pathname: "/(auth)/verify-email" as any,
          params: { email },
        });
        return;
      }

      const errorMessage = ErrorHandler.parseApiError(error);
      toast.showToast({
        title: errorMessage.title,
        subtitle: errorMessage.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => {
    router.push("/(auth)/role-selection");
  };

  const handleForgotPassword = () => {
    router.push("/(auth)/forgot-password");
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Background Shapes */}
      <View className="absolute top-[-100] left-[-80] w-[300px] h-[300px] rounded-full bg-primary/10" />
      <View
        className="absolute top-[20%] right-[-140] w-[280px] h-[350px] bg-primary/20"
        style={{ borderTopLeftRadius: 150, borderBottomLeftRadius: 150 }}
      />

      {/* Back Button */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 42, height: 42, borderRadius: 21,
            alignItems: "center", justifyContent: "center",
            backgroundColor: colors.card,
            borderWidth: 1, borderColor: colors.border,
          }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          style={{ flex: 1, paddingTop: 110 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 24 }}
        >
          {/* Logo + Titre */}
          <Image
            source={require('../../assets/images/axiLogoo.png')}
            style={{ width: 120, height: 38, marginBottom: 28 }}
            resizeMode="contain"
          />
          <Text style={{ fontFamily: "PlusJakartaSans-Bold", fontSize: 30, color: colors.textPrimary, lineHeight: 38, marginBottom: 6 }}>
            Bienvenue
          </Text>
          <Text style={{ fontFamily: "PlusJakartaSans-Regular", fontSize: 15, color: colors.textSecondary, marginBottom: 36 }}>
            Connectez-vous à votre compte
          </Text>

          {/* Email */}
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontFamily: "PlusJakartaSans-SemiBold", fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>
              Email
            </Text>
            <View style={{
              flexDirection: "row", alignItems: "center",
              backgroundColor: colors.card, borderWidth: 1,
              borderColor: colors.border, borderRadius: 14,
              paddingHorizontal: 16, height: 56,
            }}>
              <Ionicons name="mail-outline" size={18} color={colors.textTertiary} style={{ marginRight: 12 }} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="votre@email.com"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ flex: 1, fontFamily: "PlusJakartaSans-Medium", fontSize: 15, color: colors.textPrimary }}
              />
            </View>
          </View>

          {/* Mot de passe */}
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontFamily: "PlusJakartaSans-SemiBold", fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>
              Mot de passe
            </Text>
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

          {/* Mot de passe oublié */}
          <TouchableOpacity onPress={handleForgotPassword} style={{ alignSelf: "flex-end", marginBottom: 32 }}>
            <Text style={{ fontFamily: "PlusJakartaSans-SemiBold", fontSize: 13, color: "#10B981" }}>
              Mot de passe oublié ?
            </Text>
          </TouchableOpacity>

          {/* Bouton connexion */}
          <TouchableOpacity
            onPress={handleSignIn}
            disabled={isLoading}
            activeOpacity={0.85}
            style={{
              height: 54, borderRadius: 14, backgroundColor: "#10B981",
              flexDirection: "row", alignItems: "center", justifyContent: "center",
              marginBottom: 24, opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 10 }} />}
            <Text style={{ fontFamily: "PlusJakartaSans-Bold", fontSize: 16, color: "#fff" }}>
              {isLoading ? null : "Se connecter"}
            </Text>
          </TouchableOpacity>

          {/* Lien inscription */}
          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontFamily: "PlusJakartaSans-Regular", fontSize: 14, color: colors.textSecondary }}>
              Pas encore de compte ?{" "}
            </Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text style={{ fontFamily: "PlusJakartaSans-Bold", fontSize: 14, color: "#10B981" }}>
                S&apos;inscrire
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
