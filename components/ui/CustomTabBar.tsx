import { useTheme } from "@/contexts/ThemeContext";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { Platform, Pressable, View, useWindowDimensions } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { EdgeInsets, useSafeAreaInsets } from "react-native-safe-area-context";

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  insets?: EdgeInsets;
}

interface TabItemProps {
  route: any;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  options: any;
  baseIcon: number;
  isDark: boolean;
  colors: any;
}

// ─── Tab item individuel avec ses propres animations ──────────────────────────
const TabItem: React.FC<TabItemProps> = React.memo(
  ({ isFocused, onPress, onLongPress, options, baseIcon, isDark }) => {
    // Shared values pour les animations
    const pressScale = useSharedValue(1);
    const activeProgress = useSharedValue(isFocused ? 1 : 0);

    // Anime la pill quand l'état de focus change
    useEffect(() => {
      activeProgress.value = withSpring(isFocused ? 1 : 0, {
        damping: 14,
        stiffness: 380,
        mass: 0.7,
      });
    }, [isFocused]);

    // Squeeze léger au press-in
    const handlePressIn = () => {
      pressScale.value = withSpring(0.88, { damping: 8, stiffness: 500 });
    };

    // Retour doux au press-out
    const handlePressOut = () => {
      pressScale.value = withSpring(1, { damping: 10, stiffness: 300 });
    };

    // Style animé de l'icône (scale)
    const iconAnimStyle = useAnimatedStyle(() => ({
      transform: [{ scale: pressScale.value }],
    }));

    // Style animé de la pill de fond (apparaît/disparaît avec overshoot)
    const pillStyle = useAnimatedStyle(() => ({
      opacity: interpolate(activeProgress.value, [0, 0.4, 1], [0, 0.6, 1]),
      transform: [
        {
          scaleX: interpolate(
            activeProgress.value,
            [0, 0.55, 1],
            [0.2, 1.12, 1]
          ),
        },
        {
          scaleY: interpolate(
            activeProgress.value,
            [0, 0.55, 1],
            [0.4, 1.08, 1]
          ),
        },
      ],
    }));

    const IconComponent = options.tabBarIcon;
    const iconColor = isFocused
      ? "#10B981"
      : isDark
        ? "rgba(255,255,255,0.38)"
        : "rgba(20,20,20,0.35)";

    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          paddingBottom: 4,
        }}
      >
        {/* Pill de fond animée */}
        <Animated.View
          style={[
            pillStyle,
            {
              position: "absolute",
              width: 54,
              height: 38,
              borderRadius: 19,
              backgroundColor: isDark
                ? "rgba(16,185,129,0.17)"
                : "rgba(16,185,129,0.11)",
            },
          ]}
        />

        {/* Icône avec animation de scale */}
        <Animated.View style={iconAnimStyle}>
          {!!IconComponent &&
            IconComponent({
              color: iconColor,
              size: baseIcon,
              focused: isFocused,
            })}
        </Animated.View>

      </Pressable>
    );
  }
);

// ─── Contenu de la barre (partagé iOS / Android) ─────────────────────────────
function TabBarContent({
  routes,
  currentRouteKey,
  descriptors,
  navigation,
  barHeight,
  baseIcon,
  isDark,
  colors,
}: {
  routes: any[];
  currentRouteKey: string;
  descriptors: any;
  navigation: any;
  barHeight: number;
  baseIcon: number;
  isDark: boolean;
  colors: any;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        height: barHeight,
        paddingHorizontal: 6,
      }}
    >
      {routes.map((route: any) => {
        const { options } = descriptors[route.key];
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
          navigation.emit({ type: "tabLongPress", target: route.key });
        };

        return (
          <TabItem
            key={route.key}
            route={route}
            isFocused={isFocused}
            onPress={onPress}
            onLongPress={onLongPress}
            options={options}
            baseIcon={baseIcon}
            isDark={isDark}
            colors={colors}
          />
        );
      })}
    </View>
  );
}

