import { Camera, Map, Marker, type CameraRef } from "@maplibre/maplibre-react-native";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import socketService from "../../services/socket/SocketService";

// Style vectoriel gratuit OpenFreeMap — pas de clé API, pas de facturation.
const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/bright";

interface DeliveryTrackingMapProps {
  missionId: string;
  /** [longitude, latitude] — utilisé tant qu'aucune position live n'est reçue. */
  fallbackCenter: [number, number];
}

/**
 * Carte de suivi live d'une livraison — affiche la position du livreur
 * assigné en temps réel via la room Socket.IO `mission:${missionId}`
 * (voir delivers_mobile/hooks/useActiveMissionLocationTracking).
 */
export default function DeliveryTrackingMap({ missionId, fallbackCenter }: DeliveryTrackingMapProps) {
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
              <Ionicons name="bicycle" size={18} color="#FFFFFF" />
            </View>
          </Marker>
        )}
      </Map>

      {!position && (
        <View
          style={{
            position: "absolute",
            top: 16,
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
          <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
          <Text style={{ fontFamily: "Poppins-Medium", fontSize: 13, color: colors.textSecondary, flex: 1 }}>
            En attente de la position du livreur…
          </Text>
        </View>
      )}

      {position && lastUpdateAt && (
        <View
          style={{
            position: "absolute",
            bottom: 16,
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
          <Text style={{ fontFamily: "Poppins-Medium", fontSize: 12, color: colors.textSecondary }}>
            Position en direct
          </Text>
        </View>
      )}
    </View>
  );
}
