import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LocationPickerMap from "../../../../components/location/LocationPickerMap";
import { AppHeader } from "../../../../components/ui/AppHeader";
import { useToast } from "../../../../components/ui/ToastManager";
import { useTheme } from "../../../../contexts/ThemeContext";
import EnterpriseService, {
  PickupPoint,
} from "../../../../services/api/EnterpriseService";

/**
 * Points de retrait — les lieux d'où partent les colis.
 *
 * Une entreprise peut en avoir plusieurs (boutique, entrepôt). C'est l'un
 * d'eux qui est FIGÉ sur chaque mission au moment de la publier : si un point
 * est déplacé ou supprimé ensuite, les missions en cours continuent de
 * pointer là où se trouve réellement le colis.
 *
 * Les entreprises qui avaient défini un emplacement avant l'arrivée des
 * points multiples voient ici un point « Emplacement principal » synthétisé
 * par le serveur (`isLegacy`). Il devient un vrai point de la liste dès le
 * premier enregistrement — aucune migration n'a été nécessaire.
 */
export default function PickupPointsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Mode carte : on remplace l'écran par le sélecteur plutôt que d'ajouter
  // une route, le retour se faisant simplement en repassant en mode liste.
  const [picking, setPicking] = useState(false);
  const [pending, setPending] = useState<{ coordinates: [number, number]; address: string } | null>(null);
  const [label, setLabel] = useState("");

  useEffect(() => {
    (async () => {
      const list = await EnterpriseService.listPickupPoints();
      setPoints(list);
      setLoading(false);
    })();
  }, []);

  const persist = async (next: PickupPoint[]) => {
    setSaving(true);
    try {
      const saved = await EnterpriseService.savePickupPoints(
        next.map(({ label, coordinates, address, isDefault, isActive }) => ({
          label,
          coordinates,
          address,
          isDefault,
          isActive,
        }))
      );
      setPoints(saved);
      return true;
    } catch (e: any) {
      toast.showError(e?.message || "Enregistrement impossible");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleMapConfirm = (coordinates: [number, number], address: string) => {
    setPending({ coordinates, address });
    setLabel(address || "");
    setPicking(false);
  };

  const confirmNewPoint = async () => {
    if (!pending) return;
    const trimmed = label.trim();
    if (!trimmed) {
      toast.showError("Donnez un nom à ce point (ex : Boutique Ganhi)");
      return;
    }
    const next: PickupPoint[] = [
      ...points,
      {
        label: trimmed,
        coordinates: pending.coordinates,
        address: pending.address,
        // Le premier point créé devient le point par défaut.
        isDefault: points.length === 0,
        isActive: true,
      },
    ];
    setPending(null);
    if (await persist(next)) {
      toast.showSuccess("Point de retrait ajouté", trimmed);
    }
  };

  const setDefault = async (index: number) => {
    const next = points.map((p, i) => ({ ...p, isDefault: i === index }));
    if (await persist(next)) {
      toast.showSuccess("Point par défaut mis à jour", next[index].label);
    }
  };

  const remove = async (index: number) => {
    const next = points.filter((_, i) => i !== index);
    // Ne jamais laisser la liste sans point par défaut.
    if (next.length > 0 && !next.some((p) => p.isDefault)) {
      next[0].isDefault = true;
    }
    if (await persist(next)) {
      toast.showSuccess("Point supprimé");
    }
  };

  // ── Mode carte ────────────────────────────────────────────────────
  if (picking) {
    const center = points.find((p) => p.isDefault)?.coordinates ?? points[0]?.coordinates ?? null;
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ExpoStatusBar style="light" />
        <LocationPickerMap initialCenter={center} onConfirm={handleMapConfirm} confirming={false} />
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

  // ── Mode liste ────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style="auto" />
      <AppHeader title="Points de retrait" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ color: colors.textSecondary }} className="font-poppins text-sm mb-5">
          Les lieux d&apos;où partent vos colis. Le livreur est envoyé au point choisi lors de la
          création de la livraison — c&apos;est l&apos;adresse qu&apos;il verra.
        </Text>

        {loading ? (
          <View className="py-12 items-center">
            <ActivityIndicator color={colors.brandPrimary} />
          </View>
        ) : points.length === 0 ? (
          <View
            className="rounded-2xl p-6 items-center"
            style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
          >
            <Ionicons name="storefront-outline" size={34} color={colors.textTertiary} />
            <Text style={{ color: colors.textPrimary }} className="font-poppins-bold text-base mt-3 text-center">
              Aucun point de retrait
            </Text>
            <Text style={{ color: colors.textSecondary }} className="font-poppins text-sm mt-1 text-center">
              Vous ne pourrez pas publier de livraison tant qu&apos;aucun point n&apos;est défini.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {points.map((p, i) => (
              <View
                key={p._id ?? `${p.label}-${i}`}
                className="rounded-2xl p-4"
                style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
              >
                <View className="flex-row items-start">
                  <Ionicons
                    name={p.isDefault ? "location" : "location-outline"}
                    size={19}
                    color={p.isDefault ? colors.brandPrimary : colors.textTertiary}
                    style={{ marginTop: 2 }}
                  />
                  <View className="flex-1 ml-3">
                    <View className="flex-row items-center flex-wrap" style={{ gap: 8 }}>
                      <Text style={{ color: colors.textPrimary }} className="font-poppins-bold text-base">
                        {p.label}
                      </Text>
                      {p.isDefault && (
                        <View
                          style={{ backgroundColor: colors.brandLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}
                        >
                          <Text style={{ color: colors.brandPrimary }} className="font-poppins-semibold text-xs">
                            Par défaut
                          </Text>
                        </View>
                      )}
                    </View>
                    {p.address ? (
                      <Text style={{ color: colors.textSecondary }} className="font-poppins text-sm mt-0.5">
                        {p.address}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View
                  className="flex-row items-center mt-3.5 pt-3.5"
                  style={{ borderTopWidth: 1, borderTopColor: colors.borderLight, gap: 18 }}
                >
                  {!p.isDefault && (
                    <TouchableOpacity onPress={() => setDefault(i)} disabled={saving} activeOpacity={0.7}>
                      <Text style={{ color: colors.brandPrimary }} className="font-poppins-semibold text-sm">
                        Définir par défaut
                      </Text>
                    </TouchableOpacity>
                  )}
                  <View className="flex-1" />
                  <TouchableOpacity onPress={() => remove(i)} disabled={saving} activeOpacity={0.7}>
                    <Text style={{ color: colors.error }} className="font-poppins-semibold text-sm">
                      Supprimer
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          onPress={() => setPicking(true)}
          disabled={saving || loading}
          activeOpacity={0.88}
          className="rounded-2xl py-4 flex-row items-center justify-center mt-5"
          style={{ backgroundColor: colors.brandPrimary, opacity: saving || loading ? 0.6 : 1 }}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="add" size={19} color="#FFFFFF" />
              <Text className="text-white font-poppins-bold text-base ml-1.5">
                Ajouter un point de retrait
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Nommer le point qui vient d'être placé sur la carte */}
      <Modal visible={!!pending} transparent animationType="fade" onRequestClose={() => setPending(null)} statusBarTranslucent>
        <View className="flex-1 justify-center px-6" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <View className="rounded-3xl p-6" style={{ backgroundColor: colors.card }}>
            <Text style={{ color: colors.textPrimary }} className="font-poppins-bold text-lg">
              Nommer ce point
            </Text>
            <Text style={{ color: colors.textSecondary }} className="font-poppins text-sm mt-1">
              Un nom court que vous reconnaîtrez au moment de créer une livraison.
            </Text>

            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="Ex : Boutique Ganhi"
              placeholderTextColor={colors.textTertiary}
              style={{
                marginTop: 16,
                backgroundColor: colors.secondary,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 13,
                color: colors.textPrimary,
                fontFamily: "Poppins-Medium",
                fontSize: 15,
              }}
            />

            {pending?.address ? (
              <Text style={{ color: colors.textTertiary }} className="font-poppins text-xs mt-2">
                {pending.address}
              </Text>
            ) : null}

            <View className="flex-row mt-5" style={{ gap: 10 }}>
              <TouchableOpacity
                onPress={() => setPending(null)}
                className="flex-1 rounded-xl py-3.5 items-center"
                style={{ backgroundColor: colors.secondary }}
                activeOpacity={0.85}
              >
                <Text style={{ color: colors.textPrimary }} className="font-poppins-semibold text-sm">
                  Annuler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmNewPoint}
                className="flex-1 rounded-xl py-3.5 items-center"
                style={{ backgroundColor: colors.brandPrimary }}
                activeOpacity={0.85}
              >
                <Text className="text-white font-poppins-semibold text-sm">Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
