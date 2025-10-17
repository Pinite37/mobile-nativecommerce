import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const userRoles = [
  {
    id: 'CLIENT',
    title: 'Client',
    description: 'Achetez auprès d\' entreprises vérifiées et suivez vos commandes',
    icon: 'person-outline',
    color: 'bg-blue-50',
    iconColor: '#1E40AF',
  },
  {
    id: 'ENTERPRISE',
    title: 'Entreprise',
    description: 'Vendez vos produits et gérez votre entreprise',
    icon: 'business-outline',
    color: 'bg-green-50',
    iconColor: '#059669',
  },
];

export default function RoleSelectionScreen() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleContinue = () => {
    if (!selectedRole) {
      Alert.alert('Erreur', 'Veuillez sélectionner un rôle pour continuer');
      return;
    }

    // Navigate to appropriate signup flow based on role
    if (selectedRole === 'ENTERPRISE') {
      router.push({
        pathname: '/(auth)/enterprise-signup',
        params: { role: selectedRole }
      });
    } else {
      router.push({
        pathname: '/(auth)/signup',
        params: { role: selectedRole }
      });
    }
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
            Choisissez votre rôle
          </Text>
          <Text className="text-base font-quicksand text-neutral-600">
            Sélectionnez comment vous souhaitez utiliser notre plateforme
          </Text>
        </View>

        {/* Role Options */}
        <View className="px-6">
          {userRoles.map((role) => (
            <TouchableOpacity
              key={role.id}
              onPress={() => setSelectedRole(role.id)}
              className={`border-2 rounded-2xl p-6 mb-4 ${
                selectedRole === role.id
                  ? 'border-primary bg-primary/5'
                  : 'border-neutral-200 bg-white'
              }`}
              activeOpacity={0.8}
            >
              <View className="flex-row items-center">
                <View className={`w-12 h-12 rounded-xl ${role.color} items-center justify-center mr-4`}>
                  <Ionicons name={role.icon as any} size={24} color={role.iconColor} />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-quicksand-semibold text-neutral-900 mb-1">
                    {role.title}
                  </Text>
                  <Text className="text-sm font-quicksand text-neutral-600">
                    {role.description}
                  </Text>
                </View>
                <View className={`w-6 h-6 rounded-full border-2 ${
                  selectedRole === role.id
                    ? 'border-primary bg-primary'
                    : 'border-neutral-300'
                } items-center justify-center`}>
                  {selectedRole === role.id && (
                    <View className="w-2 h-2 rounded-full bg-white" />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Continue Button */}
        <View className="px-6 pb-6 mt-8">
          <TouchableOpacity
            onPress={handleContinue}
            className={`rounded-xl py-4 ${
              selectedRole ? 'bg-primary' : 'bg-neutral-200'
            }`}
            disabled={!selectedRole}
          >
            <Text className={`font-quicksand-semibold text-base text-center ${
              selectedRole ? 'text-white' : 'text-neutral-500'
            }`}>
              Continuer
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
