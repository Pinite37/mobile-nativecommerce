import { router } from "expo-router";
import React from "react";

import ProductSearchScreen from "../../../components/search/ProductSearchScreen";

/** Recherche, espace client. L'écran est partagé ; seul le chemin produit change. */
export default function ClientSearch() {
  return (
    <ProductSearchScreen
      ouvrirProduit={(id) => router.push(`/(app)/(client)/product/${id}`)}
      demanderConnexion={() => router.push("/(auth)/signin")}
    />
  );
}
