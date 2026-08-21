import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Animated, PanResponder, View } from "react-native";

const SWIPE_THRESHOLD = 65;

const SwipeableMessageRow = ({
  children,
  onReply,
  enabled = true,
}: {
  children: React.ReactNode;
  onReply: () => void;
  enabled?: boolean;
}) => {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const triggered = React.useRef(false);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        if (!enabled) return false;
        return gs.dx > 22 && Math.abs(gs.dx) > Math.abs(gs.dy) * 3;
      },
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderMove: (_, gs) => {
        if (gs.dx > 0) {
          translateX.setValue(Math.min(gs.dx, SWIPE_THRESHOLD + 20));
          if (gs.dx >= SWIPE_THRESHOLD && !triggered.current) {
            triggered.current = true;
          }
        }
      },
      onPanResponderRelease: (_, gs) => {
        const didTrigger = triggered.current;
        triggered.current = false;
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 220 }).start();
        if (didTrigger) onReply();
      },
      onPanResponderTerminate: () => {
        triggered.current = false;
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const iconOpacity = translateX.interpolate({ inputRange: [0, 20, SWIPE_THRESHOLD], outputRange: [0, 0.4, 1], extrapolate: 'clamp' });
  const iconScale = translateX.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0.5, 1], extrapolate: 'clamp' });

  return (
    <View>
      <Animated.View style={{ position: 'absolute', left: 6, top: 0, bottom: 0, justifyContent: 'center', opacity: iconOpacity, transform: [{ scale: iconScale }] }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 }}>
          <Ionicons name="return-up-forward" size={15} color="#FFFFFF" />
        </View>
      </Animated.View>
      <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX }] }}>
        {children}
      </Animated.View>
    </View>
  );
};

export default SwipeableMessageRow;
