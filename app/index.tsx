import { router } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { LoadingOverlay } from "../components/ui/LoadingOverlay";
import { useAuth } from "../contexts/AuthContext";
import OnboardingService from "../services/OnboardingService";
import { NavigationHelper } from "../utils/NavigationHelper";
import StartupPerformanceMonitor from "../utils/StartupPerformanceMonitor";

export default function Index() {
  const { isAuthenticated, user, userRole, isLoading } = useAuth();
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

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
        router.replace("/(auth)/verify-email" as any);
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
      StartupPerformanceMonitor.mark("App Index - Navigation vers welcome");
      // User is not authenticated but has seen onboarding
      NavigationHelper.navigateToAuth();
    }

    // Log final report
    setTimeout(() => {
      StartupPerformanceMonitor.logReport();
    }, 1000);
  }, [
    isAuthenticated,
    user,
    userRole,
    isLoading,
    hasCheckedOnboarding,
    onboardingCompleted,
  ]);

  return (
    <View className="flex-1 bg-white">
      <LoadingOverlay
        isLoading={isLoading || !hasCheckedOnboarding}
        message="Démarrage rapide..."
        showSlowWarning={false} // Désactivé pour éviter le spam
        slowWarningDelay={5000} // Augmenté à 5s si réactivé
      />
    </View>
  );
}
