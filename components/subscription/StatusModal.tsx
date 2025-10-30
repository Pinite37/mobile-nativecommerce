import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

interface StatusModalProps {
  visible: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
  onClose: () => void;
}

export default function StatusModal({
  visible,
  type,
  title,
  message,
  onClose,
}: StatusModalProps) {
  const isSuccess = type === 'success';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <BlurView intensity={20} className="absolute inset-0" />
        
        <View className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
          {/* Animated Header */}
          <LinearGradient
            colors={isSuccess ? ['#10B981', '#059669'] : ['#EF4444', '#DC2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-6 pb-8 items-center"
          >
            <View 
              className="w-20 h-20 rounded-full items-center justify-center mb-4 shadow-lg"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
            >
              <View className="w-16 h-16 rounded-full bg-white items-center justify-center">
                <Ionicons
                  name={isSuccess ? 'checkmark-circle' : 'close-circle'}
                  size={48}
                  color={isSuccess ? '#10B981' : '#EF4444'}
                />
              </View>
            </View>
            <Text className="text-white font-quicksand-bold text-2xl text-center">
              {title}
            </Text>
          </LinearGradient>

          {/* Message Content */}
          <View className="p-6 pt-5">
            <Text className="text-neutral-700 font-quicksand-medium text-base text-center leading-6 mb-6">
              {message}
            </Text>

            {/* Action Button */}
            <TouchableOpacity
              onPress={onClose}
              className="rounded-xl py-4 items-center justify-center shadow-sm"
              style={{ backgroundColor: isSuccess ? '#10B981' : '#EF4444' }}
            >
              <Text className="text-white font-quicksand-bold text-base">
                {isSuccess ? 'Super !' : 'Compris'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
