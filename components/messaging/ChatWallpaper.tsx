import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { View } from "react-native";

const WALLPAPER_ICONS = [
  'chatbubble-outline', 'heart-outline', 'star-outline', 'sparkles-outline',
  'leaf-outline', 'bag-handle-outline', 'storefront-outline', 'happy-outline',
  'flower-outline', 'ribbon-outline', 'pricetag-outline', 'gift-outline',
  'diamond-outline', 'cart-outline', 'cube-outline', 'megaphone-outline',
  'thumbs-up-outline', 'shield-checkmark-outline', 'wallet-outline', 'trending-up-outline',
];

const _rng = (n: number) => { const x = Math.sin(n + 1) * 73856; return x - Math.floor(x); };

const COLS = 9, CELL_W = 46, CELL_H = 52;
const WALLPAPER_ITEMS = Array.from({ length: 34 }, (_, r) =>
  Array.from({ length: COLS }, (_, c) => {
    const i = r * COLS + c;
    return {
      key: `w${i}`,
      top: r * CELL_H + (_rng(i * 5 + 0) - 0.5) * CELL_H * 0.9,
      left: c * CELL_W + (_rng(i * 5 + 1) - 0.5) * CELL_W * 0.9,
      icon: WALLPAPER_ICONS[Math.floor(_rng(i * 5 + 2) * WALLPAPER_ICONS.length)],
      rot: _rng(i * 5 + 3) * 360,
      size: 14 + Math.floor(_rng(i * 5 + 4) * 14),
      alpha: 0.055 + _rng(i * 5 + 0.7) * 0.065,
    };
  })
).flat();

const ChatWallpaper = React.memo(({ isDark }: { isDark: boolean }) => (
  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
    {WALLPAPER_ITEMS.map(item => (
      <View
        key={item.key}
        style={{
          position: 'absolute',
          top: item.top,
          left: item.left,
          opacity: isDark ? item.alpha * 0.8 : item.alpha,
          transform: [{ rotate: `${item.rot}deg` }],
        }}
      >
        <Ionicons name={item.icon as any} size={item.size} color="#10B981" />
      </View>
    ))}
  </View>
));

export default ChatWallpaper;
