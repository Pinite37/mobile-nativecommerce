import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabBarIconWithBadge } from "../../../../components/ui/TabBarIconWithBadge";
import { useUnreadNotifications } from "../../../../hooks/useUnreadNotifications";

export default function TabsLayout() {
  const { unreadCount } = useUnreadNotifications();
  const insets = useSafeAreaInsets();

  // Calcul dynamique pour tenir compte des barres de navigation Android / iOS
  const baseHeight = 72; // hauteur visuelle de base du tab bar (sans inset)
  const dynamicHeight = baseHeight + insets.bottom; // on ajoute l'inset réel
  const dynamicPaddingBottom = 16 + Math.min(insets.bottom, 24); // conserver un bon touch area sans exagérer

  const NotificationIcon = ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <TabBarIconWithBadge
      name="notifications"
      color={color}
      size={focused ? size + 2 : size}
      focused={focused}
      badgeCount={unreadCount}
    />
  );

  const CustomTabBarButton = (props: any) => (
    <TouchableOpacity {...props} activeOpacity={1} />
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#10B981",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 12,
          paddingTop: 16,
          paddingBottom: dynamicPaddingBottom,
          paddingHorizontal: 12,
          height: dynamicHeight,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "Quicksand-SemiBold",
          marginTop: 6,
          marginBottom: 2,
          lineHeight: 13,
        },
        tabBarItemStyle: {
          paddingTop: 10,
          paddingBottom: 6,
          marginHorizontal: 4,
          borderRadius: 16,
          height: 62,
          alignItems: 'center',
          justifyContent: 'center',
        },
        tabBarIconStyle: {
          marginBottom: 4,
        },
        headerStyle: {
          backgroundColor: "#FFFFFF",
          shadowColor: "transparent",
        },
        headerTitleStyle: {
          fontSize: 18,
          fontFamily: "Quicksand-SemiBold",
          color: "#1F2937",
        },
        tabBarButton: CustomTabBarButton,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Board",
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "analytics" : "analytics-outline"} 
              size={focused ? 26 : 24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Produits",
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "cube" : "cube-outline"} 
              size={focused ? 26 : 24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favoris",
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "heart" : "heart-outline"} 
              size={focused ? 26 : 24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "chatbubbles" : "chatbubbles-outline"} 
              size={focused ? 26 : 24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          headerShown: false,
          tabBarIcon: NotificationIcon,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "person" : "person-outline"} 
              size={focused ? 26 : 24} 
              color={color} 
            />
          ),
        }}
      />
      {/* Pages cachées */}
      <Tabs.Screen
        name="marketplace"
        options={{
          href: null, // Cache cet onglet
        }}
      />
      <Tabs.Screen
        name="product"
        options={{
          href: null, // Cache cet onglet
          headerShown: false, // Assure que le header est caché
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          href: null, // Cache cet onglet
        }}
      />
      <Tabs.Screen
        name="deliveries"
        options={{
          href: null, // Cache cet onglet
        }}
      />
      <Tabs.Screen
        name="enterprise"
        options={{
          href: null, // Cache cet onglet
        }}
      />
      <Tabs.Screen
        name="enterprise/[id]"
        options={{
          href: null, // Cache la route dynamique enterprise/[id]
        }}
      />
      <Tabs.Screen
        name="notifications/index"
        options={{
          href: null, // Cache cette route spécifique
        }}
      />
    </Tabs>
  );
}
     