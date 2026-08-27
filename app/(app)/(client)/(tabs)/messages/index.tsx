import ConversationPreviewStore from "../../../../../services/ConversationPreviewStore";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";
import { useTheme } from "@/contexts/ThemeContext";
import i18n from "@/i18n/i18n";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image } from "expo-image";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../../../../../components/ui/ReanimatedToast/context";
import { Shimmer } from "../../../../../components/ui/Shimmer";
import { useSocket } from "../../../../../hooks/useSocket";
import MessagingService, {
  Conversation,
} from "../../../../../services/api/MessagingService";

const SkeletonCard = () => (
  <View className="rounded-2xl mx-4 my-2 p-4 bg-white shadow-sm border border-neutral-50">
    <View className="flex-row items-center">
      {/* Avatar skeleton */}
      <Shimmer style={{ width: 56, height: 56, borderRadius: 28 }} />

      {/* Content skeleton */}
      <View className="ml-4 flex-1">
        <View className="flex-row items-center justify-between mb-2">
          <Shimmer style={{ height: 18, borderRadius: 8, width: "60%" }} />
          <Shimmer style={{ height: 12, borderRadius: 6, width: "20%" }} />
        </View>

        {/* Product info skeleton */}
        <View className="flex-row items-center mb-2">
          <Shimmer
            style={{ width: 20, height: 20, borderRadius: 6, marginRight: 8 }}
          />
          <Shimmer style={{ height: 12, borderRadius: 6, width: "50%" }} />
        </View>

        {/* Message preview skeleton */}
        <Shimmer
          style={{ height: 14, borderRadius: 6, width: "90%", marginBottom: 4 }}
        />
        <Shimmer style={{ height: 14, borderRadius: 6, width: "70%" }} />
      </View>
    </View>
  </View>
);

