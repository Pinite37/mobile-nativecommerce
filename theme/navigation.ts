import { DarkTheme, DefaultTheme, type Theme } from "expo-router";

import type { Colors } from "./colors";

/**
 * Thème passé au navigateur lui-même.
 *
 * Distinct du thème de l'app : celui-ci peint le conteneur que React
 * Navigation place SOUS les écrans. Sans lui il garde son blanc par défaut,
 * et ce blanc réapparaissait en mode sombre pendant les transitions, sous les
 * pages et au-delà de leur contenu.
 *
 * Il couvre aussi les piles implicites qu'expo-router crée pour les dossiers
 * sans _layout : elles ne reçoivent aucune option de notre part, mais héritent
 * bien de ce thème.
 *
 * `primary` vient de brandPrimary et non de colors.primary : ce dernier vaut
 * #FFFFFF en clair, ce qui donnerait un accent blanc sur fond blanc.
 */
export function buildNavigationTheme(colors: Colors, isDark: boolean): Theme {
  const base = isDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    dark: isDark,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      primary: colors.brandPrimary,
      notification: colors.error,
    },
  };
}

/**
 * Animation commune à toutes les piles.
 *
 * `slide_from_right` impose le même glissement horizontal sur les deux
 * plateformes : la page entre par la droite, et le retour la fait ressortir
 * vers la droite. iOS le faisait déjà, Android appliquait son animation
 * système — différente selon la version, et souvent verticale.
 *
 * Volontairement une constante et non un hook : ces options sont posées dans
 * des layouts qui ont des `return` anticipés (chargement, redirection), où un
 * hook supplémentaire changerait le nombre de hooks entre deux rendus.
 */
export const STACK_ANIMATION = {
  animation: "slide_from_right" as const,
};
