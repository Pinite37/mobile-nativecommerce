import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* En-tête natif désactivé pour TOUT le segment : chaque écran
        porte son propre AppHeader. Réglé ici plutôt qu'écran par
        écran — sinon toute page ajoutée ensuite hérite du header
        par défaut d'Expo Router et se retrouve avec deux bandeaux. */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
