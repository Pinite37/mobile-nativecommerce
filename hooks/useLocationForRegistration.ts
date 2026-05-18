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

    try {
      // Vérifier d'abord si la permission est déjà accordée (sans re-demander)
      const existing = await Location.getForegroundPermissionsAsync();

      let granted = existing.status === Location.PermissionStatus.GRANTED;

      if (!granted) {
        // Demander la permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        granted = status === Location.PermissionStatus.GRANTED;
      }

      if (!granted) {
        setState({ status: "denied", coords: null, detectedCity: null });
        return;
      }

      // Timeout de sécurité si le GPS est très lent
      const timeoutPromise = new Promise<null>((_, reject) => {
        timeoutRef.current = setTimeout(
          () => reject(new Error("timeout")),
          TIMEOUT_MS,
        );
      });

      const positionPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Bon compromis vitesse/précision
      });

      const position = (await Promise.race([
        positionPromise,
        timeoutPromise,
      ])) as Location.LocationObject;

      clearTimer();

      const coords: LocationCoords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      // Reverse geocoding pour afficher la ville à l'utilisateur
      let detectedCity: string | null = null;
      try {
        const [place] = await Location.reverseGeocodeAsync(coords);
        if (place) {
          // Composer un nom lisible : ville ou sous-région + pays
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
        }
      } catch {
        // Reverse geocoding échoué — on garde les coords quand même
      }

      setState({ status: "granted", coords, detectedCity });
    } catch (err: any) {
      clearTimer();
      if (err?.message === "timeout") {
        // Timeout GPS : on considère comme erreur non bloquante
        setState({ status: "error", coords: null, detectedCity: null });
      } else {
        setState({ status: "error", coords: null, detectedCity: null });
      }
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
