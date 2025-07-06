import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function EnterpriseSignUpScreen() {
  // Personal Information
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [address, setAddress] = useState('');
  
  // Enterprise Information
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    if (!firstName || !lastName || !email || !phone || !password || !confirmPassword || !address) {
      Alert.alert('Error', 'Please fill in all personal information fields');
      return;
    }

    if (!companyName || !description) {
      Alert.alert('Error', 'Please fill in all company information fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement enterprise sign up logic
      const userData = {
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
      
      console.log('Enterprise Sign up:', userData);
      Alert.alert('Success', 'Enterprise account created successfully!');
      // Navigate to main app or dashboard
    } catch {
      Alert.alert('Error', 'Sign up failed. Please try again.');
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
      
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
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
          <View className="mb-6">
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
              value={companyName}
              onChangeText={setCompanyName}
              placeholder="Enter your company name"
              className="border border-neutral-200 rounded-xl px-4 py-4 text-base font-quicksand"
            />
          </View>

          {/* Description */}
          <View className="mb-6">
            <Text className="text-sm font-quicksand-medium text-neutral-700 mb-2">
              Business Description
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your business"
              multiline
              numberOfLines={4}
              className="border border-neutral-200 rounded-xl px-4 py-4 text-base font-quicksand"
              style={{ textAlignVertical: 'top' }}
            />
          </View>

          {/* Security Section */}
          <Text className="text-lg font-quicksand-semibold text-neutral-900 mb-4">
            Security
          </Text>

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
          <View className="mb-8">
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
              {isLoading ? 'Creating Business Account...' : 'Create Business Account'}
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
      </ScrollView>
    </View>
  );
}
