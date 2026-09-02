import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LocationPickerMap from "../../../../components/location/LocationPickerMap";
import { useToast } from "../../../../components/ui/ToastManager";
import { useAuth } from "../../../../contexts/AuthContext";
import { useTheme } from "../../../../contexts/ThemeContext";
import CustomerService from "../../../../services/api/CustomerService";

export default function LocationPickerScreen() {
  const { user, refreshUserData } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  // [0, 0] est la valeur par défaut du backend tant qu'aucune position n'a
  // jamais été enregistrée — jamais un vrai point de livraison, donc traité
  // comme "inconnu" plutôt que centré sur l'Atlantique.
  const hasRealLocation =
    !!user?.location?.coordinates &&
    user.location.coordinates.length === 2 &&
    (user.location.coordinates[0] !== 0 || user.location.coordinates[1] !== 0);
  const initialCenter: [number, number] | null = hasRealLocation
    ? (user!.location.coordinates as [number, number])
    : null;

  const handleConfirm = async (coordinates: [number, number], address: string) => {
    try {
      setConfirming(true);
      await CustomerService.updateLocation({ coordinates, address });
      await refreshUserData();
      toast.showSuccess("Position enregistrée", address || "Votre point de livraison a été mis à jour");
      router.back();
    } catch {
      toast.showError("Impossible d'enregistrer cette position");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style="light" />

      <LocationPickerMap initialCenter={initialCenter} onConfirm={handleConfirm} confirming={confirming} />

      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          position: "absolute",
          top: insets.top + 12,
          left: 16,
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: colors.card,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.2,
          shadowRadius: 6,
          elevation: 6,
        }}
      >
        <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
      </TouchableOpacity>

      <View
        style={{
          position: "absolute",
          top: insets.top + 12,
          left: 68,
          right: 16,
          height: 42,
          justifyContent: "center",
        }}
        pointerEvents="none"
      >
        <Text
          style={{
            fontFamily: "PlusJakartaSans-SemiBold",
            fontSize: 15,
            color: colors.textPrimary,
            backgroundColor: colors.card,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 21,
            alignSelf: "flex-start",
            overflow: "hidden",
          }}
        >
          Choisir mon adresse de livraison
        </Text>
      </View>
    </View>
  );
}
