import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import i18n from '../../i18n/i18n';

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
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-6">
        <BlurView intensity={20} className="absolute inset-0" />
        
        <View style={{ backgroundColor: colors.card, borderRadius: 24, width: '100%', maxWidth: 400, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 10 }}>
          {/* Animated Header */}
          <LinearGradient
            colors={isSuccess ? ['#10B981', '#059669'] : ['#EF4444', '#DC2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="p-6 pb-8 items-center"
          >
            <View 
              style={{ 
                width: 80, 
                height: 80, 
                borderRadius: 40, 
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
              }}
            >
              <View 
                style={{ 
                  width: 64, 
                  height: 64, 
                  borderRadius: 32, 
                  backgroundColor: '#FFFFFF',
                  justifyContent: 'center',
                  alignItems: 'center',
                  display: 'flex',
                }}
              >
                <Ionicons
                  name={isSuccess ? 'checkmark-circle' : 'close-circle'}
                  size={48}
                  color={isSuccess ? '#10B981' : '#EF4444'}
                  style={{ textAlign: 'center', marginLeft: 0, marginRight: 0 }}
                />
              </View>
            </View>
            <Text style={{ color: '#FFFFFF', fontFamily: 'Quicksand-Bold', fontSize: 24, textAlign: 'center' }}>
              {title}
            </Text>
          </LinearGradient>

          {/* Message Content */}
          <View className="p-6 pt-5">
            <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Medium', fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 24 }}>
              {message}
            </Text>

            {/* Action Button */}
            <TouchableOpacity
              onPress={onClose}
              className="rounded-xl py-4 items-center justify-center shadow-sm"
              style={{ backgroundColor: isSuccess ? '#10B981' : '#EF4444' }}
            >
              <Text style={{ color: '#FFFFFF', fontFamily: 'Quicksand-Bold', fontSize: 16 }}>
                {isSuccess ? i18n.t('common.actions.great') : i18n.t('common.actions.understood')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
