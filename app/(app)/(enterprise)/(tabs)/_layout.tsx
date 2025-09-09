import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TabBarIconWithBadge } from "../../../../components/ui/TabBarIconWithBadge";
import { useUnreadNotifications } from "../../../../hooks/useUnreadNotifications";
import { CustomTabBar } from "../../../../components/ui/CustomTabBar";

export default function TabsLayout() {
  const { unreadCount } = useUnreadNotifications();
  const insets = useSafeAreaInsets();

  const NotificationIcon = ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <TabBarIconWithBadge
      name="notifications"
      color={color}
      size={focused ? size + 2 : size}
      focused={focused}
      badgeCount={unreadCount}
    />
  );

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} insets={insets} />}
      screenOptions={{
        tabBarActiveTintColor: "#10B981",
        tabBarInactiveTintColor: "#9CA3AF",
        // Les styles ci-dessous sont moins critiques car la CustomTabBar gère désormais l'affichage
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: "Quicksand-SemiBold",
          marginTop: 6,
          marginBottom: 2,
          lineHeight: 13,
        },
        tabBarIconStyle: {
          marginBottom: 0,
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
     