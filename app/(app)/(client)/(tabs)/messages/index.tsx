import { useLocale } from "@/contexts/LocaleContext";
import i18n from "@/i18n/i18n";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useToast } from "../../../../../components/ui/ReanimatedToast/context";
import { useSocket } from "../../../../../hooks/useSocket";
import MessagingService, {
  Conversation,
} from "../../../../../services/api/MessagingService";

// Skeleton Loader Component
const ShimmerBlock = ({ style }: { style?: any }) => {
  const shimmer = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);
  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 150],
  });
  return (
    <View style={[{ backgroundColor: "#F3F4F6", overflow: "hidden" }, style]}>
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 120,
          transform: [{ translateX }],
          backgroundColor: "rgba(255,255,255,0.5)",
          opacity: 0.7,
        }}
      />
    </View>
  );
};

const SkeletonCard = () => (
  <View className="rounded-2xl mx-4 my-2 p-4 bg-white shadow-sm border border-neutral-50">
    <View className="flex-row items-center">
      {/* Avatar skeleton */}
      <ShimmerBlock style={{ width: 56, height: 56, borderRadius: 28 }} />

      {/* Content skeleton */}
      <View className="ml-4 flex-1">
        <View className="flex-row items-center justify-between mb-2">
          <ShimmerBlock style={{ height: 18, borderRadius: 8, width: "60%" }} />
          <ShimmerBlock style={{ height: 12, borderRadius: 6, width: "20%" }} />
        </View>

        {/* Product info skeleton */}
        <View className="flex-row items-center mb-2">
          <ShimmerBlock
            style={{ width: 20, height: 20, borderRadius: 6, marginRight: 8 }}
          />
          <ShimmerBlock style={{ height: 12, borderRadius: 6, width: "50%" }} />
        </View>

        {/* Message preview skeleton */}
        <ShimmerBlock
          style={{ height: 14, borderRadius: 6, width: "90%", marginBottom: 4 }}
        />
        <ShimmerBlock style={{ height: 14, borderRadius: 6, width: "70%" }} />
      </View>
    </View>
  </View>
);

