import { Stack } from "expo-router";
import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";

export default function AppLayout() {
  const { isAuthenticated, userRole, redirectToRoleBasedHome } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      // User is not authenticated, this should not happen
      // but redirect to auth as a fallback
      redirectToRoleBasedHome(); // This will redirect to auth if no role
      return;
    }

    if (userRole) {
      // User is authenticated with a role
      console.log('User authenticated with role:', userRole);
    }
  }, [isAuthenticated, userRole, redirectToRoleBasedHome]);

  return (
    <Stack>
      <Stack.Screen 
        name="(client)" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="(enterprise)" 
        options={{ 
          headerShown: false,
        }} 
      />
    </Stack>
  );
}
