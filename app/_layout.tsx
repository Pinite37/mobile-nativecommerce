import { LocaleProvider } from "@/contexts/LocaleContext";
import { PreferencesSync } from "@/contexts/PreferencesSync";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ToastProvider as ReanimatedToastProvider } from "../components/ui/ReanimatedToast/toast-provider";
import { AuthProvider } from "../contexts/AuthContext";
import { SocketProvider } from "../contexts/SocketContext";
import "./globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      retry: 2,
    },
  },
});

// Point unique de configuration — appelé une seule fois au démarrage du module
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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
      SplashScreen.hideAsync().catch(() => {
        // Ignorer l'erreur si le splash screen n'est pas enregistré
      });
    }
  }, [loaded, error]);

  // Optimisation : Ne pas bloquer si les fonts ne sont pas encore chargées
  // Laisser l'app démarrer avec les fonts système par défaut
  if (!loaded && !error) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <ThemeProvider>
          <AuthProvider>
            <PreferencesSync>
              <SocketProvider>
                <ReanimatedToastProvider>
                  <Stack>
                    <Stack.Screen name="index" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="(onboarding)"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="(auth)"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen name="(app)" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="p/[id]"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="+not-found"
                      options={{ headerShown: false }}
                    />
                  </Stack>
                </ReanimatedToastProvider>
              </SocketProvider>
            </PreferencesSync>
          </AuthProvider>
        </ThemeProvider>
      </LocaleProvider>
    </QueryClientProvider>
  );
}
