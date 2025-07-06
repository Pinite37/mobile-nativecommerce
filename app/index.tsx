import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { NavigationHelper } from "../utils/NavigationHelper";

export default function Index() {
  const { isAuthenticated, userRole, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return; // Wait for auth check to complete
    }

    const timer = setTimeout(() => {
      if (isAuthenticated && userRole) {
        // User is authenticated, redirect to role-based home
        NavigationHelper.navigateToRoleHome(userRole);
      } else {
        // User is not authenticated, start with onboarding
        NavigationHelper.navigateToOnboarding();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isAuthenticated, userRole, isLoading]);

  // Show loading indicator while checking authentication
  if (isLoading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#FE8C00" />
      </View>
    );
  }

  return <View className="flex-1 bg-white" />; // Render something while redirecting
}