export default function ClientMessagesPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { locale } = useLocale();
  const { onNewMessage, onMessagesRead } = useSocket();
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Conversation[]>([]);
  const [searching, setSearching] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

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

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const conversationsData = await MessagingService.getUserConversations();
      console.log(
        "Raw conversationsData:",
        JSON.stringify(conversationsData, null, 2)
      ); // Debug API response
      setConversations(conversationsData || []);
      console.log(
        "✅ Conversations chargées:",
        (conversationsData || []).length
      );
    } catch (error: any) {
      console.error("❌ Erreur chargement conversations:", error);
      setConversations([]);

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
      setLoading(false);
    }
  }, [notifyError, router]);

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);

      if (query.trim().length < 2) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      try {
        setSearching(true);
        // Rechercher dans les conversations locales (déjà filtrées)
        const lowerQuery = query.trim().toLowerCase();
        const filtered = conversations.filter((conv) => {
          // Rechercher dans le nom du participant
          const otherParticipant =
            conv.otherParticipant ||
            conv.participants?.find(
              (p) => (p as any)?._id !== (conv as any)?.userId
            );
          const participantName = otherParticipant
            ? `${otherParticipant.firstName} ${otherParticipant.lastName}`.toLowerCase()
            : "";

          // Rechercher dans le nom du produit
          const productName = (conv.product?.name || "").toLowerCase();

          // Rechercher dans le dernier message
          const lastMessageText = (conv.lastMessage?.text || "").toLowerCase();

          return (
            participantName.includes(lowerQuery) ||
            productName.includes(lowerQuery) ||
            lastMessageText.includes(lowerQuery)
          );
        });
        setSearchResults(filtered);
      } catch (error) {
        console.error("❌ Erreur recherche conversations:", error);
        setSearchResults([]);
        // Pour les erreurs de recherche, on affiche un message discret
        notifyInfo(
          i18n.t("client.messages.notifications.searchError.title"),
          i18n.t("client.messages.notifications.searchError.message")
        );
      } finally {
        setSearching(false);
      }
    },
    [conversations, notifyInfo]
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  // Gestion du menu contextuel
  const handleLongPress = (conversation: Conversation) => {
    console.log("🔵 Long press sur conversation:", conversation._id);
    setSelectedConversation(conversation);
    setContextMenuVisible(true);
  };

  const handleArchiveConversation = () => {
    console.log(
      "📁 Archive conversation (pas encore implémenté):",
      selectedConversation?._id
    );
    setContextMenuVisible(false);
    setSelectedConversation(null);
    // TODO: Implémenter l'archivage plus tard
  };

  const handleDeleteConversation = useCallback(async () => {
    if (!selectedConversation) return;

    console.log("🗑️ Suppression conversation:", selectedConversation._id);
    setContextMenuLoading(true);

    try {
      await MessagingService.deleteConversation(selectedConversation._id);

      // Retirer la conversation de la liste localement
      setConversations((prev) =>
        prev.filter((conv) => conv._id !== selectedConversation._id)
      );
      setSearchResults((prev) =>
        prev.filter((conv) => conv._id !== selectedConversation._id)
      );

      console.log("✅ Conversation supprimée avec succès");
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

  // Charger les conversations au focus de la page
  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations])
  );

  // Abonnements Socket.IO pour mise à jour temps réel
  useEffect(() => {
    const cleanupNewMessage = onNewMessage((data: any) => {
      try {
        if (!data?.conversation || !data?.message) {
          console.warn("⚠️ Socket.IO new_message: données invalides", data);
          return;
        }
        setConversations((prev) =>
          prev.map((conv) => {
            if (conv._id === data.conversation._id) {
              return {
                ...conv,
                unreadCount: (conv.unreadCount || 0) + 1,
                lastMessage: data.message,
                lastActivity: new Date().toISOString(),
              } as any;
            }
            return conv;
          })
        );
        setSearchResults((prev) =>
          prev.map((conv) => {
            if (conv._id === data.conversation._id) {
              return {
                ...conv,
                unreadCount: (conv.unreadCount || 0) + 1,
                lastMessage: data.message,
                lastActivity: new Date().toISOString(),
              } as any;
            }
            return conv;
          })
        );
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
        if (!data?.conversationId) {
          console.warn(
            "⚠️ Socket.IO messages_read: conversationId manquant",
            data
          );
          return;
        }
        setConversations((prev) =>
          prev.map((conv) => {
            if (conv._id === data.conversationId) {
              return {
                ...conv,
                unreadCount: Math.max(
                  0,
                  (conv.unreadCount || 0) - (data.readCount || 0)
                ),
              } as any;
            }
            return conv;
          })
        );
        setSearchResults((prev) =>
          prev.map((conv) => {
            if (conv._id === data.conversationId) {
              return {
                ...conv,
                unreadCount: Math.max(
                  0,
                  (conv.unreadCount || 0) - (data.readCount || 0)
                ),
              } as any;
            }
            return conv;
          })
        );
      } catch (e) {
        console.error("❌ Erreur critique Socket.IO messages_read:", e);
        notifyError(
          i18n.t("client.messages.notifications.readStatusError.title"),
          i18n.t("client.messages.notifications.readStatusError.message")
        );
      }
    });

    return () => {
      cleanupNewMessage();
      cleanupMessagesRead();
    };
  }, [onNewMessage, onMessagesRead, notifyError]);

  // Composant pour une conversation
  const ConversationCard = ({
    conversation,
  }: {
    conversation: Conversation;
  }) => {
    // Déterminer le participant non-utilisateur avec vérification
    const otherParticipant =
      conversation.otherParticipant ||
      conversation.participants?.find(
        (p) => (p as any)?._id !== (conversation as any)?.userId
      ) ||
      null;

    // Formater l'heure du dernier message avec fallback
    let lastMessageTime: string = "N/A";
    try {
      lastMessageTime = conversation.lastMessage
        ? MessagingService.formatMessageTime(
            conversation.lastMessage.sentAt ||
              (conversation.lastMessage as any).createdAt ||
              conversation.lastActivity ||
              new Date().toISOString()
          )
        : MessagingService.formatMessageTime(
            conversation.lastActivity || new Date().toISOString()
          );
      if (typeof lastMessageTime !== "string") {
        console.warn("lastMessageTime n'est pas une string:", lastMessageTime);
        lastMessageTime = new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } catch (error) {
      console.error("Erreur formatMessageTime:", error);
      lastMessageTime = new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    // Obtenir un aperçu du dernier message avec fallback
    let messagePreview: string = "Nouvelle conversation";
    try {
      messagePreview = conversation.lastMessage
        ? MessagingService.getMessagePreview(conversation.lastMessage) ||
          "Aucun message"
        : "Nouvelle conversation";
      if (typeof messagePreview !== "string") {
        console.warn("messagePreview n'est pas une string:", messagePreview);
        messagePreview = "Aucun message";
      }
    } catch (error) {
      console.error("Erreur getMessagePreview:", error);
      messagePreview = "Aucun message";
    }

    // Vérifier que otherParticipant existe avant d'appeler formatParticipantName
    let participantName: string = "Utilisateur inconnu";
    try {
      participantName = otherParticipant
        ? MessagingService.formatParticipantName(otherParticipant) ||
          "Utilisateur inconnu"
        : "Utilisateur inconnu";
      if (typeof participantName !== "string") {
        console.warn("participantName n'est pas une string:", participantName);
        participantName = "Utilisateur inconnu";
      }
    } catch (error) {
      console.error("Erreur formatParticipantName:", error);
      participantName = "Utilisateur inconnu";
    }

    // Debug logs pour inspecter les valeurs
    console.log("ConversationCard Debug:", {
      conversationId: conversation._id,
      otherParticipant,
      participantName,
      participantNameType: typeof participantName,
      lastMessageTime,
      lastMessageTimeType: typeof lastMessageTime,
      messagePreview,
      messagePreviewType: typeof messagePreview,
      product: conversation.product,
      productName: conversation.product?.name,
      productNameType: conversation.product?.name
        ? typeof conversation.product.name
        : "undefined",
    });

    // Vérifier que le rendu JSX est valide
    console.log("ConversationCard Rendering:", {
      participantName,
      lastMessageTime,
      messagePreview,
      productName: conversation.product?.name,
      unreadCount: conversation.unreadCount,
      unreadCountType: typeof conversation.unreadCount,
    });

    const isUnread = Boolean(
      conversation?.unreadCount && conversation.unreadCount > 0
    );
    const unreadCount = Number(conversation?.unreadCount) || 0;

    return (
      <TouchableOpacity
        className={`rounded-2xl mx-4 my-2 p-4 bg-white`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.03,
          shadowRadius: 4,
          elevation: 1,
          backgroundColor: isUnread ? "#ECFDF5" : "#FFFFFF",
        }}
        onPress={() => {
          console.log("Navigating to conversation:", conversation._id); // Debug navigation
          router.push(`/(app)/(client)/conversation/${conversation._id}`);
        }}
        onLongPress={() => handleLongPress(conversation)}
        delayLongPress={500}
      >
        <View className="flex-row items-center">
          {/* Photo de profil */}
          <View className="relative">
            {otherParticipant?.profileImage ? (
              <Image
                source={{ uri: otherParticipant.profileImage }}
                className="w-14 h-14 rounded-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-14 h-14 bg-primary-100 rounded-full justify-center items-center">
                <Ionicons
                  name={
                    otherParticipant?.role === "ENTERPRISE"
                      ? "business"
                      : "person"
                  }
                  size={24}
                  color="#10B981"
                />
              </View>
            )}

            {/* Badge de messages non lus */}
            {isUnread && (
              <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-6 h-6 justify-center items-center px-2 border-2 border-white">
                <Text className="text-white text-xs font-quicksand-bold">
                  {unreadCount > 99 ? "99+" : unreadCount.toString()}
                </Text>
              </View>
            )}
          </View>

          {/* Informations de la conversation */}
          <View className="ml-4 flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text
                className="text-lg font-quicksand-bold text-neutral-900"
                numberOfLines={1}
              >
                {participantName}
              </Text>
              <Text
                className={`text-xs ${
                  isUnread
                    ? "text-primary-600 font-quicksand-bold"
                    : "text-neutral-400 font-quicksand-medium"
                }`}
              >
                {lastMessageTime}
              </Text>
            </View>

            {/* Produit concerné */}
            <View className="flex-row items-center mb-2">
              {conversation.product?.images?.[0] ? (
                <Image
                  source={{ uri: conversation.product.images[0] }}
                  className="w-5 h-5 rounded-md mr-2"
                  resizeMode="cover"
                />
              ) : (
                <Ionicons
                  name="cube-outline"
                  size={14}
                  color="#9CA3AF"
                  style={{ marginRight: 4 }}
                />
              )}
              <Text
                className="text-xs text-neutral-500 font-quicksand-medium"
                numberOfLines={1}
              >
                {conversation.product?.name && conversation.product?.price
                  ? `${String(conversation.product.name)} • ${formatPrice(
                      conversation.product.price
                    )}`
                  : "Produit inconnu"}
              </Text>
            </View>

            {/* Dernier message */}
            <Text
              className={`text-sm ${
                isUnread
                  ? "text-neutral-800 font-quicksand-bold"
                  : "text-neutral-500 font-quicksand-medium"
              }`}
              numberOfLines={2}
            >
              {String(messagePreview)}
            </Text>
          </View>

          {/* Indicateur */}
          <View className="ml-2">
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const displayedConversations =
    searchQuery.trim().length >= 2
      ? showUnreadOnly
        ? searchResults.filter((c) => (c.unreadCount ?? 0) > 0)
        : searchResults
      : showUnreadOnly
      ? conversations.filter((c) => (c.unreadCount ?? 0) > 0)
      : conversations;

  if (loading) {
    return (
      <View className="flex-1 bg-neutral-50">
        <StatusBar
          backgroundColor="#047857"
          barStyle="light-content"
          translucent
        />
        {/* Header avec gradient */}
        <LinearGradient
          colors={["#047857", "#10B981"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: insets.top + 16,
            paddingLeft: insets.left + 20,
            paddingRight: insets.right + 20,
            paddingBottom: 24,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          }}
        >
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-3xl font-quicksand-bold text-white">
              {i18n.t("client.messages.title")}
            </Text>
            <TouchableOpacity className="w-10 h-10 bg-white/20 rounded-full justify-center items-center">
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Barre de recherche skeleton */}
          <View className="relative mb-2">
            <View className="bg-white rounded-2xl h-12 w-full opacity-20" />
          </View>
        </LinearGradient>

        {/* Conteneur du contenu */}
        <View className="flex-1 bg-neutral-50 pt-4">
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
    <View className="flex-1 bg-neutral-50">
      {/* Header */}
      <LinearGradient
        colors={["#047857", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 16,
          paddingLeft: insets.left + 20,
          paddingRight: insets.right + 20,
          paddingBottom: 24,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 5,
        }}
      >
        <View className="flex-row items-center justify-between mb-6">
          <Text className="text-3xl font-quicksand-bold text-white tracking-tight">
            Messages
          </Text>
          <TouchableOpacity
            className="w-10 h-10 bg-white/20 rounded-full justify-center items-center active:bg-white/30"
            onPress={() => router.push("/")}
          >
            <Ionicons name="create-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Barre de recherche */}
        <View className="relative">
          <View className="absolute left-4 top-3.5 z-10">
            <Ionicons name="search" size={20} color="#9CA3AF" />
          </View>
          <TextInput
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder={i18n.t("client.messages.search.placeholder")}
            className="bg-white rounded-2xl pl-11 pr-4 py-3.5 text-neutral-800 font-quicksand-medium text-base"
            placeholderTextColor="#9CA3AF"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
              elevation: 2,
            }}
          />
          {searching && (
            <View className="absolute right-4 top-3.5">
              <ActivityIndicator size="small" color="#10B981" />
            </View>
          )}
          {searchQuery.length > 0 && !searching && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="absolute right-4 top-3.5"
            >
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Filtres et Stats */}
      <View className="flex-row justify-between items-center px-6 py-4">
        <View className="flex-row gap-2">
          {/* Bouton Tous */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowUnreadOnly(false)}
            className={`flex-row items-center px-4 py-2 rounded-full border ${
              !showUnreadOnly
                ? "bg-primary-50 border-primary-200"
                : "bg-white border-neutral-200"
            }`}
          >
            <Ionicons
              name="mail-outline"
              size={16}
              color={!showUnreadOnly ? "#10B981" : "#6B7280"}
              style={{ marginRight: 6 }}
            />
            <Text
              className={`font-quicksand-bold text-xs ${
                !showUnreadOnly ? "text-primary-700" : "text-neutral-600"
              }`}
            >
              {i18n.t("client.messages.filters.all")}
            </Text>
          </TouchableOpacity>

          {/* Bouton Non lus */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowUnreadOnly(true)}
            className={`flex-row items-center px-4 py-2 rounded-full border ${
              showUnreadOnly
                ? "bg-primary-50 border-primary-200"
                : "bg-white border-neutral-200"
            }`}
          >
            <Ionicons
              name="mail-unread"
              size={16}
              color={showUnreadOnly ? "#10B981" : "#6B7280"}
              style={{ marginRight: 6 }}
            />
            <Text
              className={`font-quicksand-bold text-xs ${
                showUnreadOnly ? "text-primary-700" : "text-neutral-600"
              }`}
            >
              {i18n.t("client.messages.filters.unread")}
            </Text>
          </TouchableOpacity>
        </View>

        <Text className="text-neutral-400 font-quicksand-medium text-xs">
          {displayedConversations.length} {displayedConversations.length === 1 ? i18n.t("client.messages.conversation.singular") : i18n.t("client.messages.conversation.plural")}
        </Text>
      </View>

      {/* Liste des conversations */}
      <FlatList
        data={displayedConversations}
        renderItem={({ item }) => {
          console.log("FlatList renderItem:", item._id); // Debug FlatList rendering
          return <ConversationCard conversation={item} />;
        }}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#10B981"]}
            tintColor="#10B981"
          />
        }
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-20 px-8">
            <View className="bg-white p-6 rounded-full shadow-sm mb-6">
              <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
            </View>
            <Text className="text-xl font-quicksand-bold text-neutral-800 mb-2 text-center">
              {searchQuery.trim().length >= 2
                ? i18n.t("client.messages.empty.noResults")
                : i18n.t("client.messages.empty.noConversations")}
            </Text>
            <Text className="text-neutral-500 font-quicksand-medium text-center leading-6">
              {searchQuery.trim().length >= 2
                ? i18n.t("client.messages.empty.noResultsMessage", { query: searchQuery })
                : i18n.t("client.messages.empty.noConversationsMessage")}
            </Text>
            {searchQuery.trim().length === 0 && (
              <TouchableOpacity
                className="mt-8 bg-primary-600 rounded-2xl px-8 py-3.5 shadow-lg shadow-primary-500/30"
                onPress={() =>
                  router.push("/(app)/(enterprise)/(tabs)/" as any)
                }
              >
                <Text className="text-white font-quicksand-bold text-base">
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
              backgroundColor: "white",
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
              <Text className="font-quicksand-bold text-neutral-900 text-lg text-center">
                {i18n.t("client.messages.contextMenu.title")}
              </Text>
            </View>

            <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />

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
              <View className="w-10 h-10 rounded-full bg-neutral-100 justify-center items-center mr-4">
                <Ionicons name="archive-outline" size={20} color="#4B5563" />
              </View>
              <Text className="font-quicksand-semibold text-neutral-700 text-base">
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
              <View className="w-10 h-10 rounded-full bg-red-50 justify-center items-center mr-4">
                {contextMenuLoading ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                )}
              </View>
              <Text
                className={`font-quicksand-semibold text-base ${
                  contextMenuLoading ? "text-neutral-400" : "text-red-600"
                }`}
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
