import * as Location from 'expo-location';

const POSITION_TIMEOUT_MS = 6000;

async function capturePosition(): Promise<[number, number] | null> {
  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), POSITION_TIMEOUT_MS)
      ),
    ]);
    // GeoJSON : [longitude, latitude]
    return [position.coords.longitude, position.coords.latitude];
  } catch {
    return null;
  }
}

/**
 * Capture silencieuse de la position de l'appareil — n'utilise qu'une
 * permission déjà accordée, ne demande jamais. Retourne `null` en silence
 * si indisponible/refusée/en timeout : ne bloque jamais l'appelant.
 */
export async function getSilentPickupCoordinates(): Promise<[number, number] | null> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  return capturePosition();
}

/**
 * Capture de la position de l'appareil pour le point de retrait d'une
 * offre/course de livraison (en pratique l'endroit où se trouve la personne
 * qui crée l'offre, ex: la boutique) — demande la permission si nécessaire.
 * Retourne `null` en silence si refusée/indisponible : ne doit jamais
 * empêcher la création de l'offre elle-même.
 */
export async function requestPickupCoordinates(): Promise<[number, number] | null> {
  try {
    const { status: existing } = await Location.getForegroundPermissionsAsync();
    const granted =
      existing === 'granted'
        ? true
        : (await Location.requestForegroundPermissionsAsync()).status === 'granted';
    if (!granted) return null;
    return capturePosition();
  } catch {
    return null;
  }
}
