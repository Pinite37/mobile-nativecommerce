/**
 * Extraction du vrai motif d'un échec d'API.
 *
 * Pourquoi ce fichier : sur une erreur HTTP, axios remplit `error.message`
 * avec « Request failed with status code 400 ». Or presque tout le code
 * affiche `e.message`. L'utilisateur voyait donc « échec, erreur 400 » alors
 * que le serveur avait renvoyé « Le titre doit contenir au moins 5
 * caractères » dans le corps de la réponse.
 *
 * L'enrichissement se fait dans l'intercepteur, une seule fois : tous les
 * appels existants qui lisent `e.message` affichent aussitôt la bonne raison,
 * sans avoir à être modifiés un par un.
 */

/** Une erreur de champ telle que le serveur la renvoie. */
export type ErreurChamp = {
  field?: string;
  message: string;
  code?: string;
};

/** Nombre d'erreurs listées avant de résumer — au-delà, une bulle devient illisible. */
const MAX_DETAILS = 4;

/**
 * Compose un message lisible à partir de la réponse du serveur.
 * L'ordre reflète la précision décroissante de l'information.
 */
export function messageDErreur(error: any, secours = "Une erreur est survenue"): string {
  const data = error?.response?.data;

  // 1. Erreurs de validation détaillées, champ par champ.
  const champs: ErreurChamp[] = Array.isArray(data?.errors) ? data.errors : [];
  const textes = champs
    .map((e) => (typeof e?.message === "string" ? e.message.trim() : ""))
    .filter(Boolean);

  if (textes.length === 1) return textes[0];
  if (textes.length > 1) {
    if (textes.length > MAX_DETAILS) {
      const restant = textes.length - MAX_DETAILS;
      return (
        textes.slice(0, MAX_DETAILS).map((t) => `• ${t}`).join("\n") +
        `\n• et ${restant} autre${restant > 1 ? "s" : ""} problème${restant > 1 ? "s" : ""}`
      );
    }
    return textes.map((t) => `• ${t}`).join("\n");
  }

  // 2. Message du serveur.
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message.trim();
  }

  // 3. Panne réseau : distinguer « pas de connexion » d'une erreur applicative,
  //    parce que la conduite à tenir n'est pas la même pour l'utilisateur.
  if (!error?.response) {
    const code = error?.code;
    if (code === "ECONNABORTED" || /timeout/i.test(error?.message ?? "")) {
      return "Le serveur met trop de temps à répondre. Réessayez.";
    }
    return "Pas de connexion au serveur. Vérifiez votre réseau.";
  }

  // 4. Codes HTTP courants, formulés côté utilisateur.
  const status = error.response.status;
  const parStatut: Record<number, string> = {
    401: "Session expirée. Reconnectez-vous.",
    403: "Vous n'avez pas accès à cette action.",
    404: "Ressource introuvable.",
    409: "Cette action entre en conflit avec l'état actuel.",
    413: "Le fichier envoyé est trop volumineux.",
    429: "Trop de tentatives. Patientez un instant.",
  };
  if (parStatut[status]) return parStatut[status];
  if (status >= 500) return "Le serveur rencontre un problème. Réessayez plus tard.";

  return secours;
}

/** Les erreurs par champ, pour surligner les entrées fautives d'un formulaire. */
export function erreursParChamp(error: any): Record<string, string> {
  const champs: ErreurChamp[] = Array.isArray(error?.response?.data?.errors)
    ? error.response.data.errors
    : [];
  const parChamp: Record<string, string> = {};
  for (const e of champs) {
    if (e?.field && typeof e.message === "string") parChamp[e.field] = e.message;
  }
  return parChamp;
}

/**
 * Remplace `error.message` par le motif réel et attache les erreurs de champ.
 * À appeler au tout début de l'intercepteur d'erreur, avant toute branche.
 */
export function enrichirErreur(error: any): any {
  try {
    error.serverMessage = messageDErreur(error);
    error.fieldErrors = erreursParChamp(error);
    error.message = error.serverMessage;
  } catch {
    // Un échec d'enrichissement ne doit jamais masquer l'erreur d'origine.
  }
  return error;
}
