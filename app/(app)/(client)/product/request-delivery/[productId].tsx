import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LocationPickerMap from "../../../../../components/location/LocationPickerMap";
import { useToast } from "../../../../../components/ui/ToastManager";
import { useAuth } from "../../../../../contexts/AuthContext";
import { useTheme } from "../../../../../contexts/ThemeContext";
import DeliveryAddressRequestService from "../../../../../services/api/DeliveryAddressRequestService";
import DeliveryService from "../../../../../services/api/DeliveryService";

// C'est ICI que le client indique où son colis doit être livré — pas au
// niveau de son profil (une seule adresse fixe, jamais assez pour des
// commandes qui peuvent aller à des endroits différents). Toujours ouvert
// depuis une conversation déjà existante (donc jamais avant d'avoir discuté
// avec l'entreprise) :
//  - `offerId` absent  → l'entreprise n'a pas encore créé l'offre, on
//    enregistre juste une demande qu'elle reprendra en créant l'offre.
//  - `offerId` présent → l'offre existe déjà (créée sans adresse précise),
//    on la met à jour directement.
export default function RequestDeliveryScreen() {
  const { productId, offerId } = useLocalSearchParams<{ productId: string; offerId?: string }>();
  const { user } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);

  const hasRealLocation =
    !!user?.location?.coordinates &&
    user.location.coordinates.length === 2 &&
    (user.location.coordinates[0] !== 0 || user.location.coordinates[1] !== 0);
  const initialCenter: [number, number] | null = hasRealLocation
    ? (user!.location.coordinates as [number, number])
    : null;

  const handleConfirm = async (coordinates: [number, number], address: string) => {
    if (!productId) return;
    try {
      setConfirming(true);

      if (offerId) {
        await DeliveryService.updateDeliveryAddress(offerId, {
          deliveryAddress: address,
          deliveryCoordinates: coordinates,
        });
      } else {
        await DeliveryAddressRequestService.create({
          productId,
          deliveryAddress: address,
          deliveryCoordinates: coordinates,
        });
      }

      toast.showSuccess("Adresse enregistrée", "L'entreprise pourra livrer précisément à cet endroit");
      router.back();
    } catch (error: any) {
      console.error('❌ RequestDeliveryScreen.handleConfirm error:', error?.message || error);
      toast.showError(error?.message || "Impossible d'enregistrer cette adresse");
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
          Où livrer ce colis ?
        </Text>
      </View>
    </View>
  );
}
