import { Stack } from "expo-router";
import { STACK_ANIMATION } from "../../../../theme/navigation";

export default function ClientEnterpriseStackLayout() {
  return (
    <Stack screenOptions={{ ...STACK_ANIMATION, headerShown: false }}>
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