export default function ClientMessagesPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locale } = useLocale();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { onNewMessage, onMessagesRead } = useSocket();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading: loading, refetch: refetchConversations, error: conversationsError } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => { const d = await MessagingService.getUserConversations(); return d || []; },
    staleTime: 30_000,
    retry: 1,
  });

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return conversations;
    const lower = searchQuery.trim().toLowerCase();
    return conversations.filter((conv) => {
      const otherParticipant = conv.otherParticipant || conv.participants?.find((p) => (p as any)?._id !== (conv as any)?.userId);
      const participantName = otherParticipant ? `${otherParticipant.firstName} ${otherParticipant.lastName}`.toLowerCase() : "";
      const productName = (conv.product?.name || "").toLowerCase();
      const lastMessageText = (conv.lastMessage?.text || "").toLowerCase();
      return participantName.includes(lower) || productName.includes(lower) || lastMessageText.includes(lower);
    });
  }, [conversations, searchQuery]);
  const [animatingConversations, setAnimatingConversations] = useState<Set<string>>(new Set());

  // États pour le menu contextuel
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [contextMenuLoading, setContextMenuLoading] = useState(false);

  // Fonctions helper pour les notifications
  const notifySuccess = React.useCallback(
    (title: string, message?: string) => {
      try {
        showToast({ title, subtitle: message, autodismiss: true });
      } catch {}
    },
    [showToast]
  );

  const notifyError = React.useCallback(
    (title: string, message?: string) => {
      try {
        showToast({ title, subtitle: message, autodismiss: true });
      } catch {}
    },
    [showToast]
  );

  const notifyInfo = React.useCallback(
    (title: string, message?: string) => {
      try {
        showToast({ title, subtitle: message, autodismiss: true });
      } catch {}
    },
    [showToast]
  );

  const SkeletonCard = () => (
    <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="rounded-2xl mx-4 my-2 p-4 shadow-sm border">
      <View className="flex-row items-center">
        <Shimmer style={{ width: 56, height: 56, borderRadius: 28 }} />
        <View className="ml-4 flex-1">
          <View className="flex-row items-center justify-between mb-2">
            <Shimmer style={{ height: 18, borderRadius: 8, width: "60%" }} />
            <Shimmer style={{ height: 12, borderRadius: 6, width: "20%" }} />
          </View>
          <View className="flex-row items-center mb-2">
            <Shimmer
              style={{ width: 20, height: 20, borderRadius: 6, marginRight: 8 }}
            />
            <Shimmer style={{ height: 12, borderRadius: 6, width: "50%" }} />
          </View>
          <Shimmer
            style={{ height: 14, borderRadius: 6, width: "90%", marginBottom: 4 }}
          />
          <Shimmer style={{ height: 14, borderRadius: 6, width: "70%" }} />
        </View>
      </View>
    </View>
  );

  // Fonction utilitaire pour classifier les erreurs
  const classifyError = (error: any) => {
    // Erreurs réseau
    if (
      error.message?.includes("Network") ||
      error.message?.includes("fetch") ||
      error.code === "NETWORK_ERROR"
    ) {
      return {
        type: "network",
        title: i18n.t("client.messages.errors.network.title"),
        message: i18n.t("client.messages.errors.network.message"),
        userMessage: i18n.t("client.messages.errors.network.userMessage"),
      };
    }

    // Erreurs de serveur (5xx)
    if (
      error.status >= 500 ||
      error.message?.includes("Server") ||
      error.message?.includes("500")
    ) {
      return {
        type: "server",
        title: i18n.t("client.messages.errors.server.title"),
        message: i18n.t("client.messages.errors.server.message"),
        userMessage: i18n.t("client.messages.errors.server.userMessage"),
      };
    }

    // Erreurs d'authentification (401, 403)
    if (
      error.status === 401 ||
      error.status === 403 ||
      error.message?.includes("Unauthorized") ||
      error.message?.includes("Forbidden")
    ) {
      return {
        type: "auth",
        title: i18n.t("client.messages.errors.auth.title"),
        message: i18n.t("client.messages.errors.auth.message"),
        userMessage: i18n.t("client.messages.errors.auth.userMessage"),
      };
    }

    // Erreurs de validation (400)
    if (
      error.status === 400 ||
      error.message?.includes("Validation") ||
      error.message?.includes("Bad Request")
    ) {
      return {
        type: "validation",
        title: i18n.t("client.messages.errors.validation.title"),
        message: i18n.t("client.messages.errors.validation.message"),
        userMessage: i18n.t("client.messages.errors.validation.userMessage"),
      };
    }

    // Erreurs de ressource non trouvée (404)
    if (error.status === 404 || error.message?.includes("Not Found")) {
      return {
        type: "not_found",
        title: i18n.t("client.messages.errors.notFound.title"),
        message: i18n.t("client.messages.errors.notFound.message"),
        userMessage: i18n.t("client.messages.errors.notFound.userMessage"),
      };
    }

    // Erreur par défaut
    return {
      type: "unknown",
      title: i18n.t("client.messages.errors.unknown.title"),
      message: i18n.t("client.messages.errors.unknown.message"),
      userMessage: i18n.t("client.messages.errors.unknown.userMessage"),
    };
  };

  useEffect(() => {
    if (conversationsError) {
      const errorInfo = classifyError(conversationsError as any);
      notifyError(errorInfo.title, errorInfo.message);
      if (errorInfo.type === "auth") {
        setTimeout(() => router.replace("/(auth)/welcome"), 2000);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationsError]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchConversations();
    setRefreshing(false);
  };

  // Gestion du menu contextuel
  const handleLongPress = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setContextMenuVisible(true);
  };

  const handleArchiveConversation = () => {
    setContextMenuVisible(false);
    setSelectedConversation(null);
    // TODO: Implémenter l'archivage plus tard
  };

  const handleDeleteConversation = useCallback(async () => {
    if (!selectedConversation) return;

    setContextMenuLoading(true);

    try {
      await MessagingService.deleteConversation(selectedConversation._id);

      queryClient.setQueryData(['conversations'], (prev: Conversation[] = []) =>
        prev.filter((conv) => conv._id !== selectedConversation._id)
      );

      notifySuccess(
        i18n.t("client.messages.notifications.conversationDeleted.title"),
        i18n.t("client.messages.notifications.conversationDeleted.message")
      );
      setContextMenuVisible(false);
      setSelectedConversation(null);
    } catch (error: any) {
      console.error("❌ Erreur suppression conversation:", error);

      // Classifier l'erreur et notifier l'utilisateur
      const errorInfo = classifyError(error);
      notifyError(errorInfo.title, errorInfo.message);

      // Pour les erreurs d'authentification, rediriger vers la connexion
      if (errorInfo.type === "auth") {
        setTimeout(() => {
          router.replace("/(auth)/welcome");
        }, 2000);
      }
    } finally {
      setContextMenuLoading(false);
    }
  }, [selectedConversation, notifySuccess, notifyError, router]);

  const closeContextMenu = () => {
    setContextMenuVisible(false);
    setSelectedConversation(null);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  // Recharger les conversations au focus de la page
  useFocusEffect(
    useCallback(() => {
      refetchConversations();
    }, [refetchConversations])
  );

  // Abonnements Socket.IO pour mise à jour temps réel
  useEffect(() => {
    const cleanupNewMessage = onNewMessage((data: any) => {
      try {
        if (!data?.conversation || !data?.message) return;

        const isOwnMessage = data.message?.sender?._id === user?._id;
        
        // Marquer la conversation comme en animation seulement si ce n'est pas son propre message
        if (!isOwnMessage) {
          setAnimatingConversations(prev => new Set(prev).add(data.conversation._id));
          
          // Retirer l'animation après 500ms
          setTimeout(() => {
            setAnimatingConversations(prev => {
              const newSet = new Set(prev);
              newSet.delete(data.conversation._id);
              return newSet;
            });
          }, 500);
        }
        
        // Mettre à jour et remonter la conversation en haut
        queryClient.setQueryData(['conversations'], (prev: Conversation[] = []) => {
          const updated = prev.map((conv) => {
            if (conv._id !== data.conversation._id) return conv;
            return {
              ...conv,
              unreadCount: isOwnMessage ? (conv.unreadCount || 0) : (conv.unreadCount || 0) + 1,
              lastMessage: data.message,
              lastActivity: new Date().toISOString(),
            } as any;
          });
          return updated.sort((a, b) => {
            const dateA = new Date(a.lastActivity || a.lastMessage?.sentAt || 0).getTime();
            const dateB = new Date(b.lastActivity || b.lastMessage?.sentAt || 0).getTime();
            return dateB - dateA;
          });
        });
      } catch (e) {
        console.error("❌ Erreur critique Socket.IO new_message:", e);
        notifyError(
          i18n.t("client.messages.notifications.syncError.title"),
          i18n.t("client.messages.notifications.syncError.message")
        );
      }
    });

    const cleanupMessagesRead = onMessagesRead((data: any) => {
      try {
        if (!data?.conversationId) return;
        const readerId: string = data.userId;

        queryClient.setQueryData(['conversations'], (prev: Conversation[] = []) =>
          prev.map((conv) => {
            if (conv._id !== data.conversationId) return conv;
            const updated: any = { ...conv, unreadCount: 0 };
            // Si c'est l'autre personne qui a lu, marquer le lastMessage comme lu
            if (readerId && readerId !== user?._id && updated.lastMessage) {
              const alreadyRead = updated.lastMessage.readBy?.some(
                (r: any) => String(r.user) === String(readerId)
              );
              if (!alreadyRead) {
                updated.lastMessage = {
                  ...updated.lastMessage,
                  deliveryStatus: 'READ',
                  readBy: [
                    ...(updated.lastMessage.readBy || []),
                    { user: readerId, readAt: data.readAt || new Date().toISOString() },
                  ],
                };
              }
            }
            return updated;
          })
        );
      } catch (e) {
        console.error("❌ Erreur critique Socket.IO messages_read:", e);
      }
    });

    return () => {
      cleanupNewMessage();
      cleanupMessagesRead();
    };
  }, [onNewMessage, onMessagesRead]);

  // Composant pour une conversation
  const ConversationCard = ({
    conversation,
  }: {
    conversation: Conversation;
  }) => {
    const scaleAnim = useSharedValue(1);
    const isAnimating = animatingConversations.has(conversation._id);

    const pulseStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scaleAnim.value }],
    }));

    React.useEffect(() => {
      if (isAnimating) {
        scaleAnim.value = withSequence(
          withTiming(1.02, { duration: 150, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 150, easing: Easing.in(Easing.ease) })
        );
      }
    }, [isAnimating]);

    const otherParticipant =
      conversation.otherParticipant ||
      conversation.participants?.find((p) => (p as any)?._id !== (conversation as any)?.userId) ||
      null;

    let lastMessageTime = "";
    try {
      lastMessageTime = MessagingService.formatMessageTime(
        conversation.lastMessage?.sentAt ||
        (conversation.lastMessage as any)?.createdAt ||
        conversation.lastActivity ||
        new Date().toISOString()
      );
    } catch {}

    let messagePreview = "Nouvelle conversation";
    try {
      messagePreview = conversation.lastMessage
        ? MessagingService.getMessagePreview(conversation.lastMessage) || "Aucun message"
        : "Nouvelle conversation";
    } catch {}

    let participantName = "Utilisateur inconnu";
    try {
      participantName = otherParticipant
        ? MessagingService.formatParticipantName(otherParticipant) || "Utilisateur inconnu"
        : "Utilisateur inconnu";
    } catch {}

    const isUnread = Boolean(conversation?.unreadCount && conversation.unreadCount > 0);
    const unreadCount = Number(conversation?.unreadCount) || 0;

    // Indicateur d'envoi si dernier message est le mien
    const lastMsg = conversation.lastMessage;
    const senderId = lastMsg
      ? typeof (lastMsg.sender as any) === 'string'
        ? (lastMsg.sender as any)
        : lastMsg.sender?._id
      : null;
    const isSentByMe = Boolean(lastMsg && user?._id && String(senderId) === String(user._id));
    // Le backend ne persiste pas DELIVERED, il va SENT → READ via readBy
    // Vu = readBy contient quelqu'un d'autre que moi, OU deliveryStatus READ
    const isReadByOther = Boolean(
      lastMsg?.readBy?.some(r => String(r.user) !== String(user?._id)) ||
      lastMsg?.deliveryStatus === 'READ'
    );
    const sentCheckIcon: any = isReadByOther ? 'checkmark-done' : 'checkmark-done-outline';
    const sentCheckColor = isReadByOther ? '#10B981' : colors.textSecondary;

    // Indicateur de réponse à un statut
    const isStatusReply = Boolean(conversation.statusOrigin || lastMsg?.statusReply?.statusId);

    // Contexte de la conversation (produit ou statut)
    const hasProduct = Boolean(conversation.product?.name);

    return (
      <Animated.View style={pulseStyle}>
        <TouchableOpacity
          style={{
            backgroundColor: isAnimating
              ? (isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)')
              : 'transparent',
          }}
          className="px-4 py-3"
          onPress={() => {
            ConversationPreviewStore.set(conversation._id, {
              participantName,
              participantAvatar: otherParticipant?.profileImage,
              productName: conversation.product?.name,
            });
            router.push(`/(app)/(client)/conversation/${conversation._id}`);
          }}
          onLongPress={() => handleLongPress(conversation)}
          delayLongPress={500}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Avatar */}
            <View style={{ position: 'relative', marginRight: 14 }}>
              {otherParticipant?.profileImage ? (
                <Image
                  source={{ uri: otherParticipant.profileImage }}
                  style={{ width: 52, height: 52, borderRadius: 26 }}
                  contentFit="cover"
                />
              ) : (
                <View style={{
                  width: 52, height: 52, borderRadius: 26,
                  backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5',
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <Ionicons
                    name={otherParticipant?.role === 'ENTERPRISE' ? 'business' : 'person'}
                    size={22}
                    color="#10B981"
                  />
                </View>
              )}
              {isUnread && (
                <View style={{
                  position: 'absolute', top: -2, right: -2,
                  backgroundColor: '#EF4444', borderRadius: 10,
                  minWidth: 20, height: 20,
                  justifyContent: 'center', alignItems: 'center',
                  paddingHorizontal: 4,
                  borderWidth: 2, borderColor: isDark ? colors.background : '#fff',
                }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontFamily: 'Poppins-Bold' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>

            {/* Contenu */}
            <View style={{ flex: 1 }}>
              {/* Ligne 1 : nom + heure */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text
                  style={{ color: colors.textPrimary, fontFamily: isUnread ? 'Poppins-Bold' : 'Poppins-SemiBold', fontSize: 15, flex: 1, marginRight: 8 }}
                  numberOfLines={1}
                >
                  {participantName}
                </Text>
                <Text style={{ color: isUnread ? '#10B981' : colors.textTertiary, fontFamily: isUnread ? 'Poppins-Bold' : 'Poppins-Medium', fontSize: 11 }}>
                  {lastMessageTime}
                </Text>
              </View>

              {/* Ligne 2 : contexte (produit ou statut) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                {isStatusReply ? (
                  <>
                    <Ionicons name="play-circle-outline" size={13} color="#8B5CF6" style={{ marginRight: 4 }} />
                    <Text style={{ color: '#8B5CF6', fontFamily: 'Poppins-SemiBold', fontSize: 11 }} numberOfLines={1}>
                      Réponse à un statut
                    </Text>
                  </>
                ) : hasProduct ? (
                  <>
                    {conversation.product?.images?.[0] ? (
                      <Image source={{ uri: conversation.product.images[0] }} style={{ width: 14, height: 14, borderRadius: 3, marginRight: 5 }} contentFit="cover" />
                    ) : (
                      <Ionicons name="cube-outline" size={13} color={colors.textTertiary} style={{ marginRight: 4 }} />
                    )}
                    <Text style={{ color: colors.textTertiary, fontFamily: 'Poppins-Medium', fontSize: 11 }} numberOfLines={1}>
                      {conversation.product?.name && conversation.product?.price
                        ? `${conversation.product.name} • ${formatPrice(conversation.product.price)}`
                        : conversation.product?.name || ''}
                    </Text>
                  </>
                ) : null}
              </View>

              {/* Ligne 3 : aperçu message + indicateur envoi */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {isSentByMe && (
                  <Ionicons name={sentCheckIcon as any} size={14} color={sentCheckColor} style={{ marginRight: 4 }} />
                )}
                <Text
                  style={{ color: isUnread ? colors.textPrimary : colors.textSecondary, fontFamily: isUnread ? 'Poppins-SemiBold' : 'Poppins-Medium', fontSize: 13, flex: 1 }}
                  numberOfLines={1}
                >
                  {String(messagePreview)}
                </Text>
                {isUnread && (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginLeft: 6 }} />
                )}
              </View>
            </View>
          </View>
        </TouchableOpacity>
        {/* Séparateur */}
        <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 66 + 14 }} />
      </Animated.View>
    );
  };

  const displayedConversations = showUnreadOnly
    ? filteredConversations.filter((c) => (c.unreadCount ?? 0) > 0)
    : filteredConversations;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.secondary }}>
        <StatusBar
          backgroundColor="#047857"
          barStyle={isDark ? "light-content" : "dark-content"}
          translucent
        />
        {/* Header skeleton — flat */}
        <View style={{
          backgroundColor: colors.surface,
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderLight,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <View style={{ height: 28, borderRadius: 14, width: 130, backgroundColor: colors.tertiary }} />
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.tertiary }} />
          </View>
          <View style={{ height: 48, borderRadius: 15, backgroundColor: colors.tertiary }} />
        </View>

        {/* Conteneur du contenu */}
        <View style={{ flex: 1, backgroundColor: colors.secondary }} className="pt-4">
          <FlatList
            data={Array.from({ length: 6 }).map((_, i) => i.toString())}
            renderItem={() => <SkeletonCard />}
            keyExtractor={(item) => item}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.secondary }}>
      {/* Header — flat */}
      <View style={{
        backgroundColor: colors.surface,
        paddingTop: insets.top + 16,
        paddingHorizontal: 20,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 24, color: colors.textPrimary }}>
            Messages
          </Text>
          <TouchableOpacity
            style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.tertiary, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => router.push("/")}
          >
            <Ionicons name="create-outline" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Barre de recherche */}
        <View style={{ position: 'relative' }}>
          <View style={{ position: 'absolute', left: 14, top: 14, zIndex: 10 }}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
          </View>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={i18n.t("client.messages.search.placeholder")}
            style={{
              backgroundColor: colors.tertiary,
              color: colors.textPrimary,
              borderRadius: 15,
              paddingLeft: 44,
              paddingRight: searchQuery.length > 0 ? 44 : 16,
              paddingVertical: 12,
              fontFamily: 'Poppins-Medium',
              fontSize: 14,
              height: 48,
            }}
            placeholderTextColor={colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={{ position: 'absolute', right: 14, top: 14 }}
            >
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filtres et Stats */}
      <View className="flex-row justify-between items-center px-6 py-4">
        <View className="flex-row gap-2">
          {/* Bouton Tous */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowUnreadOnly(false)}
            style={{
              backgroundColor: !showUnreadOnly ? colors.secondary : colors.card,
              borderColor: !showUnreadOnly ? colors.brandPrimary : colors.border,
            }}
            className="flex-row items-center px-4 py-2 rounded-full border"
          >
            <Ionicons
              name="mail-outline"
              size={16}
              color={!showUnreadOnly ? colors.brandPrimary : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={{ color: !showUnreadOnly ? colors.brandPrimary : colors.textSecondary }}
              className="font-poppins-bold text-xs"
            >
              {i18n.t("client.messages.filters.all")}
            </Text>
          </TouchableOpacity>

          {/* Bouton Non lus */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowUnreadOnly(true)}
            style={{
              backgroundColor: showUnreadOnly ? colors.secondary : colors.card,
              borderColor: showUnreadOnly ? colors.brandPrimary : colors.border,
            }}
            className="flex-row items-center px-4 py-2 rounded-full border"
          >
            <Ionicons
              name="mail-unread"
              size={16}
              color={showUnreadOnly ? colors.brandPrimary : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={{ color: showUnreadOnly ? colors.brandPrimary : colors.textSecondary }}
              className="font-poppins-bold text-xs"
            >
              {i18n.t("client.messages.filters.unread")}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={{ color: colors.textSecondary }} className="font-poppins-medium text-xs">
          {displayedConversations.length} {displayedConversations.length === 1 ? i18n.t("client.messages.conversation.singular") : i18n.t("client.messages.conversation.plural")}
        </Text>
      </View>

      {/* Liste des conversations */}
      <FlatList
        data={displayedConversations}
        renderItem={({ item }) => <ConversationCard conversation={item} />}
        keyExtractor={(item) => item._id}
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
          <View className="flex-1 justify-center items-center py-20 px-8">
            <View style={{ backgroundColor: colors.card }} className="p-6 rounded-full shadow-sm mb-6">
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textSecondary} />
            </View>
            <Text style={{ color: colors.textPrimary }} className="text-xl font-poppins-bold mb-2 text-center">
              {searchQuery.trim().length >= 2
                ? i18n.t("client.messages.empty.noResults")
                : i18n.t("client.messages.empty.noConversations")}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="font-poppins-medium text-center leading-6">
              {searchQuery.trim().length >= 2
                ? i18n.t("client.messages.empty.noResultsMessage", { query: searchQuery })
                : i18n.t("client.messages.empty.noConversationsMessage")}
            </Text>
            {searchQuery.trim().length === 0 && (
              <TouchableOpacity
                className="mt-8 bg-primary-600 rounded-2xl px-8 py-3.5 shadow-lg shadow-primary-500/30"
                onPress={() =>
                  router.push("/(app)/(client)/(tabs)/")
                }
              >
                <Text className="text-white font-poppins-bold text-base">
                  {i18n.t("client.messages.empty.discoverProducts")}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 120,
        }}
      />

      {/* Menu contextuel pour les conversations */}
      {contextMenuVisible && selectedConversation && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={closeContextMenu}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />

          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 24,
              padding: 8,
              width: "80%",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 10,
            }}
          >
            {/* Titre */}
            <View style={{ paddingHorizontal: 20, paddingVertical: 16 }}>
              <Text style={{ color: colors.textPrimary }} className="font-poppins-bold text-lg text-center">
                {i18n.t("client.messages.contextMenu.title")}
              </Text>
            </View>

            <View style={{ height: 1, backgroundColor: colors.border }} />

            {/* Options */}
            <TouchableOpacity
              onPress={() => {
                handleArchiveConversation();
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingVertical: 16,
              }}
              disabled={contextMenuLoading}
            >
              <View style={{ backgroundColor: colors.secondary }} className="w-10 h-10 rounded-full justify-center items-center mr-4">
                <Ionicons name="archive-outline" size={20} color={colors.textSecondary} />
              </View>
              <Text style={{ color: colors.textPrimary }} className="font-poppins-semibold text-base">
                {i18n.t("client.messages.contextMenu.archive")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                handleDeleteConversation();
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingVertical: 16,
              }}
              disabled={contextMenuLoading}
            >
              <View style={{ backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2' }} className="w-10 h-10 rounded-full justify-center items-center mr-4">
                {contextMenuLoading ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                )}
              </View>
              <Text
                style={{ color: contextMenuLoading ? colors.textSecondary : '#EF4444' }}
                className="font-poppins-semibold text-base"
              >
                {contextMenuLoading
                  ? i18n.t("client.messages.contextMenu.deleting")
                  : i18n.t("client.messages.contextMenu.delete")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
