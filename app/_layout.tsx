import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ToastProvider as ReanimatedToastProvider } from "../components/ui/ReanimatedToast/toast-provider";
import { ToastManager } from "../components/ui/ToastManager";
import { AuthProvider } from "../contexts/AuthContext";
import { SocketProvider } from "../contexts/SocketContext";
import "./globals.css";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    "Quicksand-Regular": require("../assets/fonts/Quicksand-Regular.ttf"),
    "Quicksand-Bold": require("../assets/fonts/Quicksand-Bold.ttf"),
    "Quicksand-SemiBold": require("../assets/fonts/Quicksand-SemiBold.ttf"),
    "Quicksand-Medium": require("../assets/fonts/Quicksand-Medium.ttf"),
    "Quicksand-Light": require("../assets/fonts/Quicksand-Light.ttf"),
  });

  useEffect(() => {
    // Optimisation : Cacher le splash screen immédiatement pour un démarrage ultra-rapide
    if (loaded || error) {
      // Pas de délai pour un démarrage instantané
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // Optimisation : Ne pas bloquer si les fonts ne sont pas encore chargées
  // Laisser l'app démarrer avec les fonts système par défaut
  if (!loaded && !error) {
    return null;
  }

  return (
    <AuthProvider>
      <SocketProvider>
        <ReanimatedToastProvider>
          <ToastManager>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(app)" options={{ headerShown: false }} />
          </Stack>
          </ToastManager>
        </ReanimatedToastProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
