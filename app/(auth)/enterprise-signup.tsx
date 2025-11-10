import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
} from 'react-native';
import { SubscriptionWelcomeModal } from '../../components/enterprise/SubscriptionWelcomeModal';
import { useToast } from '../../components/ui/ReanimatedToast/context';
import { beninCities, neighborhoodsByCity } from '../../constants/LocationData';
import { useAuth } from '../../contexts/AuthContext';
import { EnterpriseRegisterRequest } from '../../types/auth';
import { RegistrationHelper } from '../../utils/RegistrationHelper';

export default function EnterpriseSignUpScreen() {
  // Form data states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [website, setWebsite] = useState('');
  const [selectedCity, setSelectedCity] = useState(beninCities[0].name);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [ifuNumber, setIfuNumber] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  // UI states
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [districtModalVisible, setDistrictModalVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  
  // Multi-step form states
  const [currentStep, setCurrentStep] = useState(1);
  const scrollViewRef = useRef<ScrollView>(null);
  const companyNameRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);
  const ifuNumberRef = useRef<TextInput>(null);

  const toast = useToast();
  const { handlePostRegistration } = useAuth();
  
  const TOTAL_STEPS = 4;

  useEffect(() => {
    // Réinitialiser le quartier si la ville change
    setSelectedDistrict('');
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

  // Keyboard event listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
        setIsKeyboardVisible(true);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Validation functions for each step
  const validateStep1 = (): boolean => {
    if (!firstName.trim()) {
      toast.showToast({ title: 'Erreur', subtitle: 'Le prénom est requis' });
      return false;
    }
    if (!lastName.trim()) {
      toast.showToast({ title: 'Erreur', subtitle: 'Le nom est requis' });
      return false;
    }
    if (!email.trim()) {
      toast.showToast({ title: 'Erreur', subtitle: 'L\'email est requis' });
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.showToast({ title: 'Erreur', subtitle: 'Veuillez entrer un email valide' });
      return false;
    }
    if (!phone.trim()) {
      toast.showToast({ title: 'Erreur', subtitle: 'Le numéro de téléphone est requis' });
      return false;
    }
    if (!address.trim()) {
      toast.showToast({ title: 'Erreur', subtitle: 'L\'adresse est requise' });
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!companyName.trim()) {
      toast.showToast({ title: 'Erreur', subtitle: 'Le nom de l\'entreprise est requis' });
      return false;
    }
    if (!ifuNumber.trim()) {
      toast.showToast({ title: 'Erreur', subtitle: 'Le numéro IFU est requis' });
      return false;
    }
    if (!/^\d{13}$/.test(ifuNumber)) {
      toast.showToast({ title: 'Erreur', subtitle: 'Le numéro IFU doit contenir exactement 13 chiffres' });
      return false;
    }
    if (!selectedCity) {
      toast.showToast({ title: 'Erreur', subtitle: 'Veuillez sélectionner une ville' });
      return false;
    }
    if (!selectedDistrict) {
      toast.showToast({ title: 'Erreur', subtitle: 'Veuillez sélectionner un quartier' });
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    // Step 3 is optional, so always valid
    return true;
  };

  const validateStep4 = (): boolean => {
    if (!password) {
      toast.showToast({ title: 'Erreur', subtitle: 'Le mot de passe est requis' });
      return false;
    }
    if (password.length < 6) {
      toast.showToast({ title: 'Erreur', subtitle: 'Le mot de passe doit contenir au moins 6 caractères' });
      return false;
    }
    if (password !== confirmPassword) {
      toast.showToast({ title: 'Erreur', subtitle: 'Les mots de passe ne correspondent pas' });
      return false;
    }
    if (!agreedToTerms) {
      toast.showToast({ title: 'Erreur', subtitle: 'Veuillez accepter les conditions d\'utilisation' });
      return false;
    }
    return true;
  };

  // Function to scroll to a specific input
  const scrollToInput = (ref: React.RefObject<TextInput | null>) => {
    if (ref.current && scrollViewRef.current) {
      ref.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        const scrollY = pageY - 150; // Offset to show input with some space above
        scrollViewRef.current?.scrollTo({ y: Math.max(0, scrollY), animated: true });
      });
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
    if (!firstName || !lastName || !email || !phone || !password || !confirmPassword || !address || !companyName || !selectedCity || !selectedDistrict) {
      toast.showToast({ title: 'Erreur', subtitle: 'Veuillez remplir tous les champs obligatoires' });
      return;
    }

    if (password !== confirmPassword) {
      toast.showToast({ title: 'Erreur', subtitle: 'Les mots de passe ne correspondent pas' });
      return;
    }

    if (password.length < 6) {
      toast.showToast({ title: 'Erreur', subtitle: 'Le mot de passe doit contenir au moins 6 caractères' });
      return;
    }

    setIsLoading(true);
    try {
      const userData: EnterpriseRegisterRequest = {
        firstName,
        lastName,
        email,
        phone,
        password,
        address,
        role: 'ENTERPRISE',
        companyName,
        ifuNumber,
        agreedToTerms,
        description,
        city: selectedCity,
        district: selectedDistrict,
        companyEmail: companyEmail || email, // Utiliser l'email personnel si pas d'email entreprise
        whatsapp,
        website,
      };
      
      console.log('🏢 Enterprise Sign up:', userData);
      
      // Utiliser l'utilitaire d'inscription avec connexion automatique
      const response = await RegistrationHelper.registerWithAutoLogin(userData, true);
      
      if (response.success && response.data) {
        console.log('✅ Inscription entreprise réussie, traitement de l\'état...');
        
        // Afficher l'état d'authentification pour debug
        await RegistrationHelper.logAuthenticationState();
        
        // Mettre à jour l'état d'authentification
        await handlePostRegistration(response.data.user, response.data.user.role);
        
        toast.showToast({ title: 'Succès', subtitle: 'Compte entreprise créé avec succès !' });
        
        console.log('🎯 Affichage du modal de sélection de plan...');
        
        // Afficher le modal de sélection de plan au lieu de rediriger directement
        setTimeout(() => {
          setShowSubscriptionModal(true);
        }, 800);
      }
    } catch (error: any) {
      console.error('❌ Enterprise registration error:', error);
      toast.showToast({ title: 'Erreur', subtitle: error.message || 'Échec de la création du compte. Veuillez réessayer.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push('/(auth)/signin');
  };

  // Fonction pour sélectionner une ville
  const selectCity = (cityName: string) => {
    setSelectedCity(cityName);
    setCityModalVisible(false);
    // Réinitialiser le quartier lors du changement de ville
    setSelectedDistrict('');
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

  // Step 1: Personal Information
  const renderStep1 = () => (
    <View>
      <Text className="text-lg font-quicksand-semibold text-neutral-900 mb-4">
        Informations Personnelles
      </Text>
      
      {/* Name Inputs */}
      <View className="flex-row mb-4">
        <View className="flex-1 mr-2">
          <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
            Prénom *
          </Text>
          <TextInput
            className="w-full px-4 py-3 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
            placeholder="Jean"
            placeholderTextColor="#9CA3AF"
            value={firstName}
            onChangeText={setFirstName}
            autoFocus={false}
          />
        </View>
        <View className="flex-1 ml-2">
          <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
            Nom *
          </Text>
          <TextInput
            className="w-full px-4 py-3 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
            placeholder="DOSSOU"
            placeholderTextColor="#9CA3AF"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>
      </View>
      
      {/* Email */}
      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
          Email *
        </Text>
        <TextInput
          className="w-full px-4 py-3 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
          placeholder="jean.dossou@exemple.com"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {/* Phone */}
      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
          Numéro de Téléphone *
        </Text>
        <TextInput
          className="w-full px-4 py-3 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
          placeholder="+229 XX XX XX XX"
          placeholderTextColor="#9CA3AF"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </View>

      {/* Address */}
      <View className="mb-6">
        <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
          Adresse *
        </Text>
        <TextInput
          className="w-full px-4 py-3 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
          placeholder="Cotonou"
          placeholderTextColor="#9CA3AF"
          value={address}
          onChangeText={setAddress}
        />
      </View>
    </View>
  );

  // Step 2: Business Information
  const renderStep2 = () => (
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
          className="w-full px-4 py-3 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
          placeholder="Votre Entreprise SARL"
          placeholderTextColor="#9CA3AF"
          value={companyName}
          onChangeText={setCompanyName}
          onFocus={() => scrollToInput(companyNameRef)}
          autoFocus={false}
        />
      </View>

      {/* Description */}
      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
          Description de l&apos;Entreprise (Optionnel)
        </Text>
        <TextInput
          ref={descriptionRef}
          className="w-full px-4 py-3 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
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
          Numéro IFU *
        </Text>
        <TextInput
          ref={ifuNumberRef}
          className="w-full px-4 py-3 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
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
          Ville *
        </Text>
        <TouchableOpacity
          className="w-full px-4 py-3 border border-neutral-300 rounded-2xl bg-white flex-row justify-between items-center"
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
          Quartier *
        </Text>
        <TouchableOpacity
          className={`w-full px-4 py-3 border border-neutral-300 rounded-2xl bg-white flex-row justify-between items-center ${
            !selectedCity ? 'opacity-50' : ''
          }`}
          onPress={() => selectedCity && setDistrictModalVisible(true)}
          disabled={!selectedCity}
          activeOpacity={0.7}
        >
          <Text className={`font-quicksand ${selectedDistrict ? 'text-neutral-900' : 'text-neutral-400'}`}>
            {selectedDistrict || 'Sélectionnez un quartier'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Step 3: Contact Information (Optional)
  const renderStep3 = () => (
    <View>
      <Text className="text-lg font-quicksand-semibold text-neutral-900 mb-2">
        Contact Entreprise
      </Text>
      <Text className="text-sm font-quicksand text-neutral-500 mb-4">
        Ces champs sont optionnels mais recommandés
      </Text>

      {/* Company Email */}
      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
          Email Entreprise
        </Text>
        <TextInput
          className="w-full px-4 py-3 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
          placeholder="contact@votreentreprise.com"
          placeholderTextColor="#9CA3AF"
          value={companyEmail}
          onChangeText={setCompanyEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoFocus={false}
        />
      </View>

      {/* WhatsApp */}
      <View className="mb-4">
        <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
          Numéro WhatsApp
        </Text>
        <TextInput
          className="w-full px-4 py-3 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
          placeholder="+229 XX XX XX XX"
          placeholderTextColor="#9CA3AF"
          value={whatsapp}
          onChangeText={setWhatsapp}
          keyboardType="phone-pad"
        />
      </View>

      {/* Website */}
      <View className="mb-6">
        <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
          Site Web
        </Text>
        <TextInput
          className="w-full px-4 py-3 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
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
            className="w-full px-4 py-3 pr-12 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
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
              name={showPassword ? 'eye-off' : 'eye'}
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
            className="w-full px-4 py-3 pr-12 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
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
              name={showConfirmPassword ? 'eye-off' : 'eye'}
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
            name={password.length >= 6 ? 'checkmark-circle' : 'ellipse-outline'} 
            size={16} 
            color={password.length >= 6 ? '#10B981' : '#9CA3AF'} 
          />
          <Text className={`text-sm font-quicksand ml-2 ${password.length >= 6 ? 'text-green-600' : 'text-neutral-600'}`}>
            Au moins 6 caractères
          </Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons 
            name={password === confirmPassword && password ? 'checkmark-circle' : 'ellipse-outline'} 
            size={16} 
            color={password === confirmPassword && password ? '#10B981' : '#9CA3AF'} 
          />
          <Text className={`text-sm font-quicksand ml-2 ${password === confirmPassword && password ? 'text-green-600' : 'text-neutral-600'}`}>
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
          <View className={`w-6 h-6 rounded-md border-2 items-center justify-center ${
            agreedToTerms ? 'bg-primary-600 border-primary-600' : 'bg-white border-neutral-300'
          }`}>
            {agreedToTerms && <Text className="text-white text-center">✓</Text>}
          </View>
        </TouchableOpacity>
        <Text className="text-neutral-600 font-quicksand text-sm flex-1">
          J&apos;accepte les <Text className="text-primary-600 font-quicksand-semibold underline" onPress={() => Linking.openURL('https://axi-contrat.vercel.app')}>conditions d&apos;utilisation</Text>
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      <StatusBar style="dark" />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className="flex-1">
          {/* Header */}
          <View className="px-6 pt-16 pb-4 bg-white">
            <TouchableOpacity
              onPress={() => currentStep > 1 ? handlePreviousStep() : router.back()}
              className="mb-6"
            >
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            
            <Text className="text-3xl font-quicksand-bold text-neutral-900 mb-2">
              Créer un Compte Entreprise
            </Text>
            <Text className="text-base font-quicksand text-neutral-600 mb-6">
              {currentStep === 1 && 'Parlez-nous de vous'}
              {currentStep === 2 && 'Partagez les détails de votre entreprise'}
              {currentStep === 3 && 'Comment les clients peuvent-ils vous joindre ?'}
              {currentStep === 4 && 'Sécurisez votre compte'}
            </Text>

            {/* Progress Indicator - Centered */}
            <View className="items-center justify-center mb-4">
              <View className="flex-row items-center">
                {[1, 2, 3, 4].map((step, index) => (
                  <React.Fragment key={step}>
                    <View className={`w-10 h-10 rounded-full items-center justify-center ${
                      step === currentStep 
                        ? 'bg-primary-500' 
                        : step < currentStep 
                        ? 'bg-green-500' 
                        : 'bg-neutral-200'
                    }`}>
                      {step < currentStep ? (
                        <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                      ) : (
                        <Text className={`font-quicksand-bold text-base ${
                          step === currentStep ? 'text-white' : 'text-neutral-500'
                        }`}>
                          {step}
                        </Text>
                      )}
                    </View>
                    {index < 3 && (
                      <View className={`w-16 h-1 mx-1 ${
                        step < currentStep ? 'bg-green-500' : 'bg-neutral-200'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </View>
          </View>

          <ScrollView
            ref={scrollViewRef}
            className="flex-1"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingBottom: isKeyboardVisible ? keyboardHeight + 60 : 120,
              flexGrow: 1,
              minHeight: '100%'
            }}
            bounces={false}
            overScrollMode="never"
            alwaysBounceVertical={false}
            scrollEventThrottle={16}
            nestedScrollEnabled={true}
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets={true}
          >
            {/* Form Content */}
            <View className="px-6 pt-4">
              {renderStepContent()}
            </View>
          </ScrollView>

          {/* Bottom Navigation */}
          <View className="px-6 py-4 bg-white border-t border-neutral-200">
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
                  isLoading ? 'bg-primary-300' : 'bg-primary-500'
                } flex-row items-center justify-center ${
                  currentStep > 1 ? 'flex-1 ml-2' : 'flex-1'
                }`}
                onPress={handleNextStep}
                disabled={isLoading}
                activeOpacity={1}
              >
                {isLoading && (
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                )}
                <Text className="text-white text-center font-quicksand-semibold text-base">
                  {isLoading 
                    ? 'Création' 
                    : currentStep === TOTAL_STEPS 
                    ? 'Créer le Compte' 
                    : 'Continuer'}
                </Text>
                {currentStep < TOTAL_STEPS && !isLoading && (
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                )}
              </TouchableOpacity>
            </View>

            {/* Sign In Link */}
            <View className="flex-row justify-center">
              <Text className="text-neutral-600 font-quicksand text-sm">
                Vous avez déjà un compte ?{' '}
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
            <TouchableWithoutFeedback onPress={() => setCityModalVisible(false)}>
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
                          <Text className={`font-quicksand text-base ${
                            selectedCity === item.name ? 'text-primary-500 font-quicksand-bold' : 'text-neutral-900'
                          }`}>
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
            <TouchableWithoutFeedback onPress={() => setDistrictModalVisible(false)}>
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
                          <Text className={`font-quicksand text-base ${
                            selectedDistrict === item ? 'text-primary-500 font-quicksand-bold' : 'text-neutral-900'
                          }`}>
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
    </KeyboardAvoidingView>
  );
}
