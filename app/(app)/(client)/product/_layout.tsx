import { Stack } from "expo-router";
import { STACK_ANIMATION } from "../../../../theme/navigation";

export default function ProductLayout() {
  return (
    <Stack
      screenOptions={{
        ...STACK_ANIMATION,
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="[id]" 
        options={{
          headerShown: false,
          title: "", // Titre vide
        }}
      />
    </Stack>
  );
}
