import { Stack } from "expo-router";
import { STACK_ANIMATION } from "../../theme/navigation";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ ...STACK_ANIMATION, headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="role-selection" />
      <Stack.Screen name="signin" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="enterprise-signup" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
