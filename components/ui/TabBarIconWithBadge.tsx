import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";

interface TabBarIconWithBadgeProps {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
  focused: boolean;
  badgeCount?: number;
}

export const TabBarIconWithBadge: React.FC<TabBarIconWithBadgeProps> = ({
  name,
  color,
  size,
  focused,
  badgeCount,
}) => {
  const baseName = String(name);
  const focusedName = baseName.endsWith("-outline")
    ? (baseName.slice(0, -"-outline".length) as any)
    : (baseName as any);
  const unfocusedName = baseName.endsWith("-outline")
    ? (baseName as any)
    : (`${baseName}-outline` as any);

  return (
    <View className="relative">
      <Ionicons
        name={focused ? focusedName : unfocusedName}
        size={size}
        color={color}
      />

      {badgeCount && badgeCount > 0 && (
        <View className="absolute -top-2 -right-2 bg-red-500 rounded-full min-w-5 h-5 justify-center items-center px-1">
          <Text className="text-white text-xs font-bold">
            {badgeCount > 99 ? "99+" : badgeCount.toString()}
          </Text>
        </View>
      )}
    </View>
  );
};
