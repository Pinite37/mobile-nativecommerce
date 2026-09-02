import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "../../../../components/ui/AppHeader";
import { useTheme } from "../../../../contexts/ThemeContext";
import CommandeService, {
  Commande,
  CommandeStatus,
} from "../../../../services/api/CommandeService";

/**
 * Mes commandes.
 *
 * Cet écran affichait jusqu'ici des données entièrement factices (iPhone 14,
 * écouteurs…) : il n'y avait aucun objet « commande » dans le système à
 * afficher. Il devient réel maintenant que la Commande existe.
 */

const TABS: { key: "EN_COURS" | CommandeStatus; label: string }[] = [
  { key: "EN_COURS", label: "En cours" },
  { key: "LIVREE", label: "Livrées" },
  { key: "ANNULEE", label: "Annulées" },
];

const EN_COURS: CommandeStatus[] = ["PROPOSEE", "CONFIRMEE", "EN_LIVRAISON"];

export default function OrdersScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<"EN_COURS" | CommandeStatus>("EN_COURS");

  const load = useCallback(async () => {
    const list = await CommandeService.listMine();
    setCommandes(list);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const visible = commandes.filter((c) =>
    tab === "EN_COURS" ? EN_COURS.includes(c.status) : c.status === tab
  );

  const countFor = (key: "EN_COURS" | CommandeStatus) =>
    commandes.filter((c) => (key === "EN_COURS" ? EN_COURS.includes(c.status) : c.status === key)).length;

  const renderItem = ({ item }: { item: Commande }) => {
    const enterpriseName =
      typeof item.enterprise === "object" ? item.enterprise.companyName : "Boutique";
    const mustAct = item.status === "PROPOSEE";

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push(`/(app)/(client)/commande/${item._id}` as any)}
        className="rounded-2xl p-4 mb-3"
        style={{
          backgroundColor: colors.card,
          borderColor: mustAct ? colors.brandPrimary : colors.border,
          borderWidth: mustAct ? 1.5 : 1,
        }}
      >
        <View className="flex-row items-center justify-between mb-1.5">
          <Text
            style={{ color: mustAct ? colors.brandPrimary : colors.textSecondary }}
            className="font-jakarta-semibold text-xs uppercase"
            numberOfLines={1}
          >
            {CommandeService.statusLabel(item.status)}
          </Text>
          <Text style={{ color: colors.textTertiary }} className="font-jakarta text-xs">
            {new Date(item.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
          </Text>
        </View>

        <Text style={{ color: colors.textPrimary }} className="font-jakarta-bold text-base" numberOfLines={1}>
          {item.items?.[0]?.nameSnapshot || "Commande"}
          {item.items?.length > 1 ? ` + ${item.items.length - 1}` : ""}
        </Text>
        <Text style={{ color: colors.textSecondary }} className="font-jakarta-medium text-sm mt-0.5" numberOfLines={1}>
          {enterpriseName}
        </Text>

        <View
          className="flex-row items-center justify-between pt-3 mt-3"
          style={{ borderTopWidth: 1, borderTopColor: colors.borderLight }}
        >
          <Text style={{ color: colors.brandPrimary }} className="font-jakarta-bold text-base">
            {item.agreedTotal} FCFA
          </Text>
          {mustAct ? (
            <View className="flex-row items-center">
              <Text style={{ color: colors.brandPrimary }} className="font-jakarta-semibold text-xs mr-1">
                Confirmer
              </Text>
              <Ionicons name="chevron-forward" size={15} color={colors.brandPrimary} />
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={15} color={colors.textTertiary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style="auto" />
      <AppHeader title="Mes commandes" onBack={() => router.back()} />

      <View className="flex-row px-5 pt-4 pb-1" style={{ gap: 8 }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          const n = countFor(t.key);
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              activeOpacity={0.85}
              className="rounded-full px-3.5 py-2"
              style={{
                backgroundColor: active ? colors.brandPrimary : colors.card,
                borderWidth: 1,
                borderColor: active ? colors.brandPrimary : colors.border,
              }}
            >
              <Text
                style={{ color: active ? "#FFFFFF" : colors.textSecondary }}
                className="font-jakarta-semibold text-xs"
              >
                {t.label}{n > 0 ? ` (${n})` : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 14,
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
              <Ionicons name="receipt-outline" size={40} color={colors.textTertiary} />
              <Text style={{ color: colors.textPrimary }} className="font-jakarta-bold text-base mt-3 text-center">
                {tab === "EN_COURS" ? "Aucune commande en cours" : "Rien ici"}
              </Text>
              <Text style={{ color: colors.textSecondary }} className="font-jakarta text-sm mt-1 text-center">
                Vos commandes apparaissent ici dès qu&apos;une boutique vous en propose une dans la
                discussion.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
