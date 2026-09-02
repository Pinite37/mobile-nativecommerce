import { useTheme } from "@/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  noBorder?: boolean;
}

export function AppHeader({ title, subtitle, onBack, rightElement, noBorder }: AppHeaderProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = onBack ?? (() => router.back());

  return (
    <View style={{
      backgroundColor: colors.surface,
      paddingTop: insets.top + 8,
      paddingHorizontal: 16,
      paddingBottom: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderBottomWidth: noBorder ? 0 : 1,
      borderBottomColor: colors.borderLight,
    }}>
      <TouchableOpacity
        onPress={handleBack}
        style={{
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: colors.tertiary,
          alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{ fontFamily: "PlusJakartaSans-SemiBold", fontSize: 18, color: colors.textPrimary }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={{ fontFamily: "PlusJakartaSans-Regular", fontSize: 12, color: colors.textSecondary, marginTop: 1 }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {rightElement ?? <View style={{ width: 40 }} />}
    </View>
  );
}
