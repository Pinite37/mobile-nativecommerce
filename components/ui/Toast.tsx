import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';

export interface ToastConfig {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
  onPress?: () => void;
  onDismiss?: () => void;
}

interface ToastProps {
  config: ToastConfig;
}

const Toast: React.FC<ToastProps> = ({ config }) => {
  const translateY = useMemo(() => new Animated.Value(-100), []);
  const opacity = useMemo(() => new Animated.Value(0), []);

  const dismissToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      config.onDismiss?.();
    });
  }, [translateY, opacity, config]);

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    const timer = setTimeout(() => {
      dismissToast();
    }, config.duration || 4000);

    return () => clearTimeout(timer);
  }, [translateY, opacity, dismissToast, config.duration]);

  const getToastStyles = () => {
    switch (config.type) {
      case 'success':
        return {
          backgroundColor: '#10B981',
          borderColor: '#059669',
          iconName: 'checkmark-circle',
          iconColor: '#FFFFFF',
        };
      case 'error':
        return {
          backgroundColor: '#EF4444',
          borderColor: '#DC2626',
          iconName: 'close-circle',
          iconColor: '#FFFFFF',
        };
      case 'warning':
        return {
          backgroundColor: '#F59E0B',
          borderColor: '#D97706',
          iconName: 'warning',
          iconColor: '#FFFFFF',
        };
      case 'info':
      default:
        return {
          backgroundColor: '#3B82F6',
          borderColor: '#2563EB',
          iconName: 'information-circle',
          iconColor: '#FFFFFF',
        };
    }
  };

  const styles = getToastStyles();

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 50,
        left: 16,
        right: 16,
        zIndex: 9999,
        transform: [{ translateY }],
        opacity,
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={config.onPress || dismissToast}
        style={{
          backgroundColor: styles.backgroundColor,
          borderRadius: 12,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 5,
        }}
      >
        <Ionicons
          name={styles.iconName as any}
          size={24}
          color={styles.iconColor}
          style={{ marginRight: 12 }}
        />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '600',
              marginBottom: config.message ? 4 : 0,
              fontFamily: 'Quicksand-SemiBold',
            }}
          >
            {config.title}
          </Text>
          {config.message && (
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 14,
                opacity: 0.9,
                lineHeight: 20,
                fontFamily: 'Quicksand-Regular',
              }}
            >
              {config.message}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={dismissToast}
          style={{
            marginLeft: 8,
            padding: 4,
          }}
        >
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default Toast;
