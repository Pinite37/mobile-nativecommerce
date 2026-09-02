import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Linking, Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { CommandeDelivery } from "../../services/api/CommandeService";

/**
 * Qui apporte le colis, et comment le joindre.
 *
 * Le client voyait « Un livreur a pris la course » sans savoir qui, ni
 * comment l'appeler s'il ne trouvait pas l'adresse ou n'était pas chez lui.
 */

const VEHICLE_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  Moto: "motorbike",
  Voiture: "car-side",
  Tricycle: "rickshaw",
};

const STATUS_LABEL: Record<string, { title: string; detail: string }> = {
  ASSIGNED: { title: "En route vers la boutique", detail: "Le livreur va récupérer votre colis" },
  PICKED_UP: { title: "Colis en route", detail: "Le livreur se dirige vers vous" },
  COMPLETED: { title: "Livraison terminée", detail: "Le colis vous a été remis" },
  RETURNED: { title: "Colis retourné", detail: "La livraison n'a pas pu aboutir" },
  CANCELLED: { title: "Livraison annulée", detail: "" },
};

interface Props {
  visible: boolean;
  onClose: () => void;
  delivery: CommandeDelivery | null;
  onTrack?: () => void;
}

export default function DelivererSheet({ visible, onClose, delivery, onTrack }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const deliverer = delivery?.deliverer;
  const name = `${deliverer?.firstName ?? ""} ${deliverer?.lastName ?? ""}`.trim();
  const initial = (name || "?").charAt(0).toUpperCase();
  const phone = deliverer?.phone?.trim();
  const state = STATUS_LABEL[delivery?.status ?? ""] ?? null;
  const canTrack = delivery?.status === "ASSIGNED" || delivery?.status === "PICKED_UP";

  // Sans canOpenURL : depuis iOS 9 il échoue pour tout schéma non déclaré,
  // et son échec laissait l'appui sans aucun effet visible.
  const open = async (url: string, fallback?: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      if (fallback) {
        try {
          await Linking.openURL(fallback);
        } catch { /* rien de plus à tenter */ }
      }
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={onClose} />
      <View
        style={{
          backgroundColor: colors.card,
          borderTopLeftRadius: 26,
          borderTopRightRadius: 26,
          paddingBottom: insets.bottom + 18,
        }}
      >
        <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 6 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
        </View>

        <View style={{ paddingHorizontal: 22, paddingTop: 8 }}>
          {state && (
            <View className="items-center mb-5">
              <Text style={{ color: colors.textPrimary }} className="font-jakarta-bold text-lg text-center">
                {state.title}
              </Text>
              {!!state.detail && (
                <Text style={{ color: colors.textSecondary }} className="font-jakarta text-sm mt-1 text-center">
                  {state.detail}
                </Text>
              )}
            </View>
          )}

          {deliverer ? (
            <>
              <View className="flex-row items-center">
                {deliverer.profileImage ? (
                  <Image
                    source={{ uri: deliverer.profileImage }}
                    style={{ width: 56, height: 56, borderRadius: 28 }}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={{
                      width: 56, height: 56, borderRadius: 28,
                      backgroundColor: colors.brandPrimary,
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "#FFFFFF" }} className="font-jakarta-bold text-xl">
                      {initial}
                    </Text>
                  </View>
                )}

                <View className="flex-1 ml-3.5">
                  <Text style={{ color: colors.textPrimary }} className="font-jakarta-bold text-base" numberOfLines={1}>
                    {name || "Votre livreur"}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <MaterialCommunityIcons
                      name={VEHICLE_ICONS[deliverer.vehicleType ?? ""] ?? "motorbike"}
                      size={15}
                      color={colors.textTertiary}
                    />
                    <Text style={{ color: colors.textSecondary }} className="font-jakarta-medium text-sm ml-1.5">
                      {deliverer.vehicleType || "Livreur"}
                    </Text>
                    {typeof delivery?.durationMin === "number" && (
                      <>
                        <Text style={{ color: colors.textTertiary }} className="font-jakarta text-sm mx-1.5">·</Text>
                        <Text style={{ color: colors.textSecondary }} className="font-jakarta-medium text-sm">
                          ~{delivery.durationMin} min de trajet
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              </View>

              {phone ? (
                <View className="flex-row mt-5" style={{ gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => open(`tel:${phone.replace(/[^+\d]/g, "")}`)}
                    activeOpacity={0.85}
                    className="flex-1 flex-row items-center justify-center rounded-2xl py-3.5"
                    style={{ backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border }}
                  >
                    <Ionicons name="call-outline" size={17} color={colors.textPrimary} />
                    <Text style={{ color: colors.textPrimary }} className="font-jakarta-semibold text-sm ml-2">
                      Appeler
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      const clean = phone.replace(/[^+\d]/g, "").replace("+", "");
                      // wa.me en repli : ouvre l'app si elle est installée,
                      // le navigateur sinon.
                      open(`whatsapp://send?phone=${clean}`, `https://wa.me/${clean}`);
                    }}
                    activeOpacity={0.85}
                    className="flex-1 flex-row items-center justify-center rounded-2xl py-3.5"
                    style={{ backgroundColor: colors.brandLight }}
                  >
                    <Ionicons name="logo-whatsapp" size={17} color={colors.brandSecondary} />
                    <Text style={{ color: colors.brandSecondary }} className="font-jakarta-semibold text-sm ml-2">
                      WhatsApp
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={{ color: colors.textTertiary }} className="font-jakarta text-xs mt-4 text-center">
                  Numéro indisponible. Passez par la discussion avec la boutique.
                </Text>
              )}
            </>
          ) : (
            <View className="items-center py-4">
              <Ionicons name="time-outline" size={30} color={colors.textTertiary} />
              <Text style={{ color: colors.textPrimary }} className="font-jakarta-semibold text-base mt-3 text-center">
                Aucun livreur pour l&apos;instant
              </Text>
              <Text style={{ color: colors.textSecondary }} className="font-jakarta text-sm mt-1 text-center">
                La course est proposée aux livreurs à proximité.
              </Text>
            </View>
          )}

          {canTrack && onTrack && (
            <TouchableOpacity
              onPress={() => { onClose(); onTrack(); }}
              activeOpacity={0.88}
              className="flex-row items-center justify-center rounded-2xl py-4 mt-3.5"
              style={{ backgroundColor: colors.brandPrimary }}
            >
              <Ionicons name="navigate" size={18} color="#FFFFFF" />
              <Text className="text-white font-jakarta-bold text-base ml-2">
                Suivre sur la carte
              </Text>
            </TouchableOpacity>
          )}

          {(delivery?.missionCount ?? 0) > 1 && (
            <Text style={{ color: colors.textTertiary }} className="font-jakarta text-xs mt-3 text-center">
              Cette commande est répartie sur {delivery?.missionCount} livraisons.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}
