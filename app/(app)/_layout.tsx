import { Stack } from "expo-router";

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="(client)"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(enterprise)"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
