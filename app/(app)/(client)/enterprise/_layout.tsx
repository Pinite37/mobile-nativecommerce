import { Stack } from "expo-router";

export default function ClientEnterpriseStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
          animation: 'slide_from_right'
        }}
      />
    </Stack>
  );
}
