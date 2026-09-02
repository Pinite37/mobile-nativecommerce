import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "../../../../components/ui/AppHeader";
import { useToast } from "../../../../components/ui/ToastManager";
import { useTheme } from "../../../../contexts/ThemeContext";
import SettlementService, {
  SettlementLine,
} from "../../../../services/api/SettlementService";

/**
 * Règlements des livreurs.
 *
 * Le paiement se fait hors de l'application. Cet écran ne déplace pas
 * d'argent : il sert à savoir ce qu'on doit encore, et à déclarer qu'une
 * course a été payée — déclaration qui apparaît immédiatement dans le
 * portefeuille du livreur concerné.
 */
export default function SettlementsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [tab, setTab] = useState<"DUE" | "PAID">("DUE");
  const [lines, setLines] = useState<SettlementLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await SettlementService.listForEnterprise(tab);
    setLines(data);
    setLoading(false);
  }, [tab]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const total = lines.reduce((somme, l) => somme + (l.amount || 0), 0);

  const confirmerReglement = (line: SettlementLine) => {
    const nom = SettlementService.delivererName(line);
    Alert.alert(
      "Confirmer le règlement",
      `Déclarer avoir payé ${line.amount} FCFA à ${nom} pour « ${line.label} » ?\n\nCette déclaration apparaîtra dans son portefeuille et ne peut pas être annulée depuis l'app.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "J'ai payé",
          style: "default",
          onPress: async () => {
            setPaying(line._id);
            try {
              await SettlementService.markPaid(line._id);
              // Retiré de la liste plutôt que rechargé : l'onglet courant ne
              // contient que des lignes du même statut.
              setLines((prev) => prev.filter((l) => l._id !== line._id));
              toast.showSuccess("Règlement enregistré", `${nom} en est informé`);
            } catch (e: any) {
              toast.showError(e?.message || "Règlement non enregistré");
            } finally {
              setPaying(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: SettlementLine }) => {
    const nom = SettlementService.delivererName(item);
    const enCours = paying === item._id;

    return (
      <View
        className="rounded-2xl p-4 mb-3"
        style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <Text
              style={{ color: colors.textPrimary }}
              className="font-jakarta-bold text-base"
              numberOfLines={1}
            >
              {nom}
            </Text>
            <Text
              style={{ color: colors.textSecondary }}
              className="font-jakarta-medium text-sm mt-0.5"
              numberOfLines={1}
            >
              {item.label}
              {item.missionType === "CALL" ? " · appel" : ""}
            </Text>
            <Text style={{ color: colors.textTertiary }} className="font-jakarta text-xs mt-1">
              Terminée le{" "}
              {new Date(item.completedAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
          <Text style={{ color: colors.brandPrimary }} className="font-jakarta-bold text-base">
            {item.amount} FCFA
          </Text>
        </View>

        {item.status === "DUE" ? (
          <TouchableOpacity
            onPress={() => confirmerReglement(item)}
            disabled={enCours}
            activeOpacity={0.85}
            className="flex-row items-center justify-center rounded-xl py-2.5 mt-3.5"
            style={{ backgroundColor: colors.brandPrimary, opacity: enCours ? 0.6 : 1 }}
          >
            {enCours ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={17} color="#FFFFFF" />
                <Text className="text-white font-jakarta-semibold text-sm ml-1.5">
                  Marquer comme payée
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View
            className="flex-row items-center pt-3 mt-3"
            style={{ borderTopWidth: 1, borderTopColor: colors.borderLight }}
          >
            <Ionicons name="checkmark-done" size={15} color={colors.brandPrimary} />
            <Text style={{ color: colors.textSecondary }} className="font-jakarta-medium text-xs ml-1.5">
              Réglée
              {item.paidAt
                ? ` le ${new Date(item.paidAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
                : ""}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style="auto" />
      <AppHeader title="Règlements livreurs" onBack={() => router.back()} />

      <View className="flex-row px-5 pt-4" style={{ gap: 8 }}>
        {(["DUE", "PAID"] as const).map((k) => {
          const actif = tab === k;
          return (
            <TouchableOpacity
              key={k}
              onPress={() => setTab(k)}
              activeOpacity={0.85}
              className="rounded-full px-4 py-2"
              style={{
                backgroundColor: actif ? colors.brandPrimary : colors.card,
                borderWidth: 1,
                borderColor: actif ? colors.brandPrimary : colors.border,
              }}
            >
              <Text
                style={{ color: actif ? "#FFFFFF" : colors.textSecondary }}
                className="font-jakarta-semibold text-xs"
              >
                {k === "DUE" ? "À régler" : "Réglées"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {!loading && lines.length > 0 && (
        <View className="px-5 pt-4">
          <Text style={{ color: colors.textTertiary }} className="font-jakarta text-xs">
            {tab === "DUE" ? "Reste à payer" : "Total réglé"}
          </Text>
          <Text style={{ color: colors.textPrimary }} className="font-jakarta-bold text-2xl">
            {total} FCFA
          </Text>
        </View>
      )}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : (
        <FlatList
          data={lines}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: insets.bottom + 40,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.brandPrimary]}
              tintColor={colors.brandPrimary}
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-8" style={{ paddingTop: 60 }}>
              <Ionicons name="cash-outline" size={40} color={colors.textTertiary} />
              <Text
                style={{ color: colors.textPrimary }}
                className="font-jakarta-bold text-base mt-3 text-center"
              >
                {tab === "DUE" ? "Rien à régler" : "Aucun règlement"}
              </Text>
              <Text
                style={{ color: colors.textSecondary }}
                className="font-jakarta text-sm mt-1 text-center"
              >
                {tab === "DUE"
                  ? "Les courses terminées par vos livreurs apparaissent ici jusqu'à ce que vous les régliez."
                  : "Les courses que vous avez déclarées payées apparaîtront ici."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
