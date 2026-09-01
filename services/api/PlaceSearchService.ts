/**
 * Recherche de lieux — pharmacies, maquis, bureaux, rues, quartiers.
 *
 * Photon (photon.komoot.io) plutôt que Nominatim ou un service payant :
 *  · même source de données qu'OpenFreeMap, qui fournit nos tuiles — ce que
 *    l'utilisateur cherche est exactement ce qu'il voit affiché sur la carte ;
 *  · conçu pour la saisie au fil de la frappe, là où la politique d'usage de
 *    Nominatim décourage les requêtes systématiques d'une app en production ;
 *  · gratuit et sans clé, cohérent avec le choix d'OpenFreeMap fait pour
 *    éviter la facturation Google Maps.
 *
 * La recherche est un ACCÉLÉRATEUR, jamais un passage obligé : toute panne
 * (réseau, service indisponible, zone mal couverte) doit laisser le
 * placement manuel de l'épingle parfaitement fonctionnel.
 */

const PHOTON_URL = 'https://photon.komoot.io/api/';

// Sans cette emprise, « Ganhi » remonte aussi un homonyme au Liberia.
const BENIN_BBOX = '0.77,6.20,3.85,12.42';

const REQUEST_TIMEOUT_MS = 8000;

export interface PlaceResult {
  id: string;
  /** Ce qu'on cherchait : « Pharmacie Ganhi », « Maquis Bar Djembè » */
  name: string;
  /** Où c'est : « Avenue de la République, Cotonou » */
  context: string;
  coordinates: [number, number]; // [longitude, latitude]
  /** Depuis le centre courant de la carte. `null` si non calculable. */
  distanceKm: number | null;
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function buildLabels(p: Record<string, any>): { name: string; context: string } {
  const streetLine = [p.housenumber, p.street].filter(Boolean).join(' ');

  // Un résultat de rue n'a pas de `name` : la rue EST le nom.
  const name = p.name || streetLine || p.city || p.district || 'Lieu';

  const parts: string[] = [];
  if (p.name && streetLine) parts.push(streetLine);
  if (p.district && p.district !== p.city) parts.push(p.district);
  if (p.city) parts.push(p.city);
  if (parts.length === 0 && p.state) parts.push(p.state);

  // Ne jamais répéter le nom dans le contexte.
  const context = parts.filter((v, i) => v !== name && parts.indexOf(v) === i).join(', ');

  return { name, context };
}

class PlaceSearchService {
  /**
   * @param query      texte saisi
   * @param near       centre courant de la carte, pour remonter le proche d'abord
   * @param signal     permet d'annuler une requête devenue obsolète
   */
  async search(
    query: string,
    near: [number, number],
    signal?: AbortSignal
  ): Promise<PlaceResult[]> {
    const q = query.trim();
    if (q.length < 3) return [];

    // Double sécurité : le signal de l'appelant (frappe suivante) ET un
    // délai maximal, pour qu'une requête pendante ne bloque jamais l'UI.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort);

    try {
      const url =
        `${PHOTON_URL}?q=${encodeURIComponent(q)}` +
        `&lat=${near[1]}&lon=${near[0]}` +
        `&bbox=${BENIN_BBOX}` +
        `&limit=6&lang=fr`;

      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) return [];

      const data = await response.json();
      const features: any[] = Array.isArray(data?.features) ? data.features : [];

      return features
        .map((f, i) => {
          const coords = f?.geometry?.coordinates;
          if (!Array.isArray(coords) || coords.length !== 2) return null;
          const coordinates: [number, number] = [coords[0], coords[1]];
          const p = f.properties || {};
          const { name, context } = buildLabels(p);
          return {
            id: `${p.osm_type ?? 'x'}${p.osm_id ?? i}`,
            name,
            context,
            coordinates,
            distanceKm: haversineKm(near, coordinates),
          } as PlaceResult;
        })
        .filter((r): r is PlaceResult => r !== null);
    } catch {
      // Réseau coupé, service indisponible, requête annulée : silencieux.
      // Le placement manuel de l'épingle reste entièrement fonctionnel.
      return [];
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  /** « 850 m », « 2,4 km », « 58 km » — le biais de proximité de Photon est
   *  doux, pas strict : afficher la distance évite de piéger l'utilisateur
   *  avec un résultat homonyme à l'autre bout du pays. */
  formatDistance(km: number | null): string {
    if (km === null || isNaN(km)) return '';
    if (km < 1) return `${Math.round(km * 1000)} m`;
    if (km < 10) return `${km.toFixed(1).replace('.', ',')} km`;
    return `${Math.round(km)} km`;
  }
}

export default new PlaceSearchService();
