import React from 'react';
import { Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context';

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  insets?: EdgeInsets;
}

export const CustomTabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation, insets }) => {
  // Utiliser les insets passés en prop ou les récupérer si non fournis
  const defaultInsets = useSafeAreaInsets();
  const safeInsets = insets || defaultInsets;

  // Responsivité basée sur la largeur de l'écran
  const { width } = useWindowDimensions();
  const isSmallPhone = width < 360;
  const isTablet = width >= 768;

  // Calculs dynamiques: padding et tailles adaptatives
  const dynamicPaddingBottom = 14 + Math.min(safeInsets.bottom, 24);
  const dynamicPaddingTop = isSmallPhone ? 8 : 12;
  const dynamicPaddingHorizontal = Math.max(12, safeInsets.left + safeInsets.right + 8);
  const barBaseHeight = isTablet ? 68 : isSmallPhone ? 58 : 62;
  const dynamicHeight = barBaseHeight + safeInsets.bottom;

  // Tailles d'icônes/typo adaptatives
  const baseIcon = isTablet ? 26 : isSmallPhone ? 22 : 24;
  const labelFontSize = isTablet ? 13 : isSmallPhone ? 11 : 12;
  const labelLineHeight = Math.round(labelFontSize * 1.15);

  React.useEffect(() => {
    // Indication minimale pour débogage
    console.log('TabBar mounted with Quicksand font family (responsive)');
  }, []);

  const currentIndex = typeof state?.index === 'number' ? state.index : 0;
  const currentRouteKey = state?.routes?.[currentIndex]?.key;
  const focusedOptions = currentRouteKey ? (descriptors[currentRouteKey]?.options || {}) : {};

  // Modern Expo Router uses tabBarStyle: { display: 'none' } instead of tabBarVisible
  if (focusedOptions.tabBarStyle?.display === 'none') {
    return null;
  }

  // Filter out routes that should not appear in the tab bar
  const routes = (state?.routes ?? []).filter((route: any) => {
    const options = descriptors[route.key]?.options || {};
    if (options.href === null) return false; // Expo Router: cacher
    if (options.tabBarButton === null) return false; // React Navigation: cacher
    if (options.tabBarItemStyle?.display === 'none') return false; // Cacher explicitement
    return true;
  });

  return (
    <View
      className="flex-row bg-white border-t-0 shadow-lg rounded-t-3xl"
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 15,
        paddingTop: dynamicPaddingTop,
        paddingBottom: dynamicPaddingBottom,
        paddingHorizontal: dynamicPaddingHorizontal,
        height: dynamicHeight,
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
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
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
            accessibilityLabel={options.tabBarAccessibilityLabel || `Onglet ${label}`}
            testID={options.tabBarTestID || `tab-${label}`}
            onPress={onPress}
            onLongPress={onLongPress}
            activeOpacity={1}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className={`flex-1 items-center justify-center py-2 mx-1 rounded-2xl ${
              isFocused ? 'bg-primary/10' : 'bg-transparent'
            }`}
            style={{
              minHeight: 48,
              transform: [{ scale: isFocused ? 1.04 : 1 }],
              marginHorizontal: Math.max(2, safeInsets.left / 4),
            }}
          >
            <View className="items-center justify-center">
              {!!IconComponent && (
                <View style={{ marginBottom: 3 }}>
                  {IconComponent({
                    color: isFocused ? '#10B981' : '#6B7280',
                    size: isFocused ? baseIcon + 2 : baseIcon,
                    focused: isFocused,
                  })}
                </View>
              )}
              <Text
                className={`mt-1 ${isFocused ? 'text-primary' : 'text-gray-500'}`}
                style={{
                  fontSize: labelFontSize,
                  lineHeight: labelLineHeight,
                  textAlign: 'center',
                  fontFamily: 'Quicksand-SemiBold',
                }}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
              >
                {label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
