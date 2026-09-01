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

// NOTE: on a supprimé requestPickupCoordinates() qui vivait ici — elle
// capturait le GPS live du téléphone de l'entreprise AU MOMENT de créer une
// offre, ce qui n'a aucun rapport avec où se trouve la boutique (position du
// simulateur, du domicile, etc.). Le point de retrait est maintenant
// l'emplacement précis de la boutique, choisi une fois sur la carte
// (Profil > Emplacement de ma boutique) et lu directement côté backend.
