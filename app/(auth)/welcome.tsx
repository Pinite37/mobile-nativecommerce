import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const { colors, isDark } = useTheme();

  // Bloquer l'accès si déjà connecté
  useEffect(() => {
    if (!isLoading && isAuthenticated && userRole) {
      console.log('🚫 Utilisateur déjà connecté, redirection depuis welcome');
      if (userRole === 'CLIENT') {
        router.replace('/(app)/(client)/(tabs)');
      } else if (userRole === 'ENTERPRISE') {
        router.replace('/(app)/(enterprise)/(tabs)');
      }
    }
  }, [isLoading, isAuthenticated, userRole]);

  // Ne rien afficher pendant le chargement ou si déjà connecté
  if (isLoading || isAuthenticated) {
    return null;
  }
  const handleEmailAuth = () => {
    router.push('/(auth)/signin');
  };

  const handleCreateAccount = () => {
    router.push('/(auth)/role-selection');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Main Content */}
      <View
        className="flex-1 justify-between px-6"
        style={{
          paddingTop: Math.max(insets.top, 48),
          paddingBottom: Math.max(insets.bottom, 32)
        }}
      >
        {/* Top Section with Illustration */}
        <View className="items-center pt-8">
          <Image
            source={require('../../assets/images/axiLogoo.png')}
            className="w-64 h-48"
            resizeMode="contain"
          />

          <Text className="text-3xl font-quicksand-bold text-center mb-3 mt-4" style={{ color: colors.textPrimary }}>
            Connectez-vous
          </Text>

          <Text className="text-sm font-quicksand text-center px-8" style={{ color: colors.textSecondary }}>
            Bienvenue ! Veuillez vous connecter à votre compte
          </Text>
        </View>

        {/* Auth Options */}
        <View>
          {/* Email/Password Button */}
          <TouchableOpacity
            onPress={handleEmailAuth}
            className="bg-primary rounded-2xl py-4 mb-4 shadow-sm"
            activeOpacity={1}
          >
            <Text className="text-white font-quicksand-semibold text-base text-center">
              Se connecter avec mot de passe
            </Text>
          </TouchableOpacity>

          {/* Create Account Button */}
          <TouchableOpacity
            onPress={handleCreateAccount}
            className="border-2 border-primary rounded-2xl py-4 shadow-sm"
            style={{ backgroundColor: colors.background }}
            activeOpacity={1}
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