// ─── CustomTabBar principal ───────────────────────────────────────────────────
export const CustomTabBar: React.FC<TabBarProps> = ({
  state,
  descriptors,
  navigation,
  insets,
}) => {
  const { colors, isDark } = useTheme();
  const defaultInsets = useSafeAreaInsets();
  const safeInsets = insets || defaultInsets;
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const bottomMargin = Math.max(safeInsets.bottom + 6, 22);
  const barHeight = isTablet ? 68 : 60;
  const baseIcon = isTablet ? 24 : 22;

  const currentIndex = typeof state?.index === "number" ? state.index : 0;
  const currentRouteKey = state?.routes?.[currentIndex]?.key;
  const focusedOptions = currentRouteKey
    ? descriptors[currentRouteKey]?.options || {}
    : {};

  if (focusedOptions.tabBarStyle?.display === "none") return null;

  const routes = (state?.routes ?? []).filter((route: any) => {
    const options = descriptors[route.key]?.options || {};
    if (options.href === null) return false;
    if (options.tabBarButton === null) return false;
    if (options.tabBarItemStyle?.display === "none") return false;
    return true;
  });

  const sharedContent = (
    <TabBarContent
      routes={routes}
      currentRouteKey={currentRouteKey}
      descriptors={descriptors}
      navigation={navigation}
      barHeight={barHeight}
      baseIcon={baseIcon}
      isDark={isDark}
      colors={colors}
    />
  );

  // ─── iOS : Liquid Glass ─────────────────────────────────────────────────────
  if (Platform.OS === "ios") {
    return (
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          bottom: bottomMargin,
          left: 20,
          right: 20,
          zIndex: 100,
          borderRadius: 36,
          // Ombre verte douce en mode clair, noire en mode sombre
          shadowColor: isDark ? "#000" : "#047857",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.45 : 0.14,
          shadowRadius: 22,
        }}
      >
        {/* BlurView — intensité max pour un vrai effet liquide */}
        <BlurView
          intensity={98}
          tint={isDark ? "systemUltraThinMaterialDark" : "systemUltraThinMaterialLight"}
          style={{ borderRadius: 36, overflow: "hidden" }}
        >
          {/* Overlay quasi-transparent — juste une légère teinte */}
          <View
            style={{
              backgroundColor: isDark
                ? "rgba(10,10,10,0.08)"
                : "rgba(255,255,255,0.12)",
              borderRadius: 36,
              borderWidth: 1,
              borderColor: isDark
                ? "rgba(255,255,255,0.12)"
                : "rgba(255,255,255,0.92)",
              overflow: "hidden",
            }}
          >
            {/* Surbrillance spéculaire forte — donne la profondeur du verre */}
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "50%",
                borderTopLeftRadius: 36,
                borderTopRightRadius: 36,
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={
                  isDark
                    ? ["rgba(255,255,255,0.09)", "rgba(255,255,255,0)"]
                    : ["rgba(255,255,255,0.82)", "rgba(255,255,255,0)"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ flex: 1 }}
              />
            </View>

            {sharedContent}
          </View>
        </BlurView>
      </View>
    );
  }

  // ─── Android : Glassmorphisme ───────────────────────────────────────────────
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        bottom: bottomMargin,
        left: 20,
        right: 20,
        zIndex: 100,
        borderRadius: 36,
        elevation: 18,
        // Ombre simulée Android via elevation + couleur
        shadowColor: isDark ? "#000" : "#047857",
      }}
    >
      <View
        style={{
          borderRadius: 36,
          // Fond semi-transparent pour le glassmorphisme
          backgroundColor: isDark
            ? "rgba(16,16,16,0.91)"
            : "rgba(252,252,252,0.93)",
          borderWidth: 1,
          borderColor: isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(255,255,255,0.68)",
          overflow: "hidden",
        }}
      >
        {/* Dégradé simulant la réflexion de surface */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "50%",
            borderTopLeftRadius: 36,
            borderTopRightRadius: 36,
            overflow: "hidden",
          }}
        >
          <LinearGradient
            colors={
              isDark
                ? ["rgba(255,255,255,0.04)", "rgba(255,255,255,0)"]
                : ["rgba(255,255,255,0.65)", "rgba(255,255,255,0)"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
          />
        </View>

        {sharedContent}
      </View>
    </View>
  );
};
