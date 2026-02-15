import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useToast } from "../../components/ui/ReanimatedToast/context";
import { useAuth } from "../../contexts/AuthContext";
import AuthService from "../../services/api/AuthService";
import { ErrorHandler } from "../../utils/ErrorHandler";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
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
          console.log("🚚 DELIVER role detected - showing error toast");
          console.log("🚚 User role from response:", userRole);

          // Show error toast with longer duration
          console.log("🚚 About to call toast.showError");
          toast.showToast({
            title: "Profil non supporté",
            subtitle:
              "Cette application ne gère que les profils clients et entreprises. Veuillez utiliser l'application dédiée aux livreurs.",
          });
          console.log("🚚 toast.showError called successfully");

          // Clear any stored session data
          await logout();

          // Add a longer delay to ensure toast is visible before any navigation
          setTimeout(() => {
            console.log(
              "🚚 DELIVER role handled - toast should have been visible for 6 seconds",
            );
          }, 6500);

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
          router.replace("/(auth)/verify-email" as any);
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
    toast.showToast({
      title: "Info",
      subtitle: "Fonctionnalité de mot de passe oublié sera bientôt disponible",
    });
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Fixed Header with Back Button */}
      <View className="absolute top-0 left-0 right-0 z-10 bg-white px-6 pt-16 pb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        className="flex-1 pt-28"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={150}
        enableAutomaticScroll={true}
        extraHeight={150}
        resetScrollToCoords={{ x: 0, y: 0 }}
        scrollEnabled={true}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Header */}
        <View className="px-6 pb-8">
          <Text className="text-3xl font-quicksand-bold text-neutral-900 mb-2">
            Bienvenue
          </Text>
          <Text className="text-base font-quicksand text-neutral-600">
            Connectez-vous à votre compte
          </Text>
        </View>

        {/* Form */}
        <View className="px-6">
          {/* Email Input */}
          <View className="mb-4">
            <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Entrez votre email"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              className="border border-neutral-200 rounded-xl px-4 py-4 text-base font-quicksand text-neutral-900"
              style={{ color: "#111827" }}
            />
          </View>

          {/* Password Input */}
          <View className="mb-6">
            <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
              Mot de passe
            </Text>
            <View className="relative">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Entrez votre mot de passe"
                placeholderTextColor="#9CA3AF"
                secureTextEntry={!showPassword}
                className="border border-neutral-200 rounded-xl px-4 py-4 pr-12 text-base font-quicksand text-neutral-900"
                style={{ color: "#111827" }}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4"
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          {/* <TouchableOpacity
            onPress={handleForgotPassword}
            className="self-end mb-8"
          >
            <Text className="text-primary font-quicksand-medium text-sm">
              Mot de passe oublié ?
            </Text>
          </TouchableOpacity> */}

          {/* Sign In Button */}
          <TouchableOpacity
            onPress={handleSignIn}
            disabled={isLoading}
            activeOpacity={1}
            className={`rounded-xl py-4 mb-6 flex-row items-center justify-center ${
              isLoading ? "bg-primary/70" : "bg-primary"
            }`}
          >
            {isLoading && (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
            )}
            <Text className="text-white font-quicksand-semibold text-base text-center">
              {isLoading ? "Connexion..." : "Se connecter"}
            </Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View className="flex-row justify-center items-center">
            <Text className="text-neutral-600 font-quicksand text-sm">
              Vous n&apos;avez pas de compte ?{" "}
            </Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text className="text-primary font-quicksand-semibold text-sm">
                S&apos;inscrire
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
