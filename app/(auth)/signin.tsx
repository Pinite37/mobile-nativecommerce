import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useToast } from '../../components/ui/ToastManager';
import { useAuth } from '../../contexts/AuthContext';
import AuthService from '../../services/api/AuthService';
import { ErrorHandler } from '../../utils/ErrorHandler';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();
  const { checkAuthStatus, redirectToRoleBasedHome } = useAuth();

  const handleSignIn = async () => {
    if (!email || !password) {
      toast.showError('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);
    try {
      const response = await AuthService.login({ email, password });
      
      if (response.success) {
        const successMessage = ErrorHandler.getSuccessMessage('login');
        toast.showSuccess(successMessage.title, successMessage.message);
        
        // Refresh auth status and redirect
        await checkAuthStatus();
        const userRole = response.data.user.role;
        
        setTimeout(() => {
          redirectToRoleBasedHome(userRole);
        }, 1000);
      }
    } catch (error: any) {
      const errorMessage = ErrorHandler.parseApiError(error);
      toast.showError(errorMessage.title, errorMessage.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => {
    router.push('/(auth)/signup');
  };

  const handleForgotPassword = () => {
    toast.showInfo('Info', 'Fonctionnalité de mot de passe oublié sera bientôt disponible');
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
            Welcome Back
          </Text>
          <Text className="text-base font-quicksand text-neutral-600">
            Sign in to your account
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
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              className="border border-neutral-200 rounded-xl px-4 py-4 text-base font-quicksand"
            />
          </View>

          {/* Password Input */}
          <View className="mb-6">
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

          {/* Forgot Password */}
          <TouchableOpacity
            onPress={handleForgotPassword}
            className="self-end mb-8"
          >
            <Text className="text-primary font-quicksand-medium text-sm">
              Forgot Password?
            </Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <TouchableOpacity
            onPress={handleSignIn}
            disabled={isLoading}
            className={`rounded-xl py-4 mb-6 ${
              isLoading ? 'bg-primary/70' : 'bg-primary'
            }`}
          >
            <Text className="text-white font-quicksand-semibold text-base text-center">
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View className="flex-row justify-center items-center">
            <Text className="text-neutral-600 font-quicksand text-sm">
              Don&apos;t have an account?{' '}
            </Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text className="text-primary font-quicksand-semibold text-sm">
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
