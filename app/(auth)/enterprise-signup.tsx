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
import { useToast } from "../../components/ui/ReanimatedToast/context";
import { beninCities, neighborhoodsByCity } from "../../constants/LocationData";
import { useAuth } from "../../contexts/AuthContext";
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
  const { handlePostRegistration } = useAuth();
  const insets = useSafeAreaInsets();

  const TOTAL_STEPS = 4;

  useEffect(() => {
    // Réinitialiser le quartier si la ville change
    setSelectedDistrict("");
  }, [selectedCity]);

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

  // Step 2: business details — fully optional, only validate format of what's filled
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

  // Step 3: optional contact/personal info
  const validateStep3 = (): boolean => {
    return true;
  };

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
          router.replace("/(auth)/verify-email" as any);
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
          router.replace("/(app)/(enterprise)/(tabs)/" as any);
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
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "rgba(229, 231, 235, 0.6)",
      borderRadius: 16,
      paddingVertical: 4,
    },
    flagContainer: {
      backgroundColor: "#FFFFFF",
      borderTopLeftRadius: 16,
      borderBottomLeftRadius: 16,
    },
    input: {
      color: "#111827",
    },
    callingCode: {
      color: "#111827",
    },
  };

  // Step 1: Company essentials (only required fields besides password)
  const renderStep1 = () => (
    <View>
      <Text className="text-lg font-quicksand-semibold text-neutral-900 mb-4">
        Informations Entreprise
      </Text>

      {/* Company Name */}
      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
          Nom de l&apos;Entreprise *
        </Text>
        <TextInput
          ref={companyNameRef}
          className="w-full px-5 py-4 border border-neutral-200/60 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500 shadow-sm"
          placeholder="Votre Entreprise SARL"
          placeholderTextColor="#9CA3AF"
          value={companyName}
          onChangeText={setCompanyName}
          onFocus={() => scrollToInput(companyNameRef)}
          autoFocus={false}
        />
      </View>

      {/* Email */}
      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
          Email *
        </Text>
        <TextInput
          className="w-full px-5 py-4 border border-neutral-200/60 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500 shadow-sm"
          placeholder="contact@votreentreprise.com"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Company Phone (required) */}
      <View className="mb-6">
        <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
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

  // Step 2: Business details (all optional)
  const renderStep2 = () => (
    <View>
      <Text className="text-lg font-quicksand-semibold text-neutral-900 mb-2">
        Détails de l&apos;Entreprise
      </Text>
      <Text className="text-sm font-quicksand text-neutral-500 mb-4">
        Ces champs sont optionnels mais recommandés
      </Text>

      {/* Description */}
      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
          Description de l&apos;Entreprise
        </Text>
        <TextInput
          ref={descriptionRef}
          className="w-full px-5 py-4 border border-neutral-200/60 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500 shadow-sm"
          placeholder="Décrivez votre entreprise..."
          placeholderTextColor="#9CA3AF"
          value={description}
          onChangeText={setDescription}
          onFocus={() => scrollToInput(descriptionRef)}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* IFU Number */}
      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
          Numéro IFU
        </Text>
        <TextInput
          ref={ifuNumberRef}
          className="w-full px-5 py-4 border border-neutral-200/60 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500 shadow-sm"
          placeholder="1234567890123"
          placeholderTextColor="#9CA3AF"
          value={ifuNumber}
          onChangeText={setIfuNumber}
          onFocus={() => scrollToInput(ifuNumberRef)}
          keyboardType="numeric"
          maxLength={13}
        />
      </View>

      {/* City Selection */}
      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
          Ville
        </Text>
        <TouchableOpacity
          className="w-full px-5 py-4 border border-neutral-200/60 rounded-2xl bg-white flex-row justify-between items-center shadow-sm"
          onPress={() => setCityModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text className="font-quicksand text-neutral-900">
            {selectedCity}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* District Selection */}
      <View className="mb-6">
        <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
          Quartier
        </Text>
        <TouchableOpacity
          className={`w-full px-5 py-4 border border-neutral-200/60 rounded-2xl bg-white flex-row justify-between items-center shadow-sm ${
            !selectedCity ? "opacity-50" : ""
          }`}
          onPress={() => selectedCity && setDistrictModalVisible(true)}
          disabled={!selectedCity}
          activeOpacity={0.7}
        >
          <Text
            className={`font-quicksand ${selectedDistrict ? "text-neutral-900" : "text-neutral-400"}`}
          >
            {selectedDistrict || "Sélectionnez un quartier"}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Step 3: Optional contact & personal info
  const renderStep3 = () => (
    <View>
      <Text className="text-lg font-quicksand-semibold text-neutral-900 mb-2">
        Contact & Représentant
      </Text>
      <Text className="text-sm font-quicksand text-neutral-500 mb-4">
        Tous ces champs sont optionnels
      </Text>

      {/* Name Inputs */}
      <View className="flex-row mb-4">
        <View className="flex-1 mr-2">
          <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
            Prénom
          </Text>
          <TextInput
            className="w-full px-5 py-4 border border-neutral-200/60 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500 shadow-sm"
            placeholder="Jean"
            placeholderTextColor="#9CA3AF"
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>
        <View className="flex-1 ml-2">
          <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
            Nom
          </Text>
          <TextInput
            className="w-full px-5 py-4 border border-neutral-200/60 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500 shadow-sm"
            placeholder="DOSSOU"
            placeholderTextColor="#9CA3AF"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>
      </View>

      {/* Personal Phone */}
      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
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

      {/* Address */}
      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
          Adresse
        </Text>
        <TextInput
          className="w-full px-5 py-4 border border-neutral-200/60 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500 shadow-sm"
          placeholder="Cotonou"
          placeholderTextColor="#9CA3AF"
          value={address}
          onChangeText={setAddress}
        />
      </View>

      {/* Company Email */}
      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
          Email Entreprise
        </Text>
        <TextInput
          className="w-full px-5 py-4 border border-neutral-200/60 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500 shadow-sm"
          placeholder="contact@votreentreprise.com"
          placeholderTextColor="#9CA3AF"
          value={companyEmail}
          onChangeText={setCompanyEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* WhatsApp */}
      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
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

      {/* Website */}
      <View className="mb-6">
        <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
          Site Web
        </Text>
        <TextInput
          className="w-full px-5 py-4 border border-neutral-200/60 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500 shadow-sm"
          placeholder="https://votreentreprise.com"
          placeholderTextColor="#9CA3AF"
          value={website}
          onChangeText={setWebsite}
          keyboardType="url"
          autoCapitalize="none"
        />
      </View>
    </View>
  );

  // Step 4: Security
  const renderStep4 = () => (
    <View>
      <Text className="text-lg font-quicksand-semibold text-neutral-900 mb-4">
        Sécurisez Votre Compte
      </Text>

      {/* Password */}
      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
          Mot de Passe *
        </Text>
        <View className="relative">
          <TextInput
            className="w-full px-5 py-4 pr-12 border border-neutral-200/60 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500 shadow-sm"
            placeholder="Entrez votre mot de passe"
            placeholderTextColor="#9CA3AF"
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
              color="#9CA3AF"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirm Password */}
      <View className="mb-6">
        <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
          Confirmer le Mot de Passe *
        </Text>
        <View className="relative">
          <TextInput
            className="w-full px-5 py-4 pr-12 border border-neutral-200/60 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500 shadow-sm"
            placeholder="Confirmez votre mot de passe"
            placeholderTextColor="#9CA3AF"
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
              color="#9CA3AF"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Password Requirements */}
      <View className="bg-blue-50 p-4 rounded-xl mb-6">
        <Text className="text-sm font-quicksand-medium text-blue-900 mb-2">
          Exigences du Mot de Passe :
        </Text>
        <View className="flex-row items-center mb-1">
          <Ionicons
            name={password.length >= 6 ? "checkmark-circle" : "ellipse-outline"}
            size={16}
            color={password.length >= 6 ? "#10B981" : "#9CA3AF"}
          />
          <Text
            className={`text-sm font-quicksand ml-2 ${password.length >= 6 ? "text-green-600" : "text-neutral-600"}`}
          >
            Au moins 6 caractères
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons
            name={
              password === confirmPassword && password
                ? "checkmark-circle"
                : "ellipse-outline"
            }
            size={16}
            color={
              password === confirmPassword && password ? "#10B981" : "#9CA3AF"
            }
          />
          <Text
            className={`text-sm font-quicksand ml-2 ${password === confirmPassword && password ? "text-green-600" : "text-neutral-600"}`}
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
            className={`w-6 h-6 rounded-md border-2 items-center justify-center ${
              agreedToTerms
                ? "bg-primary-600 border-primary-600"
                : "bg-white border-neutral-300"
            }`}
          >
            {agreedToTerms && <Text className="text-white text-center">✓</Text>}
          </View>
        </TouchableOpacity>
        <Text className="text-neutral-600 font-quicksand text-sm flex-1">
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
    <View className="flex-1 bg-[#F8F9FA]">
      <StatusBar style="dark" />

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
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>

            <Image 
              source={require('../../assets/images/axiLogoo.png')} 
              style={{ width: 120, height: 40 }} 
              resizeMode="contain" 
              className="mb-4"
            />
            <Text className="text-3xl font-quicksand-bold text-neutral-900 mb-2">
              Créer un Compte Entreprise
            </Text>
            <Text className="text-base font-quicksand text-neutral-600 mb-6">
              {currentStep === 1 && "Parlez-nous de votre entreprise"}
              {currentStep === 2 && "Ajoutez quelques détails (optionnel)"}
              {currentStep === 3 &&
                "Comment les clients peuvent-ils vous joindre ?"}
              {currentStep === 4 && "Sécurisez votre compte"}
            </Text>

            {/* Progress Indicator - Centered */}
            <View className="items-center justify-center mb-4">
              <View className="flex-row items-center">
                {[1, 2, 3, 4].map((step, index) => (
                  <React.Fragment key={step}>
                    <View
                      className={`w-10 h-10 rounded-full items-center justify-center ${
                        step === currentStep
                          ? "bg-primary-500"
                          : step < currentStep
                            ? "bg-green-500"
                            : "bg-neutral-200"
                      }`}
                    >
                      {step < currentStep ? (
                        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                      ) : (
                        <Text
                          className={`font-quicksand-bold text-base ${
                            step === currentStep
                              ? "text-white"
                              : "text-neutral-500"
                          }`}
                        >
                          {step}
                        </Text>
                      )}
                    </View>
                    {index < 3 && (
                      <View
                        className={`w-16 h-1 mx-1 ${
                          step < currentStep ? "bg-green-500" : "bg-neutral-200"
                        }`}
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
            className="px-6 bg-white border-t border-neutral-200"
            style={{
              paddingTop: 16,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            }}
          >
            <View className="flex-row items-center mb-3">
              {currentStep > 1 && (
                <TouchableOpacity
                  className="flex-1 mr-2 py-3 rounded-2xl border-2 border-neutral-300 flex-row items-center justify-center"
                  onPress={handlePreviousStep}
                  activeOpacity={1}
                >
                  <Ionicons name="arrow-back" size={20} color="#374151" />
                  <Text className="text-neutral-700 font-quicksand-semibold text-base ml-2">
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
                    ? "Création"
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
              <Text className="text-neutral-600 font-quicksand text-sm">
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
                  <View className="bg-white rounded-t-3xl max-h-96">
                    <View className="p-4 border-b border-neutral-200">
                      <Text className="text-lg font-quicksand-bold text-center text-neutral-900">
                        Sélectionner la Ville
                      </Text>
                    </View>
                    <FlatList
                      data={beninCities}
                      keyExtractor={(item) => item.id.toString()}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          className="p-4 border-b border-neutral-100"
                          onPress={() => selectCity(item.name)}
                          activeOpacity={0.7}
                        >
                          <Text
                            className={`font-quicksand text-base ${
                              selectedCity === item.name
                                ? "text-primary-500 font-quicksand-bold"
                                : "text-neutral-900"
                            }`}
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
                  <View className="bg-white rounded-t-3xl max-h-96">
                    <View className="p-4 border-b border-neutral-200">
                      <Text className="text-lg font-quicksand-bold text-center text-neutral-900">
                        Sélectionner le Quartier
                      </Text>
                    </View>
                    <FlatList
                      data={neighborhoodsByCity[selectedCity] || []}
                      keyExtractor={(item, index) => index.toString()}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          className="p-4 border-b border-neutral-100"
                          onPress={() => selectDistrict(item)}
                          activeOpacity={0.7}
                        >
                          <Text
                            className={`font-quicksand text-base ${
                              selectedDistrict === item
                                ? "text-primary-500 font-quicksand-bold"
                                : "text-neutral-900"
                            }`}
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
