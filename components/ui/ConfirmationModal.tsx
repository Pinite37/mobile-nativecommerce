import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, Text, TouchableOpacity, View } from 'react-native';

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
  loading?: boolean;
}

export default function ConfirmationModal({
  visible,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  confirmColor = '#10B981',
  onConfirm,
  onCancel,
  isDestructive = false,
  loading = false
}: ConfirmationModalProps) {
  const [animation] = useState(new Animated.Value(0));
  const [overlayAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(animation, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(animation, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible, animation, overlayAnimation]);

  const scale = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1],
  });

  const actualConfirmColor = isDestructive ? '#EF4444' : confirmColor;
  const iconName = isDestructive ? 'warning' : 'help-circle';
  const iconColor = isDestructive ? '#F59E0B' : '#3B82F6';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onCancel}
    >
      <Animated.View 
        className="flex-1 bg-black/50 justify-center items-center px-6"
        style={{ opacity: overlayAnimation }}
      >
        <Animated.View
          className="bg-white rounded-3xl w-full max-w-sm shadow-2xl"
          style={{
            transform: [{ scale }],
            opacity: animation,
          }}
        >
          <View className="p-6">
            {/* Icône et titre */}
            <View className="items-center mb-4">
              <View 
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: iconColor + '20' }}
              >
                <Ionicons name={iconName as any} size={32} color={iconColor} />
              </View>
              <Text className="text-xl font-quicksand-bold text-neutral-800 text-center mb-2">
                {title}
              </Text>
              <Text className="text-base text-neutral-600 font-quicksand-medium text-center leading-6">
                {message}
              </Text>
            </View>

            {/* Boutons d'action */}
            <View className="space-y-3">
              {/* Bouton de confirmation */}
              <TouchableOpacity
                disabled={loading}
                onPress={onConfirm}
                className="rounded-xl py-4 items-center overflow-hidden"
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={isDestructive ? ['#EF4444', '#DC2626'] : [actualConfirmColor, actualConfirmColor]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="absolute inset-0"
                />
                {loading ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text className="font-quicksand-bold text-white ml-2">
                      En cours...
                    </Text>
                  </View>
                ) : (
                  <Text className="font-quicksand-bold text-white">
                    {confirmText}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Bouton d'annulation */}
              <TouchableOpacity
                disabled={loading}
                onPress={onCancel}
                className="bg-neutral-100 rounded-xl py-4 items-center"
                activeOpacity={0.7}
              >
                <Text className="font-quicksand-semibold text-neutral-700">
                  {cancelText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}