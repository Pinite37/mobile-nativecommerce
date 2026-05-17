import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../../components/ui/ReanimatedToast/context";
import AuthService from "../../services/api/AuthService";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;
const OTP_EXPIRY_SECONDS = 600; // 10 minutes

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

type Step = 1 | 2 | 3;

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [step, setStep] = useState<Step>(1);

  // Step 1 — email
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Step 2 — OTP
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [countdown, setCountdown] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Step 3 — new password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // OTP expiry countdown (purely visual)
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Resend button cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus first OTP box when step 2 appears
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => inputRefs.current[0]?.focus(), 400);
    }
  }, [step]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // ─── Step 1: envoyer le code ───────────────────────────────────────────────
  const handleSendOtp = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      toast.showToast({ title: "Champ requis", subtitle: "Veuillez saisir votre adresse email" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.showToast({ title: "Email invalide", subtitle: "Veuillez saisir une adresse email valide" });
      return;
    }

    Keyboard.dismiss();
    setIsSending(true);
    try {
      await AuthService.forgotPassword(trimmed.toLowerCase());
      setCountdown(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN);
      setStep(2);
    } catch (error: any) {
      toast.showToast({
        title: "Erreur",
        subtitle: error.message || "Impossible d'envoyer le code",
      });
    } finally {
      setIsSending(false);
    }
  };

  // ─── Step 2: saisie OTP ────────────────────────────────────────────────────
  const handleOtpChange = useCallback(
    (text: string, index: number) => {
      const digit = text.replace(/[^0-9]/g, "");

      // Handle paste: distribute across boxes
      if (digit.length > 1) {
        const digits = digit.slice(0, OTP_LENGTH).split("");
        const newOtp = [...otp];
        digits.forEach((d, i) => {
          if (index + i < OTP_LENGTH) newOtp[index + i] = d;
        });
        setOtp(newOtp);
        inputRefs.current[Math.min(index + digits.length, OTP_LENGTH - 1)]?.focus();
        return;
      }

      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);
      if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    },
    [otp],
  );

  const handleOtpKeyPress = useCallback(
    (e: any, index: number) => {
      if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    },
    [otp],
  );

  const otpCode = otp.join("");

  const handleOtpContinue = () => {
    if (otpCode.length !== OTP_LENGTH) {
      toast.showToast({ title: "Code incomplet", subtitle: `Veuillez saisir les ${OTP_LENGTH} chiffres du code` });
      return;
    }
    Keyboard.dismiss();
    setStep(3);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsResending(true);
    try {
      await AuthService.forgotPassword(email.trim().toLowerCase());
      setCountdown(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(""));
      setTimeout(() => inputRefs.current[0]?.focus(), 200);
      toast.showToast({ title: "Code envoyé", subtitle: "Un nouveau code a été envoyé à votre email" });
    } catch (error: any) {
      toast.showToast({ title: "Erreur", subtitle: error.message || "Impossible de renvoyer le code" });
    } finally {
      setIsResending(false);
    }
  };

  // ─── Step 3: nouveau mot de passe ─────────────────────────────────────────
  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.showToast({ title: "Champs requis", subtitle: "Veuillez remplir tous les champs" });
      return;
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      toast.showToast({
        title: "Mot de passe invalide",
        subtitle: "Au moins 8 caractères, une majuscule, une minuscule et un chiffre",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.showToast({ title: "Erreur", subtitle: "Les mots de passe ne correspondent pas" });
      return;
    }

    Keyboard.dismiss();
    setIsSubmitting(true);
    try {
      await AuthService.resetPasswordWithOtp({
        email: email.trim().toLowerCase(),
        otp: otpCode,
        newPassword,
      });
      toast.showToast({
        title: "Mot de passe modifié ✓",
        subtitle: "Votre mot de passe a été réinitialisé avec succès",
      });
      setTimeout(() => router.replace("/(auth)/signin" as any), 1200);
    } catch (error: any) {
      const msg: string = error.message || "";
      const lower = msg.toLowerCase();

      // OTP invalide, expiré ou autre erreur — rester sur l'étape 3
      toast.showToast({
        title: lower.includes("expiré") || lower.includes("expired") ? "Code expiré" : "Erreur",
        subtitle: msg || "Une erreur est survenue. Vérifiez votre code OTP.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Navigation retour ─────────────────────────────────────────────────────
  const handleBack = () => {
    if (step === 1) {
      router.back();
    } else if (step === 2) {
      setStep(1);
    } else {
      setStep(2);
    }
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const maskedEmail = email
    ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + b.replace(/./g, "•") + c)
    : "";

  const stepInfo: Record<Step, { icon: string; title: string; subtitle: string }> = {
    1: {
      icon: "lock-closed-outline",
      title: "Mot de passe\noublié ?",
      subtitle: "Saisissez votre adresse email pour recevoir un code de réinitialisation.",
    },
    2: {
      icon: "mail-open-outline",
      title: "Vérifiez\nvotre email",
      subtitle: `Code envoyé à\n${maskedEmail}`,
    },
    3: {
      icon: "shield-checkmark-outline",
      title: "Nouveau\nmot de passe",
      subtitle: "Choisissez un nouveau mot de passe sécurisé.",
    },
  };

  const current = stepInfo[step];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />

      {/* Header: back + step indicators */}
      <View className="px-6 pt-4 pb-2 flex-row items-center gap-4">
        <TouchableOpacity
          onPress={handleBack}
          className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>

        <View className="flex-row gap-2 items-center">
          {([1, 2, 3] as Step[]).map((s) => (
            <View
              key={s}
              className={`h-1.5 rounded-full ${s < step ? "bg-emerald-400" : s === step ? "bg-emerald-500" : "bg-neutral-200"}`}
              style={{ width: s === step ? 28 : 10 }}
            />
          ))}
        </View>
      </View>

      <KeyboardAwareScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={150}
        enableAutomaticScroll
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Icon + Title + Subtitle */}
        <View className="items-center px-6 pt-8 pb-6">
          <View className="w-20 h-20 rounded-full bg-emerald-50 items-center justify-center mb-5">
            <Ionicons name={current.icon as any} size={40} color="#10B981" />
          </View>
          <Text className="text-2xl font-quicksand-bold text-neutral-900 text-center mb-2">
            {current.title}
          </Text>
          <Text className="text-sm font-quicksand text-neutral-500 text-center px-4">
            {current.subtitle}
          </Text>
        </View>

        <View className="px-6">
          {/* ── Étape 1 : Email ── */}
          {step === 1 && (
            <>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="votre@email.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="send"
                onSubmitEditing={handleSendOtp}
                className="bg-neutral-50 border border-neutral-200 rounded-2xl px-5 py-4 text-base font-quicksand text-neutral-900 mb-6"
                style={{ color: "#111827", minHeight: 60 }}
              />

              <TouchableOpacity
                onPress={handleSendOtp}
                disabled={isSending}
                activeOpacity={0.8}
                className={`rounded-2xl py-4 flex-row items-center justify-center ${isSending ? "bg-emerald-400" : "bg-emerald-500"}`}
              >
                {isSending && (
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                )}
                <Text className="text-white font-quicksand-bold text-base">
                  {isSending ? "Envoi en cours..." : "Envoyer le code"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── Étape 2 : OTP ── */}
          {step === 2 && (
            <>
              {/* Countdown visuel */}
              <View className="items-center mb-5">
                <Text
                  className={`text-sm font-quicksand-semibold ${
                    countdown === 0
                      ? "text-red-500"
                      : countdown <= 60
                        ? "text-amber-500"
                        : "text-neutral-400"
                  }`}
                >
                  {countdown > 0
                    ? `Expire dans ${formatTime(countdown)}`
                    : "Code expiré — renvoyez un nouveau code"}
                </Text>
              </View>

              {/* Boîtes OTP */}
              <View className="flex-row justify-center gap-3 mb-8">
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => { inputRefs.current[index] = ref; }}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    onKeyPress={(e) => handleOtpKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={index === 0 ? OTP_LENGTH : 1}
                    selectTextOnFocus
                    className={`w-12 h-14 rounded-xl text-center text-xl font-quicksand-bold border-2 ${
                      digit
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-neutral-200 bg-neutral-50"
                    }`}
                    style={{ color: "#1F2937" }}
                  />
                ))}
              </View>

              {/* Bouton Continuer */}
              <TouchableOpacity
                onPress={handleOtpContinue}
                disabled={otpCode.length !== OTP_LENGTH}
                activeOpacity={0.8}
                className={`rounded-2xl py-4 mb-5 items-center ${
                  otpCode.length !== OTP_LENGTH ? "bg-emerald-300" : "bg-emerald-500"
                }`}
              >
                <Text className="text-white font-quicksand-bold text-base">Continuer</Text>
              </TouchableOpacity>

              {/* Renvoyer */}
              <View className="items-center">
                <Text className="text-sm font-quicksand text-neutral-500 mb-2">
                  Vous n&apos;avez pas reçu le code ?
                </Text>
                {resendCooldown > 0 ? (
                  <Text className="text-sm font-quicksand-semibold text-neutral-400">
                    Renvoyer dans {resendCooldown}s
                  </Text>
                ) : (
                  <TouchableOpacity onPress={handleResend} disabled={isResending}>
                    {isResending ? (
                      <ActivityIndicator size="small" color="#10B981" />
                    ) : (
                      <Text className="text-sm font-quicksand-bold text-emerald-600">
                        Renvoyer le code
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {/* ── Étape 3 : Nouveau mot de passe ── */}
          {step === 3 && (
            <>
              {/* Nouveau mot de passe */}
              <View className="relative mb-5">
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Nouveau mot de passe"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showNewPassword}
                  className="bg-neutral-50 border border-neutral-200 rounded-2xl px-5 py-4 pr-12 text-base font-quicksand text-neutral-900"
                  style={{ color: "#111827", minHeight: 60 }}
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword((p) => !p)}
                  className="absolute right-4 top-5"
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showNewPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>

              {/* Confirmer mot de passe */}
              <View className="relative mb-3">
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirmer le mot de passe"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showConfirmPassword}
                  className="bg-neutral-50 border border-neutral-200 rounded-2xl px-5 py-4 pr-12 text-base font-quicksand text-neutral-900"
                  style={{ color: "#111827", minHeight: 60 }}
                  returnKeyType="done"
                  onSubmitEditing={handleResetPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword((p) => !p)}
                  className="absolute right-4 top-5"
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>

              {/* Hint règle */}
              <Text className="text-xs font-quicksand text-neutral-400 mb-6 px-1">
                Au moins 8 caractères, une majuscule, une minuscule et un chiffre
              </Text>

              {/* Bouton soumettre */}
              <TouchableOpacity
                onPress={handleResetPassword}
                disabled={isSubmitting}
                activeOpacity={0.8}
                className={`rounded-2xl py-4 flex-row items-center justify-center ${isSubmitting ? "bg-emerald-400" : "bg-emerald-500"}`}
              >
                {isSubmitting && (
                  <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
                )}
                <Text className="text-white font-quicksand-bold text-base">
                  {isSubmitting ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
