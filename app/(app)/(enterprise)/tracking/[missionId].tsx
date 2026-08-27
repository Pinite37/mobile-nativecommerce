import { Ionicons } from "@expo/vector-icons";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DeliveryTrackingMap from "../../../../components/tracking/DeliveryTrackingMap";
import { useTheme } from "../../../../contexts/ThemeContext";

// Centre par défaut (Cotonou) tant qu'aucune position live n'est reçue.
const DEFAULT_CENTER: [number, number] = [2.4183, 6.3703];

export default function EnterpriseDeliveryTracking() {
  const { missionId, lat, lng } = useLocalSearchParams<{ missionId: string; lat?: string; lng?: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const fallbackCenter: [number, number] =
    lat && lng ? [parseFloat(lng), parseFloat(lat)] : DEFAULT_CENTER;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} />

      <View
        style={{
          position: "absolute",
          top: insets.top + 12,
          left: 16,
          zIndex: 10,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.card,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 6,
            elevation: 5,
          }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {missionId ? (
        <DeliveryTrackingMap missionId={missionId} fallbackCenter={fallbackCenter} />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: "Poppins-Medium", color: colors.textSecondary }}>
            Livraison introuvable
          </Text>
        </View>
      )}
    </View>
  );
}
