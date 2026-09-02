import { Camera, Map, Marker, type CameraRef } from "@maplibre/maplibre-react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import socketService from "../../services/socket/SocketService";

// Style vectoriel gratuit OpenFreeMap — pas de clé API, pas de facturation.
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/bright";

interface DeliveryTrackingMapProps {
  missionId: string;
  /** [longitude, latitude] — utilisé tant qu'aucune position live n'est reçue. */
  fallbackCenter: [number, number];
  /**
   * Point d'arrivée. La carte ne montrait que le livreur : sans repère de
   * destination, impossible de savoir s'il se rapproche ou s'en éloigne.
   */
  destination?: [number, number] | null;
  destinationLabel?: string;
}

/**
 * Carte de suivi live d'une livraison — affiche la position du livreur
 * assigné en temps réel via la room Socket.IO `mission:${missionId}`
 * (voir delivers_mobile/hooks/useActiveMissionLocationTracking).
 */
export default function DeliveryTrackingMap({
  missionId,
  fallbackCenter,
  destination,
  destinationLabel,
}: DeliveryTrackingMapProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const cameraRef = useRef<CameraRef>(null);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [lastUpdateAt, setLastUpdateAt] = useState<string | null>(null);

  useEffect(() => {
    socketService.joinMission(missionId);

    const handlePositionUpdate = (data: { missionId: string; latitude: number; longitude: number; at: string }) => {
      if (data.missionId !== missionId) return;
      setPosition([data.longitude, data.latitude]);
      setLastUpdateAt(data.at);
    };

    socketService.on("deliverer_position_update", handlePositionUpdate);

    return () => {
      socketService.off("deliverer_position_update", handlePositionUpdate);
      socketService.leaveMission(missionId);
    };
  }, [missionId]);

  useEffect(() => {
    if (!position) return;
    cameraRef.current?.easeTo({ center: position, duration: 800 });
  }, [position]);

  return (
    <View style={{ flex: 1 }}>
      <Map mapStyle={MAP_STYLE_URL} style={{ flex: 1 }}>
        <Camera
          ref={cameraRef}
          initialViewState={{ center: position ?? fallbackCenter, zoom: 14 }}
        />
        {destination && (
          <Marker id="destination" lngLat={destination} anchor="center">
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: colors.error,
                  borderWidth: 3,
                  borderColor: "#FFFFFF",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="home" size={14} color="#FFFFFF" />
              </View>
              {!!destinationLabel && (
                <View
                  style={{
                    marginTop: 5,
                    maxWidth: 170,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 8,
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{ color: colors.textPrimary, fontFamily: "PlusJakartaSans-SemiBold", fontSize: 11 }}
                  >
                    {destinationLabel}
                  </Text>
                </View>
              )}
            </View>
          </Marker>
        )}

        {position && (
          <Marker id="deliverer" lngLat={position} anchor="center">
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.brandPrimary,
                borderWidth: 3,
                borderColor: "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
              }}
            >
              {/* Ionicons n'a pas de moto : `bicycle` affichait un vélo.
                  MaterialCommunityIcons en a une, et c'est le véhicule réel
                  de la quasi-totalité des livreurs ici. */}
              <MaterialCommunityIcons name="motorbike" size={20} color="#FFFFFF" />
            </View>
          </Marker>
        )}
      </Map>

      {/* En bas et non en haut : à `top: 16` ce bandeau passait sous
          l'îlot dynamique et sous le bouton retour, tronqué au point de
          ressembler à un champ de recherche. Le bas est aussi la place
          habituelle d'un état de suivi. */}
      {!position && (
        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + 20,
            left: 16,
            right: 16,
            backgroundColor: colors.card,
            borderRadius: 14,
            padding: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 6,
            elevation: 4,
          }}
        >
          <Ionicons name="navigate-circle-outline" size={20} color={colors.textTertiary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "PlusJakartaSans-SemiBold", fontSize: 13, color: colors.textPrimary }}>
              Position du livreur indisponible
            </Text>
            {/* Dire la raison plutôt que de laisser tourner un « en
                attente » indéfini : la position n'est diffusée que lorsque
                l'application du livreur est ouverte. */}
            <Text style={{ fontFamily: "PlusJakartaSans-Medium", fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
              Elle apparaîtra dès qu&apos;il ouvrira son application. Votre adresse de livraison reste affichée.
            </Text>
          </View>
        </View>
      )}

      {position && lastUpdateAt && (
        <View
          style={{
            position: "absolute",
            bottom: insets.bottom + 20,
            left: 16,
            backgroundColor: colors.card,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandPrimary }} />
          <Text style={{ fontFamily: "PlusJakartaSans-Medium", fontSize: 12, color: colors.textSecondary }}>
            Position en direct
          </Text>
        </View>
      )}
    </View>
  );
}
