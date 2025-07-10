import { Redirect } from "expo-router";
import React, { useEffect } from "react";

/**
 * Ce fichier redirige simplement vers l'interface d'onglets
 * pour éviter les conflits de routing entre index.tsx et (tabs)/index.tsx
 */
export default function ClientRedirect() {
  // Pour debug - afficher un message temporaire avant la redirection
  useEffect(() => {
    console.log("Redirection vers la page principale client...");
  }, []);

  // Redirection vers la page d'accueil principale (index)
  return <Redirect href="/(app)/(client)/(tabs)" />;
}
