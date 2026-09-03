import { Stack } from "expo-router";
import { STACK_ANIMATION } from "../../../../../theme/navigation";

export default function MessagesLayout() {
  return (
    <Stack
      screenOptions={{
        ...STACK_ANIMATION,
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{
          title: "Messages"
        }}
      />
    </Stack>
  );
}