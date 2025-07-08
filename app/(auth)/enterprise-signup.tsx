import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useToast } from '../../components/ui/ToastManager';
import { useAuth } from '../../contexts/AuthContext';
import { EnterpriseRegisterRequest } from '../../types/auth';
import { RegistrationHelper } from '../../utils/RegistrationHelper';

export default function EnterpriseSignUpScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const { redirectToRoleBasedHome, handlePostRegistration } = useAuth();

  const handleSignUp = async () => {
    if (!firstName || !lastName || !email || !phone || !password || !confirmPassword || !address || !companyName) {
      toast.showError('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (password !== confirmPassword) {
      toast.showError('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      toast.showError('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
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
        description,
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
        
        toast.showSuccess('Succès', 'Compte entreprise créé avec succès !');
        
        console.log('🎯 Redirection vers l\'interface entreprise...');
        
        // Rediriger vers l'interface entreprise avec un délai optimisé
        setTimeout(() => {
          redirectToRoleBasedHome('ENTERPRISE');
        }, 1200);
      }
    } catch (error: any) {
      console.error('❌ Enterprise registration error:', error);
      toast.showError('Erreur', error.message || 'Échec de la création du compte. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <StatusBar style="dark" />
      
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          className="flex-1" 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
        {/* Header */}
        <View className="px-6 pt-16 pb-8">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mb-6"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          
          <Text className="text-3xl font-quicksand-bold text-neutral-900 mb-2">
            Create Business Account
          </Text>
          <Text className="text-base font-quicksand text-neutral-600">
            Start selling your products today
          </Text>
        </View>

        {/* Form */}
        <View className="px-6">
          {/* Personal Information Section */}
          <Text className="text-lg font-quicksand-semibold text-neutral-900 mb-4">
            Personal Information
          </Text>
          
          {/* Name Inputs */}
          <View className="flex-row mb-4">
            <View className="flex-1 mr-2">
              <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
                First Name
              </Text>
              <TextInput
                className="w-full px-4 py-3 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
                placeholder="John"
                placeholderTextColor="#9CA3AF"
                value={firstName}
                onChangeText={setFirstName}
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
                Last Name
              </Text>
              <TextInput
                className="w-full px-4 py-3 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
                placeholder="Doe"
                placeholderTextColor="#9CA3AF"
                value={lastName}
                onChangeText={setLastName}
              />
            </View>
          </View>
          
          {/* Email */}
          <View className="mb-4">
            <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
              Email
            </Text>
            <TextInput
              className="w-full px-4 py-3 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
              placeholder="john.doe@example.com"
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
              Phone Number
            </Text>
            <TextInput
              className="w-full px-4 py-3 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
              placeholder="+1 (555) 123-4567"
              placeholderTextColor="#9CA3AF"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
          </View>

          {/* Address */}
          <View className="mb-6">
            <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
              Address
            </Text>
            <TextInput
              className="w-full px-4 py-3 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
              placeholder="123 Main St, City, State"
              placeholderTextColor="#9CA3AF"
              value={address}
              onChangeText={setAddress}
            />
          </View>

          {/* Business Information Section */}
          <Text className="text-lg font-quicksand-semibold text-neutral-900 mb-4">
            Business Information
          </Text>

          {/* Company Name */}
          <View className="mb-4">
            <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
              Company Name
            </Text>
            <TextInput
              className="w-full px-4 py-3 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
              placeholder="Your Company Ltd."
              placeholderTextColor="#9CA3AF"
              value={companyName}
              onChangeText={setCompanyName}
            />
          </View>

          {/* Description */}
          <View className="mb-6">
            <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
              Business Description (Optional)
            </Text>
            <TextInput
              className="w-full px-4 py-3 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
              placeholder="Describe your business..."
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Password Section */}
          <Text className="text-lg font-quicksand-semibold text-neutral-900 mb-4">
            Security
          </Text>

          {/* Password */}
          <View className="mb-4">
            <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
              Password
            </Text>
            <View className="relative">
              <TextInput
                className="w-full px-4 py-3 pr-12 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
                placeholder="Enter your password"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                className="absolute right-4 top-3"
                onPress={() => setShowPassword(!showPassword)}
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
              Confirm Password
            </Text>
            <View className="relative">
              <TextInput
                className="w-full px-4 py-3 pr-12 border border-neutral-300 rounded-2xl font-quicksand text-neutral-900 bg-white focus:border-primary-500"
                placeholder="Confirm your password"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                className="absolute right-4 top-3"
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            className={`w-full py-4 rounded-2xl mb-4 ${
              isLoading ? 'bg-primary-300' : 'bg-primary-500'
            }`}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            <Text className="text-white text-center font-quicksand-semibold text-lg">
              {isLoading ? 'Creating Account...' : 'Create Business Account'}
            </Text>
          </TouchableOpacity>

          {/* Sign In Link */}
          <View className="flex-row justify-center mb-8">
            <Text className="text-neutral-600 font-quicksand">
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={handleSignIn}>
              <Text className="text-primary-500 font-quicksand-semibold">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
