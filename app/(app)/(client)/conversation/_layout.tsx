import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../../../contexts/AuthContext";

export default function ConversationLayout() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/signin" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "white" },
      }}
    >
      <Stack.Screen
        name="[conversationId]"
        options={{
          headerShown: false,
          title: "",
        }}
      />
    </Stack>
  );
}
