import { Stack } from "expo-router";

import { STACK_ANIMATION } from "../../../../../theme/navigation";

/**
 * Sans ce fichier, expo-router crée une pile implicite avec ses options par
 * défaut : l'animation système d'Android au lieu du glissement horizontal
 * commun au reste de l'app.
 */
export default function ClientProductRequestDeliveryLayout() {
  return <Stack screenOptions={{ ...STACK_ANIMATION, headerShown: false }} />;
}
