import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Text, TouchableOpacity, View } from 'react-native';

interface NotificationModalProps {
  visible: boolean;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  onClose: () => void;
  autoHide?: boolean;
  duration?: number;
}

export default function NotificationModal({
  visible,
  type,
  title,
  message,
  onClose,
  autoHide = true,
  duration = 3000
}: NotificationModalProps) {
  const [animation] = useState(new Animated.Value(0));

  const handleClose = React.useCallback(() => {
    Animated.timing(animation, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  }, [animation, onClose]);

  useEffect(() => {
    if (visible) {
      Animated.timing(animation, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();

      if (autoHide) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        return () => clearTimeout(timer);
      }
    } else {
      Animated.timing(animation, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, animation, autoHide, duration, handleClose]);

  const getIconAndColor = () => {
    switch (type) {
      case 'success':
        return { icon: 'checkmark-circle', color: '#10B981' };
      case 'error':
        return { icon: 'close-circle', color: '#EF4444' };
      case 'warning':
        return { icon: 'warning', color: '#F59E0B' };
      case 'info':
        return { icon: 'information-circle', color: '#3B82F6' };
      default:
        return { icon: 'information-circle', color: '#6B7280' };
    }
  };

  const { icon, color } = getIconAndColor();

  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-start items-center pt-12 px-4">
        <Animated.View
          className="bg-white rounded-2xl shadow-lg border border-neutral-200 w-full max-w-sm"
          style={{
            transform: [{ translateY }],
            opacity: animation,
          }}
        >
          <View className="p-4">
            <View className="flex-row items-start">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: color + '20' }}
              >
                <Ionicons name={icon as any} size={24} color={color} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-quicksand-bold text-neutral-800 mb-1">
                  {title}
                </Text>
                <Text className="text-base text-neutral-600 font-quicksand-medium leading-5">
                  {message}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                className="w-8 h-8 rounded-full bg-neutral-100 items-center justify-center ml-2"
              >
                <Ionicons name="close" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Hook pour utiliser facilement les notifications
export function useNotification() {
  const [notification, setNotification] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'info' | 'warning';
    title: string;
    message: string;
  } | null>(null);

  const showNotification = (
    type: 'success' | 'error' | 'info' | 'warning',
    title: string,
    message: string,
    autoHide = true,
    duration = 3000
  ) => {
    setNotification({ visible: true, type, title, message });

    if (autoHide) {
      setTimeout(() => {
        setNotification(null);
      }, duration);
    }
  };

  const hideNotification = () => {
    setNotification(null);
  };

  return {
    notification,
    showNotification,
    hideNotification,
  };
}
