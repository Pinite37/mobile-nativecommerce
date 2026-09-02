import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";

interface ErrorStateProps {
  title?: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Couleur de l'icône et du thème. Par défaut: amber */
  variant?: "network" | "notFound" | "generic";
  onRetry?: () => void;
  retryLabel?: string;
  onSecondary?: () => void;
  secondaryLabel?: string;
}

const VARIANTS = {
  network: {
    icon: "cloud-offline-outline" as keyof typeof Ionicons.glyphMap,
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.10)",
    bgInner: "rgba(245,158,11,0.16)",
    defaultTitle: "Connexion impossible",
    defaultMessage: "Vérifiez votre connexion internet et réessayez.",
  },
  notFound: {
    icon: "search-outline" as keyof typeof Ionicons.glyphMap,
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.10)",
    bgInner: "rgba(139,92,246,0.16)",
    defaultTitle: "Rien trouvé",
    defaultMessage: "Cet élément est introuvable ou a été supprimé.",
  },
  generic: {
    icon: "construct-outline" as keyof typeof Ionicons.glyphMap,
    color: "#EF4444",
    bg: "rgba(239,68,68,0.08)",
    bgInner: "rgba(239,68,68,0.14)",
    defaultTitle: "Une erreur est survenue",
    defaultMessage: "Quelque chose s'est mal passé. Réessayez dans un instant.",
  },
};

export function ErrorState({
  title,
  message,
  icon,
  variant = "generic",
  onRetry,
  retryLabel = "Réessayer",
  onSecondary,
  secondaryLabel,
}: ErrorStateProps) {
  const { colors, isDark } = useTheme();
  const v = VARIANTS[variant];
  const iconName = icon ?? v.icon;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 32,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      {/* Double cercle avec icône */}
      <View
        style={{
          width: 112,
          height: 112,
          borderRadius: 56,
          backgroundColor: v.bg,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 28,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: v.bgInner,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={iconName} size={38} color={v.color} />
        </View>
      </View>

      {/* Titre */}
      <Text
        className="font-jakarta-bold text-xl text-center"
        style={{ color: colors.textPrimary, marginBottom: 10 }}
      >
        {title ?? v.defaultTitle}
      </Text>

      {/* Message */}
      <Text
        className="font-jakarta-medium text-sm text-center"
        style={{
          color: colors.textSecondary,
          lineHeight: 20,
          maxWidth: 280,
          marginBottom: 32,
        }}
      >
        {message ?? v.defaultMessage}
      </Text>

      {/* Boutons */}
      <View style={{ width: "100%", maxWidth: 280, gap: 10 }}>
        {onRetry && (
          <TouchableOpacity
            onPress={onRetry}
            activeOpacity={0.8}
            style={{
              backgroundColor: v.color,
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text
              className="font-jakarta-bold text-sm"
              style={{ color: "#fff" }}
            >
              {retryLabel}
            </Text>
          </TouchableOpacity>
        )}

        {onSecondary && secondaryLabel && (
          <TouchableOpacity
            onPress={onSecondary}
            activeOpacity={0.75}
            style={{
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
              backgroundColor: isDark
                ? "rgba(255,255,255,0.07)"
                : "rgba(0,0,0,0.05)",
            }}
          >
            <Text
              className="font-jakarta-semibold text-sm"
              style={{ color: colors.textSecondary }}
            >
              {secondaryLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

export default ErrorState;
