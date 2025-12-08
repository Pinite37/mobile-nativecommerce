import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import i18n from "../i18n/i18n";

export default function NotFoundScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();

    // Animations
    const floatAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Animation de flottement pour l'icône
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: 1,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 2000,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Animation d'apparition
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, [floatAnim, scaleAnim, fadeAnim]);

    const translateY = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -20],
    });

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar style={isDark ? "light" : "dark"} />

            {/* Gradient Background */}
            <LinearGradient
                colors={
                    isDark
                        ? ["#1F2937", "#111827", "#000000"]
                        : ["#F9FAFB", "#F3F4F6", "#E5E7EB"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                }}
            />

            {/* Decorative circles */}
            <View
                style={{
                    position: "absolute",
                    top: 100,
                    right: -100,
                    width: 300,
                    height: 300,
                    borderRadius: 150,
                    backgroundColor: isDark ? "rgba(254, 140, 0, 0.1)" : "rgba(254, 140, 0, 0.15)",
                    opacity: 0.5,
                }}
            />
            <View
                style={{
                    position: "absolute",
                    bottom: -50,
                    left: -100,
                    width: 250,
                    height: 250,
                    borderRadius: 125,
                    backgroundColor: isDark ? "rgba(16, 185, 129, 0.1)" : "rgba(16, 185, 129, 0.15)",
                    opacity: 0.5,
                }}
            />

            <View
                className="flex-1 justify-center items-center px-6"
                style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
            >
                <Animated.View
                    style={{
                        transform: [{ translateY }, { scale: scaleAnim }],
                        opacity: fadeAnim,
                    }}
                    className="items-center"
                >
                    {/* Icon Container */}
                    <View
                        className="w-32 h-32 rounded-full justify-center items-center mb-6"
                        style={{
                            backgroundColor: isDark ? "rgba(254, 140, 0, 0.15)" : "rgba(254, 140, 0, 0.1)",
                            shadowColor: "#FE8C00",
                            shadowOffset: { width: 0, height: 8 },
                            shadowOpacity: 0.2,
                            shadowRadius: 16,
                            elevation: 8,
                        }}
                    >
                        <View
                            className="w-24 h-24 rounded-full justify-center items-center"
                            style={{
                                backgroundColor: isDark ? "rgba(254, 140, 0, 0.2)" : "rgba(254, 140, 0, 0.15)",
                            }}
                        >
                            <Ionicons
                                name="location-outline"
                                size={56}
                                color="#FE8C00"
                            />
                        </View>
                    </View>

                    {/* 404 Text */}
                    <Text
                        className="text-7xl font-quicksand-bold mb-2"
                        style={{
                            color: "#FE8C00",
                            textShadowColor: isDark ? "rgba(254, 140, 0, 0.3)" : "rgba(254, 140, 0, 0.2)",
                            textShadowOffset: { width: 0, height: 4 },
                            textShadowRadius: 12,
                        }}
                    >
                        404
                    </Text>

                    {/* Main Title */}
                    <Text
                        className="text-2xl font-quicksand-bold text-center mb-3"
                        style={{ color: colors.textPrimary }}
                    >
                        {i18n.t("notFound.title") || "Page introuvable"}
                    </Text>

                    {/* Description */}
                    <Text
                        className="text-base font-quicksand-medium text-center mb-8 px-4"
                        style={{ color: colors.textSecondary, lineHeight: 24 }}
                    >
                        {i18n.t("notFound.description") ||
                            "Désolé, la page que vous recherchez semble s'être égarée. Elle n'existe peut-être plus ou l'URL est incorrecte."}
                    </Text>

                    {/* Action Buttons */}
                    <View className="w-full max-w-xs">
                        {/* Primary Button - Go Home */}
                        <TouchableOpacity
                            onPress={() => {
                                // Try to go back first, if not possible, navigate to home
                                if (router.canGoBack()) {
                                    router.back();
                                } else {
                                    router.replace("/" as any);
                                }
                            }}
                            activeOpacity={0.8}
                            className="mb-3 rounded-2xl overflow-hidden"
                            style={{
                                shadowColor: "#FE8C00",
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 4,
                            }}
                        >
                            <LinearGradient
                                colors={["#FE8C00", "#F97316"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                className="py-4 px-6 flex-row items-center justify-center"
                            >
                                <Ionicons name="home" size={20} color="#FFFFFF" />
                                <Text className="text-white text-base font-quicksand-bold ml-2">
                                    {i18n.t("notFound.goHome") || "Retour à l'accueil"}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Secondary Button - Go Back */}
                        {router.canGoBack() && (
                            <TouchableOpacity
                                onPress={() => router.back()}
                                activeOpacity={0.8}
                                className="rounded-2xl py-4 px-6 flex-row items-center justify-center"
                                style={{
                                    backgroundColor: colors.card,
                                    borderWidth: 1.5,
                                    borderColor: isDark ? "rgba(254, 140, 0, 0.3)" : "rgba(254, 140, 0, 0.2)",
                                }}
                            >
                                <Ionicons
                                    name="arrow-back"
                                    size={20}
                                    color={colors.textPrimary}
                                />
                                <Text
                                    className="text-base font-quicksand-bold ml-2"
                                    style={{ color: colors.textPrimary }}
                                >
                                    {i18n.t("notFound.goBack") || "Page précédente"}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>

                {/* Bottom Help Text */}
                <Animated.View
                    style={{ opacity: fadeAnim }}
                    className="absolute bottom-8 items-center px-6"
                >
                    <View className="flex-row items-center">
                        <Ionicons
                            name="information-circle-outline"
                            size={16}
                            color={colors.textTertiary}
                        />
                        <Text
                            className="text-xs font-quicksand-medium ml-2"
                            style={{ color: colors.textTertiary }}
                        >
                            {i18n.t("notFound.help") || "Besoin d'aide ? Contactez le support"}
                        </Text>
                    </View>
                </Animated.View>
            </View>
        </View>
    );
}
