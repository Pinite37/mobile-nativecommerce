import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";

import {
    ActivityIndicator,
    Animated,
    Easing,
    FlatList,
    Image,
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
  const bar1Anim = useRef(new Animated.Value(0)).current;
  const bar2Anim = useRef(new Animated.Value(0)).current;
  const bar3Anim = useRef(new Animated.Value(0)).current;

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

  const TOTAL_STEPS = 4;

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

  // Animer les barres de progression
  useEffect(() => {
    Animated.timing(bar1Anim, {
      toValue: currentStep >= 2 ? 1 : 0,
      duration: 380,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
    Animated.timing(bar2Anim, {
      toValue: currentStep >= 3 ? 1 : 0,
      duration: 380,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
    Animated.timing(bar3Anim, {
      toValue: currentStep >= 4 ? 1 : 0,
      duration: 380,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

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

  // Step 2: localisation & about — only validate IFU format if filled
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

  // Step 3: contact details — all optional
  const validateStep3 = (): boolean => true;

  const validateStep4 = (): boolean => {
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
        break;
      case 4:
        isValid = validateStep4();
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
          router.replace("/(app)/(enterprise)/(tabs)");
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
      case 4:
        return renderStep4();
      default:
        return null;
    }
  };

  const phoneInputStyles = {
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
  };

  const inputRow = (icon: string, content: React.ReactNode, multiline = false) => (
    <View style={{
      flexDirection: "row",
      alignItems: multiline ? "flex-start" : "center",
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 16,
      ...(multiline ? { paddingVertical: 14, minHeight: 100 } : { height: 56 }),
    }}>
      <Ionicons name={icon as any} size={18} color={colors.textTertiary} style={{ marginRight: 12, ...(multiline ? { marginTop: 2 } : {}) }} />
      {content}
    </View>
  );

  const fieldLabel = (label: string) => (
    <Text style={{ fontFamily: "PlusJakartaSans-SemiBold", fontSize: 13, color: colors.textSecondary, marginBottom: 8 }}>
      {label}
    </Text>
  );

  const renderStep1 = () => (
    <View>
      <View style={{ marginBottom: 14 }}>
        {fieldLabel("Nom de l'entreprise *")}
        {inputRow("business-outline",
          <TextInput
            ref={companyNameRef}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Votre Entreprise SARL"
            placeholderTextColor={colors.textTertiary}
            onFocus={() => scrollToInput(companyNameRef)}
            style={{ flex: 1, fontFamily: "PlusJakartaSans-Medium", fontSize: 15, color: colors.textPrimary }}
          />
        )}
      </View>

      <View style={{ marginBottom: 14 }}>
        {fieldLabel("Email *")}
        {inputRow("mail-outline",
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="contact@votreentreprise.com"
            placeholderTextColor={colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ flex: 1, fontFamily: "PlusJakartaSans-Medium", fontSize: 15, color: colors.textPrimary }}
          />
        )}
      </View>

      <View style={{ marginBottom: 6 }}>
        {fieldLabel("Numéro de l'entreprise *")}
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

  const SectionDivider = ({ label }: { label: string }) => (
    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8, marginBottom: 18 }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      <Text style={{ fontFamily: "PlusJakartaSans-SemiBold", fontSize: 11, color: colors.textTertiary, marginHorizontal: 12, letterSpacing: 0.8, textTransform: "uppercase" }}>
        {label}
      </Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={{ fontFamily: "PlusJakartaSans-Bold", fontSize: 17, color: colors.textPrimary, marginBottom: 4 }}>
        Localisation
      </Text>
      <Text style={{ fontFamily: "PlusJakartaSans-Regular", fontSize: 14, color: colors.textSecondary, marginBottom: 20 }}>
        Tous ces champs sont optionnels
      </Text>

      <LocationConsentBanner
        status={locationStatus}
        detectedCity={detectedCity}
        onRequest={requestLocation}
        onSkip={skipLocation}
        onReset={resetLocation}
      />

      {locationStatus !== "granted" && (
        <View style={{ marginBottom: 14 }}>
          {fieldLabel("Ville")}
          <TouchableOpacity
            style={{
              flexDirection: "row", alignItems: "center",
              backgroundColor: colors.card, borderWidth: 1,
              borderColor: colors.border, borderRadius: 14,
              paddingHorizontal: 16, height: 56,
            }}
            onPress={() => setCityModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="location-outline" size={18} color={colors.textTertiary} style={{ marginRight: 12 }} />
            <Text style={{ flex: 1, fontFamily: "PlusJakartaSans-Medium", fontSize: 15, color: colors.textPrimary }}>{selectedCity}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      )}

      <View style={{ marginBottom: 14 }}>
        {fieldLabel("Quartier")}
        <TouchableOpacity
          style={{
            flexDirection: "row", alignItems: "center",
            backgroundColor: colors.card, borderWidth: 1,
            borderColor: colors.border, borderRadius: 14,
            paddingHorizontal: 16, height: 56,
            opacity: !selectedCity ? 0.5 : 1,
          }}
          onPress={() => selectedCity && setDistrictModalVisible(true)}
          disabled={!selectedCity}
          activeOpacity={0.7}
        >
          <Ionicons name="map-outline" size={18} color={colors.textTertiary} style={{ marginRight: 12 }} />
          <Text style={{ flex: 1, fontFamily: "PlusJakartaSans-Medium", fontSize: 15, color: selectedDistrict ? colors.textPrimary : colors.textTertiary }}>
            {selectedDistrict || "Sélectionnez un quartier"}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textTertiary} />
        </TouchableOpacity>
      </View>

      <SectionDivider label="À propos" />

      <View style={{ marginBottom: 14 }}>
        {fieldLabel("Description de l'entreprise")}
        {inputRow("document-text-outline",
          <TextInput
            ref={descriptionRef}
            value={description}
            onChangeText={setDescription}
            placeholder="Décrivez votre entreprise..."
            placeholderTextColor={colors.textTertiary}
            onFocus={() => scrollToInput(descriptionRef)}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{ flex: 1, fontFamily: "PlusJakartaSans-Medium", fontSize: 15, color: colors.textPrimary }}
          />,
          true
        )}
      </View>

      <View style={{ marginBottom: 6 }}>
        {fieldLabel("Numéro IFU")}
        {inputRow("card-outline",
          <TextInput
            ref={ifuNumberRef}
            value={ifuNumber}
            onChangeText={setIfuNumber}
            placeholder="1234567890123"
            placeholderTextColor={colors.textTertiary}
            onFocus={() => scrollToInput(ifuNumberRef)}
            keyboardType="numeric"
            maxLength={13}
            style={{ flex: 1, fontFamily: "PlusJakartaSans-Medium", fontSize: 15, color: colors.textPrimary }}
          />
        )}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={{ fontFamily: "PlusJakartaSans-Bold", fontSize: 17, color: colors.textPrimary, marginBottom: 4 }}>
        Contact & Représentant
      </Text>
      <Text style={{ fontFamily: "PlusJakartaSans-Regular", fontSize: 14, color: colors.textSecondary, marginBottom: 20 }}>
        Tous ces champs sont optionnels
      </Text>

      <View style={{ flexDirection: "row", gap: 12, marginBottom: 14 }}>
        <View style={{ flex: 1 }}>
          {fieldLabel("Prénom")}
          {inputRow("person-outline",
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Jean"
              placeholderTextColor={colors.textTertiary}
              style={{ flex: 1, fontFamily: "PlusJakartaSans-Medium", fontSize: 15, color: colors.textPrimary }}
            />
          )}
        </View>
        <View style={{ flex: 1 }}>
          {fieldLabel("Nom")}
          {inputRow("person-outline",
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="DOSSOU"
              placeholderTextColor={colors.textTertiary}
              style={{ flex: 1, fontFamily: "PlusJakartaSans-Medium", fontSize: 15, color: colors.textPrimary }}
            />
          )}
        </View>
      </View>

      <View style={{ marginBottom: 14 }}>
        {fieldLabel("Téléphone personnel")}
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

      <View style={{ marginBottom: 14 }}>
        {fieldLabel("Adresse")}
        {inputRow("location-outline",
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Cotonou, Akpakpa"
            placeholderTextColor={colors.textTertiary}
            style={{ flex: 1, fontFamily: "PlusJakartaSans-Medium", fontSize: 15, color: colors.textPrimary }}
          />
        )}
      </View>

      <View style={{ marginBottom: 14 }}>
        {fieldLabel("Email entreprise")}
        {inputRow("mail-outline",
          <TextInput
            value={companyEmail}
            onChangeText={setCompanyEmail}
            placeholder="contact@votreentreprise.com"
            placeholderTextColor={colors.textTertiary}
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ flex: 1, fontFamily: "PlusJakartaSans-Medium", fontSize: 15, color: colors.textPrimary }}
          />
        )}
      </View>

      <View style={{ marginBottom: 14 }}>
        {fieldLabel("WhatsApp")}
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

      <View style={{ marginBottom: 6 }}>
        {fieldLabel("Site web")}
        {inputRow("globe-outline",
          <TextInput
            value={website}
            onChangeText={setWebsite}
            placeholder="https://votreentreprise.com"
            placeholderTextColor={colors.textTertiary}
            keyboardType="url"
            autoCapitalize="none"
            style={{ flex: 1, fontFamily: "PlusJakartaSans-Medium", fontSize: 15, color: colors.textPrimary }}
          />
        )}
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View>
      <View style={{ marginBottom: 14 }}>
        {fieldLabel("Mot de passe *")}
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

      <View style={{ marginBottom: 20 }}>
        {fieldLabel("Confirmer le mot de passe *")}
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

      {/* Indicateurs de validité */}
      <View style={{
        padding: 16, borderRadius: 14, marginBottom: 20,
        backgroundColor: isDark ? "rgba(16,185,129,0.08)" : "rgba(16,185,129,0.07)",
        borderWidth: 1, borderColor: isDark ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.15)",
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <Ionicons
            name={password.length >= 6 ? "checkmark-circle" : "ellipse-outline"}
            size={16}
            color={password.length >= 6 ? "#10B981" : colors.textTertiary}
          />
          <Text style={{
            fontFamily: "PlusJakartaSans-Medium", fontSize: 13, marginLeft: 8,
            color: password.length >= 6 ? "#10B981" : colors.textSecondary,
          }}>
            Au moins 6 caractères
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons
            name={password === confirmPassword && password ? "checkmark-circle" : "ellipse-outline"}
            size={16}
            color={password === confirmPassword && password ? "#10B981" : colors.textTertiary}
          />
          <Text style={{
            fontFamily: "PlusJakartaSans-Medium", fontSize: 13, marginLeft: 8,
            color: password === confirmPassword && password ? "#10B981" : colors.textSecondary,
          }}>
            Les mots de passe correspondent
          </Text>
        </View>
      </View>

      {/* CGU */}
      <TouchableOpacity
        onPress={() => setAgreedToTerms(!agreedToTerms)}
        style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 8 }}
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
          J&apos;accepte les{" "}
          <Text
            style={{ color: "#10B981", fontFamily: "PlusJakartaSans-SemiBold" }}
            onPress={() => Linking.openURL("https://axi-contrat.vercel.app")}
          >
            conditions d&apos;utilisation
          </Text>
        </Text>
      </TouchableOpacity>
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

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        {/* Header fixe en haut, hors du scroll */}
        <View style={{ paddingHorizontal: 24, paddingTop: Math.max(insets.top, 16) + 10, paddingBottom: 12 }}>
          <TouchableOpacity
            onPress={() => currentStep > 1 ? handlePreviousStep() : router.back()}
            style={{
              width: 42, height: 42, borderRadius: 21,
              alignItems: "center", justifyContent: "center",
              backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
              marginBottom: 20,
            }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <Image
            source={require('../../assets/images/axiLogoo.png')}
            style={{ width: 110, height: 36, marginBottom: 16 }}
            resizeMode="contain"
          />
          <Text style={{ fontFamily: "PlusJakartaSans-Bold", fontSize: 26, color: colors.textPrimary, marginBottom: 4 }}>
            Compte Entreprise
          </Text>
          <Text style={{ fontFamily: "PlusJakartaSans-Regular", fontSize: 14, color: colors.textSecondary, marginBottom: 20 }}>
            {currentStep === 1 && "Parlez-nous de votre entreprise"}
            {currentStep === 2 && "Localisation & présentation (optionnel)"}
            {currentStep === 3 && "Contact & représentant (optionnel)"}
            {currentStep === 4 && "Sécurisez votre compte"}
          </Text>

          {/* Progress */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {[1, 2, 3, 4].map((step, index) => {
              const barAnim = [bar1Anim, bar2Anim, bar3Anim][index];
              return (
                <React.Fragment key={step}>
                  <View style={{
                    width: 32, height: 32, borderRadius: 16,
                    alignItems: "center", justifyContent: "center",
                    backgroundColor: step <= currentStep ? "#10B981" : colors.tertiary,
                  }}>
                    {step < currentStep
                      ? <Ionicons name="checkmark" size={16} color="#fff" />
                      : <Text style={{ fontFamily: "PlusJakartaSans-Bold", fontSize: 13, color: step === currentStep ? "#fff" : colors.textSecondary }}>{step}</Text>
                    }
                  </View>
                  {index < 3 && (
                    <View style={{ flex: 1, height: 3, marginHorizontal: 5, borderRadius: 2, backgroundColor: colors.tertiary, overflow: "hidden" }}>
                      <Animated.View style={{
                        position: "absolute", left: 0, top: 0, bottom: 0,
                        backgroundColor: "#10B981", borderRadius: 2,
                        width: barAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                      }} />
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </View>
        </View>

        {/* Contenu + boutons dans le scroll */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 16 }}
        >
          <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>
            {renderStepContent()}
          </View>

          {/* Navigation */}
          <View style={{ paddingHorizontal: 24, paddingTop: 20 }}>
            {(currentStep === 2 || currentStep === 3) && (
              <TouchableOpacity
                onPress={() => setCurrentStep(currentStep + 1)}
                activeOpacity={0.7}
                style={{
                  flexDirection: "row", alignItems: "center", justifyContent: "center",
                  borderWidth: 1, borderColor: colors.border, borderRadius: 14,
                  paddingVertical: 12, marginBottom: 10,
                }}
              >
                <Text style={{ fontFamily: "PlusJakartaSans-Medium", fontSize: 14, color: colors.textSecondary, marginRight: 4 }}>
                  Passer cette étape
                </Text>
                <Ionicons name="arrow-forward" size={15} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
              {currentStep > 1 && (
                <TouchableOpacity
                  style={{
                    flex: 1, height: 54, borderRadius: 14,
                    borderWidth: 1.5, borderColor: colors.border,
                    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                  onPress={handlePreviousStep}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
                  <Text style={{ fontFamily: "PlusJakartaSans-SemiBold", fontSize: 15, color: colors.textPrimary }}>Retour</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={{
                  flex: 1, height: 54, borderRadius: 14,
                  backgroundColor: "#10B981", opacity: isLoading ? 0.7 : 1,
                  flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
                }}
                onPress={handleNextStep}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading && <ActivityIndicator size="small" color="#fff" />}
                <Text style={{ fontFamily: "PlusJakartaSans-Bold", fontSize: 15, color: "#fff" }}>
                  {isLoading ? null : currentStep === TOTAL_STEPS ? "Créer le compte" : "Continuer"}
                </Text>
                {currentStep < TOTAL_STEPS && !isLoading && (
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                )}
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "center" }}>
              <Text style={{ fontFamily: "PlusJakartaSans-Regular", fontSize: 14, color: colors.textSecondary }}>
                Déjà un compte ?{" "}
              </Text>
              <TouchableOpacity onPress={handleSignIn} activeOpacity={0.7}>
                <Text style={{ fontFamily: "PlusJakartaSans-Bold", fontSize: 14, color: "#10B981" }}>
                  Se connecter
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

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
                      <Text className="text-lg font-jakarta-bold text-center" style={{ color: colors.textPrimary }}>
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
                            className={`font-jakarta text-base ${selectedCity === item.name ? "text-primary-500 font-jakarta-bold" : ""}`}
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
                      <Text className="text-lg font-jakarta-bold text-center" style={{ color: colors.textPrimary }}>
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
                            className={`font-jakarta text-base ${selectedDistrict === item ? "text-primary-500 font-jakarta-bold" : ""}`}
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
      </KeyboardAvoidingView>
    </View>
  );
}
