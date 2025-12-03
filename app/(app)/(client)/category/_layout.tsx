import { Stack } from "expo-router";

export default function CategoryLayout() {
  return (
    <Stack
      screenOptions={{
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
