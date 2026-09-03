import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../contexts/AuthContext";
import ProductService from "../services/api/ProductService";

/**
 * Favoris de l'utilisateur, partagés par tous les écrans.
 *
 * La définition vivait dans l'accueil client. Tout autre écran qui voulait
 * afficher un cœur devait soit la recopier, soit lire la clé `['favorites']`
 * sans `queryFn` — ce que TanStack Query v5 refuse : « No queryFn was passed ».
 *
 * Ici, la requête est définie une fois. Les écrans qui l'appellent partagent
 * le même cache, donc un produit mis en favori depuis la recherche apparaît
 * aussitôt en favori sur l'accueil.
 */

const CLE = ["favorites"] as const;

/** Normalise les formes de réponse rencontrées côté API. */
function versEnsemble(data: unknown): Set<string> {
  const liste = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.data)
      ? (data as any).data
      : [];
  return new Set<string>(
    liste.map((f: any) => f?.product?._id ?? f?._id).filter(Boolean),
  );
}

export function useFavorites() {
  const { isAuthenticated } = useAuth();
  return useQuery<Set<string>>({
    queryKey: CLE,
    enabled: !!isAuthenticated,
    queryFn: async () => versEnsemble(await ProductService.getFavoriteProducts()),
    staleTime: 1000 * 60 * 5,
    initialData: new Set<string>(),
  });
}

/**
 * Bascule un favori, avec mise à jour immédiate du cache.
 *
 * L'écriture optimiste est ce qui rend le cœur instantané ; en cas d'échec on
 * revient à l'état précédent plutôt que de laisser un affichage qui ment.
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, estFavori }: { id: string; estFavori: boolean }) => {
      if (estFavori) await ProductService.removeProductFromFavorites(id);
      else await ProductService.addProductToFavorites(id);
    },
    onMutate: async ({ id, estFavori }) => {
      await queryClient.cancelQueries({ queryKey: CLE });
      const precedent = queryClient.getQueryData<Set<string>>(CLE);
      queryClient.setQueryData<Set<string>>(CLE, (prev = new Set()) => {
        const suivant = new Set(prev);
        if (estFavori) suivant.delete(id);
        else suivant.add(id);
        return suivant;
      });
      return { precedent };
    },
    onError: (_e, _v, contexte) => {
      if (contexte?.precedent) queryClient.setQueryData(CLE, contexte.precedent);
    },
  });
}
