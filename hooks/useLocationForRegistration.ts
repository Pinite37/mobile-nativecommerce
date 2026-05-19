import * as Location from "expo-location";
import { useCallback, useRef, useState } from "react";

export type LocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "skipped"
  | "error";

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface LocationState {
  status: LocationStatus;
  coords: LocationCoords | null;
  /** Ville détectée affichée à l'utilisateur (reverse geocoding) */
  detectedCity: string | null;
}

const TIMEOUT_MS = 8000;

export function useLocationForRegistration() {
  const [state, setState] = useState<LocationState>({
    status: "idle",
    coords: null,
    detectedCity: null,
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const requestLocation = useCallback(async () => {
    setState({ status: "requesting", coords: null, detectedCity: null });
    console.log("[Location] Démarrage de la détection...");

    try {
      // Vérifier d'abord si la permission est déjà accordée (sans re-demander)
      const existing = await Location.getForegroundPermissionsAsync();
      console.log("[Location] Permission existante:", existing.status, "| canAskAgain:", existing.canAskAgain);

      let granted = existing.status === Location.PermissionStatus.GRANTED;

      if (!granted) {
        console.log("[Location] Demande de permission en cours...");
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log("[Location] Résultat de la demande:", status);
        granted = status === Location.PermissionStatus.GRANTED;
      }

      if (!granted) {
        console.log("[Location] Permission refusée → statut 'denied'");
        setState({ status: "denied", coords: null, detectedCity: null });
        return;
      }

      console.log("[Location] Permission accordée, récupération de la position GPS...");

      // Timeout de sécurité si le GPS est très lent
      const timeoutPromise = new Promise<null>((_, reject) => {
        timeoutRef.current = setTimeout(() => {
          console.log("[Location] ⏱ Timeout GPS atteint après", TIMEOUT_MS, "ms → statut 'error'");
          reject(new Error("timeout"));
        }, TIMEOUT_MS);
      });

      const positionPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const position = (await Promise.race([
        positionPromise,
        timeoutPromise,
      ])) as Location.LocationObject;

      clearTimer();
      console.log("[Location] Position obtenue:", position.coords.latitude, position.coords.longitude, "| précision:", position.coords.accuracy, "m");

      const coords: LocationCoords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      // Reverse geocoding pour afficher la ville à l'utilisateur
      let detectedCity: string | null = null;
      try {
        console.log("[Location] Reverse geocoding...");
        const [place] = await Location.reverseGeocodeAsync(coords);
        console.log("[Location] Place brute:", JSON.stringify(place));
        if (place) {
          const city =
            place.city ||
            place.subregion ||
            place.district ||
            place.region ||
            null;
          const country = place.country;
          detectedCity = city
            ? country
              ? `${city}, ${country}`
              : city
            : country || null;
          console.log("[Location] Ville détectée:", detectedCity);
        }
      } catch (geoErr) {
        console.warn("[Location] Reverse geocoding échoué:", geoErr);
      }

      setState({ status: "granted", coords, detectedCity });
      console.log("[Location] ✅ Statut final: granted");
    } catch (err: any) {
      clearTimer();
      console.error("[Location] ❌ Erreur:", err?.message, err);
      setState({ status: "error", coords: null, detectedCity: null });
    }
  }, []);

  const skip = useCallback(() => {
    clearTimer();
    setState({ status: "skipped", coords: null, detectedCity: null });
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setState({ status: "idle", coords: null, detectedCity: null });
  }, []);

  return { ...state, requestLocation, skip, reset };
}
