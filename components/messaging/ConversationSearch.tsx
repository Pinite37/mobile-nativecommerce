import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import MessagingService, {
  ConversationSearchHit,
} from "../../services/api/MessagingService";

/**
 * Recherche dans une conversation.
 *
 * Devenue nécessaire avec l'unification des fils : un fil couvre désormais
 * toute la relation avec une entreprise et s'allonge indéfiniment. Retrouver
 * « ce qu'on s'était dit sur tel produit » ne se fait plus en ouvrant le bon
 * fil — il faut pouvoir chercher dedans.
 *
 * Chercher un nom de produit tombe aussi sur son repère « À propos de : … »,
 * ce qui ramène directement au passage concerné.
 */

const DEBOUNCE_MS = 350;

interface Props {
  conversationId: string;
  visible: boolean;
  onClose: () => void;
  /** Appelé au tap sur un résultat, si le message est chargé à l'écran. */
  onJumpToMessage?: (messageId: string) => void;
}

export default function ConversationSearch({
  conversationId,
  visible,
  onClose,
  onJumpToMessage,
}: Props) {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ConversationSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      // Léger délai : sur iOS, focus immédiat après montage ne lève pas le clavier.
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
    setQuery("");
    setHits([]);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const found = await MessagingService.searchInConversation(conversationId, q);
      setHits(found);
      setSearching(false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, visible, conversationId]);

  if (!visible) return null;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 }}>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.secondary,
            borderRadius: 12,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="search" size={16} color={colors.textTertiary} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher dans la discussion…"
            placeholderTextColor={colors.textTertiary}
            autoCorrect={false}
            returnKeyType="search"
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 9,
              color: colors.textPrimary,
              fontFamily: "Poppins-Medium",
              fontSize: 14,
            }}
          />
          {searching ? (
            <ActivityIndicator size="small" color={colors.brandPrimary} />
          ) : query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={10}>
              <Ionicons name="close-circle" size={17} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
          hitSlop={10}
          style={{ marginLeft: 12 }}
        >
          <Text style={{ color: colors.brandPrimary }} className="font-poppins-semibold text-sm">
            Fermer
          </Text>
        </TouchableOpacity>
      </View>

      {query.trim().length >= 2 && !searching && (
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 300 }}>
          {hits.length === 0 ? (
            <Text
              style={{
                paddingHorizontal: 16,
                paddingBottom: 16,
                color: colors.textSecondary,
                fontFamily: "Poppins-Medium",
                fontSize: 13,
              }}
            >
              Aucun message ne contient « {query.trim()} ».
            </Text>
          ) : (
            hits.map((h) => {
              const isMarker = h.messageType === "SYSTEM";
              return (
                <TouchableOpacity
                  key={h._id}
                  onPress={() => onJumpToMessage?.(h._id)}
                  activeOpacity={0.7}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 11,
                    borderTopWidth: 1,
                    borderTopColor: colors.borderLight,
                    flexDirection: "row",
                    alignItems: "flex-start",
                  }}
                >
                  <Ionicons
                    name={isMarker ? "pricetag-outline" : "chatbubble-outline"}
                    size={14}
                    color={isMarker ? colors.brandPrimary : colors.textTertiary}
                    style={{ marginTop: 2 }}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text
                      style={{ color: colors.textPrimary }}
                      className="font-poppins-medium text-sm"
                      numberOfLines={2}
                    >
                      {h.text}
                    </Text>
                    <Text style={{ color: colors.textTertiary }} className="font-poppins text-xs mt-0.5">
                      {h.sender?.firstName ? `${h.sender.firstName} · ` : ""}
                      {formatDate(h.createdAt)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}
