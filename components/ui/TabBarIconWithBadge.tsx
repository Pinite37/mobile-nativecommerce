import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

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
  return (
    <View className="relative">
      <Ionicons
        name={focused ? name.replace('-outline', '') as any : `${name}-outline` as any}
        size={focused ? size + 2 : size}
        color={color}
      />

      {badgeCount && badgeCount > 0 && (
        <View className="absolute -top-2 -right-2 bg-red-500 rounded-full min-w-5 h-5 justify-center items-center px-1">
          <Text className="text-white text-xs font-bold">
            {badgeCount > 99 ? '99+' : badgeCount.toString()}
          </Text>
        </View>
      )}
    </View>
  );
};
