import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Location from "expo-location";
import { Camera, Map, type CameraRef, type ViewStateChangeEvent } from "@maplibre/maplibre-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import PlaceSearchService, { PlaceResult } from "../../services/api/PlaceSearchService";

// Pause après la dernière frappe avant d'interroger le service — évite une
// requête par lettre tout en restant imperceptible à l'usage.
const SEARCH_DEBOUNCE_MS = 350;

const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/bright";
const DEFAULT_CENTER: [number, number] = [2.4183, 6.3703]; // Cotonou

interface LocationPickerMapProps {
  /** Position initiale — si connue (dernière position enregistrée, GPS…). */
  initialCenter?: [number, number] | null;
  onConfirm: (coordinates: [number, number], address: string) => void;
  confirming?: boolean;
}

/**
 * Sélecteur de position "épingle fixe" — le classique des apps de livraison :
 * la carte bouge sous une épingle centrale immobile, l'utilisateur cadre son
 * point exact (bien plus précis qu'une détection GPS auto, qui peut être à
 * côté d'un immeuble ou d'un portail). Reverse-geocode l'adresse affichée à
 * chaque arrêt de mouvement — jamais figée sur une valeur devinée.
 */
export default function LocationPickerMap({ initialCenter, onConfirm, confirming }: LocationPickerMapProps) {
  const { colors, isDark } = useTheme();
  const cameraRef = useRef<CameraRef>(null);
  const [center, setCenter] = useState<[number, number]>(initialCenter ?? DEFAULT_CENTER);
  const [address, setAddress] = useState<string | null>(null);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [locating, setLocating] = useState(false);
  const insets = useSafeAreaInsets();

  // Recherche de lieu
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Après un saut vers un résultat, on conserve le nom cherché (« Pharmacie
  // Ganhi ») au lieu de le laisser écraser par le géocodage inverse, qui
  // renverrait l'adresse générique de la rue.
  const skipNextResolveRef = useRef(false);

  const resolveAddress = async (coords: [number, number]) => {
    setResolvingAddress(true);
    try {
      const [place] = await Location.reverseGeocodeAsync({
        latitude: coords[1],
        longitude: coords[0],
      });
      const city = place?.city || place?.subregion || place?.district || "";
      const street = [place?.street, place?.name].filter(Boolean).join(" ");
      const label = [street, city].filter(Boolean).join(", ");
      setAddress(label || null);
    } catch {
      setAddress(null);
    } finally {
      setResolvingAddress(false);
    }
  };

  // Résolution initiale
  useEffect(() => {
    resolveAddress(center);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chaque frappe annule la requête précédente : seule la dernière compte.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      abortRef.current?.abort();
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const found = await PlaceSearchService.search(q, center, controller.signal);
      if (!controller.signal.aborted) {
        setResults(found);
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // `center` volontairement hors dépendances : rebiaiser la recherche à
    // chaque micro-déplacement de carte relancerait des requêtes en boucle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const selectResult = (place: PlaceResult) => {
    Keyboard.dismiss();
    setQuery("");
    setResults([]);
    // La recherche amène à proximité ; l'utilisateur garde la main pour
    // ajuster au portail près — ce qui compte pour une adresse de livraison.
    skipNextResolveRef.current = true;
    setCenter(place.coordinates);
    setAddress([place.name, place.context].filter(Boolean).join(", "));
    cameraRef.current?.easeTo({ center: place.coordinates, zoom: 17, duration: 800 });
  };

  const handleRegionDidChange = (event: NativeSyntheticEvent<ViewStateChangeEvent>) => {
    const nextCenter = event.nativeEvent.center;
    if (!nextCenter) return;
    setCenter(nextCenter);
    if (skipNextResolveRef.current) {
      skipNextResolveRef.current = false;
      return;
    }
    resolveAddress(nextCenter);
  };

  const goToMyPosition = async () => {
    setLocating(true);
    try {
      const { status: existing } = await Location.getForegroundPermissionsAsync();
      const granted =
        existing === "granted"
          ? true
          : (await Location.requestForegroundPermissionsAsync()).status === "granted";
      if (!granted) return;

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next: [number, number] = [position.coords.longitude, position.coords.latitude];
      cameraRef.current?.easeTo({ center: next, zoom: 17, duration: 700 });
    } catch {
      // Silencieux
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Map mapStyle={MAP_STYLE_URL} style={{ flex: 1 }} onRegionDidChange={handleRegionDidChange}>
        <Camera ref={cameraRef} initialViewState={{ center, zoom: 16 }} />
      </Map>

      {/* Recherche — placée SOUS la rangée du bouton retour que posent les
          écrans parents, pour ne jamais entrer en collision avec. */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 64,
          left: 16,
          right: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.card,
            borderRadius: 14,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="search" size={17} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Pharmacie, maquis, rue…"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
            autoCorrect={false}
            style={{
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 10,
              color: colors.textPrimary,
              fontFamily: "Poppins-Medium",
              fontSize: 14.5,
            }}
          />
          {searching ? (
            <ActivityIndicator size="small" color={colors.brandPrimary} />
          ) : query.length > 0 ? (
            <TouchableOpacity onPress={() => { setQuery(""); Keyboard.dismiss(); }} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* On garde les résultats précédents affichés pendant la frappe
            suivante — sinon la liste disparaît et réapparaît à chaque
            lettre. Le témoin d'activité dans le champ suffit à signaler
            qu'une nouvelle recherche est en cours. */}
        {query.trim().length >= 3 && (results.length > 0 || !searching) && (
          <View
            style={{
              marginTop: 8,
              backgroundColor: colors.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: "hidden",
              maxHeight: 260,
            }}
          >
            {results.length === 0 ? (
              <Text
                style={{
                  padding: 16,
                  color: colors.textSecondary,
                  fontFamily: "Poppins-Medium",
                  fontSize: 13.5,
                }}
              >
                Aucun lieu trouvé. Vous pouvez toujours placer l&apos;épingle à la main.
              </Text>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled">
                {results.map((r, i) => (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => selectResult(r)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: colors.borderLight,
                    }}
                  >
                    <Ionicons name="location-outline" size={16} color={colors.textTertiary} />
                    <View style={{ flex: 1, marginLeft: 11 }}>
                      <Text
                        style={{ color: colors.textPrimary, fontFamily: "Poppins-SemiBold", fontSize: 14 }}
                        numberOfLines={1}
                      >
                        {r.name}
                      </Text>
                      {r.context ? (
                        <Text
                          style={{ color: colors.textSecondary, fontFamily: "Poppins-Medium", fontSize: 12, marginTop: 1 }}
                          numberOfLines={1}
                        >
                          {r.context}
                        </Text>
                      ) : null}
                    </View>
                    {/* La distance évite de partir sur un homonyme situé à
                        l'autre bout du pays — le tri par proximité est doux. */}
                    <Text
                      style={{ color: colors.textTertiary, fontFamily: "Poppins-Medium", fontSize: 12, marginLeft: 8 }}
                    >
                      {PlaceSearchService.formatDistance(r.distanceKm)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* Épingle fixe au centre — ne bouge jamais, c'est la carte qui glisse dessous */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          marginLeft: -20,
          marginTop: -44,
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.brandPrimary,
            borderWidth: 3,
            borderColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.3,
            shadowRadius: 5,
            elevation: 6,
          }}
        >
          <Ionicons name="storefront" size={18} color="#FFFFFF" />
        </View>
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 7,
            borderRightWidth: 7,
            borderTopWidth: 11,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderTopColor: colors.brandPrimary,
            marginTop: -2,
          }}
        />
        <View
          style={{
            width: 8,
            height: 3,
            borderRadius: 4,
            backgroundColor: "rgba(0,0,0,0.25)",
            marginTop: 2,
          }}
        />
      </View>

      {/* Bouton "ma position" */}
      <TouchableOpacity
        onPress={goToMyPosition}
        disabled={locating}
        style={{
          position: "absolute",
          right: 16,
          bottom: 170,
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: colors.card,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 5,
        }}
      >
        {locating ? (
          <ActivityIndicator size="small" color={colors.brandPrimary} />
        ) : (
          <Ionicons name="locate" size={20} color={colors.brandPrimary} />
        )}
      </TouchableOpacity>

      {/* Carte flottante en bas — verre dépoli, cohérente avec le suivi de livraison */}
      <View
        style={{
          position: "absolute",
          bottom: 24,
          left: 16,
          right: 16,
          borderRadius: 28,
          overflow: "hidden",
          shadowColor: isDark ? "#000" : "#047857",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: isDark ? 0.45 : 0.16,
          shadowRadius: 22,
        }}
      >
        <BlurView
          intensity={95}
          tint={isDark ? "systemUltraThinMaterialDark" : "systemUltraThinMaterialLight"}
        >
          <View
            style={{
              backgroundColor: isDark ? "rgba(10,10,10,0.15)" : "rgba(255,255,255,0.18)",
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.85)",
              padding: 18,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <Ionicons name="location" size={14} color={colors.brandPrimary} />
              <Text
                style={{ fontFamily: "Poppins-SemiBold", fontSize: 12, color: colors.brandPrimary, marginLeft: 5, letterSpacing: 0.3 }}
              >
                POINT DE LIVRAISON
              </Text>
            </View>

            <Text
              style={{ fontFamily: "Poppins-Bold", fontSize: 16, color: colors.textPrimary, marginBottom: 14, minHeight: 22 }}
              numberOfLines={1}
            >
              {resolvingAddress ? "Recherche de l'adresse…" : address || "Adresse non identifiée"}
            </Text>

            <TouchableOpacity
              onPress={() => onConfirm(center, address || "")}
              disabled={confirming}
              activeOpacity={0.88}
              style={{
                backgroundColor: colors.brandPrimary,
                borderRadius: 16,
                paddingVertical: 15,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: confirming ? 0.7 : 1,
              }}
            >
              {confirming ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={{ fontFamily: "Poppins-Bold", fontSize: 15, color: "#FFFFFF" }}>
                    Confirmer cette position
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    </View>
  );
}
