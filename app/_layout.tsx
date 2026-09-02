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
import { KeyboardProvider } from "react-native-keyboard-controller";
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
    // Plus Jakarta Sans, chargée sous son vrai nom. Les migrations
    // précédentes (Quicksand → Poppins) avaient conservé les anciens noms
    // en alias : `fontFamily: "Quicksand-Bold"` rendait en réalité du
    // Poppins. Deux noms pour une police, personne ne s'y retrouvait — les
    // alias sont supprimés, il ne reste qu'une famille.
    "PlusJakartaSans-Light": require("@expo-google-fonts/plus-jakarta-sans/300Light/PlusJakartaSans_300Light.ttf"),
    "PlusJakartaSans-Regular": require("@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf"),
    "PlusJakartaSans-Medium": require("@expo-google-fonts/plus-jakarta-sans/500Medium/PlusJakartaSans_500Medium.ttf"),
    "PlusJakartaSans-SemiBold": require("@expo-google-fonts/plus-jakarta-sans/600SemiBold/PlusJakartaSans_600SemiBold.ttf"),
    "PlusJakartaSans-Bold": require("@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf"),
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
    // KeyboardProvider doit envelopper toute l'app : sans lui, les
    // KeyboardAwareScrollView de react-native-keyboard-controller — déjà
    // utilisés dans huit écrans — ne reçoivent aucun événement clavier et
    // restent silencieusement inertes.
    <KeyboardProvider>
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
    </KeyboardProvider>
  );
}
