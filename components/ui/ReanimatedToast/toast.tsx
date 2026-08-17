import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { ToastType } from './context';

type ToastProps = {
  index: number;
  toast: ToastType;
  onDismiss: (toastKey: string) => void;
};

const ToastOffset = 20;
const ToastHeight = 70;
const HideToastOffset = ToastOffset + ToastHeight;
const BaseSafeArea = 50;

export const Toast: React.FC<ToastProps> = ({ toast, index, onDismiss }) => {
const { width: windowWidth } = useWindowDimensions();

  // Shared values so worklets never access plain JS object properties
  const toastId = useSharedValue(toast.id);
  const toastKey = useSharedValue(String(toast.key ?? toast.id));

  useEffect(() => {
    toastId.value = toast.id;
    toastKey.value = String(toast.key ?? toast.id);
  }, [toast.id, toast.key, toastId, toastKey]);

  const initialBottomPosition = toast.id === 0 ? -HideToastOffset : BaseSafeArea + (toast.id - 1) * ToastOffset;
  const bottom = useSharedValue(initialBottomPosition);

  useEffect(() => {
    bottom.value = withSpring(BaseSafeArea + toast.id * ToastOffset);
  }, [toast.id, bottom]);

  const translateX = useSharedValue(0);
  const isSwiping = useSharedValue(false);

  // Opacity initialisée à la bonne valeur dès le premier rendu (pas de départ à 0)
  const contentOpacity = useSharedValue(toast.id <= 1 ? 1 : 0);

  useEffect(() => {
    contentOpacity.value = withTiming(toast.id <= 1 ? 1 : 0, { duration: 200 });
  }, [toast.id, contentOpacity]);

  const dismissItem = useCallback(() => {
    'worklet';
    translateX.value = withTiming(-windowWidth, undefined, isFinished => {
      if (isFinished) {
        scheduleOnRN(onDismiss, toastKey.value);
      }
    });
  }, [onDismiss, toastKey, translateX, windowWidth]);

  const gesture = Gesture.Pan()
    .enabled(toast.id === 0)
    .onBegin(() => {
      isSwiping.value = true;
    })
    .onUpdate(event => {
      if (event.translationX > 0) return;
      translateX.value = event.translationX;
    })
    .onEnd(event => {
      if (event.translationX < -50) {
        dismissItem();
      } else {
        translateX.value = withSpring(0);
      }
    })
    .onFinalize(() => {
      isSwiping.value = false;
    });

  useEffect(() => {
    if (!toast.autodismiss || toast.id !== 0) return;
    const timeout = setTimeout(() => {
      dismissItem();
    }, 2000);
    return () => clearTimeout(timeout);
  }, [dismissItem, toast.id, toast.autodismiss]);

  const rToastStyle = useAnimatedStyle(() => {
    const baseScale = 1 - toastId.value * 0.05;
    const scale = isSwiping.value ? baseScale * 0.96 : baseScale;
    return {
      bottom: bottom.value,
      zIndex: 1000 - toastId.value,
      transform: [
        { scale: withTiming(scale) },
        { translateX: translateX.value },
      ],
    };
  });

  const rVisibleContainerStyle = useAnimatedStyle(() => {
    return { opacity: contentOpacity.value };
  });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        key={index}
        style={[
          {
            width: windowWidth * 0.9,
            left: windowWidth * 0.05,
            shadowRadius: Math.max(10 - toast.id * 2, 5),
            zIndex: 100 - toast.id,
            borderCurve: 'continuous' as any,
          },
          styles.container,
          rToastStyle,
        ]}
      >
        <Animated.View style={styles.textContainer}>
          <Animated.View style={[rVisibleContainerStyle, styles.rowCenter]}>
            {Boolean(toast.leading) && <>{toast.leading?.()}</>}
            <View style={[styles.columnCenter, { marginLeft: toast.leading ? 10 : 0 }]}>
              <Text style={styles.title}>{toast.title as any}</Text>
              {toast.subtitle && <Text style={styles.subtitle}>{toast.subtitle as any}</Text>}
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  columnCenter: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 20,
    elevation: 5,
    height: 70,
    paddingHorizontal: 25,
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
  },
  rowCenter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  subtitle: {
    color: '#666',
    fontSize: 13,
  },
  textContainer: {
    alignItems: 'flex-start',
    flex: 1,
    justifyContent: 'center',
    rowGap: 2,
  },
  title: {
    color: '#111',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Toast;
