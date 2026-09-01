import { router, useRootNavigationState } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, View } from "react-native";
import { useAuth } from "../contexts/AuthContext";
import OnboardingService from "../services/OnboardingService";
import { NavigationHelper } from "../utils/NavigationHelper";
import StartupPerformanceMonitor from "../utils/StartupPerformanceMonitor";

export default function Index() {
  const { isAuthenticated, user, userRole, isLoading } = useAuth();
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const navigationState = useRootNavigationState();

  // Check onboarding status on mount
  useEffect(() => {
    const checkOnboarding = async () => {
      const completed = await OnboardingService.hasCompletedOnboarding();
      setOnboardingCompleted(completed);
      setHasCheckedOnboarding(true);
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    StartupPerformanceMonitor.mark("App Index - useEffect déclenché");

    // Wait for navigator to be ready (prevents crash during hot reload)
    if (!navigationState?.key) return;

    // Wait for both auth and onboarding checks to complete
    if (isLoading || !hasCheckedOnboarding) {
      return;
    }

    StartupPerformanceMonitor.mark("App Index - Auth check terminé");

    // Navigation logic based on auth and onboarding state
    if (isAuthenticated && userRole) {
      // Check if email is verified
      if (user && user.emailVerified === false) {
        console.log(
          "📧 Email non vérifié au démarrage, redirection vers vérification OTP",
        );
        router.replace("/(auth)/verify-email");
        return;
      }
      StartupPerformanceMonitor.mark("App Index - Navigation vers app");
      // User is authenticated, redirect to role-based home
      NavigationHelper.navigateToRoleHome(userRole);
    } else if (!onboardingCompleted) {
      StartupPerformanceMonitor.mark("App Index - Navigation vers onboarding");
      // User is not authenticated and hasn't seen onboarding
      NavigationHelper.navigateToOnboarding();
    } else {
      StartupPerformanceMonitor.mark(
        "App Index - Navigation vers marketplace public",
      );
      // User is not authenticated but has seen onboarding: open marketplace in guest mode
      NavigationHelper.navigateToPublicMarketplace();
    }

    // Log final report
    setTimeout(() => {
      StartupPerformanceMonitor.logReport();
    }, 1000);
  }, [
    navigationState?.key,
    isAuthenticated,
    user,
    userRole,
    isLoading,
    hasCheckedOnboarding,
    onboardingCompleted,
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={require('../assets/images/axi-logo.png')}
        style={{ width: 140, height: 140, resizeMode: 'contain', marginBottom: 40 }}
      />
      <ActivityIndicator size="large" color="#10B981" />
    </View>
  );
}
