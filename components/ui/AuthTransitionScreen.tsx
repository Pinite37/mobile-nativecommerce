import React from "react";
import { ActivityIndicator, Image, View } from "react-native";

/**
 * Écran affiché le temps que la redirection post-authentification se
 * déclenche — quand l'auth est encore en train de se restaurer au
 * démarrage, ou juste après une connexion réussie, le temps qu'un
 * `useEffect` redirige vers l'espace du rôle.
 *
 * Avant, ces écrans faisaient `return null` : les effets s'exécutent après
 * le commit du rendu, donc `isAuthenticated` passait à `true` un rendu
 * AVANT que la redirection ne parte — un flash d'écran blanc, exactement au
 * moment le plus visible, juste après avoir appuyé sur « Se connecter ».
 *
 * Même identité visuelle que la porte d'entrée (`app/index.tsx`), pour que
 * la transition ne change pas de nature selon l'écran qui l'affiche.
 */
export default function AuthTransitionScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
      <Image
        source={require("../../assets/images/axi-logo.png")}
        style={{ width: 140, height: 140, resizeMode: "contain", marginBottom: 40 }}
      />
      <ActivityIndicator size="large" color="#10B981" />
    </View>
  );
}
