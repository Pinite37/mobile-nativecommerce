import React, { useEffect } from "react";
import { ViewStyle } from "react-native";
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../contexts/ThemeContext";

interface ShimmerProps {
    style?: ViewStyle;
}

export function Shimmer({ style }: ShimmerProps) {
    const { isDark, colors } = useTheme();
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withRepeat(
            withTiming(1, { duration: 1200, easing: Easing.linear }),
            -1,
            false
        );
        return () => {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            progress.value = 0;
        };
    }, []);

    const slideStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: interpolate(progress.value, [0, 1], [-150, 150]) }],
    }));

    return (
        <Animated.View
            style={[
                {
                    backgroundColor: colors.border,
                    overflow: "hidden",
                },
                style,
            ]}
        >
            <Animated.View
                style={[
                    {
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        width: 120,
                        backgroundColor: isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(255,255,255,0.5)",
                        opacity: 0.7,
                    },
                    slideStyle,
                ]}
            />
        </Animated.View>
    );
}
