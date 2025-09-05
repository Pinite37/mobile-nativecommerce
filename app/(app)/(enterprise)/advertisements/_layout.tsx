import { Stack } from 'expo-router';

export default function AdvertisementsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
    </Stack>
  );
}
