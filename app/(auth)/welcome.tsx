import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

export default function WelcomeScreen() {
  const handleGoogleAuth = () => {
    // TODO: Implement Google authentication
    console.log('Google authentication');
  };

  const handleFacebookAuth = () => {
    // TODO: Implement Facebook authentication
    console.log('Facebook authentication');
  };

  const handleAppleAuth = () => {
    // TODO: Implement Apple authentication
    console.log('Apple authentication');
  };

  const handleEmailAuth = () => {
    router.push('/(auth)/signin');
  };

  const handleCreateAccount = () => {
    router.push('/(auth)/role-selection');
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      {/* Top Section with Illustration */}
      <View className="flex-1 justify-center items-center px-6">
        <Image
          source={require('../../assets/images/axiLogo.png')} // Replace with your auth illustration
          className="w-80 h-64 mb-8"
          resizeMode="contain"
        />
        
        <Text className="text-2xl font-quicksand-bold text-center text-neutral-900 mb-4">
          Let&apos;s you in
        </Text>
      </View>

      {/* Auth Options */}
      <View className="px-6 pb-12">
        {/* Social Login Buttons */}
        <TouchableOpacity
          onPress={handleGoogleAuth}
          className="flex-row items-center justify-center bg-white border border-neutral-200 rounded-2xl py-4 mb-4 shadow-sm"
        >
          <Image
            source={require('../../assets/images/react-logo.png')} // Replace with Google icon
            className="w-6 h-6 mr-3"
          />
          <Text className="font-quicksand-medium text-base text-neutral-900">
            Continue with Google
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleFacebookAuth}
          className="flex-row items-center justify-center bg-white border border-neutral-200 rounded-2xl py-4 mb-4 shadow-sm"
        >
          <Image
            source={require('../../assets/images/react-logo.png')} // Replace with Facebook icon
            className="w-6 h-6 mr-3"
          />
          <Text className="font-quicksand-medium text-base text-neutral-900">
            Continue with Facebook
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleAppleAuth}
          className="flex-row items-center justify-center bg-white border border-neutral-200 rounded-2xl py-4 mb-6 shadow-sm"
        >
          <Image
            source={require('../../assets/images/react-logo.png')} // Replace with Apple icon
            className="w-6 h-6 mr-3"
          />
          <Text className="font-quicksand-medium text-base text-neutral-900">
            Continue with Apple
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-px bg-neutral-200" />
          <Text className="px-4 text-neutral-500 font-quicksand-medium">or</Text>
          <View className="flex-1 h-px bg-neutral-200" />
        </View>

        {/* Email/Password Button */}
        <TouchableOpacity
          onPress={handleEmailAuth}
          className="bg-primary rounded-2xl py-4 mb-4"
        >
          <Text className="text-white font-quicksand-semibold text-base text-center">
            Sign in with password
          </Text>
        </TouchableOpacity>

        {/* Create Account Button */}
        <TouchableOpacity
          onPress={handleCreateAccount}
          className="bg-white border-2 border-primary rounded-2xl py-4 mb-4"
        >
          <Text className="text-primary font-quicksand-semibold text-base text-center">
            Create Account
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
