import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { colors, isDark } = useTheme();

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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-16 pb-8">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mb-6"
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text className="text-3xl font-poppins-bold mb-2" style={{ color: colors.textPrimary }}>
            Choisissez votre rôle
          </Text>
          <Text className="text-base font-quicksand" style={{ color: colors.textSecondary }}>
            Sélectionnez comment vous souhaitez utiliser notre plateforme
          </Text>
        </View>

        {/* Role Options */}
        <View className="px-6">
          {userRoles.map((role) => (
            <TouchableOpacity
              key={role.id}
              onPress={() => setSelectedRole(role.id)}
              className="border-2 rounded-2xl p-6 mb-4"
              style={selectedRole === role.id
                ? { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.05)' }
                : { borderColor: colors.border, backgroundColor: colors.card }}
              activeOpacity={0.8}
            >
              <View className="flex-row items-center">
                <View className={`w-12 h-12 rounded-xl ${role.color} items-center justify-center mr-4`}>
                  <Ionicons name={role.icon as any} size={24} color={role.iconColor} />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-poppins-semibold mb-1" style={{ color: colors.textPrimary }}>
                    {role.title}
                  </Text>
                  <Text className="text-sm font-quicksand" style={{ color: colors.textSecondary }}>
                    {role.description}
                  </Text>
                </View>
                <View
                  className="w-6 h-6 rounded-full border-2 items-center justify-center"
                  style={selectedRole === role.id
                    ? { borderColor: '#10B981', backgroundColor: '#10B981' }
                    : { borderColor: colors.border }}
                >
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
            className={`rounded-xl py-4 ${selectedRole ? 'bg-primary' : ''}`}
            style={!selectedRole ? { backgroundColor: colors.tertiary } : undefined}
            disabled={!selectedRole}
          >
            <Text
              className="font-poppins-semibold text-base text-center"
              style={{ color: selectedRole ? '#FFFFFF' : colors.textSecondary }}
            >
              Continuer
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
