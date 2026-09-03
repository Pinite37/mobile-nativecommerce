import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";

import { useTheme } from "../../contexts/ThemeContext";

export type LigneBandeauCommande = {
  id: string;
  icone: keyof typeof Ionicons.glyphMap;
  teinte: string;
  fond: string;
  titre: string;
  sousTitre: string;
  /** Marque une commande qui attend une action — mise en avant dans la fiche. */
  urgent?: boolean;
  /** Absent : la ligne n'est pas cliquable (cas entreprise, pas de fiche à ouvrir). */
  onPress?: () => void;
  action?: { texte: string; onPress: () => void; enCours?: boolean };
};

type Props = {
  lignes: LigneBandeauCommande[];
  restant: number;
  /** Complète « N commande(s) … » — ex. « en cours », « en cours avec ce client ». */
  texteRestant: string;
};

/**
 * Résumé des commandes en tête d'une conversation, détail en fiche.
 *
 * Une première version dépliait le détail en place, en tête du fil : la
 * `FlatList` des messages est juste en dessous dans le même flux, donc chaque
 * frame de l'animation de hauteur redimensionnait son conteneur — la liste de
 * messages se redessinait en continu, ce qui se percevait comme « la
 * conversation elle-même qui bouge ». Le détail vit maintenant dans une fiche
 * `Modal` : une couche native séparée du reste de l'écran, qui ne peut
 * structurellement plus affecter la taille de quoi que ce soit en dessous.
 * Reprend le langage déjà en place pour les fiches de sélection (ville,
 * quartier) : glissement depuis le bas, fond assombri, poignée.
 *
 * S'ouvre d'elle-même à la première apparition d'une commande qui exige une
 * action (ex. confirmer l'adresse) : une fiche `Modal` ne pousse rien dans le
 * flux de l'écran, donc l'ouvrir automatiquement ne recrée pas le défaut
 * corrigé plus haut. Ne se déclenche qu'une fois par visite de la
 * conversation — si l'utilisateur la referme, elle ne se rouvre pas toute
 * seule à chaque rafraîchissement des données ; le résumé en tête reste
 * coloré tant que l'action n'est pas faite, pour qu'elle reste trouvable.
 */
export default function CommandesBanner({ lignes, restant, texteRestant }: Props) {
  const { colors, isDark } = useTheme();
  const [ouvert, setOuvert] = useState(false);
  const dejaPropose = useRef(false);

  useEffect(() => {
    if (dejaPropose.current || lignes.length === 0) return;
    if (lignes.some((l) => l.urgent)) {
      dejaPropose.current = true;
      setOuvert(true);
    }
  }, [lignes]);

  if (lignes.length === 0) return null;

  const urgentes = lignes.filter((l) => l.urgent).length;
  const total = lignes.length + restant;

  const fermer = () => setOuvert(false);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOuvert(true)}
        activeOpacity={0.75}
        accessibilityRole="button"
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 10,
          backgroundColor: urgentes > 0 ? "rgba(16,185,129,0.08)" : colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderLight,
        }}
      >
        <Ionicons
          name={urgentes > 0 ? "alert-circle" : "receipt-outline"}
          size={16}
          color={urgentes > 0 ? colors.brandPrimary : colors.textTertiary}
        />
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            marginLeft: 9,
            color: urgentes > 0 ? colors.brandPrimary : colors.textPrimary,
            fontFamily: "PlusJakartaSans-Bold",
            fontSize: 12.5,
          }}
        >
          {total} commande{total > 1 ? "s" : ""} {texteRestant}
          {urgentes > 0 ? ` · ${urgentes} à traiter` : ""}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal animationType="slide" transparent visible={ouvert} onRequestClose={fermer}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <Pressable
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            onPress={fermer}
          />
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              maxHeight: "75%",
              paddingBottom: 24,
            }}
          >
            <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 6 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingBottom: 14,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                  backgroundColor: isDark ? "rgba(16,185,129,0.2)" : "#ECFDF5",
                }}
              >
                <Ionicons name="receipt-outline" size={17} color={colors.brandPrimary} />
              </View>
              <Text style={{ flex: 1, color: colors.textPrimary, fontFamily: "PlusJakartaSans-Bold", fontSize: 17 }}>
                {total} commande{total > 1 ? "s" : ""} {texteRestant}
              </Text>
              <TouchableOpacity
                onPress={fermer}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.tertiary,
                }}
              >
                <Ionicons name="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 16, gap: 10 }}>
              {lignes.map((l) => (
                <TouchableOpacity
                  key={l.id}
                  activeOpacity={l.onPress ? 0.9 : 1}
                  disabled={!l.onPress}
                  onPress={() => {
                    if (l.onPress) {
                      l.onPress();
                      fermer();
                    }
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    borderRadius: 16,
                    backgroundColor: l.fond,
                    borderWidth: l.urgent ? 0 : 1,
                    borderColor: colors.border,
                  }}
                >
                  <Ionicons name={l.icone} size={17} color={l.teinte} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text
                      numberOfLines={1}
                      style={{ color: colors.textPrimary, fontFamily: "PlusJakartaSans-SemiBold", fontSize: 13.5 }}
                    >
                      {l.titre}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: l.urgent ? l.teinte : colors.textSecondary,
                        fontFamily: "PlusJakartaSans-Medium",
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {l.sousTitre}
                    </Text>
                  </View>

                  {l.action ? (
                    <TouchableOpacity
                      onPress={l.action.onPress}
                      disabled={l.action.enCours}
                      activeOpacity={0.85}
                      style={{
                        backgroundColor: colors.brandPrimary,
                        borderRadius: 10,
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                        opacity: l.action.enCours ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontFamily: "PlusJakartaSans-Bold", fontSize: 12.5 }}>
                        {l.action.enCours ? "…" : l.action.texte}
                      </Text>
                    </TouchableOpacity>
                  ) : l.onPress ? (
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  ) : null}
                </TouchableOpacity>
              ))}

              {restant > 0 && (
                <Text
                  style={{
                    textAlign: "center",
                    color: colors.textSecondary,
                    fontFamily: "PlusJakartaSans-Medium",
                    fontSize: 12,
                    paddingTop: 2,
                  }}
                >
                  + {restant} autre{restant > 1 ? "s" : ""} {texteRestant}
                </Text>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
