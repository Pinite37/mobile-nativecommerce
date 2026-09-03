import { Redirect, Stack } from "expo-router";
import { useAuth } from "../../../../../contexts/AuthContext";
import { STACK_ANIMATION } from "../../../../../theme/navigation";

export default function MessagesLayout() {
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
        ...STACK_ANIMATION,
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Messages",
        }}
      />
    </Stack>
  );
}
