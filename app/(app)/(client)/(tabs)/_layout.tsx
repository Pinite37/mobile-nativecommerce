import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Réimportons le CustomTabBar maintenant que le menu s'affiche correctement
import { CustomTabBar } from "../../../../components/ui/CustomTabBar";
import { TabBarIconWithBadge } from "../../../../components/ui/TabBarIconWithBadge";
import { useUnreadMessages } from "../../../../hooks/useUnreadMessages";

export default function ClientTabsLayout() {
  const insets = useSafeAreaInsets();
  const { unreadConversationCount } = useUnreadMessages();

  const MessagesIcon = ({
    color,
    size,
    focused,
  }: {
    color: string;
    size: number;
    focused: boolean;
  }) => (
    <TabBarIconWithBadge
      name="chatbubbles"
      color={color}
      size={size}
      focused={focused}
      badgeCount={unreadConversationCount}
    />
  );

  // Calcul dynamique pour tenir compte des barres de navigation Android / iOS
  const baseHeight = 70; // hauteur visuelle de base du tab bar (sans inset)
  const dynamicHeight = baseHeight + insets.bottom; // on ajoute l'inset réel
  const dynamicPaddingBottom = 16 + Math.min(insets.bottom, 24); // conserver un bon touch area sans exagérer
  const dynamicPaddingTop = 16; // padding top fixe pour cohérence
  const dynamicPaddingHorizontal = Math.max(12, insets.left + insets.right + 8); // Adaptation aux écrans avec notches

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} insets={insets} />}
      initialRouteName="favorites"
      screenOptions={{
        tabBarActiveTintColor: "#10B981",
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
          height: dynamicHeight,
          borderTopRightRadius: 25,
          borderTopLeftRadius: 25,
          paddingBottom: dynamicPaddingBottom,
          paddingTop: dynamicPaddingTop,
          paddingHorizontal: dynamicPaddingHorizontal,
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
      {/* <Tabs.Screen
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
      /> */}
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
        name="messages"
        options={{
          title: "Messages",
          headerShown: false,
          tabBarIcon: MessagesIcon,
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