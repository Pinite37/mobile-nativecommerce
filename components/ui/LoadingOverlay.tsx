import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  showSlowWarning?: boolean;
  slowWarningDelay?: number; // en millisecondes
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Chargement...',
  showSlowWarning = true,
  slowWarningDelay = 3000, // 3 secondes
}) => {
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowSlowMessage(false);
      return;
    }

    if (!showSlowWarning) return;

    const timer = setTimeout(() => {
      if (isLoading) {
        setShowSlowMessage(true);
      }
    }, slowWarningDelay);

    return () => clearTimeout(timer);
  }, [isLoading, showSlowWarning, slowWarningDelay]);

  if (!isLoading) return null;

  return (
    <View className="absolute inset-0 bg-white/95 justify-center items-center z-50">
      <View className="bg-white rounded-2xl p-8 mx-8 shadow-lg border border-gray-100">
        <View className="items-center">
          <ActivityIndicator size="large" color="#FE8C00" />
          
          <Text className="text-lg font-quicksand-semibold text-gray-900 mt-4 mb-2">
            {message}
          </Text>
          
          {showSlowMessage ? (
            <View className="items-center mt-4 p-4 bg-orange-50 rounded-xl">
              <View className="flex-row items-center mb-2">
                <Ionicons name="wifi-outline" size={20} color="#F59E0B" />
                <Text className="text-orange-600 font-quicksand-semibold ml-2">
                  Connexion lente détectée
                </Text>
              </View>
              <Text className="text-orange-600 font-quicksand text-center text-sm">
                Vérifiez votre connexion internet ou réessayez plus tard
              </Text>
            </View>
          ) : (
            <Text className="text-gray-600 font-quicksand text-center">
              Récupération de vos données...
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

export default LoadingOverlay;
