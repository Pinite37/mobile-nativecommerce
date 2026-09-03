import { Stack } from "expo-router";
import { STACK_ANIMATION } from "../../../../theme/navigation";

export default function CategoryLayout() {
  return (
    <Stack
      screenOptions={{
        ...STACK_ANIMATION,
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="[categoryId]" 
        options={{
          headerShown: false,
          title: "",
        }}
      />
    </Stack>
  );
}
