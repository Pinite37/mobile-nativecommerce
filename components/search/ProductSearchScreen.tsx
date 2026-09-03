import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../contexts/AuthContext";
import { useFavorites, useToggleFavorite } from "../../hooks/useFavorites";
import { useTheme } from "../../contexts/ThemeContext";
import i18n from "../../i18n/i18n";
import ProductService from "../../services/api/ProductService";
import SearchService from "../../services/api/SearchService";
import SearchCacheService, { RecentSearch } from "../../services/SearchCacheService";
import { messageDErreur } from "../../utils/apiError";

/**
 * Recherche — écran plein, partagé par les espaces client et entreprise.
 *
 * Les deux avaient la même recherche, dupliquée : deux fois les mêmes états,
 * les mêmes panneaux superposés, les mêmes défauts. Elle vit ici une seule
 * fois ; seul le chemin d'ouverture d'un produit change d'un espace à l'autre,
 * et il arrive en paramètre.
 *
 * Elle vivait auparavant dans l'accueil, sous forme de panneaux superposés
 * pilotés par cinq booléens (`showSuggestions`, `showRecentSearches`,
 * `showSearchResults`…) au milieu d'un fichier de 1 600 lignes. Trois défauts
 * en découlaient : le bouton retour de l'appareil devait être intercepté à la
 * main pour refermer les couches, les résultats n'avaient pas la place de
 * respirer, et rien n'était partageable ni ré-adressable.
 *
 * Un écran a une adresse, un état propre, et le retour système fonctionne
 * sans code. Les filtres de l'accueil (ville, quartier, tri) arrivent en
 * paramètres pour que la recherche porte sur le même périmètre que ce que
 * l'utilisateur voyait juste avant.
 */

type EtatRecherche = "repos" | "suggestions" | "chargement" | "resultats" | "erreur";

const DELAI_SUGGESTIONS_MS = 280;
const TAILLE_PAGE = 20;

type Props = {
  /** Ouvre la fiche d'un produit. Le chemin diffère selon l'espace (client ou entreprise). */
  ouvrirProduit: (id: string) => void;
  /** Appelé quand une action exige d'être connecté. */
  demanderConnexion?: () => void;
};

