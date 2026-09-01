import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "../../../../components/ui/AppHeader";
import { useToast } from "../../../../components/ui/ToastManager";
import { useTheme } from "../../../../contexts/ThemeContext";
import CommandeService from "../../../../services/api/CommandeService";
import EnterpriseService from "../../../../services/api/EnterpriseService";

/**
 * Proposer une commande à un client, depuis la conversation.
 *
 * Écran à part entière et non plus une feuille superposée. Quatre tentatives
 * de faire cohabiter le clavier avec une vue en position absolue couvrant
 * tout l'écran ont échoué ; une route laisse le système s'en charger, et
 * supprime du même coup le fond cliquable, l'interception du bouton retour
 * Android et le pilotage manuel du clavier.
 *
 * Le formulaire est passé de six champs à trois : urgence, date d'expiration
 * et instructions spéciales étaient saisies puis jetées — `CommandeService`
 * ne les a jamais reçues. C'étaient des restes de l'époque où cet écran
 * créait directement une mission de livraison, avant l'objet Commande.
 */
export default function CreateCommandeScreen() {
  const { conversationId, clientId, productId, products, clientName } =
    useLocalSearchParams<{
      conversationId: string;
      clientId: string;
      productId: string;
      /** Produits abordés dans ce fil, sérialisés en JSON. */
      products?: string;
      clientName?: string;
    }>();

  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  // Un fil couvre toute la relation avec le client, donc plusieurs produits.
  // Sans ce choix, la commande partait toujours avec le dernier produit d'où
  // le client était arrivé — pas celui dont on venait de discuter.
  const threadProducts: { _id: string; name?: string; price?: number }[] = (() => {
    try {
      const parsed = JSON.parse(products || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const [selectedProductId, setSelectedProductId] = useState<string>(productId || "");
  const [agreedTotal, setAgreedTotal] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [paidBy, setPaidBy] = useState<"ENTREPRISE" | "CLIENT">("CLIENT");
  const [submitting, setSubmitting] = useState(false);
  // `null` tant qu'on ne sait pas : afficher l'avertissement par défaut
  // accuserait l'entreprise avant même d'avoir vérifié.
  const [hasPickupPoint, setHasPickupPoint] = useState<boolean | null>(null);

  useEffect(() => {
    EnterpriseService.listPickupPoints()
      .then((points) => setHasPickupPoint(points.some((p) => p.isActive !== false)))
      .catch(() => setHasPickupPoint(null));
  }, []);

  const total = Number(agreedTotal);
  const fee = Number(deliveryFee || 0);
  const totalIsValid = !!agreedTotal && !isNaN(total) && total > 0;
  const feeIsValid = !isNaN(fee) && fee >= 0;

  const handleSubmit = async () => {
    if (!clientId || !selectedProductId) {
      toast.showError("Choisissez le produit concerné par cette commande");
      return;
    }
    if (!totalIsValid) {
      toast.showError("Indiquez le montant sur lequel vous vous êtes mis d'accord");
      return;
    }
    if (!feeIsValid) {
      toast.showError("Les frais de livraison doivent être un nombre positif");
      return;
    }

    setSubmitting(true);
    try {
      await CommandeService.create({
        client: clientId,
        conversation: conversationId || undefined,
        items: [{ product: selectedProductId, quantity: 1, unitPrice: total }],
        agreedTotal: total,
        deliveryFee: fee,
        deliveryFeePaidBy: paidBy,
      });
      toast.showSuccess(
        "Commande proposée",
        "Le client va confirmer et indiquer son adresse de livraison"
      );
      router.back();
    } catch (e: any) {
      toast.showError(e?.message || "La commande n'a pas pu être proposée");
    } finally {
      setSubmitting(false);
    }
  };

  const renderAmountField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    icon: keyof typeof Ionicons.glyphMap,
    hint?: string
  ) => (
    <View className="mb-5">
      <Text
        style={{ color: colors.textTertiary, letterSpacing: 0.7 }}
        className="font-poppins-semibold text-xs uppercase mb-2 ml-1"
      >
        {label}
      </Text>
      <View
        className="flex-row items-center rounded-2xl px-4"
        style={{ backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border }}
      >
        <Ionicons name={icon} size={18} color={colors.textTertiary} />
        <TextInput
          value={value}
          onChangeText={(v) => onChange(v.replace(/[^0-9]/g, ""))}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          keyboardType="number-pad"
          style={{
            flex: 1,
            paddingVertical: 14,
            paddingHorizontal: 10,
            color: colors.textPrimary,
            fontFamily: "Poppins-SemiBold",
            fontSize: 16,
          }}
        />
        <Text style={{ color: colors.brandPrimary }} className="font-poppins-bold text-xs">
          FCFA
        </Text>
      </View>
      {!!hint && (
        <Text style={{ color: colors.textTertiary }} className="font-poppins text-xs mt-1.5 ml-1">
          {hint}
        </Text>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ExpoStatusBar style="auto" />
      <AppHeader
        title="Proposer une commande"
        subtitle={clientName || undefined}
        onBack={() => router.back()}
      />

      <KeyboardAwareScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={24}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
      >
        {hasPickupPoint === false && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push("/(app)/(enterprise)/profile/location-picker" as any)}
            className="flex-row items-center rounded-2xl p-3.5 mb-5"
            style={{
              backgroundColor: isDark ? "rgba(245,158,11,0.12)" : "#FEF6E7",
              borderWidth: 1,
              borderColor: isDark ? "rgba(245,158,11,0.3)" : "#F7E0B5",
            }}
          >
            <Ionicons name="storefront-outline" size={19} color={colors.warning} />
            <View className="flex-1 ml-3">
              <Text style={{ color: colors.textPrimary }} className="font-poppins-bold text-sm">
                Point de retrait manquant
              </Text>
              <Text style={{ color: colors.textSecondary }} className="font-poppins text-xs mt-0.5">
                Définissez-le pour pouvoir publier la livraison ensuite.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.warning} />
          </TouchableOpacity>
        )}

        {/* Choix du produit. Affiché seulement s'il y en a plusieurs :
            avec un seul, un sélecteur à une option est du bruit. */}
        {threadProducts.length > 1 && (
          <View className="mb-5">
            <Text
              style={{ color: colors.textTertiary, letterSpacing: 0.7 }}
              className="font-poppins-semibold text-xs uppercase mb-2 ml-1"
            >
              Produit concerné
            </Text>
            <View style={{ gap: 8 }}>
              {threadProducts.map((p) => {
                const isSelected = selectedProductId === p._id;
                return (
                  <TouchableOpacity
                    key={p._id}
                    onPress={() => setSelectedProductId(p._id)}
                    activeOpacity={0.85}
                    className="flex-row items-center rounded-2xl px-4 py-3"
                    style={{
                      backgroundColor: isSelected ? colors.brandLight : colors.secondary,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.brandPrimary : colors.border,
                    }}
                  >
                    <Ionicons
                      name={isSelected ? "radio-button-on" : "radio-button-off"}
                      size={19}
                      color={isSelected ? colors.brandPrimary : colors.border}
                    />
                    <View className="flex-1 ml-3">
                      <Text
                        style={{ color: isSelected ? colors.brandSecondary : colors.textPrimary }}
                        className="font-poppins-semibold text-sm"
                        numberOfLines={1}
                      >
                        {p.name || "Produit"}
                      </Text>
                      {typeof p.price === "number" && (
                        <Text
                          style={{ color: colors.textSecondary }}
                          className="font-poppins text-xs mt-0.5"
                        >
                          Prix affiché : {p.price.toLocaleString("fr-FR")} FCFA
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Un seul produit : on le rappelle sans en faire un choix, pour que
            l'entreprise sache sur quoi elle s'engage. */}
        {threadProducts.length === 1 && (
          <View
            className="flex-row items-center rounded-2xl px-4 py-3 mb-5"
            style={{ backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border }}
          >
            <Ionicons name="cube-outline" size={17} color={colors.textTertiary} />
            <Text
              style={{ color: colors.textPrimary }}
              className="font-poppins-semibold text-sm ml-2.5 flex-1"
              numberOfLines={1}
            >
              {threadProducts[0].name || "Produit"}
            </Text>
          </View>
        )}

        {renderAmountField(
          "Prix convenu",
          agreedTotal,
          setAgreedTotal,
          "Montant total négocié",
          "pricetag-outline",
          "Le montant sur lequel vous vous êtes mis d'accord dans la discussion."
        )}

        {renderAmountField(
          "Frais de livraison",
          deliveryFee,
          setDeliveryFee,
          "0",
          "bicycle-outline"
        )}

        <Text
          style={{ color: colors.textTertiary, letterSpacing: 0.7 }}
          className="font-poppins-semibold text-xs uppercase mb-2 ml-1"
        >
          Qui règle le livreur
        </Text>
        <View className="flex-row mb-6" style={{ gap: 10 }}>
          {([
            { value: "CLIENT" as const, title: "Le client", detail: "à la livraison" },
            { value: "ENTREPRISE" as const, title: "Vous", detail: "au retrait" },
          ]).map((option) => {
            const isSelected = paidBy === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                onPress={() => setPaidBy(option.value)}
                activeOpacity={0.85}
                className="flex-1 rounded-2xl px-4 py-3.5"
                style={{
                  backgroundColor: isSelected ? colors.brandLight : colors.secondary,
                  borderWidth: 1.5,
                  borderColor: isSelected ? colors.brandPrimary : colors.border,
                }}
              >
                <Text
                  style={{ color: isSelected ? colors.brandSecondary : colors.textPrimary }}
                  className="font-poppins-bold text-sm"
                >
                  {option.title}
                </Text>
                <Text
                  style={{ color: isSelected ? colors.brandPrimary : colors.textSecondary }}
                  className="font-poppins text-xs mt-0.5"
                >
                  {option.detail}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Récapitulatif : le client verra deux montants, l'entreprise doit
            voir la même chose avant d'envoyer. */}
        {totalIsValid && (
          <View
            className="rounded-2xl p-4"
            style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
          >
            <View className="flex-row items-center justify-between">
              <Text style={{ color: colors.textSecondary }} className="font-poppins-medium text-sm">
                Produit
              </Text>
              <Text style={{ color: colors.textPrimary }} className="font-poppins-semibold text-sm">
                {total.toLocaleString("fr-FR")} FCFA
              </Text>
            </View>
            <View className="flex-row items-center justify-between mt-2">
              <Text style={{ color: colors.textSecondary }} className="font-poppins-medium text-sm">
                Livraison · {paidBy === "CLIENT" ? "payée par le client" : "à votre charge"}
              </Text>
              <Text style={{ color: colors.textPrimary }} className="font-poppins-semibold text-sm">
                {fee.toLocaleString("fr-FR")} FCFA
              </Text>
            </View>
            <View
              className="flex-row items-center justify-between pt-3 mt-3"
              style={{ borderTopWidth: 1, borderTopColor: colors.borderLight }}
            >
              <Text style={{ color: colors.textPrimary }} className="font-poppins-bold text-sm">
                {paidBy === "CLIENT" ? "Le client règle" : "Le client règle"}
              </Text>
              <Text style={{ color: colors.brandPrimary }} className="font-poppins-bold text-lg">
                {(paidBy === "CLIENT" ? total + fee : total).toLocaleString("fr-FR")} FCFA
              </Text>
            </View>
          </View>
        )}
      </KeyboardAwareScrollView>

      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
          backgroundColor: colors.background,
        }}
      >
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={submitting || !totalIsValid || !selectedProductId}
          activeOpacity={0.88}
          className="flex-row items-center justify-center rounded-2xl py-4"
          style={{ backgroundColor: colors.brandPrimary, opacity: submitting || !totalIsValid || !selectedProductId ? 0.5 : 1 }}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={19} color="#FFFFFF" />
              <Text className="text-white font-poppins-bold text-base ml-2">
                Proposer la commande
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
