import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DelivererSheet from "../../../../components/delivery/DelivererSheet";
import DeliveryTimeline from "../../../../components/delivery/DeliveryTimeline";
import socketService from "../../../../services/socket/SocketService";
import LocationPickerMap from "../../../../components/location/LocationPickerMap";
import { AppHeader } from "../../../../components/ui/AppHeader";
import { useToast } from "../../../../components/ui/ToastManager";
import { useAuth } from "../../../../contexts/AuthContext";
import { useTheme } from "../../../../contexts/ThemeContext";
import CommandeService, { Commande } from "../../../../services/api/CommandeService";

/**
 * Confirmation d'une commande par le client.
 *
 * C'est le SEUL moment où l'adresse de livraison entre dans le système, et
 * elle vient toujours du client — l'entreprise ne la retape jamais. Tant
 * qu'il n'a pas confirmé, aucune mission ne peut être publiée : c'est ce qui
 * rend une livraison sans point d'arrivée structurellement impossible.
 */
export default function CommandeScreen() {
  const { commandeId } = useLocalSearchParams<{ commandeId: string }>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [commande, setCommande] = useState<Commande | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [picking, setPicking] = useState(false);
  const [delivererSheet, setDelivererSheet] = useState(false);

  const load = useCallback(async () => {
    if (!commandeId) return;
    setCommande(await CommandeService.getById(commandeId));
    setLoading(false);
  }, [commandeId]);

  // Au retour sur l'écran : le livreur a pu accepter, retirer le colis ou
  // livrer pendant que le client était ailleurs.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Étapes en direct : le serveur annonce chaque transition dans la salle
  // de la mission. Sans ça, la frise ne bougeait qu'au rafraîchissement
  // périodique — trente secondes d'attente devant un écran figé, au moment
  // précis où le client guette son colis.
  const missionId = commande?.delivery?.missionId;
  useEffect(() => {
    if (!missionId) return;

    socketService.joinMission(missionId);
    const onStatus = (data: { missionId: string }) => {
      if (data?.missionId !== missionId) return;
      load();
    };
    socketService.on("mission_status_update", onStatus);

    return () => {
      socketService.off("mission_status_update", onStatus);
      socketService.leaveMission(missionId);
    };
  }, [missionId, load]);

  // Filet de sécurité : une notification perdue (réseau coupé, socket
  // reconnecté) ne doit pas figer la frise indéfiniment.
  useEffect(() => {
    const enLivraison =
      commande?.delivery &&
      ["ASSIGNED", "PICKED_UP"].includes(commande.delivery.status);
    if (!enLivraison) return;
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [commande?.delivery?.status, load]);

  const handleConfirm = async (coordinates: [number, number], address: string) => {
    if (!commandeId) return;
    setConfirming(true);
    try {
      const updated = await CommandeService.confirm(commandeId, { coordinates, address });
      setCommande(updated);
      setPicking(false);
      toast.showSuccess("Commande confirmée", "L'entreprise peut maintenant organiser la livraison");
    } catch (e: any) {
      toast.showError(e?.message || "Confirmation impossible");
    } finally {
      setConfirming(false);
    }
  };

  // ── Choix de l'adresse sur la carte ───────────────────────────────
  if (picking) {
    // [0, 0] est la valeur par défaut du backend tant qu'aucune position
    // n'a jamais été enregistrée — jamais un vrai point, donc traité comme
    // inconnu plutôt que centré sur l'Atlantique.
    const profile = user?.location?.coordinates;
    const hasReal =
      !!profile && profile.length === 2 && (profile[0] !== 0 || profile[1] !== 0);

    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ExpoStatusBar style="light" />
        <LocationPickerMap
          initialCenter={hasReal ? (profile as [number, number]) : null}
          onConfirm={handleConfirm}
          confirming={confirming}
        />
        <TouchableOpacity
          onPress={() => setPicking(false)}
          activeOpacity={0.85}
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
          }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AppHeader title="Commande" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      </View>
    );
  }

  if (!commande) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <AppHeader title="Commande" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="receipt-outline" size={40} color={colors.textTertiary} />
          <Text style={{ color: colors.textPrimary }} className="font-jakarta-bold text-base mt-3 text-center">
            Commande introuvable
          </Text>
        </View>
      </View>
    );
  }

  // Mongoose crée `coordinates: []` pour un tableau déclaré sans valeur, et
  // un tableau vide est TRUTHY en JavaScript : tester la simple présence
  // faisait croire qu'une adresse existait alors qu'elle était vide.
  const hasAddress =
    Array.isArray(commande.deliveryAddress?.coordinates) &&
    commande.deliveryAddress!.coordinates!.length === 2;

  const awaitingMe = commande.status === "PROPOSEE";

  // Modifiable tant qu'aucune mission n'est partie : une fois publiée, la
  // mission porte une COPIE FIGÉE de l'adresse — la changer ici ne la
  // suivrait pas, et le livreur irait au mauvais endroit.
  const canEditAddress =
    ["PROPOSEE", "CONFIRMEE"].includes(commande.status) && !(commande.missions?.length);
  const enterpriseName =
    typeof commande.enterprise === "object" ? commande.enterprise.companyName : "L'entreprise";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style="auto" />
      <AppHeader title="Commande" subtitle={enterpriseName} onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* État */}
        <View
          className="rounded-2xl p-4 mb-3.5"
          style={{
            backgroundColor: awaitingMe ? colors.card : "rgba(16,185,129,0.08)",
            borderColor: awaitingMe ? colors.border : colors.brandPrimary,
            borderWidth: 1,
          }}
        >
          <Text
            style={{ color: awaitingMe ? colors.textSecondary : colors.brandPrimary }}
            className="font-jakarta-semibold text-xs uppercase"
          >
            {CommandeService.statusLabel(commande.status)}
          </Text>
          {awaitingMe && (
            <Text style={{ color: colors.textSecondary }} className="font-jakarta text-sm mt-1">
              Indiquez où livrer pour que {enterpriseName} puisse organiser la course.
            </Text>
          )}
        </View>

        {/* Frise des étapes : le client voyait un statut isolé sans savoir
            ce qui restait à venir. */}
        <DeliveryTimeline commande={commande} />

        {/* Suivi de la livraison. L'écran de suivi existait mais aucun
            bouton n'y menait, et le client ne disposait ni de l'identifiant
            de mission ni du moindre renseignement sur le livreur. */}
        {commande.delivery && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setDelivererSheet(true)}
            className="rounded-2xl p-4 mb-3.5 flex-row items-center"
            style={{ backgroundColor: colors.card, borderColor: colors.brandPrimary, borderWidth: 1 }}
          >
            <View
              style={{
                width: 42, height: 42, borderRadius: 14,
                backgroundColor: colors.brandLight,
                alignItems: "center", justifyContent: "center",
              }}
            >
              <Ionicons
                name={commande.delivery.status === "PICKED_UP" ? "bicycle" : "storefront-outline"}
                size={20}
                color={colors.brandPrimary}
              />
            </View>
            <View className="flex-1 ml-3">
              <Text style={{ color: colors.textPrimary }} className="font-jakarta-bold text-sm">
                {commande.delivery.status === "PICKED_UP"
                  ? "Votre colis est en route"
                  : commande.delivery.deliverer
                    ? "Un livreur a pris la course"
                    : "En attente d'un livreur"}
              </Text>
              <Text style={{ color: colors.textSecondary }} className="font-jakarta text-xs mt-0.5" numberOfLines={1}>
                {commande.delivery.deliverer
                  ? `${commande.delivery.deliverer.firstName ?? ""} ${commande.delivery.deliverer.lastName ?? ""}`.trim() || "Voir le livreur"
                  : "La course est proposée aux livreurs proches"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}

        {/* Articles */}
        <View
          className="rounded-2xl p-4 mb-3.5"
          style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
        >
          {commande.items.map((it, i) => (
            <View
              key={`${it.product}-${i}`}
              className="flex-row items-center justify-between py-2"
              style={i > 0 ? { borderTopWidth: 1, borderTopColor: colors.borderLight } : undefined}
            >
              <Text style={{ color: colors.textPrimary }} className="font-jakarta-medium text-sm flex-1" numberOfLines={1}>
                {it.quantity > 1 ? `${it.quantity} × ` : ""}{it.nameSnapshot}
              </Text>
              <Text style={{ color: colors.textSecondary }} className="font-jakarta-medium text-sm ml-3">
                {it.unitPrice * it.quantity} FCFA
              </Text>
            </View>
          ))}

          <View
            className="flex-row items-center justify-between pt-3 mt-2"
            style={{ borderTopWidth: 1, borderTopColor: colors.border }}
          >
            <Text style={{ color: colors.textPrimary }} className="font-jakarta-bold text-sm">
              Prix convenu
            </Text>
            <Text style={{ color: colors.brandPrimary }} className="font-jakarta-bold text-lg">
              {commande.agreedTotal} FCFA
            </Text>
          </View>

          <View className="flex-row items-center justify-between mt-2">
            <Text style={{ color: colors.textSecondary }} className="font-jakarta-medium text-xs">
              Frais de livraison · {commande.deliveryFeePaidBy === "CLIENT" ? "à votre charge" : "réglés par la boutique"}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="font-jakarta-semibold text-xs">
              {commande.deliveryFee} FCFA
            </Text>
          </View>
        </View>

        {/* Adresse de livraison */}
        <Text
          style={{ color: colors.textTertiary, letterSpacing: 0.7 }}
          className="font-jakarta-semibold text-xs uppercase mb-2.5 ml-1"
        >
          Adresse de livraison
        </Text>

        {hasAddress ? (
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
          >
            <View className="flex-row items-start">
              <Ionicons name="location" size={18} color={colors.brandPrimary} style={{ marginTop: 1 }} />
              <Text style={{ color: colors.textPrimary }} className="font-jakarta-medium text-sm ml-2.5 flex-1">
                {commande.deliveryAddress?.address || "Position enregistrée"}
              </Text>
            </View>

            {canEditAddress && (
              <TouchableOpacity
                onPress={() => setPicking(true)}
                activeOpacity={0.7}
                className="flex-row items-center pt-3 mt-3"
                style={{ borderTopWidth: 1, borderTopColor: colors.borderLight }}
              >
                <Ionicons name="create-outline" size={15} color={colors.brandPrimary} />
                <Text style={{ color: colors.brandPrimary }} className="font-jakarta-semibold text-sm ml-1.5">
                  Modifier l&apos;adresse
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setPicking(true)}
            activeOpacity={0.88}
            className="rounded-2xl py-4 flex-row items-center justify-center"
            style={{ backgroundColor: colors.brandPrimary }}
          >
            <Ionicons name="map" size={19} color="#FFFFFF" />
            <Text className="text-white font-jakarta-bold text-base ml-2">
              Choisir où livrer
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <DelivererSheet
        visible={delivererSheet}
        onClose={() => setDelivererSheet(false)}
        delivery={commande.delivery ?? null}
        onTrack={() =>
          router.push({
            pathname: "/(app)/(client)/tracking/[missionId]",
            params: {
              missionId: commande.delivery?.missionId ?? "",
              // Destination transmise : la carte ne montrait que le point du
              // livreur, sans repère de l'endroit où il doit arriver.
              destLng: String(commande.deliveryAddress?.coordinates?.[0] ?? ""),
              destLat: String(commande.deliveryAddress?.coordinates?.[1] ?? ""),
              destLabel: commande.deliveryAddress?.address ?? "",
            },
          } as any)
        }
      />
    </View>
  );
}