export default function ProductSearchScreen({ ouvrirProduit, demanderConnexion }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();

  const params = useLocalSearchParams<{
    q?: string;
    city?: string;
    district?: string;
    sort?: string;
  }>();

  const [saisie, setSaisie] = useState(params.q ?? "");
  const [requeteLancee, setRequeteLancee] = useState("");
  const [etat, setEtat] = useState<EtatRecherche>("repos");
  const [resultats, setResultats] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [recentes, setRecentes] = useState<RecentSearch[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [encorePlus, setEncorePlus] = useState(false);
  const [chargeSuite, setChargeSuite] = useState(false);
  const [messageErreur, setMessageErreur] = useState("");

  const champRef = useRef<TextInput>(null);
  const minuteurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Le rang de la requête évite qu'une réponse lente à « ch » n'écrase les
  // résultats de « chaussure » tapé juste après.
  const rangRef = useRef(0);

  const filtres = useMemo(
    () => ({
      city: params.city || undefined,
      district: params.district || undefined,
      sort: params.sort || undefined,
    }),
    [params.city, params.district, params.sort],
  );

  const { data: favoris } = useFavorites();
  const { mutate: basculer } = useToggleFavorite();

  // ─── Recherches récentes ────────────────────────────────────────────────
  const chargerRecentes = useCallback(async () => {
    try {
      setRecentes(await SearchCacheService.getRecentSearches());
    } catch {
      setRecentes([]);
    }
  }, []);

  useEffect(() => {
    chargerRecentes();
    // Le clavier s'ouvre seul : on arrive ici pour taper, pas pour regarder.
    const t = setTimeout(() => champRef.current?.focus(), 220);
    return () => clearTimeout(t);
  }, [chargerRecentes]);

  // Une requête passée en paramètre est jouée immédiatement.
  useEffect(() => {
    if (params.q?.trim()) lancer(params.q.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Suggestions ────────────────────────────────────────────────────────
  const onChangeSaisie = (texte: string) => {
    setSaisie(texte);
    if (minuteurRef.current) clearTimeout(minuteurRef.current);

    const terme = texte.trim();
    if (terme.length < 2) {
      setSuggestions([]);
      if (etat !== "resultats") setEtat("repos");
      return;
    }

    minuteurRef.current = setTimeout(async () => {
      const rang = ++rangRef.current;
      try {
        const s = await SearchService.getSuggestions(terme, 8);
        if (rang !== rangRef.current) return;
        setSuggestions(Array.isArray(s) ? s : []);
        setEtat("suggestions");
      } catch {
        if (rang === rangRef.current) setSuggestions([]);
      }
    }, DELAI_SUGGESTIONS_MS);
  };

  // ─── Recherche ──────────────────────────────────────────────────────────
  const extraireResultats = (reponse: any): any[] => {
    if (Array.isArray(reponse?.data)) return reponse.data;
    if (Array.isArray(reponse?.products)) return reponse.products;
    if (Array.isArray(reponse)) return reponse;
    return [];
  };

  const extraireTotal = (reponse: any, recus: number): number | null => {
    const t = reponse?.searchInfo?.totalResults ?? reponse?.pagination?.total;
    return typeof t === "number" ? t : recus;
  };

  const lancer = useCallback(
    async (terme: string) => {
      const q = terme.trim();
      if (!q) return;

      Keyboard.dismiss();
      if (minuteurRef.current) clearTimeout(minuteurRef.current);
      const rang = ++rangRef.current;

      setSaisie(q);
      setRequeteLancee(q);
      setSuggestions([]);
      setEtat("chargement");
      setPage(1);
      setMessageErreur("");

      try {
        const reponse = await ProductService.searchPublicProducts(q, {
          ...filtres,
          page: 1,
          limit: TAILLE_PAGE,
        } as any);
        if (rang !== rangRef.current) return;

        const liste = extraireResultats(reponse);
        setResultats(liste);
        setTotal(extraireTotal(reponse, liste.length));
        setEncorePlus(liste.length >= TAILLE_PAGE);
        setEtat("resultats");

        // Le cache ne doit jamais faire échouer un affichage réussi.
        try {
          await SearchCacheService.addToRecentSearches(q, liste.length);
          await chargerRecentes();
        } catch {
          /* cache indisponible */
        }
      } catch (e: any) {
        if (rang !== rangRef.current) return;
        setMessageErreur(messageDErreur(e));
        setEtat("erreur");
      }
    },
    [filtres, chargerRecentes],
  );

  const chargerSuite = useCallback(async () => {
    if (chargeSuite || !encorePlus || etat !== "resultats" || !requeteLancee) return;
    setChargeSuite(true);
    try {
      const suivante = page + 1;
      const reponse = await ProductService.searchPublicProducts(requeteLancee, {
        ...filtres,
        page: suivante,
        limit: TAILLE_PAGE,
      } as any);
      const liste = extraireResultats(reponse);
      setResultats((prev) => [...prev, ...liste]);
      setPage(suivante);
      setEncorePlus(liste.length >= TAILLE_PAGE);
    } catch {
      // Un échec de page suivante ne doit pas effacer ce qui est déjà affiché.
      setEncorePlus(false);
    } finally {
      setChargeSuite(false);
    }
  }, [chargeSuite, encorePlus, etat, requeteLancee, page, filtres]);

  const effacer = () => {
    setSaisie("");
    setResultats([]);
    setSuggestions([]);
    setRequeteLancee("");
    setTotal(null);
    setEtat("repos");
    champRef.current?.focus();
  };

  const basculerFavori = (id: string) => {
    if (!isAuthenticated) {
      demanderConnexion?.();
      return;
    }
    basculer({ id, estFavori: favoris?.has(id) ?? false });
  };

  const formaterPrix = (p: number) =>
    `${new Intl.NumberFormat("fr-FR").format(p ?? 0)} FCFA`;

  // ─── Rendus ─────────────────────────────────────────────────────────────
  const carteProduit = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => ouvrirProduit(item._id)}
      style={{
        flex: 1,
        margin: 6,
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 18,
        overflow: "hidden",
      }}
    >
      <View>
        <Image
          source={{ uri: item.images?.[0] }}
          style={{ width: "100%", height: 132, backgroundColor: colors.tertiary }}
          contentFit="cover"
        />
        {isAuthenticated && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              basculerFavori(item._id);
            }}
            hitSlop={8}
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 30,
              height: 30,
              borderRadius: 15,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.92)",
            }}
          >
            <Ionicons
              name={favoris?.has(item._id) ? "heart" : "heart-outline"}
              size={15}
              color={favoris?.has(item._id) ? "#EF4444" : colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      <View style={{ padding: 10 }}>
        <Text
          numberOfLines={1}
          style={{ color: colors.textSecondary, fontFamily: "PlusJakartaSans-Medium", fontSize: 11 }}
        >
          {item.category?.name || "Divers"}
        </Text>
        <Text
          numberOfLines={2}
          style={{
            color: colors.textPrimary,
            fontFamily: "PlusJakartaSans-Bold",
            fontSize: 13,
            lineHeight: 18,
            marginTop: 2,
            minHeight: 36,
          }}
        >
          {item.name}
        </Text>
        <Text
          style={{
            color: colors.brandPrimary,
            fontFamily: "PlusJakartaSans-Bold",
            fontSize: 14,
            marginTop: 4,
          }}
        >
          {formaterPrix(item.price)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  /**
   * Une ligne de liste — suggestion ou recherche récente.
   *
   * TouchableOpacity et non Pressable : avec la transformation JSX de
   * NativeWind, la forme `style={({pressed}) => ({...})}` n'est pas appliquée.
   * La ligne se rendait donc sans `flexDirection: "row"` — icône au-dessus du
   * texte, flèche en dessous. Tous les autres Pressable du projet passent un
   * objet statique, ce qui fonctionne ; le style-fonction est le seul cas
   * fautif, et il n'existait qu'ici.
   */
  const ligne = (
    icone: keyof typeof Ionicons.glyphMap,
    texte: string,
    onPress: () => void,
    options?: {
      onSupprimer?: () => void;
      sousTexte?: string;
      surligner?: string;
      accent?: boolean;
    },
  ) => {
    const { onSupprimer, sousTexte, surligner, accent } = options ?? {};

    const morceaux = (() => {
      const terme = (surligner ?? "").trim();
      if (!terme) return [{ t: texte, fort: false }];
      const i = texte.toLowerCase().indexOf(terme.toLowerCase());
      if (i < 0) return [{ t: texte, fort: false }];
      return [
        { t: texte.slice(0, i), fort: false },
        { t: texte.slice(i, i + terme.length), fort: true },
        { t: texte.slice(i + terme.length), fort: false },
      ].filter((p) => p.t.length > 0);
    })();

    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.6}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: accent ? colors.brandPrimary : colors.tertiary,
          }}
        >
          <Ionicons
            name={icone}
            size={16}
            color={accent ? "#FFFFFF" : colors.textSecondary}
          />
        </View>

        <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
          <Text numberOfLines={1} style={{ fontSize: 14.5, lineHeight: 19 }}>
            {morceaux.map((p, k) => (
              <Text
                key={k}
                style={{
                  fontFamily: p.fort ? "PlusJakartaSans-Bold" : "PlusJakartaSans-Medium",
                  color: colors.textPrimary,
                }}
              >
                {p.t}
              </Text>
            ))}
          </Text>
          {!!sousTexte && (
            <Text
              numberOfLines={1}
              style={{
                color: colors.textTertiary,
                fontFamily: "PlusJakartaSans-Regular",
                fontSize: 11.5,
                marginTop: 2,
              }}
            >
              {sousTexte}
            </Text>
          )}
        </View>

        {onSupprimer && (
          <TouchableOpacity onPress={onSupprimer} hitSlop={12} style={{ padding: 4 }}>
            <Ionicons name="close" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  /** Filet de séparation aligné sur le texte, pas sur le bord de l'écran. */
  const separateur = () => (
    <View style={{ height: 1, backgroundColor: colors.borderLight, marginLeft: 64 }} />
  );

  const entete = (titre: string, action?: { texte: string; onPress: () => void }) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 8,
      }}
    >
      <Text
        style={{
          color: colors.textTertiary,
          fontFamily: "PlusJakartaSans-Bold",
          fontSize: 10.5,
          letterSpacing: 0.8,
          textTransform: "uppercase",
        }}
      >
        {titre}
      </Text>
      {action && (
        <TouchableOpacity onPress={action.onPress} hitSlop={8}>
          <Text style={{ color: colors.brandPrimary, fontFamily: "PlusJakartaSans-SemiBold", fontSize: 12.5 }}>
            {action.texte}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const messageCentre = (
    icone: keyof typeof Ionicons.glyphMap,
    titre: string,
    detail?: string,
    action?: { texte: string; onPress: () => void },
  ) => (
    <View style={{ alignItems: "center", paddingHorizontal: 40, paddingTop: 72 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.tertiary,
        }}
      >
        <Ionicons name={icone} size={24} color={colors.textSecondary} />
      </View>
      <Text
        style={{
          color: colors.textPrimary,
          fontFamily: "PlusJakartaSans-Bold",
          fontSize: 15,
          marginTop: 16,
          textAlign: "center",
        }}
      >
        {titre}
      </Text>
      {!!detail && (
        <Text
          style={{
            color: colors.textSecondary,
            fontFamily: "PlusJakartaSans-Regular",
            fontSize: 13,
            marginTop: 6,
            textAlign: "center",
            lineHeight: 19,
          }}
        >
          {detail}
        </Text>
      )}
      {action && (
        <TouchableOpacity
          onPress={action.onPress}
          style={{
            marginTop: 18,
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: colors.brandPrimary,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontFamily: "PlusJakartaSans-Bold", fontSize: 13 }}>
            {action.texte}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const corps = () => {
    if (etat === "chargement") {
      return (
        <View style={{ paddingTop: 80, alignItems: "center" }}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      );
    }

    if (etat === "erreur") {
      return messageCentre("cloud-offline-outline", "Recherche impossible", messageErreur, {
        texte: "Réessayer",
        onPress: () => lancer(requeteLancee || saisie),
      });
    }

    if (etat === "resultats") {
      if (resultats.length === 0) {
        return messageCentre(
          "search-outline",
          i18n.t("client.home.searchResults.noResults"),
          i18n.t("client.home.searchResults.noResultsMessage"),
        );
      }
      return (
        <FlatList
          key="resultats"
          data={resultats}
          renderItem={carteProduit}
          keyExtractor={(item) => item._id}
          numColumns={2}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: insets.bottom + 24 }}
          ListHeaderComponent={
            <Text
              style={{
                color: colors.textSecondary,
                fontFamily: "PlusJakartaSans-Medium",
                fontSize: 12.5,
                paddingHorizontal: 6,
                paddingTop: 14,
                paddingBottom: 4,
              }}
            >
              {i18n.t("client.home.searchResults.resultsCount", { count: total ?? resultats.length })}
            </Text>
          }
          onEndReached={chargerSuite}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            chargeSuite ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator color={colors.brandPrimary} />
              </View>
            ) : null
          }
        />
      );
    }

    if (etat === "suggestions" && suggestions.length > 0) {
      return (
        <FlatList
          key="suggestions"
          data={suggestions}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item, i) => `${item?.text ?? item?.name ?? i}-${i}`}
          ItemSeparatorComponent={separateur}
          ListHeaderComponent={
            <View>
              {ligne("search", `Rechercher « ${saisie.trim()} »`, () => lancer(saisie), {
                accent: true,
              })}
              {separateur()}
              {entete(i18n.t("client.home.search.suggestions"))}
            </View>
          }
          renderItem={({ item }) => {
            const texte = item?.text ?? item?.name ?? String(item);
            const type = item?.type ? i18n.t(`client.home.search.types.${item.type}`) : undefined;
            return ligne("search-outline", texte, () => lancer(texte), {
              sousTexte: type,
              surligner: saisie,
            });
          }}
        />
      );
    }

    // Repos : historique.
    if (recentes.length === 0) {
      return messageCentre(
        "search-outline",
        i18n.t("client.home.search.noRecentSearches"),
        "Tapez le nom d'un produit, d'une catégorie ou d'une entreprise.",
      );
    }

    return (
      <FlatList
        key="recentes"
        data={recentes}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item, i) => `${item.query}-${i}`}
          ItemSeparatorComponent={separateur}
        ListHeaderComponent={entete(i18n.t("client.home.search.recentSearches"), {
          texte: i18n.t("client.home.search.clearHistory"),
          onPress: async () => {
            await SearchCacheService.clearRecentSearches();
            chargerRecentes();
          },
        })}
        renderItem={({ item }) =>
          ligne("time-outline", item.query, () => lancer(item.query), {
            onSupprimer: async () => {
              await SearchCacheService.removeFromRecentSearches(item.query);
              chargerRecentes();
            },
          })
        }
      />
    );
  };

  const filtreActif = [params.city, params.district].filter(Boolean).join(" · ");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Barre de recherche */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingTop: 6,
          paddingBottom: 12,
          gap: 6,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          style={{ width: 40, height: 44, alignItems: "center", justifyContent: "center" }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.tertiary,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
            paddingHorizontal: 12,
            height: 46,
          }}
        >
          <Ionicons name="search" size={17} color={colors.textSecondary} />
          <TextInput
            ref={champRef}
            value={saisie}
            onChangeText={onChangeSaisie}
            onSubmitEditing={() => lancer(saisie)}
            placeholder={i18n.t("client.home.search.placeholder")}
            placeholderTextColor={colors.textSecondary}
            returnKeyType="search"
            autoCorrect={false}
            style={{
              flex: 1,
              marginLeft: 8,
              color: colors.textPrimary,
              fontFamily: "PlusJakartaSans-Medium",
              fontSize: 14.5,
              padding: 0,
            }}
          />
          {saisie.length > 0 && (
            <TouchableOpacity onPress={effacer} hitSlop={10}>
              <Ionicons name="close-circle" size={17} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Périmètre hérité de l'accueil : l'utilisateur doit savoir que sa
          recherche est restreinte, sinon un résultat vide est incompréhensible. */}
      {!!filtreActif && (
        <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingBottom: 10 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: colors.tertiary,
            }}
          >
            <Ionicons name="location" size={12} color={colors.brandPrimary} />
            <Text
              style={{
                marginLeft: 5,
                color: colors.textSecondary,
                fontFamily: "PlusJakartaSans-SemiBold",
                fontSize: 11.5,
              }}
            >
              {filtreActif}
            </Text>
          </View>
        </View>
      )}

      <View style={{ height: 1, backgroundColor: colors.border }} />

      <View style={{ flex: 1 }}>{corps()}</View>
    </View>
  );
}
