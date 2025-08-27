import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

// Réimportons le CustomTabBar maintenant que le menu s'affiche correctement
import { CustomTabBar } from "../../../../components/ui/CustomTabBar";

export default function ClientTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      initialRouteName="favorites"
      screenOptions={{
        tabBarActiveTintColor: "#FE8C00",
        tabBarInactiveTintColor: "#9CA3AF",
        headerShown: false, // Ensure all headers are hidden by default
        tabBarLabelStyle: {
          fontFamily: 'Quicksand-SemiBold',
          fontSize: 12,
          marginBottom: 4,
        },
        tabBarStyle: {
          display: 'flex', // Make sure it's visible
          position: 'absolute', // Make sure it stays at the bottom
          bottom: 0,
          left: 0,
          right: 0,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          backgroundColor: '#FFFFFF',
          height: 70,
          borderTopRightRadius: 25,
          borderTopLeftRadius: 25,
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
          headerShown: false,
          tabBarLabelStyle: {
            fontFamily: 'Quicksand-SemiBold',
            fontSize: 12,
          },
          tabBarIcon: ({ color, focused }) => (
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
          title: "Rechercher",
          headerShown: false,
          tabBarLabelStyle: {
            fontFamily: 'Quicksand-SemiBold',
            fontSize: 12,
          },
          tabBarIcon: ({ color, focused }) => (
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
          headerShown: false,
          tabBarLabelStyle: {
            fontFamily: 'Quicksand-SemiBold',
            fontSize: 12,
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "heart" : "heart-outline"} 
              size={focused ? 26 : 24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Panier",
          headerShown: false,
          tabBarLabelStyle: {
            fontFamily: 'Quicksand-SemiBold',
            fontSize: 12,
          },
          tabBarIcon: ({ color, focused }) => (
            <Ionicons 
              name={focused ? "cart" : "cart-outline"} 
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
        name="profile"
        options={{
          title: "Profil",
          headerShown: false,
          tabBarLabelStyle: {
            fontFamily: 'Quicksand-SemiBold',
            fontSize: 12,
          },
          tabBarIcon: ({ color, focused }) => (
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