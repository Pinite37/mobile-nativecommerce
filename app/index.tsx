import { useEffect } from "react";
import { View } from "react-native";
import { LoadingOverlay } from "../components/ui/LoadingOverlay";
import { useAuth } from "../contexts/AuthContext";
import { NavigationHelper } from "../utils/NavigationHelper";
import StartupPerformanceMonitor from "../utils/StartupPerformanceMonitor";

export default function Index() {
  const { isAuthenticated, userRole, isLoading } = useAuth();

  useEffect(() => {
    StartupPerformanceMonitor.mark('App Index - useEffect déclenché');
    
    if (isLoading) {
      return; // Wait for auth check to complete
    }

    StartupPerformanceMonitor.mark('App Index - Auth check terminé');

    // Navigation immédiate sans délai pour un démarrage ultra-rapide
    if (isAuthenticated && userRole) {
      StartupPerformanceMonitor.mark('App Index - Navigation vers app');
      // User is authenticated, redirect to role-based home
      NavigationHelper.navigateToRoleHome(userRole);
    } else {
      StartupPerformanceMonitor.mark('App Index - Navigation vers onboarding');
      // User is not authenticated, start with onboarding
      NavigationHelper.navigateToOnboarding();
    }
    
    // Log final report
    setTimeout(() => {
      StartupPerformanceMonitor.logReport();
    }, 1000);
  }, [isAuthenticated, userRole, isLoading]);

  return (
    <View className="flex-1 bg-white">
      <LoadingOverlay 
        isLoading={isLoading}
        message="Démarrage rapide..."
        showSlowWarning={false} // Désactivé pour éviter le spam
        slowWarningDelay={5000} // Augmenté à 5s si réactivé
      />
    </View>
  );
}
