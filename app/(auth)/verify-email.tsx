import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToast } from '../../components/ui/ReanimatedToast/context';
import { useAuth } from '../../contexts/AuthContext';
import AuthService from '../../services/api/AuthService';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailScreen() {
  const { email: routeEmail } = useLocalSearchParams<{ email?: string }>();
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const inputRefs = useRef<(TextInput | null)[]>([]);
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { user, checkAuthStatus, redirectToRoleBasedHome, userRole } = useAuth();

  // Get stored user role from TokenStorage for cases where AuthContext isn't fully loaded
  const [storedRole, setStoredRole] = useState<string | null>(userRole);
  const [storedEmail, setStoredEmail] = useState<string | null>(user?.email || routeEmail || null);
  
  useEffect(() => {
    const loadStoredData = async () => {
      const TokenStorageService = (await import('../../services/TokenStorageService')).default;
      if (!userRole) {
        const role = await TokenStorageService.getUserRole();
        setStoredRole(role);
      }
      if (!user?.email && !routeEmail) {
        const userData = await TokenStorageService.getUserData();
        if (userData?.email) {
          setStoredEmail(userData.email);
        }
      }
    };
    loadStoredData();
  }, [userRole, user, routeEmail]);

  // Countdown timer for resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Focus first input when screen opens
  // No need to call resendEmailOtp here — the backend already sends the OTP during registration/login
  useEffect(() => {
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 400);
  }, []);

  // Handle OTP input change
  const handleChange = useCallback(
    (text: string, index: number) => {
      // Only allow digits
      const digit = text.replace(/[^0-9]/g, '');

      if (digit.length > 1) {
        // Handle paste: distribute digits across inputs
        const digits = digit.slice(0, OTP_LENGTH).split('');
        const newOtp = [...otp];
        digits.forEach((d, i) => {
          if (index + i < OTP_LENGTH) {
            newOtp[index + i] = d;
          }
        });
        setOtp(newOtp);
        // Focus the next empty input or the last one
        const nextIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
        inputRefs.current[nextIndex]?.focus();
        return;
      }

      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);

      // Auto-advance to next input
      if (digit && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [otp]
  );

  // Handle backspace
  const handleKeyPress = useCallback(
    (e: any, index: number) => {
      if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    },
    [otp]
  );

  const otpCode = otp.join('');

  // Auto-verify when all 6 digits entered
  useEffect(() => {
    if (otpCode.length === OTP_LENGTH && !isVerifying) {
      handleVerifyOtp();
    }
  }, [otpCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVerifyOtp = async () => {
    if (otpCode.length !== OTP_LENGTH) {
      toast.showToast({
        title: 'Code incomplet',
        subtitle: `Veuillez saisir les ${OTP_LENGTH} chiffres du code`,
      });
      return;
    }

    Keyboard.dismiss();
    setIsVerifying(true);

    try {
      // Pass email for unauthenticated flow (login failed with 401 'email not verified')
      const emailForOtp = user?.email || storedEmail || undefined;
      const response = await AuthService.verifyEmailOtp(otpCode, emailForOtp);

      if (response.success) {
        toast.showToast({
          title: 'Email vérifié ✅',
          subtitle: 'Votre adresse email a été vérifiée avec succès',
        });

        // Check if we have tokens stored (registration flow) or not (login 403 flow)
        const TokenStorageService = (await import('../../services/TokenStorageService')).default;
        const tokens = await TokenStorageService.getTokens();

        if (tokens.accessToken) {
          // REGISTRATION FLOW: tokens exist → fully activate session and go to home
          console.log('🔓 Activation complète de la session après vérification OTP (flux inscription)...');
          await checkAuthStatus();

          // Get the effective role (from context or from stored data)
          const effectiveRole = userRole || storedRole;

          setTimeout(() => {
            if (effectiveRole) {
              console.log('🚀 Redirection post-OTP vers home pour rôle:', effectiveRole);
              redirectToRoleBasedHome(effectiveRole);
            } else {
              console.warn('⚠️ Aucun rôle trouvé, redirection vers index');
              router.replace('/');
            }
          }, 800);
        } else {
          // LOGIN FLOW: no tokens (backend returned 403) → redirect to signin
          console.log('🔑 Pas de tokens stockés (flux connexion) → redirection vers signin');
          toast.showToast({
            title: 'Email vérifié',
            subtitle: 'Vous pouvez maintenant vous connecter',
          });
          setTimeout(() => {
            router.replace('/(auth)/signin' as any);
          }, 800);
        }
      }
    } catch (error: any) {
      toast.showToast({
        title: 'Code invalide',
        subtitle: error.message || 'Le code OTP est incorrect ou expiré',
      });
      // Clear OTP and re-focus first input
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 200);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async (silent = false) => {
    if (cooldown > 0) return;

    setIsResending(true);
    try {
      // Pass email for unauthenticated flow (login failed with 401 'email not verified')
      const emailForOtp = user?.email || storedEmail || undefined;
      await AuthService.resendEmailOtp(emailForOtp);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      if (!silent) {
        toast.showToast({
          title: 'Code envoyé',
          subtitle: 'Un nouveau code a été envoyé à votre adresse email',
        });
      }
    } catch (error: any) {
      if (!silent) {
        toast.showToast({
          title: 'Erreur',
          subtitle: error.message || "Impossible d'envoyer le code",
        });
      }
    } finally {
      setIsResending(false);
    }
  };

  // Masked email for display (use storedEmail as fallback when AuthContext user is not loaded)
  const emailToDisplay = user?.email || storedEmail || '';
  const maskedEmail = emailToDisplay
    ? emailToDisplay.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + b.replace(/./g, '•') + c)
    : '';

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="px-6 pt-4 pb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-neutral-100 items-center justify-center"
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View className="flex-1 px-6 pt-6">
        {/* Icon */}
        <View className="items-center mb-6">
          <View className="w-20 h-20 rounded-full bg-emerald-50 items-center justify-center mb-4">
            <Ionicons name="mail-open-outline" size={40} color="#10B981" />
          </View>
          <Text className="text-2xl font-quicksand-bold text-neutral-900 text-center">
            Vérifiez votre email
          </Text>
          <Text className="text-base font-quicksand text-neutral-500 text-center mt-2 px-4">
            Nous avons envoyé un code de vérification à{'\n'}
            <Text className="font-quicksand-semibold text-neutral-700">
              {maskedEmail}
            </Text>
          </Text>
        </View>

        {/* OTP Inputs */}
        <View className="flex-row justify-center gap-3 mb-8">
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              value={digit}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={index === 0 ? OTP_LENGTH : 1}
              selectTextOnFocus
              className={`w-12 h-14 rounded-xl text-center text-xl font-quicksand-bold border-2 ${
                digit
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-neutral-200 bg-neutral-50'
              }`}
              style={{ color: '#1F2937' }}
            />
          ))}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          onPress={handleVerifyOtp}
          disabled={isVerifying || otpCode.length !== OTP_LENGTH}
          className={`rounded-xl py-4 mb-4 ${
            isVerifying || otpCode.length !== OTP_LENGTH
              ? 'bg-emerald-300'
              : 'bg-emerald-500'
          }`}
        >
          {isVerifying ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center text-base font-quicksand-bold">
              Vérifier
            </Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <View className="items-center mt-2">
          <Text className="text-sm font-quicksand text-neutral-500 mb-2">
            Vous n&apos;avez pas reçu le code ?
          </Text>
          {cooldown > 0 ? (
            <Text className="text-sm font-quicksand-semibold text-neutral-400">
              Renvoyer dans {cooldown}s
            </Text>
          ) : (
            <TouchableOpacity
              onPress={() => handleResendOtp(false)}
              disabled={isResending}
            >
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
      </View>
    </View>
  );
}
