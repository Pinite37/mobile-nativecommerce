import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function ClientLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#FE8C00",
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
          paddingBottom: 22,
          paddingHorizontal: 12,
          height: 88,
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
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "home" : "home-outline"} 
              size={focused ? 26 : 24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Chercher",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "search" : "search-outline"} 
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
        name="orders"
        options={{
          title: "Ordres",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "bag" : "bag-outline"} 
              size={focused ? 26 : 24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons 
              name={focused ? "person" : "person-outline"} 
              size={focused ? 26 : 24} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}
