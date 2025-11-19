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
import { useSocket } from "../../../../../hooks/useSocket";
import MessagingService, {
  Conversation,
} from "../../../../../services/api/MessagingService";

export default function MessagesPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { onNewMessage, onMessagesRead } = useSocket();
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

  const loadConversations = async () => {
    try {
      setLoading(true);
      const conversationsData = await MessagingService.getUserConversations();
      setConversations(conversationsData || []);
      console.log(
        "✅ Conversations chargées:",
        (conversationsData || []).length
      );
    } catch (error) {
      console.error("❌ Erreur chargement conversations:", error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    try {
      setSearching(true);
      // Pour le moment, filtrer localement car searchConversations n'est pas implémentée
      const results = conversations.filter((conv) => {
        const participant = conv.otherParticipant || conv.participants?.[0];
        const participantName = participant
          ? MessagingService.formatParticipantName(participant)
          : "";
        const productName = conv.product?.name || "";
        const searchLower = query.toLowerCase();
        return (
          participantName.toLowerCase().includes(searchLower) ||
          productName.toLowerCase().includes(searchLower)
        );
      });
      setSearchResults(results);
    } catch (error) {
      console.error("❌ Erreur recherche conversations:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

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

  const handleDeleteConversation = async () => {
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
      setContextMenuVisible(false);
      setSelectedConversation(null);

      // TODO: Afficher une notification de succès si nécessaire
    } catch (error: any) {
      console.error("❌ Erreur suppression conversation:", error);
      // TODO: Afficher une notification d'erreur
    } finally {
      setContextMenuLoading(false);
    }
  };

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
    }, [])
  );

  // === GESTION SOCKET.IO ===
  useEffect(() => {
    const setupSocketConnection = async () => {
      try {
        // Le client Socket.IO est géré par le hook useSocket dans les composants de conversation
        // Ici on configure juste les listeners pour les notifications de messages

        // Écouter les nouveaux messages (notifications)
        const handleNewMessageNotification = (data: any) => {
          console.log("🔔 Nouvelle notification de message:", data);

          // Mettre à jour le compteur de messages non lus pour la conversation
          setConversations((prev) =>
            prev.map((conv) => {
              if (conv._id === data.conversation._id) {
                return {
                  ...conv,
                  unreadCount: (conv.unreadCount || 0) + 1,
                  lastMessage: data.message,
                  lastActivity: new Date().toISOString(),
                };
              }
              return conv;
            })
          );

          // Mettre à jour aussi les résultats de recherche si applicable
          setSearchResults((prev) =>
            prev.map((conv) => {
              if (conv._id === data.conversation._id) {
                return {
                  ...conv,
                  unreadCount: (conv.unreadCount || 0) + 1,
                  lastMessage: data.message,
                  lastActivity: new Date().toISOString(),
                };
              }
              return conv;
            })
          );
        };

        // Écouter les messages marqués comme lus
        const handleMessagesRead = (data: any) => {
          console.log("👁️ Messages marqués comme lus:", data);

          // Mettre à jour le compteur de messages non lus
          setConversations((prev) =>
            prev.map((conv) => {
              if (conv._id === data.conversationId) {
                return {
                  ...conv,
                  unreadCount: Math.max(
                    0,
                    (conv.unreadCount || 0) - data.readCount
                  ),
                };
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
                    (conv.unreadCount || 0) - data.readCount
                  ),
                };
              }
              return conv;
            })
          );
        };

        // S'abonner aux événements Socket.IO via le hook
        const cleanupNewMessage = onNewMessage(handleNewMessageNotification);
        const cleanupMessagesRead = onMessagesRead(handleMessagesRead);

        // Cleanup function
        return () => {
          cleanupNewMessage?.();
          cleanupMessagesRead?.();
        };
      } catch (error) {
        console.error("❌ Erreur setup Socket.IO dans messages:", error);
      }
    };

    setupSocketConnection();
  }, [onNewMessage, onMessagesRead]);

  // Composant pour une conversation
  const ConversationCard = ({
    conversation,
  }: {
    conversation: Conversation;
  }) => {
    // L'API retourne déjà otherParticipant, sinon on prend le premier participant différent
    const otherParticipant =
      conversation?.otherParticipant || conversation?.participants?.[0];

    const lastMessageTime = conversation?.lastMessage
      ? MessagingService.formatMessageTime(
          conversation.lastMessage.sentAt ||
            (conversation.lastMessage as any).createdAt
        )
      : conversation?.lastActivity
      ? MessagingService.formatMessageTime(conversation.lastActivity)
      : "";

    const messagePreview = conversation?.lastMessage
      ? MessagingService.getMessagePreview(conversation.lastMessage) || ""
      : "Nouvelle conversation";

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
          elevation: 1, // Reduced elevation
          backgroundColor: isUnread ? "#ECFDF5" : "#FFFFFF",
        }}
        activeOpacity={0.7}
        onPress={() => {
          router.push(
            `/(app)/(enterprise)/conversation/${conversation._id}` as any
          );
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
                {otherParticipant
                  ? MessagingService.formatParticipantName(otherParticipant) ||
                    "Utilisateur inconnu"
                  : "Utilisateur inconnu"}
              </Text>
              <Text
                className={`text-xs ${
                  isUnread
                    ? "text-primary-600 font-quicksand-bold"
                    : "text-neutral-400 font-quicksand-medium"
                }`}
              >
                {String(lastMessageTime)}
              </Text>
            </View>

            {/* Produit concerné */}
            <View className="flex-row items-center mb-2">
              {conversation?.product?.images?.[0] ? (
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
                {conversation?.product?.name && conversation?.product?.price
                  ? `${String(conversation.product.name)} • ${formatPrice(
                      Number(conversation.product.price)
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
        ? searchResults.filter((conv) => (conv.unreadCount || 0) > 0)
        : searchResults
      : showUnreadOnly
      ? conversations.filter((conv) => (conv.unreadCount || 0) > 0)
      : conversations;

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
            <ShimmerBlock
              style={{ height: 18, borderRadius: 8, width: "60%" }}
            />
            <ShimmerBlock
              style={{ height: 12, borderRadius: 6, width: "20%" }}
            />
          </View>

          {/* Product info skeleton */}
          <View className="flex-row items-center mb-2">
            <ShimmerBlock
              style={{ width: 20, height: 20, borderRadius: 6, marginRight: 8 }}
            />
            <ShimmerBlock
              style={{ height: 12, borderRadius: 6, width: "50%" }}
            />
          </View>

          {/* Message preview skeleton */}
          <ShimmerBlock
            style={{
              height: 14,
              borderRadius: 6,
              width: "90%",
              marginBottom: 4,
            }}
          />
          <ShimmerBlock style={{ height: 14, borderRadius: 6, width: "70%" }} />
        </View>
      </View>
    </View>
  );

  const renderSkeletons = () => {
    return (
      <FlatList
        data={Array.from({ length: 6 }).map((_, i) => i.toString())}
        renderItem={() => <SkeletonCard />}
        keyExtractor={(item) => item}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      />
    );
  };

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
              Messages
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
        <View className="flex-1 bg-neutral-50 pt-4">{renderSkeletons()}</View>
      </View>
    );
  }

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
          <TouchableOpacity className="w-10 h-10 bg-white/20 rounded-full justify-center items-center active:bg-white/30">
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
            placeholder="Rechercher une conversation..."
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
              Tous
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
              Non lus
            </Text>
          </TouchableOpacity>
        </View>

        <Text className="text-neutral-400 font-quicksand-medium text-xs">
          {displayedConversations.length} conversation
          {displayedConversations.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Conteneur du contenu */}
      <View className="flex-1">
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
              colors={["#10B981"]}
              tintColor="#10B981"
            />
          }
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-20 px-8">
              <View className="bg-white p-6 rounded-full shadow-sm mb-6">
                <Ionicons
                  name="chatbubbles-outline"
                  size={48}
                  color="#D1D5DB"
                />
              </View>
              <Text className="text-xl font-quicksand-bold text-neutral-800 mb-2 text-center">
                {searchQuery.trim().length >= 2
                  ? "Aucun résultat"
                  : "Aucune conversation"}
              </Text>
              <Text className="text-neutral-500 font-quicksand-medium text-center leading-6">
                {searchQuery.trim().length >= 2
                  ? `Nous n'avons trouvé aucune conversation correspondant à "${searchQuery}"`
                  : "Commencez à discuter avec des vendeurs pour voir vos échanges ici."}
              </Text>
              {searchQuery.trim().length === 0 && (
                <TouchableOpacity
                  className="mt-8 bg-primary-600 rounded-2xl px-8 py-3.5 shadow-lg shadow-primary-500/30"
                  onPress={() =>
                    router.push("/(app)/(enterprise)/(tabs)/" as any)
                  }
                >
                  <Text className="text-white font-quicksand-bold text-base">
                    Découvrir des produits
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
      </View>

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
                Options
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
                Archiver la conversation
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
                  ? "Suppression..."
                  : "Supprimer la conversation"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
