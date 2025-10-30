import { Stack } from "expo-router";
import { SubscriptionProvider } from "../../../contexts/SubscriptionContext";

export default function EnterpriseLayout() {
  return (
    <SubscriptionProvider>
      <Stack>
        <Stack.Screen 
          name="(tabs)" 
          options={{ 
            headerShown: false 
          }} 
        />
        {/* Cache le header pour tout le segment advertisements */}
        <Stack.Screen
          name="advertisements"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="profile/settings"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="profile/help"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="profile/info"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(tabs)/enterprise/[id]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="conversation"
          options={{
            headerShown: false,
          }}
        />
        {/* Cache le header pour les pages delivery-partners */}
        <Stack.Screen
        name="delivery-partners"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="delivery-partners/[partnerId]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="delivery-partners/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(tabs)/offers"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="(tabs)/offers/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="marketplace/index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="my-products/index"
        options={{
          headerShown: false,
        }}
      />
       <Stack.Screen
        name="advertisement/[id]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="category/[categoryId]"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="subscriptions/index"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
    </SubscriptionProvider>
  );
}
