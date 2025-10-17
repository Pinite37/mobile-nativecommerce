import { Stack } from "expo-router";

export default function ClientLayout() {
  return (
    <Stack
      screenOptions={{
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