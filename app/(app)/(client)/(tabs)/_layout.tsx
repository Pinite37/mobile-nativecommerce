import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Réimportons le CustomTabBar maintenant que le menu s'affiche correctement
import { CustomTabBar } from "../../../../components/ui/CustomTabBar";
import { TabBarIconWithBadge } from "../../../../components/ui/TabBarIconWithBadge";
import { useAuth } from "../../../../contexts/AuthContext";
import { useUnreadMessages } from "../../../../hooks/useUnreadMessages";

export default function ClientTabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { unreadConversationCount } = useUnreadMessages();

  const protectTab = (event: any) => {
    if (isAuthenticated) return;
    event.preventDefault();
    router.push("/(auth)/signin");
  };

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

  const bottomMargin = Math.max(insets.bottom + 6, 22);
  const tabBarTotalHeight = 60 + bottomMargin;

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} insets={insets} />}
      initialRouteName="index"
      sceneContainerStyle={{ paddingBottom: tabBarTotalHeight }}
      screenOptions={{
        tabBarActiveTintColor: "#10B981",
        tabBarInactiveTintColor: "#9CA3AF",
        headerShown: false,
        tabBarLabelStyle: {
          fontFamily: "Quicksand-SemiBold",
          fontSize: 12,
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
          headerShown: false,
          tabBarLabelStyle: {
            fontFamily: "Quicksand-SemiBold",
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
            fontFamily: "Quicksand-SemiBold",
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
        listeners={{
          tabPress: protectTab,
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          headerShown: false,
          tabBarIcon: MessagesIcon,
        }}
        listeners={{
          tabPress: protectTab,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          headerShown: false,
          tabBarLabelStyle: {
            fontFamily: "Quicksand-SemiBold",
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
        listeners={{
          tabPress: protectTab,
        }}
      />
    </Tabs>
  );
}
