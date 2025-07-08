import { Stack } from "expo-router";

export default function EnterpriseLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="(tabs)" 
        options={{ 
          headerShown: false 
        }} 
      />
    </Stack>
  );
}
