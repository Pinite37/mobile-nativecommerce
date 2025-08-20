import { Stack } from "expo-router";

export default function ConversationLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'white' },
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
