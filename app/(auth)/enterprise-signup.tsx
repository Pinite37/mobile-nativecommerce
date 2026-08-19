import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";

import {
    ActivityIndicator,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import PhoneInput, {
    ICountry,
    getCountryByCca2,
} from "react-native-international-phone-number";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SubscriptionWelcomeModal } from "../../components/enterprise/SubscriptionWelcomeModal";
import { LocationConsentBanner } from "../../components/ui/LocationConsentBanner";
import { useToast } from "../../components/ui/ReanimatedToast/context";
import { useTheme } from "../../contexts/ThemeContext";
import { beninCities, neighborhoodsByCity } from "../../constants/LocationData";
import { useAuth } from "../../contexts/AuthContext";
import { useLocationForRegistration } from "../../hooks/useLocationForRegistration";
import { EnterpriseRegisterRequest } from "../../types/auth";
import { RegistrationHelper } from "../../utils/RegistrationHelper";

const DEFAULT_COUNTRY_CCA2 = "BJ";

export default function EnterpriseSignUpScreen() {
  const defaultCountry = getCountryByCca2(DEFAULT_COUNTRY_CCA2) ?? null;

  // Form data states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<ICountry | null>(
    defaultCountry,
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [address, setAddress] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyPhoneCountry, setCompanyPhoneCountry] =
    useState<ICountry | null>(defaultCountry);
  const [description, setDescription] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappCountry, setWhatsappCountry] = useState<ICountry | null>(
    defaultCountry,
  );
  const [website, setWebsite] = useState("");
  const [selectedCity, setSelectedCity] = useState(beninCities[0].name);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [ifuNumber, setIfuNumber] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // UI states
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [districtModalVisible, setDistrictModalVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Multi-step form states
  const [currentStep, setCurrentStep] = useState(1);
  const scrollViewRef = useRef<ScrollView>(null);
  const companyNameRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);
  const ifuNumberRef = useRef<TextInput>(null);

  const toast = useToast();
  const { colors, isDark } = useTheme();
  const { handlePostRegistration } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    status: locationStatus,
    coords,
    detectedCity,
    requestLocation,
    skip: skipLocation,
    reset: resetLocation,
  } = useLocationForRegistration();
  const autoFilledCityRef = useRef(false);

  const TOTAL_STEPS = 3;

  useEffect(() => {
    // Réinitialiser le quartier si la ville change
    setSelectedDistrict("");
  }, [selectedCity]);

  // Auto-fill city from GPS when location is granted
  useEffect(() => {
    if (locationStatus === "granted" && detectedCity && !autoFilledCityRef.current) {
      const cityPart = detectedCity.split(",")[0].trim();
      const match = beninCities.find(
        (c) => c.name.toLowerCase() === cityPart.toLowerCase(),
      );
      if (match) {
        setSelectedCity(match.name);
        autoFilledCityRef.current = true;
      }
    }
  }, [locationStatus, detectedCity]);

  // Reset scroll to top when step changes
  useEffect(() => {
    // Use setTimeout to ensure scroll happens after content has been rendered
    const timeoutId = setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
    }, 50); // Small delay to ensure rendering is complete

    return () => clearTimeout(timeoutId);
  }, [currentStep]);

  // Validation functions for each step
  // Step 1: company essentials (the only required business fields)
  const validateStep1 = (): boolean => {
    if (!companyName.trim()) {
      toast.showToast({
        title: "Erreur",
        subtitle: "Le nom de l'entreprise est requis",
      });
      return false;
    }
    if (!email.trim()) {
      toast.showToast({ title: "Erreur", subtitle: "L'email est requis" });
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.showToast({
        title: "Erreur",
        subtitle: "Veuillez entrer un email valide",
      });
      return false;
    }
    if (!companyPhone.trim()) {
      toast.showToast({
        title: "Erreur",
        subtitle: "Le numéro de l'entreprise est requis",
      });
      return false;
    }
    return true;
  };

  // Step 2: all optional details — only validate IFU format if filled
  const validateStep2 = (): boolean => {
    if (ifuNumber.trim() && !/^\d{13}$/.test(ifuNumber)) {
      toast.showToast({
        title: "Erreur",
        subtitle: "Le numéro IFU doit contenir exactement 13 chiffres",
      });
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    if (!password) {
      toast.showToast({
        title: "Erreur",
        subtitle: "Le mot de passe est requis",
      });
      return false;
    }
    if (password.length < 6) {
      toast.showToast({
        title: "Erreur",
        subtitle: "Le mot de passe doit contenir au moins 6 caractères",
      });
      return false;
    }
    if (password !== confirmPassword) {
      toast.showToast({
        title: "Erreur",
        subtitle: "Les mots de passe ne correspondent pas",
      });
      return false;
    }
    if (!agreedToTerms) {
      toast.showToast({
        title: "Erreur",
        subtitle: "Veuillez accepter les conditions d'utilisation",
      });
      return false;
    }
    return true;
  };

  // Function to scroll to a specific input
  const scrollToInput = (ref: React.RefObject<TextInput | null>) => {
    if (ref.current && scrollViewRef.current) {
      ref.current.measure(
        (
          x: number,
          y: number,
          width: number,
          height: number,
          pageX: number,
          pageY: number,
        ) => {
          const scrollY = pageY - 150; // Offset to show input with some space above
          scrollViewRef.current?.scrollTo({
            y: Math.max(0, scrollY),
            animated: true,
          });
        },
      );
    }
  };
  const handleNextStep = () => {
    let isValid = false;

    switch (currentStep) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      case 3:
        isValid = validateStep3();
        if (isValid) {
          handleSignUp();
          return;
        }
        break;
    }

    if (isValid && currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSignUp = async () => {
    if (!companyName.trim() || !email.trim() || !companyPhone.trim()) {
      toast.showToast({
        title: "Erreur",
        subtitle: "Veuillez remplir tous les champs obligatoires",
      });
      return;
    }

    if (!password || password.length < 6) {
      toast.showToast({
        title: "Erreur",
        subtitle: "Le mot de passe doit contenir au moins 6 caractères",
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

    setIsLoading(true);
    try {
      const formatInternationalPhone = (
        local: string,
        country: ICountry | null,
      ) => {
        const digits = local.replace(/[^\d]/g, "");
        if (!digits) return "";
        const root = country?.idd?.root ?? "";
        const suffix = country?.idd?.suffixes?.[0] ?? "";
        const prefix = root ? `${root}${suffix}` : "";
        return `${prefix}${digits}`;
      };

      const formattedCompanyPhone = formatInternationalPhone(
        companyPhone,
        companyPhoneCountry,
      );
      const formattedPhone = phone.trim()
        ? formatInternationalPhone(phone, phoneCountry)
        : "";
      const formattedWhatsApp = whatsapp.trim()
        ? formatInternationalPhone(whatsapp, whatsappCountry)
        : "";

      const userData: EnterpriseRegisterRequest = {
        email: email.trim(),
        password,
        role: "ENTERPRISE",
        companyName: companyName.trim(),
        companyPhone: formattedCompanyPhone,
        agreedToTerms,
        ...(firstName.trim() && { firstName: firstName.trim() }),
        ...(lastName.trim() && { lastName: lastName.trim() }),
        ...(formattedPhone && { phone: formattedPhone }),
        ...(address.trim() && { address: address.trim() }),
        ...(description.trim() && { description: description.trim() }),
        ...(ifuNumber.trim() && { ifuNumber: ifuNumber.trim() }),
        ...(selectedCity && { city: selectedCity }),
        ...(selectedDistrict && { district: selectedDistrict }),
        ...(companyEmail.trim() && { companyEmail: companyEmail.trim() }),
        ...(formattedWhatsApp && { whatsapp: formattedWhatsApp }),
        ...(website.trim() && { website: website.trim() }),
        ...(coords && { latitude: coords.latitude, longitude: coords.longitude }),
      };

      console.log("🏢 Enterprise Sign up:", userData);

      // Utiliser l'utilitaire d'inscription avec connexion automatique
      const response = await RegistrationHelper.registerWithAutoLogin(
        userData,
        true,
      );

      if (response.success && response.data) {
        console.log(
          "✅ Inscription entreprise réussie, traitement de l'état...",
        );

        // Afficher l'état d'authentification pour debug
        await RegistrationHelper.logAuthenticationState();

        toast.showToast({
          title: "Succès",
          subtitle: "Compte entreprise créé avec succès !",
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
          router.replace("/(auth)/verify-email");
          return;
        }

        // Email déjà vérifié : activer la session complète
        console.log("🎯 Email vérifié, activation de la session complète...");
        await handlePostRegistration(
          response.data.user,
          response.data.user.role,
        );

        if (Platform.OS === "ios") {
          console.log("📱 iOS détecté: aucun parcours d'abonnement in-app");
          router.replace("/(app)/(enterprise)/(tabs)/");
        } else {
          console.log("🎯 Affichage du modal de sélection de plan...");
          // Afficher le modal de sélection de plan au lieu de rediriger directement
          setTimeout(() => {
            setShowSubscriptionModal(true);
          }, 800);
        }
      }
    } catch (error: any) {
      console.error("❌ Enterprise registration error:", error);
      toast.showToast({
        title: "Erreur",
        subtitle:
          error.message ||
          "Échec de la création du compte. Veuillez réessayer.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push("/(auth)/signin");
  };

  // Fonction pour sélectionner une ville
  const selectCity = (cityName: string) => {
    setSelectedCity(cityName);
    setCityModalVisible(false);
    // Réinitialiser le quartier lors du changement de ville
    setSelectedDistrict("");
  };

  // Fonction pour sélectionner un quartier
  const selectDistrict = (districtName: string) => {
    setSelectedDistrict(districtName);
    setDistrictModalVisible(false);
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  const phoneInputStyles = {
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
  };

  // Step 1: Company essentials (only required fields besides password)
  const renderStep1 = () => (
    <View>
      <Text className="text-lg font-quicksand-semibold mb-4" style={{ color: colors.textPrimary }}>
        Informations Entreprise
      </Text>

      {/* Company Name */}
      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
          Nom de l&apos;Entreprise *
        </Text>
        <TextInput
          ref={companyNameRef}
          className="w-full px-5 py-4 border rounded-2xl font-quicksand shadow-sm"
          style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }}
          placeholder="Votre Entreprise SARL"
          placeholderTextColor={colors.textTertiary}
          value={companyName}
          onChangeText={setCompanyName}
          onFocus={() => scrollToInput(companyNameRef)}
          autoFocus={false}
        />
      </View>

      {/* Email */}
      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
          Email *
        </Text>
        <TextInput
          className="w-full px-5 py-4 border rounded-2xl font-quicksand shadow-sm"
          style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }}
          placeholder="contact@votreentreprise.com"
          placeholderTextColor={colors.textTertiary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Company Phone (required) */}
      <View className="mb-6">
        <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
          Numéro de l&apos;Entreprise *
        </Text>
        <PhoneInput
          value={companyPhone}
          onChangePhoneNumber={setCompanyPhone}
          selectedCountry={companyPhoneCountry}
          onChangeSelectedCountry={setCompanyPhoneCountry}
          defaultCountry={DEFAULT_COUNTRY_CCA2}
          phoneInputStyles={phoneInputStyles}
          placeholder="XX XX XX XX"
        />
      </View>
    </View>
  );

  // Step 2: All optional details (merged)
  const SectionDivider = ({ label }: { label: string }) => (
    <View className="flex-row items-center mt-2 mb-5">
      <View className="flex-1 h-px" style={{ backgroundColor: colors.borderLight }} />
      <Text className="text-xs font-quicksand-medium mx-3 uppercase" style={{ color: colors.textTertiary }}>
        {label}
      </Text>
      <View className="flex-1 h-px" style={{ backgroundColor: colors.borderLight }} />
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text className="text-lg font-quicksand-semibold mb-1" style={{ color: colors.textPrimary }}>
        Détails & Contact
      </Text>
      <Text className="text-sm font-quicksand mb-5" style={{ color: colors.textSecondary }}>
        Tous ces champs sont optionnels — remplissez ce qui vous convient
      </Text>

      {/* ── Localisation ── */}
      <LocationConsentBanner
        status={locationStatus}
        detectedCity={detectedCity}
        onRequest={requestLocation}
        onSkip={skipLocation}
        onReset={resetLocation}
      />

      {/* Ville : affichée seulement si le GPS n'a pas fonctionné */}
      {locationStatus !== "granted" && (
        <View className="mb-4">
          <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
            Ville
          </Text>
          <TouchableOpacity
            className="w-full px-5 py-4 border rounded-2xl flex-row justify-between items-center shadow-sm"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            onPress={() => setCityModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text className="font-quicksand" style={{ color: colors.textPrimary }}>{selectedCity}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Quartier : toujours affiché (le GPS ne détecte pas le quartier) */}
      <View className="mb-2">
        <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
          Quartier
        </Text>
        <TouchableOpacity
          className={`w-full px-5 py-4 border rounded-2xl flex-row justify-between items-center shadow-sm ${!selectedCity ? "opacity-50" : ""}`}
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          onPress={() => selectedCity && setDistrictModalVisible(true)}
          disabled={!selectedCity}
          activeOpacity={0.7}
        >
          <Text className="font-quicksand" style={{ color: selectedDistrict ? colors.textPrimary : colors.textTertiary }}>
            {selectedDistrict || "Sélectionnez un quartier"}
          </Text>
          <Ionicons name="chevron-down" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* ── À propos ── */}
      <SectionDivider label="À propos" />

      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
          Description de l&apos;Entreprise
        </Text>
        <TextInput
          ref={descriptionRef}
          className="w-full px-5 py-4 border rounded-2xl font-quicksand shadow-sm"
          style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }}
          placeholder="Décrivez votre entreprise..."
          placeholderTextColor={colors.textTertiary}
          value={description}
          onChangeText={setDescription}
          onFocus={() => scrollToInput(descriptionRef)}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <View className="mb-2">
        <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
          Numéro IFU
        </Text>
        <TextInput
          ref={ifuNumberRef}
          className="w-full px-5 py-4 border rounded-2xl font-quicksand shadow-sm"
          style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }}
          placeholder="1234567890123"
          placeholderTextColor={colors.textTertiary}
          value={ifuNumber}
          onChangeText={setIfuNumber}
          onFocus={() => scrollToInput(ifuNumberRef)}
          keyboardType="numeric"
          maxLength={13}
        />
      </View>

      {/* ── Contact & Représentant ── */}
      <SectionDivider label="Contact & Représentant" />

      <View className="flex-row mb-4">
        <View className="flex-1 mr-2">
          <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
            Prénom
          </Text>
          <TextInput
            className="w-full px-5 py-4 border rounded-2xl font-quicksand shadow-sm"
            style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }}
            placeholder="Jean"
            placeholderTextColor={colors.textTertiary}
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>
        <View className="flex-1 ml-2">
          <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
            Nom
          </Text>
          <TextInput
            className="w-full px-5 py-4 border rounded-2xl font-quicksand shadow-sm"
            style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }}
            placeholder="DOSSOU"
            placeholderTextColor={colors.textTertiary}
            value={lastName}
            onChangeText={setLastName}
          />
        </View>
      </View>

      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
          Téléphone Personnel
        </Text>
        <PhoneInput
          value={phone}
          onChangePhoneNumber={setPhone}
          selectedCountry={phoneCountry}
          onChangeSelectedCountry={setPhoneCountry}
          defaultCountry={DEFAULT_COUNTRY_CCA2}
          phoneInputStyles={phoneInputStyles}
          placeholder="XX XX XX XX"
        />
      </View>

      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
          Adresse
        </Text>
        <TextInput
          className="w-full px-5 py-4 border rounded-2xl font-quicksand shadow-sm"
          style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }}
          placeholder="Cotonou"
          placeholderTextColor={colors.textTertiary}
          value={address}
          onChangeText={setAddress}
        />
      </View>

      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
          Email Entreprise
        </Text>
        <TextInput
          className="w-full px-5 py-4 border rounded-2xl font-quicksand shadow-sm"
          style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }}
          placeholder="contact@votreentreprise.com"
          placeholderTextColor={colors.textTertiary}
          value={companyEmail}
          onChangeText={setCompanyEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
          Numéro WhatsApp
        </Text>
        <PhoneInput
          value={whatsapp}
          onChangePhoneNumber={setWhatsapp}
          selectedCountry={whatsappCountry}
          onChangeSelectedCountry={setWhatsappCountry}
          defaultCountry={DEFAULT_COUNTRY_CCA2}
          phoneInputStyles={phoneInputStyles}
          placeholder="XX XX XX XX"
        />
      </View>

      <View className="mb-6">
        <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
          Site Web
        </Text>
        <TextInput
          className="w-full px-5 py-4 border rounded-2xl font-quicksand shadow-sm"
          style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }}
          placeholder="https://votreentreprise.com"
          placeholderTextColor={colors.textTertiary}
          value={website}
          onChangeText={setWebsite}
          keyboardType="url"
          autoCapitalize="none"
        />
      </View>
    </View>
  );

  // Step 3: Security
  const renderStep3 = () => (
    <View>
      <Text className="text-lg font-quicksand-semibold mb-4" style={{ color: colors.textPrimary }}>
        Sécurisez Votre Compte
      </Text>

      {/* Password */}
      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
          Mot de Passe *
        </Text>
        <View className="relative">
          <TextInput
            className="w-full px-5 py-4 pr-12 border rounded-2xl font-quicksand shadow-sm"
            style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }}
            placeholder="Entrez votre mot de passe"
            placeholderTextColor={colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoFocus={false}
          />
          <TouchableOpacity
            className="absolute right-4 top-3"
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirm Password */}
      <View className="mb-6">
        <Text className="text-sm font-quicksand-medium mb-2" style={{ color: colors.textPrimary }}>
          Confirmer le Mot de Passe *
        </Text>
        <View className="relative">
          <TextInput
            className="w-full px-5 py-4 pr-12 border rounded-2xl font-quicksand shadow-sm"
            style={{ backgroundColor: colors.card, borderColor: colors.border, color: colors.textPrimary }}
            placeholder="Confirmez votre mot de passe"
            placeholderTextColor={colors.textTertiary}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity
            className="absolute right-4 top-3"
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showConfirmPassword ? "eye-off" : "eye"}
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Password Requirements */}
      <View className="p-4 rounded-xl mb-6" style={{ backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' }}>
        <Text className="text-sm font-quicksand-medium mb-2" style={{ color: isDark ? '#93C5FD' : '#1E40AF' }}>
          Exigences du Mot de Passe :
        </Text>
        <View className="flex-row items-center mb-1">
          <Ionicons
            name={password.length >= 6 ? "checkmark-circle" : "ellipse-outline"}
            size={16}
            color={password.length >= 6 ? "#10B981" : colors.textTertiary}
          />
          <Text
            className={`text-sm font-quicksand ml-2 ${password.length >= 6 ? "text-green-600" : ""}`}
            style={{ color: password.length >= 6 ? undefined : colors.textSecondary }}
          >
            Au moins 6 caractères
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons
            name={password === confirmPassword && password ? "checkmark-circle" : "ellipse-outline"}
            size={16}
            color={password === confirmPassword && password ? "#10B981" : colors.textTertiary}
          />
          <Text
            className={`text-sm font-quicksand ml-2 ${password === confirmPassword && password ? "text-green-600" : ""}`}
            style={{ color: password === confirmPassword && password ? undefined : colors.textSecondary }}
          >
            Les mots de passe correspondent
          </Text>
        </View>
      </View>

      {/* Terms and Conditions */}
      <View className="flex-row items-center justify-center mt-5 px-1 mb-6">
        <TouchableOpacity
          onPress={() => setAgreedToTerms(!agreedToTerms)}
          className="flex-row items-center mr-3"
          activeOpacity={0.7}
        >
          <View
            className="w-6 h-6 rounded-md border-2 items-center justify-center"
            style={agreedToTerms
              ? { backgroundColor: '#10B981', borderColor: '#10B981' }
              : { backgroundColor: colors.card, borderColor: colors.border }}
          >
            {agreedToTerms && <Text className="text-white text-center">✓</Text>}
          </View>
        </TouchableOpacity>
        <Text className="font-quicksand text-sm flex-1" style={{ color: colors.textSecondary }}>
          J&apos;accepte les{" "}
          <Text
            className="text-primary-600 font-quicksand-semibold underline"
            onPress={() => Linking.openURL("https://axi-contrat.vercel.app")}
          >
            conditions d&apos;utilisation
          </Text>
        </Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Background Shapes */}
      <View className="absolute top-[-100] right-[-80] w-[300px] h-[300px] rounded-full bg-primary/10" />
      <View
        className="absolute top-[30%] left-[-140] w-[280px] h-[350px] bg-primary/20"
        style={{ borderTopRightRadius: 150, borderBottomRightRadius: 150 }}
      />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1">
          {/* Header */}
          <View
            className="px-6"
            style={{
              paddingTop: Math.max(insets.top, 16) + 16,
              paddingBottom: 16,
            }}
          >
            <TouchableOpacity
              onPress={() =>
                currentStep > 1 ? handlePreviousStep() : router.back()
              }
              className="mb-6"
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            <Image
              source={require('../../assets/images/axiLogoo.png')}
              style={{ width: 120, height: 40 }}
              resizeMode="contain"
              className="mb-4"
            />
            <Text className="text-3xl font-quicksand-bold mb-2" style={{ color: colors.textPrimary }}>
              Créer un Compte Entreprise
            </Text>
            <Text className="text-base font-quicksand mb-6" style={{ color: colors.textSecondary }}>
              {currentStep === 1 && "Parlez-nous de votre entreprise"}
              {currentStep === 2 && "Ajoutez quelques détails (optionnel)"}
              {currentStep === 3 && "Sécurisez votre compte"}
            </Text>

            {/* Progress Indicator - Centered */}
            <View className="items-center justify-center mb-4">
              <View className="flex-row items-center">
                {[1, 2, 3].map((step, index) => (
                  <React.Fragment key={step}>
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: step === currentStep ? '#10B981' : step < currentStep ? '#22C55E' : colors.tertiary
                      }}
                    >
                      {step < currentStep ? (
                        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                      ) : (
                        <Text
                          className="font-quicksand-bold text-base"
                          style={{ color: step === currentStep ? '#FFFFFF' : colors.textSecondary }}
                        >
                          {step}
                        </Text>
                      )}
                    </View>
                    {index < 2 && (
                      <View
                        className="w-20 h-1 mx-1"
                        style={{ backgroundColor: step < currentStep ? '#22C55E' : colors.tertiary }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </View>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
            keyboardVerticalOffset={0}
          >
            <ScrollView
              ref={scrollViewRef}
              className="flex-1"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingBottom: Math.max(insets.bottom, 20) + 100,
                flexGrow: 1,
              }}
              scrollEventThrottle={16}
              keyboardDismissMode="interactive"
            >
              {/* Form Content */}
              <View className="px-6 pt-4">{renderStepContent()}</View>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Bottom Navigation */}
          <View
            className="px-6 border-t"
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
              paddingTop: 16,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            }}
          >
            {currentStep === 2 && (
              <TouchableOpacity
                onPress={() => setCurrentStep(3)}
                activeOpacity={0.7}
                className="flex-row items-center justify-center border rounded-2xl py-3 mb-3"
                style={{ borderColor: colors.border }}
              >
                <Text className="font-quicksand-medium text-sm mr-1" style={{ color: colors.textSecondary }}>
                  Passer cette étape
                </Text>
                <Ionicons name="arrow-forward" size={15} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            <View className="flex-row items-center mb-3">
              {currentStep > 1 && (
                <TouchableOpacity
                  className="flex-1 mr-2 py-3 rounded-2xl border-2 flex-row items-center justify-center"
                  style={{ borderColor: colors.border }}
                  onPress={handlePreviousStep}
                  activeOpacity={1}
                >
                  <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
                  <Text className="font-quicksand-semibold text-base ml-2" style={{ color: colors.textPrimary }}>
                    Retour
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                className={`py-4 rounded-2xl ${
                  isLoading ? "bg-primary-300" : "bg-primary-500"
                } flex-row items-center justify-center ${
                  currentStep > 1 ? "flex-1 ml-2" : "flex-1"
                }`}
                onPress={handleNextStep}
                disabled={isLoading}
                activeOpacity={1}
              >
                {isLoading && (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text className="text-white text-center font-quicksand-semibold text-base">
                  {isLoading
                    ? "Création en cours..."
                    : currentStep === TOTAL_STEPS
                      ? "Créer le Compte"
                      : "Continuer"}
                </Text>
                {currentStep < TOTAL_STEPS && !isLoading && (
                  <Ionicons
                    name="arrow-forward"
                    size={20}
                    color="#FFFFFF"
                    style={{ marginLeft: 8 }}
                  />
                )}
              </TouchableOpacity>
            </View>

            {/* Sign In Link */}
            <View className="flex-row justify-center">
              <Text className="font-quicksand text-sm" style={{ color: colors.textSecondary }}>
                Vous avez déjà un compte ?{" "}
              </Text>
              <TouchableOpacity onPress={handleSignIn} activeOpacity={0.7}>
                <Text className="text-primary-500 font-quicksand-semibold text-sm">
                  Se Connecter
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Modal pour sélectionner la ville */}
          <Modal
            visible={cityModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setCityModalVisible(false)}
          >
            <TouchableWithoutFeedback
              onPress={() => setCityModalVisible(false)}
            >
              <View className="flex-1 bg-black/50 justify-end">
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View className="rounded-t-3xl max-h-96" style={{ backgroundColor: colors.card }}>
                    <View className="p-4 border-b" style={{ borderColor: colors.border }}>
                      <Text className="text-lg font-quicksand-bold text-center" style={{ color: colors.textPrimary }}>
                        Sélectionner la Ville
                      </Text>
                    </View>
                    <FlatList
                      data={beninCities}
                      keyExtractor={(item) => item.id.toString()}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          className="p-4 border-b"
                          style={{ borderColor: colors.borderLight }}
                          onPress={() => selectCity(item.name)}
                          activeOpacity={0.7}
                        >
                          <Text
                            className={`font-quicksand text-base ${selectedCity === item.name ? "text-primary-500 font-quicksand-bold" : ""}`}
                            style={{ color: selectedCity === item.name ? undefined : colors.textPrimary }}
                          >
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* Modal pour sélectionner le quartier */}
          <Modal
            visible={districtModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setDistrictModalVisible(false)}
          >
            <TouchableWithoutFeedback
              onPress={() => setDistrictModalVisible(false)}
            >
              <View className="flex-1 bg-black/50 justify-end">
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View className="rounded-t-3xl max-h-96" style={{ backgroundColor: colors.card }}>
                    <View className="p-4 border-b" style={{ borderColor: colors.border }}>
                      <Text className="text-lg font-quicksand-bold text-center" style={{ color: colors.textPrimary }}>
                        Sélectionner le Quartier
                      </Text>
                    </View>
                    <FlatList
                      data={neighborhoodsByCity[selectedCity] || []}
                      keyExtractor={(item, index) => index.toString()}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          className="p-4 border-b"
                          style={{ borderColor: colors.borderLight }}
                          onPress={() => selectDistrict(item)}
                          activeOpacity={0.7}
                        >
                          <Text
                            className={`font-quicksand text-base ${selectedDistrict === item ? "text-primary-500 font-quicksand-bold" : ""}`}
                            style={{ color: selectedDistrict === item ? undefined : colors.textPrimary }}
                          >
                            {item}
                          </Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          {/* Modal de bienvenue et sélection de plan */}
          <SubscriptionWelcomeModal
            visible={showSubscriptionModal}
            onClose={() => setShowSubscriptionModal(false)}
            userName={firstName}
          />
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
}
