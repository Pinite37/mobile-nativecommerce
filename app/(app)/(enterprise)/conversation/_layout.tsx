import { Stack } from "expo-router";
import { STACK_ANIMATION } from "../../../../theme/navigation";

export default function ConversationLayout() {
  return (
    <Stack
      screenOptions={{
        ...STACK_ANIMATION,
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="[conversationId]" 
        options={{
          headerShown: false,
          title: "",
        }}
      />
    </Stack>
  );
}
