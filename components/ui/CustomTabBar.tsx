import React from "react";
import {
  Platform,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { EdgeInsets, useSafeAreaInsets } from "react-native-safe-area-context";

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  insets?: EdgeInsets;
}

export const CustomTabBar: React.FC<TabBarProps> = ({
  state,
  descriptors,
  navigation,
  insets,
}) => {
  // Utiliser les insets passés en prop ou les récupérer si non fournis
  const defaultInsets = useSafeAreaInsets();
  const safeInsets = insets || defaultInsets;

  // Responsivité basée sur la largeur de l'écran
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 360;
  const isTablet = width >= 768;

  // Calculs dynamiques: padding et tailles adaptatives
  // Floating design: on ajoute une marge en bas
  const bottomMargin = Platform.OS === "ios" ? safeInsets.bottom : 20;
  const dynamicPaddingBottom = Platform.OS === "ios" ? 0 : 0; // Padding interne géré par le height/justify
  const dynamicPaddingTop = 0;

  const barBaseHeight = isTablet ? 72 : 64;
  const dynamicHeight = barBaseHeight; // Hauteur fixe pour le floating bar

  // Tailles d'icônes/typo adaptatives
  const baseIcon = isTablet ? 24 : 22;
  const labelFontSize = isTablet ? 12 : 10; // Un peu plus petit pour le style épuré

  const currentIndex = typeof state?.index === "number" ? state.index : 0;
  const currentRouteKey = state?.routes?.[currentIndex]?.key;
  const focusedOptions = currentRouteKey
    ? descriptors[currentRouteKey]?.options || {}
    : {};

  // Modern Expo Router uses tabBarStyle: { display: 'none' } instead of tabBarVisible
  if (focusedOptions.tabBarStyle?.display === "none") {
    return null;
  }

  // Filter out routes that should not appear in the tab bar
  const routes = (state?.routes ?? []).filter((route: any) => {
    const options = descriptors[route.key]?.options || {};
    if (options.href === null) return false; // Expo Router: cacher
    if (options.tabBarButton === null) return false; // React Navigation: cacher
    if (options.tabBarItemStyle?.display === "none") return false; // Cacher explicitement
    return true;
  });

  return (
    <View
      style={{
        position: "absolute",
        bottom: bottomMargin,
        left: 20,
        right: 20,
        zIndex: 100,
      }}
      pointerEvents="box-none"
    >
      <View
        className="flex-row bg-white items-center justify-between"
        style={{
          borderRadius: 32, // Pill shape
          height: dynamicHeight,
          paddingHorizontal: 8,
          // Ombres sophistiquées
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 10,
        }}
      >
        {routes.map((route: any) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = currentRouteKey === route.key;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          // Récupération du rendu d'icône fourni par les options
          const IconComponent = options.tabBarIcon;

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={
                options.tabBarAccessibilityLabel || `Onglet ${label}`
              }
              testID={options.tabBarTestID || `tab-${label}`}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                transform: [{ scale: isFocused ? 1 : 1 }],
              }}
            >
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  width: 48,
                  height: 48,
                  borderRadius: 24, // Force circle (half of size)
                  backgroundColor: isFocused ? "#ECFDF5" : "transparent", // Green-50
                }}
              >
                {!!IconComponent && (
                  <View>
                    {IconComponent({
                      color: isFocused ? "#10B981" : "#9CA3AF", // Green-500 vs Gray-400
                      size: isFocused ? baseIcon + 2 : baseIcon,
                      focused: isFocused,
                    })}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};
