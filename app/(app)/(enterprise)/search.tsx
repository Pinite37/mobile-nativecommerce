import { router } from "expo-router";
import React from "react";

import ProductSearchScreen from "../../../components/search/ProductSearchScreen";

/**
 * Recherche, espace entreprise.
 *
 * Une entreprise est toujours connectée quand elle atteint cet écran : pas de
 * `demanderConnexion` à fournir. Les fiches produit s'ouvrent sur la route de
 * son propre espace, pas sur celle du client.
 */
export default function EnterpriseSearch() {
  return (
    <ProductSearchScreen
      ouvrirProduit={(id) => router.push(`/(app)/(enterprise)/product/${id}`)}
    />
  );
}
