import { Stack } from "expo-router";
import { STACK_ANIMATION } from "../../../../../theme/navigation";

export default function ProductsLayout() {
  return (
    <Stack
      screenOptions={{
        ...STACK_ANIMATION,
        headerShown: false,
        animation: "slide_from_right",
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
