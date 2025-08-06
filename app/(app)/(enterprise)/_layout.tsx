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
      <Stack.Screen
        name="profile/settings"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="profile/help"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="profile/info"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(tabs)/enterprise/[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="conversation"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
