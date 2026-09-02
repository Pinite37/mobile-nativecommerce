import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { Commande } from "../../services/api/CommandeService";

/**
 * Frise des étapes d'une livraison, du colis récupéré à la remise.
 *
 * Le client voyait un statut isolé — « Un livreur a pris la course » — sans
 * savoir ce qui restait à venir. La frise répond à la seule question qu'il
 * se pose vraiment : où en est mon colis, et qu'est-ce qui vient après.
 *
 * Chaque segment se remplit par animation quand l'étape est franchie, plutôt
 * que d'apparaître déjà vert : le mouvement est ce qui signale qu'il vient de
 * se passer quelque chose.
 */

interface Step {
  key: string;
  title: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const STEPS: Step[] = [
  { key: "CONFIRMEE", title: "Commande confirmée", detail: "Vous avez indiqué où livrer", icon: "checkmark-circle-outline" },
  { key: "ASSIGNED", title: "Livreur assigné", detail: "Un livreur a pris la course", icon: "person-outline" },
  { key: "PICKED_UP", title: "Colis récupéré", detail: "Le livreur a le colis en main", icon: "cube-outline" },
  { key: "COMPLETED", title: "Livré", detail: "Le colis vous a été remis", icon: "home-outline" },
];

/** Combien d'étapes sont franchies, d'après l'état réel de la commande. */
function reachedIndex(commande: Commande): number {
  const missionStatus = commande.delivery?.status;
  if (commande.status === "LIVREE" || missionStatus === "COMPLETED") return 3;
  if (missionStatus === "PICKED_UP") return 2;
  if (missionStatus === "ASSIGNED") return 1;
  if (["CONFIRMEE", "EN_LIVRAISON"].includes(commande.status)) return 0;
  return -1;
}

export default function DeliveryTimeline({ commande }: { commande: Commande }) {
  const { colors } = useTheme();
  const index = reachedIndex(commande);

  // Une valeur animée par segment : chacun se remplit indépendamment, ce qui
  // permet d'animer uniquement celui qui vient d'être franchi.
  const fills = useRef(STEPS.map(() => new Animated.Value(0))).current;
  const previous = useRef(-1);

  useEffect(() => {
    STEPS.forEach((_, i) => {
      const target = i <= index ? 1 : 0;
      // Au premier rendu, les étapes déjà franchies sont posées sans
      // animation : rejouer toute l'histoire à chaque ouverture donnerait
      // l'impression que tout vient de se produire.
      const instant = previous.current === -1 && i < index;
      Animated.timing(fills[i], {
        toValue: target,
        duration: instant ? 0 : 420,
        delay: instant ? 0 : Math.max(0, i - Math.max(previous.current, 0)) * 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    });
    previous.current = index;
  }, [index, fills]);

  if (index < 0) return null;

  return (
    <View
      className="rounded-2xl p-4 mb-3.5"
      style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
    >
      <Text
        style={{ color: colors.textTertiary, letterSpacing: 0.7 }}
        className="font-jakarta-semibold text-xs uppercase mb-3.5 ml-0.5"
      >
        Suivi de la livraison
      </Text>

      {STEPS.map((step, i) => {
        const done = i <= index;
        const isLast = i === STEPS.length - 1;

        return (
          <View key={step.key} className="flex-row">
            {/* Colonne pastille + segment */}
            <View style={{ width: 26, alignItems: "center" }}>
              <Animated.View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  borderWidth: 2,
                  alignItems: "center",
                  justifyContent: "center",
                  borderColor: fills[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [colors.border, colors.brandPrimary],
                  }),
                  backgroundColor: fills[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: ["transparent", colors.brandPrimary],
                  }),
                }}
              >
                {done && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </Animated.View>

              {!isLast && (
                <View
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 34,
                    backgroundColor: colors.border,
                    marginVertical: 3,
                    overflow: "hidden",
                  }}
                >
                  {/* Le trait se remplit du haut vers le bas — le sens de
                      progression que l'œil attend. */}
                  <Animated.View
                    style={{
                      width: 2,
                      backgroundColor: colors.brandPrimary,
                      height: fills[i + 1].interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0%", "100%"],
                      }),
                    }}
                  />
                </View>
              )}
            </View>

            <View style={{ flex: 1, marginLeft: 12, paddingBottom: isLast ? 0 : 14 }}>
              <Text
                style={{ color: done ? colors.textPrimary : colors.textTertiary }}
                className={done ? "font-jakarta-semibold text-sm" : "font-jakarta-medium text-sm"}
              >
                {step.title}
              </Text>
              <Text
                style={{ color: done ? colors.textSecondary : colors.textTertiary }}
                className="font-jakarta text-xs mt-0.5"
              >
                {step.detail}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
