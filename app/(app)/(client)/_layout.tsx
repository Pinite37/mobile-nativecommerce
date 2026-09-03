import { Stack } from "expo-router";
import { STACK_ANIMATION } from "../../../theme/navigation";

export default function ClientLayout() {
  return (
    <Stack
      screenOptions={{
        ...STACK_ANIMATION,
        headerShown: false, // Ensure all headers are hidden by default
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="product" 
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="category/[categoryId]" 
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="enterprise" 
        options={{ 
          headerShown: false,
          presentation: 'card'
        }} 
      />
    </Stack>
  );
}