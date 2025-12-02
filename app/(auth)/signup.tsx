import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Linking, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useToast } from '../../components/ui/ReanimatedToast/context';
import { useAuth } from '../../contexts/AuthContext';
import { ErrorHandler } from '../../utils/ErrorHandler';
import { RegistrationHelper } from '../../utils/RegistrationHelper';

export default function SignUpScreen() {
  const { role } = useLocalSearchParams<{ role: string }>();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const toast = useToast();
  const { redirectToRoleBasedHome, handlePostRegistration, logout } = useAuth();

  const handleSignUp = async () => {
    if (!firstName || !lastName || !email || !phone || !address || !password || !confirmPassword) {
      toast.showToast({ title: 'Erreur', subtitle: 'Veuillez remplir tous les champs' });
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

    if (!agreedToTerms) {
      toast.showToast({ title: 'Erreur', subtitle: 'Veuillez accepter les termes et conditions' });
      return;
    }

    setIsLoading(true);
    try {
      const userData = {
        firstName,
        lastName,
        email,
        phone,
        address,
        password,
        agreedToTerms,
        role: (role || 'CLIENT') as 'CLIENT' | 'ENTERPRISE',
      };

      console.log('🚀 Début de l\'inscription...');

      // Utiliser l'utilitaire d'inscription avec connexion automatique
      const response = await RegistrationHelper.registerWithAutoLogin(userData, false);

      if (response.success && response.data) {
        console.log('✅ Inscription réussie, traitement de l\'état...');

        // Check if role is supported
        const userRole = response.data.user.role;
        if ((userRole as string) === 'DELIVER') {
          toast.showToast({
            title: 'Profil non supporté',
            subtitle: 'Cette application ne gère que les profils clients et entreprises. Veuillez utiliser l\'application dédiée aux livreurs.'
          });

          // Clear any stored session data
          await logout();
          return;
        }

        // Afficher l'état d'authentification pour debug
        await RegistrationHelper.logAuthenticationState();

        // Mettre à jour l'état d'authentification
        await handlePostRegistration(response.data.user, response.data.user.role);

        const successMessage = ErrorHandler.getSuccessMessage('register');
        toast.showToast({ title: successMessage.title, subtitle: successMessage.message });

        console.log('🎯 Redirection vers l\'interface utilisateur...');

        // Rediriger vers l'interface correspondant au rôle avec un délai optimisé
        setTimeout(() => {
          redirectToRoleBasedHome(response.data.user.role);
        }, 1200);
      }
    } catch (error: any) {
      console.error('❌ Erreur inscription:', error);
      const errorMessage = ErrorHandler.parseApiError(error);
      toast.showToast({ title: errorMessage.title, subtitle: errorMessage.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    router.back();
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
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}
        <View className="px-6 pb-8">
          <Text className="text-3xl font-quicksand-bold text-neutral-900 mb-2">
            Créer un compte
          </Text>
          <Text className="text-base font-quicksand text-neutral-600">
            Inscrivez-vous pour commencer
          </Text>
        </View>

        {/* Form */}
        <View className="px-6">
          {/* Name Inputs */}
          <View className="flex-row mb-4">
            <View className="flex-1 mr-2">
              <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
                Prénom
              </Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Prénom"
                className="border border-neutral-200 rounded-xl px-4 py-4 text-base font-quicksand"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
                Nom
              </Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Nom"
                className="border border-neutral-200 rounded-xl px-4 py-4 text-base font-quicksand"
              />
            </View>
          </View>

          {/* Email Input */}
          <View className="mb-4">
            <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Entrez votre email"
              keyboardType="email-address"
              autoCapitalize="none"
              className="border border-neutral-200 rounded-xl px-4 py-4 text-base font-quicksand"
            />
          </View>

          {/* Phone Input */}
          <View className="mb-4">
            <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
              Numéro de téléphone
            </Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Entrez votre numéro de téléphone"
              keyboardType="phone-pad"
              className="border border-neutral-200 rounded-xl px-4 py-4 text-base font-quicksand"
            />
          </View>

          {/* Address Input */}
          <View className="mb-4">
            <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
              Adresse
            </Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Entrez votre adresse"
              className="border border-neutral-200 rounded-xl px-4 py-4 text-base font-quicksand"
            />
          </View>

          {/* Password Input */}
          <View className="mb-4">
            <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
              Mot de passe
            </Text>
            <View className="relative">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Entrez votre mot de passe"
                secureTextEntry={!showPassword}
                className="border border-neutral-200 rounded-xl px-4 py-4 pr-12 text-base font-quicksand"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4"
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View className="mb-6">
            <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
              Confirmer le mot de passe
            </Text>
            <View className="relative">
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirmez votre mot de passe"
                secureTextEntry={!showConfirmPassword}
                className="border border-neutral-200 rounded-xl px-4 py-4 pr-12 text-base font-quicksand"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-4"
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#6B7280"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Terms and Conditions Checkbox */}
          <View className="mb-6">
            <TouchableOpacity
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              className="flex-row items-start"
              activeOpacity={1}
            >
              <View className="w-5 h-5 border-2 border-neutral-300 rounded mr-3 mt-0.5 justify-center items-center">
                {agreedToTerms && (
                  <Ionicons name="checkmark" size={14} color="#3B82F6" />
                )}
              </View>
              <Text className="text-sm font-quicksand text-neutral-600 flex-1">
                J&#39;accepte les{' '}
                <Text
                  className="text-primary font-quicksand-medium"
                  onPress={() => Linking.openURL('https://nativecommerce.com/terms')}
                >
                  « termes et conditions »
                </Text>
                {' '}et la{' '}
                <Text
                  className="text-primary font-quicksand-medium"
                  onPress={() => Linking.openURL('https://nativecommerce.com/privacy')}
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
            className={`rounded-xl py-4 mb-6 ${isLoading ? 'bg-primary/70' : 'bg-primary'
              }`}
          >
            <Text className="text-white font-quicksand-semibold text-base text-center">
              {isLoading ? 'Création du compte...' : 'Créer le compte'}
            </Text>
          </TouchableOpacity>

          {/* Sign In Link */}
          <View className="flex-row justify-center items-center pb-6">
            <Text className="text-neutral-600 font-quicksand text-sm">
              Vous avez déjà un compte ?{' '}
            </Text>
            <TouchableOpacity onPress={handleSignIn}>
              <Text className="text-primary font-quicksand-semibold text-sm">
                Se connecter
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
