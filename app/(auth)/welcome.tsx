import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

export default function WelcomeScreen() {
  const handleEmailAuth = () => {
    router.push('/(auth)/signin');
  };

  const handleCreateAccount = () => {
    router.push('/(auth)/role-selection');
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      {/* Main Content */}
      <View className="flex-1 justify-between px-6 py-12">
        {/* Top Section with Illustration */}
        <View className="items-center pt-8">
          <Image
            source={require('../../assets/images/axiLogoo.png')}
            className="w-64 h-48"
            resizeMode="contain"
          />
          
          <Text className="text-3xl font-quicksand-bold text-center text-neutral-900 mb-3 mt-4">
            Connectez-vous
          </Text>
          
          <Text className="text-sm font-quicksand text-center text-neutral-600 px-8">
            Bienvenue ! Veuillez vous connecter à votre compte
          </Text>
        </View>

        {/* Auth Options */}
        <View>
          {/* Email/Password Button */}
          <TouchableOpacity
            onPress={handleEmailAuth}
            className="bg-primary rounded-2xl py-4 mb-4 shadow-sm"
          >
            <Text className="text-white font-quicksand-semibold text-base text-center">
              Se connecter avec mot de passe
            </Text>
          </TouchableOpacity>

          {/* Create Account Button */}
          <TouchableOpacity
            onPress={handleCreateAccount}
            className="bg-white border-2 border-primary rounded-2xl py-4 shadow-sm"
          >
            <Text className="text-primary font-quicksand-semibold text-base text-center">
              Créer un compte
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
