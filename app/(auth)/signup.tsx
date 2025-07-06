import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useToast } from '../../components/ui/ToastManager';
import AuthService from '../../services/api/AuthService';
import { ErrorHandler } from '../../utils/ErrorHandler';

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
  const toast = useToast();

  const handleSignUp = async () => {
    if (!firstName || !lastName || !email || !phone || !address || !password || !confirmPassword) {
      toast.showError('Erreur', 'Veuillez remplir tous les champs');
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
      const userData = {
        firstName,
        lastName,
        email,
        phone,
        address,
        password,
        role: (role || 'CLIENT') as 'CLIENT' | 'ENTERPRISE',
      };

      const response = await AuthService.register(userData);
      
      if (response.success) {
        const successMessage = ErrorHandler.getSuccessMessage('register');
        toast.showSuccess(successMessage.title, successMessage.message);
        
        // Navigate to main app
        router.replace('/');
      }
    } catch (error: any) {
      const errorMessage = ErrorHandler.parseApiError(error);
      toast.showError(errorMessage.title, errorMessage.message);
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
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Header */}
        <View className="px-6 pb-8">
          <Text className="text-3xl font-quicksand-bold text-neutral-900 mb-2">
            Create Account
          </Text>
          <Text className="text-base font-quicksand text-neutral-600">
            Sign up to get started
          </Text>
        </View>

        {/* Form */}
        <View className="px-6">
          {/* Name Inputs */}
          <View className="flex-row mb-4">
            <View className="flex-1 mr-2">
              <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
                First Name
              </Text>
              <TextInput
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                className="border border-neutral-200 rounded-xl px-4 py-4 text-base font-quicksand"
              />
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
                Last Name
              </Text>
              <TextInput
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
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
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              className="border border-neutral-200 rounded-xl px-4 py-4 text-base font-quicksand"
            />
          </View>

          {/* Phone Input */}
          <View className="mb-4">
            <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
              Phone Number
            </Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              className="border border-neutral-200 rounded-xl px-4 py-4 text-base font-quicksand"
            />
          </View>

          {/* Address Input */}
          <View className="mb-4">
            <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
              Address
            </Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Enter your address"
              className="border border-neutral-200 rounded-xl px-4 py-4 text-base font-quicksand"
            />
          </View>

          {/* Password Input */}
          <View className="mb-4">
            <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
              Password
            </Text>
            <View className="relative">
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
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
              Confirm Password
            </Text>
            <View className="relative">
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
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

          {/* Sign Up Button */}
          <TouchableOpacity
            onPress={handleSignUp}
            disabled={isLoading}
            className={`rounded-xl py-4 mb-6 ${
              isLoading ? 'bg-primary/70' : 'bg-primary'
            }`}
          >
            <Text className="text-white font-quicksand-semibold text-base text-center">
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          {/* Sign In Link */}
          <View className="flex-row justify-center items-center pb-6">
            <Text className="text-neutral-600 font-quicksand text-sm">
              Already have an account?{' '}
            </Text>
            <TouchableOpacity onPress={handleSignIn}>
              <Text className="text-primary font-quicksand-semibold text-sm">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
