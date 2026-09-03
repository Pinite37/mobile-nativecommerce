import { Stack } from 'expo-router';
import { STACK_ANIMATION } from "../../../../theme/navigation";

export default function AdvertisementLayout() {
  return (
    <Stack
      screenOptions={{
        ...STACK_ANIMATION,
        headerShown: false,
      }}
    />
  );
}