import { LocaleProvider } from "@/contexts/LocaleContext";
import { PreferencesSync } from "@/contexts/PreferencesSync";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import Notifications from "@/services/notificationsModule";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { ToastProvider as ReanimatedToastProvider } from "../components/ui/ReanimatedToast/toast-provider";
import { AuthProvider } from "../contexts/AuthContext";
import { SocketProvider } from "../contexts/SocketContext";
import "./globals.css";

// Désactiver l'overlay LogBox (erreurs toujours visibles dans la console Metro)
LogBox.ignoreAllLogs();

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
    "Poppins-Regular": require("@expo-google-fonts/poppins/400Regular/Poppins_400Regular.ttf"),
    "Poppins-Medium": require("@expo-google-fonts/poppins/500Medium/Poppins_500Medium.ttf"),
    "Poppins-SemiBold": require("@expo-google-fonts/poppins/600SemiBold/Poppins_600SemiBold.ttf"),
    "Poppins-Bold": require("@expo-google-fonts/poppins/700Bold/Poppins_700Bold.ttf"),
    "Poppins-Light": require("@expo-google-fonts/poppins/300Light/Poppins_300Light.ttf"),
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
                  {/* En-tête natif désactivé pour TOUT le segment : chaque écran
                      porte son propre AppHeader. Réglé ici plutôt qu'écran par
                      écran — sinon toute page ajoutée ensuite hérite du header
                      par défaut d'Expo Router et se retrouve avec deux bandeaux. */}
                  <Stack screenOptions={{ headerShown: false }}>
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
