import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NotificationModal, {
  useNotification,
} from "../../../../components/ui/NotificationModal";
import { useAuth } from "../../../../contexts/AuthContext";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useSocket } from "../../../../hooks/useSocket";
import i18n from "../../../../i18n/i18n";
import MessagingService, {
  Conversation,
  Message,
} from "../../../../services/api/MessagingService";
import ProductService from "../../../../services/api/ProductService";
import StatusService, { StatusItem } from "../../../../services/api/StatusService";
import { StatusViewer } from "../../../../components/ui/StatusViewer";
import { Product } from "../../../../types/product";

// Cache simple pour les conversations et messages
const conversationCache = new Map<
  string,
  { conversation: Conversation; messages: Message[]; participants: any[]; timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes en millisecondes
const SWIPE_THRESHOLD = 65;

const WALLPAPER_ICONS = [
  'chatbubble-outline', 'heart-outline', 'star-outline', 'sparkles-outline',
  'leaf-outline', 'bag-handle-outline', 'storefront-outline', 'happy-outline',
  'flower-outline', 'ribbon-outline', 'pricetag-outline', 'gift-outline',
  'diamond-outline', 'cart-outline', 'cube-outline', 'megaphone-outline',
  'thumbs-up-outline', 'shield-checkmark-outline', 'wallet-outline', 'trending-up-outline',
];

const _rngC = (n: number) => { const x = Math.sin(n + 1) * 73856; return x - Math.floor(x); };

const _COLS_C = 9, _CELL_W_C = 46, _CELL_H_C = 52;
const WALLPAPER_ITEMS = Array.from({ length: 34 }, (_, r) =>
  Array.from({ length: _COLS_C }, (_, c) => {
    const i = r * _COLS_C + c;
    return {
      key: `w${i}`,
      top: r * _CELL_H_C + (_rngC(i * 5 + 0) - 0.5) * _CELL_H_C * 0.9,
      left: c * _CELL_W_C + (_rngC(i * 5 + 1) - 0.5) * _CELL_W_C * 0.9,
      icon: WALLPAPER_ICONS[Math.floor(_rngC(i * 5 + 2) * WALLPAPER_ICONS.length)],
      rot: _rngC(i * 5 + 3) * 360,
      size: 14 + Math.floor(_rngC(i * 5 + 4) * 14),
      alpha: 0.055 + _rngC(i * 5 + 0.7) * 0.065,
    };
  })
).flat();

const ChatWallpaper = React.memo(({ isDark }: { isDark: boolean }) => (
  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
    {WALLPAPER_ITEMS.map(item => (
      <View
        key={item.key}
        style={{
          position: 'absolute',
          top: item.top,
          left: item.left,
          opacity: isDark ? item.alpha * 0.8 : item.alpha,
          transform: [{ rotate: `${item.rot}deg` }],
        }}
      >
        <Ionicons name={item.icon as any} size={item.size} color="#10B981" />
      </View>
    ))}
  </View>
));

const SwipeableRow = ({
  children,
  onReply,
  enabled = true,
}: {
  children: React.ReactNode;
  onReply: () => void;
  enabled?: boolean;
}) => {
  const translateX = React.useRef(new Animated.Value(0)).current;
  const triggered = React.useRef(false);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (evt, gs) => {
        if (!enabled) return false;
        // Capture seulement si : clairement horizontal, nettement vers la droite, pas du bord gauche
        return gs.dx > 22 && Math.abs(gs.dx) > Math.abs(gs.dy) * 3;
      },
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderMove: (_, gs) => {
        if (gs.dx > 0) {
          translateX.setValue(Math.min(gs.dx, SWIPE_THRESHOLD + 20));
          if (gs.dx >= SWIPE_THRESHOLD && !triggered.current) {
            triggered.current = true;
          }
        }
      },
      onPanResponderRelease: (_, gs) => {
        const didTrigger = triggered.current;
        triggered.current = false;
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 220 }).start();
        if (didTrigger) onReply();
      },
      onPanResponderTerminate: () => {
        triggered.current = false;
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  const iconOpacity = translateX.interpolate({ inputRange: [0, 20, SWIPE_THRESHOLD], outputRange: [0, 0.4, 1], extrapolate: 'clamp' });
  const iconScale = translateX.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0.5, 1], extrapolate: 'clamp' });

  return (
    <View>
      <Animated.View style={{ position: 'absolute', left: 6, top: 0, bottom: 0, justifyContent: 'center', opacity: iconOpacity, transform: [{ scale: iconScale }] }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 4 }}>
          <Ionicons name="return-up-forward" size={15} color="#FFFFFF" />
        </View>
      </Animated.View>
      <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX }] }}>
        {children}
      </Animated.View>
    </View>
  );
};

export default function ConversationDetails() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);

  // Scroll vers le bas quand le clavier s'ouvre
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(showEvent, () => {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => sub.remove();
  }, []);
  const { user } = useAuth(); // Récupérer l'utilisateur connecté
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Animations send + actions modal
  const sendAnim = useRef(new Animated.Value(1)).current;
  const sendTranslateY = useRef(new Animated.Value(0)).current;
  const lastSentLocalId = useRef<string | null>(null);
  const slideActionsAnim = useRef(new Animated.Value(400)).current;
  const backdropActionsAnim = useRef(new Animated.Value(0)).current;

  // Hook Socket.IO pour la communication temps réel
  const {
    isConnected,
    joinConversation,
    onNewMessage,
    onMessageDeleted,
    onMessagesRead,
  } = useSocket();
  const { notification, showNotification, hideNotification } =
    useNotification();
  // Garde-fous pour éviter les rechargements multiples
  const initialLoadRef = useRef(false);
  const productLoadRef = useRef(false);

  // Récupération sécurisée des paramètres
  let conversationId: string | null = null;
  try {
    const params = useLocalSearchParams<{ conversationId: string }>();
    conversationId = params?.conversationId || null;
  } catch (error) {
    console.warn("Erreur récupération params:", error);
  }

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [effectiveProduct, setEffectiveProduct] = useState<Product | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [statusReplyViewer, setStatusReplyViewer] = useState<{ status: StatusItem; currentUserId: string } | null>(null);
  const [inputHeight, setInputHeight] = useState(0);
  // État pour suivre si le produit est en cours de chargement
  const [productLoading, setProductLoading] = useState(false);

  // États pour la gestion des confirmations de suppression
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    messageId: string;
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
  } | null>(null);

  // États pour les modals d'actions
  const [messageActionsModal, setMessageActionsModal] = useState<{
    visible: boolean;
    message: Message | null;
  }>({ visible: false, message: null });
  const [deleteOptionsModal, setDeleteOptionsModal] = useState<{
    visible: boolean;
    messageId: string | null;
  }>({ visible: false, messageId: null });
  const [retryModal, setRetryModal] = useState<{
    visible: boolean;
    message: Message | null;
  }>({ visible: false, message: null });

  // Récupérer l'ID de l'utilisateur connecté depuis le contexte d'auth
  const getCurrentUserId = () => {
    return user?._id || null; // Utiliser l'ID du contexte d'authentification
  };

  // Vérifier si l'utilisateur est seul dans la conversation
  const isUserAloneInConversation = () => {
    if (!conversation || !conversation.participants) return true;

    // Si la conversation a moins de 2 participants, l'utilisateur est seul
    // (les autres ont supprimé la conversation)
    return conversation.participants.length < 2;
  };

  // Composant ShimmerBlock pour l'animation de chargement
  const ShimmerBlock = ({
    width,
    height,
    borderRadius = 8,
  }: {
    width: number | string;
    height: number;
    borderRadius?: number;
  }) => {
    const shimmerAnim = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
      const shimmerAnimation = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      shimmerAnimation.start();
      return () => shimmerAnimation.stop();
    }, [shimmerAnim]);

    const translateX = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-300, 300],
    });

    return (
      <View
        className="overflow-hidden"
        style={{ width: width as any, height, borderRadius, backgroundColor: colors.border }}
      >
        <Animated.View
          className="absolute inset-0"
          style={{ transform: [{ translateX }], backgroundColor: colors.secondary }}
        />
      </View>
    );
  };

  // Composant SkeletonMessage pour simuler un message en chargement
  const SkeletonMessage = ({
    isCurrentUser = false,
  }: {
    isCurrentUser?: boolean;
  }) => (
    <View className={`mb-4 ${isCurrentUser ? "items-end" : "items-start"}`}>
      <View className="flex-row items-end max-w-xs">
        {!isCurrentUser && (
          <ShimmerBlock width={32} height={32} borderRadius={16} />
        )}
        <View className="flex-1">
          <ShimmerBlock
            width={isCurrentUser ? 120 : 150}
            height={16}
            borderRadius={8}
          />
          <View className="mt-2">
            <ShimmerBlock
              width={isCurrentUser ? 200 : 180}
              height={40}
              borderRadius={16}
            />
          </View>
          <View
            className={`flex-row items-center mt-1 ${isCurrentUser ? "justify-end" : "justify-start"
              }`}
          >
            <ShimmerBlock width={40} height={12} borderRadius={6} />
          </View>
        </View>
        {isCurrentUser && (
          <ShimmerBlock width={32} height={32} borderRadius={16} />
        )}
      </View>
    </View>
  );

  // Fonction pour rendre les skeletons de conversation
  const renderSkeletonConversation = () => (
    <View className="flex-1" style={{ backgroundColor: colors.secondary }}>
      <ExpoStatusBar style="light" translucent backgroundColor="transparent" />
      {/* Header skeleton */}
      <LinearGradient
        colors={["#10B981", "#059669"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-b-3xl shadow-sm"
        style={{
          paddingTop: insets.top + 16,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
          paddingBottom: 16,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <ShimmerBlock width={24} height={24} borderRadius={12} />
            <ShimmerBlock width={120} height={20} borderRadius={4} />
          </View>
          <ShimmerBlock width={20} height={20} borderRadius={10} />
        </View>
      </LinearGradient>

      {/* Product info skeleton */}
      <View className="px-4 py-3 flex-row items-center" style={{ backgroundColor: colors.card, borderBottomColor: colors.border, borderBottomWidth: 1 }}>
        <ShimmerBlock width={40} height={40} borderRadius={12} />
        <View className="flex-1 ml-3">
          <ShimmerBlock width="60%" height={14} borderRadius={4} />
          <ShimmerBlock width="40%" height={12} borderRadius={4} />
        </View>
      </View>

      {/* Messages skeleton */}
      <View className="flex-1 px-4 py-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <SkeletonMessage key={index} isCurrentUser={index % 3 === 0} />
        ))}
      </View>
    </View>
  );

  // Gestionnaires d'événements Socket.IO avec useCallback pour stabilité
  const handleNewMessage = useCallback(
    (data: any) => {
      // Extraire l'ID de conversation de manière robuste (peut être un objet ou un string)
      const receivedConvId =
        typeof data.conversation === "string"
          ? data.conversation
          : data.conversation?._id;

      console.log("� CLIENT WebSocket - Message reçu:", {
        conversationId: receivedConvId,
        currentConvId: conversationId,
        messageId: data.message?._id,
        sender: data.message?.sender?._id,
        text: data.message?.text?.substring(0, 30),
      });

      if (receivedConvId !== conversationId) {
        console.log("⏭️ CLIENT - Message ignoré (autre conversation)");
        return;
      }

      // Vérifier si c'est un message que nous venons d'envoyer
      const currentUserId = user?._id || null;
      const isOurMessage = data.message.sender._id === currentUserId;
      const isSystemMessage = data.message.messageType === "SYSTEM";

      // IMPORTANT: Ignorer nos propres messages via Socket.IO (sauf SYSTEM)
      // Ils sont déjà ajoutés via la réponse HTTP de sendMessage
      // Les messages SYSTEM doivent toujours être affichés même s'ils viennent de nous
      if (isOurMessage && !isSystemMessage) {
        console.log("⏭️ CLIENT - Message ignoré (notre propre message)");
        return;
      }

      console.log("✅ CLIENT - Ajout du message reçu:", {
        messageId: data.message._id,
        text: data.message.text?.substring(0, 50),
        sender: data.message.sender._id,
      });

      // Ne traiter QUE les messages des AUTRES participants
      try {
        setMessages((prev) => {
          // Vérifier si le message existe déjà
          const existingIndex = prev.findIndex(
            (msg) => msg._id === data.message._id
          );

          let updatedMessages;
          if (existingIndex !== -1) {
            // Le message existe déjà, le mettre à jour
            updatedMessages = [...prev];
            updatedMessages[existingIndex] = data.message;
          } else {
            // Nouveau message d'un autre participant, l'ajouter
            updatedMessages = [...prev, data.message];
          }

          // Mettre à jour le cache avec le nouveau message
          if (conversationId && conversation) {
            const cached = conversationCache.get(conversationId);
            if (cached) {
              conversationCache.set(conversationId, {
                ...cached,
                messages: updatedMessages,
                timestamp: Date.now(),
              });
            }
          }

          return updatedMessages;
        });

        // Marquer comme lu puisque c'est un message d'un autre participant
        try {
          MessagingService.markMessagesAsRead(conversationId!);
        } catch (e) {
          console.warn("⚠️ markAsRead échoué:", e);
        }

        // Faire défiler vers le bas
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } catch (error) {
        console.error("❌ CLIENT - Erreur ajout message:", error);
      }
    },
    [conversationId, user?._id]
  );

  const handleMessageDeleted = useCallback(
    (data: any) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) => prev.filter((msg) => msg._id !== data.messageId));
      }
    },
    [conversationId]
  );

  const handleMessagesRead = useCallback(
    (data: any) => {
      if (data.conversationId === conversationId) {
        // Mettre à jour le statut des messages
        setMessages((prev) => {
          console.log(
            `👁️ CLIENT - Mise à jour readBy, messages: ${prev.length}`
          );
          return prev.map((msg) => {
            // Vérifier si ce userId est déjà dans readBy pour éviter les doublons
            const alreadyRead = msg.readBy?.some((r) => r.user === data.userId);
            if (alreadyRead) {
              return msg;
            }

            return {
              ...msg,
              readBy: msg.readBy
                ? [
                  ...msg.readBy,
                  {
                    user: data.userId,
                    readAt: data.readAt,
                  },
                ]
                : [
                  {
                    user: data.userId,
                    readAt: data.readAt,
                  },
                ],
            };
          });
        });
      }
    },
    [conversationId]
  );

  // Chargement initial de la conversation (une seule fois par conversationId)
  useEffect(() => {
    if (!conversationId) return;
    if (initialLoadRef.current) return; // déjà chargé
    initialLoadRef.current = true;

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);

        // Toujours charger depuis l'API pour avoir les derniers messages
        console.log("🔄 CLIENT - Chargement conversation depuis l'API:", conversationId);
        const data = await MessagingService.getConversationMessages(
          conversationId!
        );
        if (cancelled) return;
        console.log("📦 CLIENT - Données reçues de l'API:", {
          conversationId: data.conversation._id,
          participantsCount: data.participants?.length,
          participants: data.participants,
          messagesCount: data.messages.length,
        });
        setConversation(data.conversation);
        setMessages(data.messages);
        setParticipants(data.participants || []);

        // Mettre à jour le cache avec les données fraîches de l'API
        conversationCache.set(conversationId!, {
          conversation: data.conversation,
          messages: data.messages,
          participants: data.participants || [],
          timestamp: Date.now(),
        });
        console.log("💾 CLIENT - Cache mis à jour avec", data.messages.length, "messages");

        // Marquer comme lu immédiatement (fire & forget)
        MessagingService.markMessagesAsRead(conversationId!).catch((e) =>
          console.warn("markMessagesAsRead échoué", e)
        );
      } catch (error) {
        if (!cancelled) {
          console.error("❌ Erreur chargement conversation:", error);
          showNotification(
            "error",
            "Erreur",
            "Impossible de charger la conversation"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      // Invalider le cache quand on quitte la conversation
      // pour forcer un rechargement complet la prochaine fois
      if (conversationId) {
        conversationCache.delete(conversationId);
        console.log("🗑️ CLIENT - Cache invalidé pour:", conversationId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Chargement du produit associé (séparé pour éviter relances multiples)
  useEffect(() => {
    if (!conversation) return;
    if (productLoadRef.current) return; // déjà chargé
    productLoadRef.current = true;
    setProductLoading(true);

    let cancelled = false;
    const loadProduct = async () => {
      try {
        const conv = conversation;
        if (typeof conv.product === "string") {
          const prod = await ProductService.getPublicProductById(conv.product);
          if (!cancelled) setEffectiveProduct(prod);
        } else {
          if (!cancelled) setEffectiveProduct(conv.product as Product);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("❌ Erreur chargement produit:", error);
          setEffectiveProduct(null);
        }
      } finally {
        if (!cancelled) setProductLoading(false);
      }
    };
    loadProduct();
    return () => {
      cancelled = true;
    };
  }, [conversation]);

  // Reset flags si l'identifiant de conversation change
  useEffect(() => {
    initialLoadRef.current = false;
    productLoadRef.current = false;
    setEffectiveProduct(null);
  }, [conversationId]);

  // === GESTION SOCKET.IO ===
  useEffect(() => {
    if (!conversationId || !isConnected) {
      return;
    }

    console.log(
      "🔌 CLIENT - Socket.IO setup pour conversation:",
      conversationId
    );

    // Rejoindre la conversation Socket.IO
    joinConversation(conversationId);

    // S'abonner aux événements Socket.IO via le hook
    const cleanupNewMessage = onNewMessage(handleNewMessage);
    const cleanupMessageDeleted = onMessageDeleted(handleMessageDeleted);
    const cleanupMessagesRead = onMessagesRead(handleMessagesRead);

    console.log("✅ CLIENT - Listeners Socket.IO configurés");

    // Cleanup function
    return () => {
      cleanupNewMessage?.();
      cleanupMessageDeleted?.();
      cleanupMessagesRead?.();
    };
  }, [
    conversationId,
    isConnected,
    user?._id,
    joinConversation,
    onNewMessage,
    onMessageDeleted,
    onMessagesRead,
    handleNewMessage,
    handleMessageDeleted,
    handleMessagesRead,
  ]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !conversation) {
      console.log("⏸️ Envoi annulé: données insuffisantes ou envoi en cours", {
        hasText: !!newMessage.trim(),
        sending,
        hasConversation: !!conversation,
      });
      return;
    }

    // Créer un ID temporaire pour le message optimiste
    const localId = `temp_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const messageText = newMessage.trim();
    const messageReplyTo = replyingTo;

    // Créer un message optimiste
    const optimisticMessage: Message = {
      _id: localId,
      _localId: localId,
      _sendingStatus: "pending",
      conversation: conversationId!,
      sender: {
        _id: user!._id,
        firstName: user!.firstName || "",
        lastName: user!.lastName || "",
        profileImage: user!.profileImage,
        role: user!.role,
      },
      text: messageText,
      messageType: "TEXT",
      replyTo: messageReplyTo || undefined,
      sentAt: new Date().toISOString(),
      readBy: [
        {
          user: user!._id,
          readAt: new Date().toISOString(),
        },
      ],
      metadata: {
        deleted: false,
      },
    };

    // Ajouter immédiatement le message optimiste à la liste
    setMessages((prev) => [...prev, optimisticMessage]);

    // Animation d'envoi - bulle qui monte
    lastSentLocalId.current = localId;
    sendTranslateY.setValue(40);
    sendAnim.setValue(0);
    Animated.parallel([
      Animated.spring(sendTranslateY, { toValue: 0, damping: 14, stiffness: 180, useNativeDriver: true }),
      Animated.timing(sendAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    // Réinitialiser les états immédiatement pour meilleure UX
    setNewMessage("");
    setReplyingTo(null);

    // Scroll vers le bas
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      setSending(true);

      const productId =
        typeof conversation.product === "string"
          ? conversation.product
          : conversation.product._id;

      console.log("🚚 Envoi message - préparation", {
        productId,
        conversationId,
        textLength: messageText.length,
      });

      // Émission du message via MessagingService
      const sentMessage = await MessagingService.sendMessage(
        productId,
        messageText,
        messageReplyTo?._id,
        conversationId || undefined
      );

      console.log("📨 CLIENT - Message envoyé avec succès", {
        messageId: sentMessage?.message?._id,
      });

      // Remplacer le message optimiste par le vrai message du serveur
      if (sentMessage?.message) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._localId === localId
              ? { ...sentMessage.message, _sendingStatus: "sent" as const }
              : msg
          )
        );

        // 🔥 IMPORTANT: Mettre à jour le cache avec le nouveau message
        const cached = conversationCache.get(conversationId!);
        if (cached) {
          const updatedMessages = cached.messages.map((msg) =>
            msg._localId === localId
              ? { ...sentMessage.message, _sendingStatus: "sent" as const }
              : msg
          );

          // Si le message n'était pas dans le cache (nouveau message), l'ajouter
          const messageExists = updatedMessages.some(
            (msg) => msg._id === sentMessage.message._id
          );
          if (!messageExists) {
            updatedMessages.push({
              ...sentMessage.message,
              _sendingStatus: "sent" as const,
            });
          }

          conversationCache.set(conversationId!, {
            ...cached,
            messages: updatedMessages,
            participants: cached.participants || [],
            timestamp: Date.now(),
          });
          console.log("✅ Cache mis à jour avec le nouveau message");
        }
      }

      setSending(false);
    } catch (error: any) {
      console.error("❌ Erreur envoi message:", error);

      // Marquer le message comme échoué au lieu de le supprimer
      setMessages((prev) =>
        prev.map((msg) =>
          msg._localId === localId
            ? {
              ...msg,
              _sendingStatus: "failed" as const,
              _sendError: error?.message || "Erreur inconnue",
            }
            : msg
        )
      );

      setSending(false);
    }
  };

  // Fonction pour renvoyer un message échoué
  const retryFailedMessage = async (failedMessage: Message) => {
    if (!failedMessage._localId || !conversation) return;

    const localId = failedMessage._localId;

    // Marquer le message comme en cours de renvoi
    setMessages((prev) =>
      prev.map((msg) =>
        msg._localId === localId
          ? {
            ...msg,
            _sendingStatus: "pending" as const,
            _sendError: undefined,
          }
          : msg
      )
    );

    try {
      const productId =
        typeof conversation.product === "string"
          ? conversation.product
          : conversation.product._id;

      // Renvoyer le message
      const sentMessage = await MessagingService.sendMessage(
        productId,
        failedMessage.text,
        failedMessage.replyTo?._id,
        conversationId || undefined
      );

      console.log("✅ CLIENT - Message renvoyé avec succès", {
        messageId: sentMessage?.message?._id,
      });

      // Remplacer le message par la version du serveur
      if (sentMessage?.message) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg._localId === localId
              ? { ...sentMessage.message, _sendingStatus: "sent" as const }
              : msg
          )
        );
      }
    } catch (error: any) {
      console.error("❌ Erreur renvoi message:", error);

      // Remettre en état échoué
      setMessages((prev) =>
        prev.map((msg) =>
          msg._localId === localId
            ? {
              ...msg,
              _sendingStatus: "failed" as const,
              _sendError: error?.message || "Erreur inconnue",
            }
            : msg
        )
      );
    }
  };

  // Fonctions pour gérer les pièces jointes

  // Fonction pour envoyer un message avec animation
  // Fonction pour envoyer un message avec animation
  const handleSendPress = () => {
    if (!newMessage.trim() || sending) return;

    // Animation du bouton d'envoi
    textInputRef.current?.blur();
    sendMessage();
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      // Si le timestamp est undefined ou null, essayer d'utiliser createdAt
      if (!timestamp) {
        console.warn("Timestamp manquant, impossible de formater la date");
        return new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      const date = new Date(timestamp);
      // Vérifier si la date est valide
      if (isNaN(date.getTime())) {
        console.warn("Date invalide reçue:", timestamp);
        // Essayer de parser différents formats
        const isoDate = new Date(timestamp.replace(" ", "T"));
        if (!isNaN(isoDate.getTime())) {
          return isoDate.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          });
        }
        return new Date().toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      // Si c'est aujourd'hui, afficher l'heure
      if (diffInDays === 0) {
        return date.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      // Si c'est hier
      else if (diffInDays === 1) {
        return `Hier ${date.toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        })}`;
      }
      // Si c'est dans la semaine
      else if (diffInDays < 7) {
        return (
          date.toLocaleDateString("fr-FR", { weekday: "short" }) +
          " " +
          date.toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      }
      // Sinon, afficher la date
      else {
        return date.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: diffInDays > 365 ? "2-digit" : undefined,
        });
      }
    } catch (error) {
      console.warn("Erreur formatage date:", error, timestamp);
      return new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("fr-FR").format(price) + " FCFA";
  };

  // Fonction pour déterminer le statut d'un message
  const getMessageStatus = (message: Message, currentUserId?: string) => {
    // Ne montrer le statut que pour les messages envoyés par l'utilisateur actuel
    if (!currentUserId || message.sender._id !== currentUserId) {
      return null; // Pas de statut pour les messages reçus
    }

    // Pour les messages envoyés par l'utilisateur actuel
    if (message.readBy && message.readBy.length > 1) {
      // Le message a été lu par d'autres personnes (plus que l'expéditeur)
      return "read";
    } else if (message.readBy && message.readBy.length === 1) {
      // Le message a été envoyé mais pas encore lu par les autres
      return "delivered";
    } else {
      // Le message vient d'être envoyé
      return "sent";
    }
  };

  // Composant pour les messages système
  const SystemMessage = ({ message }: { message: Message }) => {
    // Détecter si c'est un message de livraison
    const isDeliveryMessage =
      message.text.toLowerCase().includes("livreur") ||
      message.text.toLowerCase().includes("livraison") ||
      message.text.toLowerCase().includes("livré");

    if (isDeliveryMessage) {
      return (
        <View
          style={{ paddingVertical: 16, alignItems: "center", width: "100%" }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              paddingHorizontal: 20,
              paddingVertical: 16,
              maxWidth: "90%",
              width: "90%",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
              borderWidth: 1,
              borderColor: "#D1FAE5",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                marginBottom: 8,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#D1FAE5",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name="bicycle" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 10,
                    color: "#059669",
                    fontFamily: "Quicksand-Bold",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    marginBottom: 4,
                  }}
                >
                  Notification de livraison
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.textPrimary,
                    fontFamily: "Quicksand-SemiBold",
                    lineHeight: 20,
                  }}
                >
                  {message.text}
                </Text>
              </View>
            </View>
            <View
              style={{
                marginTop: 8,
                paddingTop: 8,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  color: colors.textSecondary,
                  fontFamily: "Quicksand-Medium",
                  textAlign: "center",
                }}
              >
                {formatMessageTime(
                  message.sentAt || (message as any).createdAt
                )}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    // Message système standard
    return (
      <View style={{ paddingVertical: 12, alignItems: "center" }}>
        <View
          style={{
            backgroundColor: colors.secondary,
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              fontFamily: "Quicksand-Medium",
              textAlign: "center",
            }}
          >
            {message.text}
          </Text>
        </View>
      </View>
    );
  };

  // Composant pour l'indicateur de statut
  const MessageStatusIndicator = ({ message }: { message: Message }) => {
    // Vérifier d'abord l'état d'envoi local
    if (message._sendingStatus === "pending") {
      return <Ionicons name="time-outline" size={12} color="#9CA3AF" />;
    }

    if (message._sendingStatus === "failed") {
      return (
        <TouchableOpacity
          onPress={() => setRetryModal({ visible: true, message })}
          className="ml-1"
        >
          <Ionicons name="information-circle" size={14} color="#EF4444" />
        </TouchableOpacity>
      );
    }

    // Si envoyé avec succès, afficher le statut classique
    const status = getMessageStatus(message, getCurrentUserId() || undefined);

    if (!status) return null;

    switch (status) {
      case "sent":
        return <Ionicons name="checkmark" size={12} color="#9CA3AF" />;
      case "delivered":
        return (
          <View className="flex-row">
            <Ionicons name="checkmark" size={12} color="#9CA3AF" />
            <Ionicons
              name="checkmark"
              size={12}
              color="#9CA3AF"
              style={{ marginLeft: -6 }}
            />
          </View>
        );
      case "read":
        return (
          <View style={{ flexDirection: 'row' }}>
            <Ionicons name="checkmark" size={12} color="#53BDEB" />
            <Ionicons name="checkmark" size={12} color="#53BDEB" style={{ marginLeft: -6 }} />
          </View>
        );
      default:
        return null;
    }
  };

  // Composant pour un message
  const MessageBubble = ({ message }: { message: Message }) => {
    const currentUserId = getCurrentUserId();
    const senderId = message.sender?._id || (message as any).senderId;
    const isCurrentUser = !!(currentUserId && senderId && senderId === currentUserId);
    const isDeleted = message.metadata?.deleted || false;
    const msgTime = formatMessageTime(message.createdAt || message.sentAt || '');
    const receivedBg = isDark ? '#1E2A3A' : '#F0F2F5';
    const hasReply = !!(message.replyTo && !message.replyTo.metadata?.deleted && message.replyTo.text);

    const sentOnLight = isCurrentUser && !isDark;
    const replyToSenderId = message.replyTo?.sender?._id;
    const meId = getCurrentUserId();
    const replyFromMe = !!(replyToSenderId && meId && String(replyToSenderId) === String(meId));
    const replyAuthorName = (() => {
      if (!message.replyTo) return '';
      if (replyFromMe) return 'Vous';
      // 1. Nom directement dans replyTo.sender
      const s = message.replyTo.sender;
      const fromSender = `${s?.firstName ?? ''} ${s?.lastName ?? ''}`.trim();
      if (fromSender) return fromSender;
      // 2. Cherche dans le state participants
      if (replyToSenderId) {
        const p = participants.find(pt => String(pt._id) === String(replyToSenderId));
        if (p) return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
      }
      // 3. Dans une conversation à 2, si c'est pas moi c'est forcément l'autre
      if (otherParticipant) return `${otherParticipant.firstName ?? ''} ${otherParticipant.lastName ?? ''}`.trim();
      return 'Contact';
    })();

    const scrollToReplied = () => {
      if (!message.replyTo?._id) return;
      const idx = messages.findIndex(m => m._id === message.replyTo!._id);
      if (idx !== -1) flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
    };

    const hasStatusReply = !!(message as any).statusReply?.statusId;
    const openStatusReply = async () => {
      if (!hasStatusReply) return;
      try {
        const status = await StatusService.getById((message as any).statusReply.statusId);
        const uid = getCurrentUserId() || '';
        setStatusReplyViewer({ status, currentUserId: uid });
      } catch {}
    };

    const StatusReplyPreview = () => hasStatusReply ? (
      <TouchableOpacity onPress={openStatusReply} activeOpacity={0.75} style={{
        backgroundColor: sentOnLight ? 'rgba(0,0,0,0.06)' : isCurrentUser ? 'rgba(0,0,0,0.22)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
        borderRadius: 10,
        borderLeftWidth: 3,
        borderLeftColor: '#8B5CF6',
        paddingHorizontal: 10,
        paddingVertical: 7,
        marginBottom: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}>
        <Ionicons name="play-circle-outline" size={16} color="#8B5CF6" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontFamily: 'Quicksand-Bold', color: '#8B5CF6', marginBottom: 1 }}>Statut</Text>
          <Text style={{ fontSize: 12, fontFamily: 'Quicksand-Medium', color: sentOnLight ? '#374151' : isCurrentUser ? 'rgba(255,255,255,0.75)' : colors.textSecondary }} numberOfLines={1}>
            {(message as any).statusReply.preview === 'IMAGE' ? '📷 Image' : ((message as any).statusReply.preview || 'Voir le statut')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color="#8B5CF6" />
      </TouchableOpacity>
    ) : null;

    const ReplyPreview = () => hasReply ? (
      <TouchableOpacity onPress={scrollToReplied} activeOpacity={0.7} style={{
        backgroundColor: sentOnLight ? 'rgba(0,0,0,0.06)' : isCurrentUser ? 'rgba(0,0,0,0.22)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
        borderRadius: 10,
        borderLeftWidth: 3,
        borderLeftColor: sentOnLight ? '#10B981' : isCurrentUser ? 'rgba(255,255,255,0.6)' : '#10B981',
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginBottom: 6,
      }}>
        <Text style={{ fontSize: 11, fontFamily: 'Quicksand-Bold', color: sentOnLight ? '#10B981' : isCurrentUser ? 'rgba(255,255,255,0.9)' : '#10B981', marginBottom: 2 }}>
          {replyAuthorName}
        </Text>
        <Text style={{ fontSize: 12, fontFamily: 'Quicksand-Medium', color: sentOnLight ? '#374151' : isCurrentUser ? 'rgba(255,255,255,0.75)' : colors.textSecondary }} numberOfLines={2}>
          {message.replyTo!.text}
        </Text>
      </TouchableOpacity>
    ) : null;

    return (
      <View style={{ marginBottom: 4, alignItems: isCurrentUser ? 'flex-end' : 'flex-start', paddingHorizontal: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', maxWidth: '80%' }}>

          {/* Avatar — messages reçus uniquement */}
          {!isCurrentUser && (
            <View style={{ marginRight: 6, marginBottom: 2, flexShrink: 0 }}>
              {message.sender.profileImage ? (
                <Image source={{ uri: message.sender.profileImage }} style={{ width: 30, height: 30, borderRadius: 15 }} resizeMode="cover" />
              ) : (
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: isDark ? '#2D3748' : '#E5E7EB', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name={message.sender.role === 'ENTERPRISE' ? 'business' : 'person'} size={14} color="#9CA3AF" />
                </View>
              )}
            </View>
          )}

          {/* Bulle — taille collée au contenu */}
          <TouchableOpacity
            onLongPress={() => { if (!isDeleted) openActionsModal(message); }}
            activeOpacity={0.85}
          >
            {isCurrentUser && !isDeleted ? (
              <View style={{
                paddingHorizontal: 12,
                paddingTop: 9,
                paddingBottom: 24,
                borderRadius: 18,
                borderBottomRightRadius: 5,
                backgroundColor: isDark ? '#064E3B' : '#E0FCD7',
                shadowColor: '#10B981',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 5,
                elevation: 3,
              }}>
                <StatusReplyPreview />
                <ReplyPreview />
                <Text style={{ fontSize: 15, lineHeight: 21, color: isDark ? '#D1FAE5' : '#000000', fontFamily: 'Quicksand-Medium' }}>
                  {message.text}
                </Text>
                <View style={{ position: 'absolute', bottom: 6, right: 9, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: isDark ? 'rgba(209,250,229,0.6)' : '#667781', fontFamily: 'Quicksand-Medium', marginRight: 3 }}>
                    {msgTime}
                  </Text>
                  <MessageStatusIndicator message={message} />
                </View>
              </View>
            ) : (
              <View style={{
                paddingHorizontal: 12,
                paddingTop: 9,
                paddingBottom: isDeleted ? 10 : 24,
                borderRadius: 18,
                borderBottomLeftRadius: 5,
                backgroundColor: isDeleted ? (isDark ? '#1A2332' : '#F3F4F6') : receivedBg,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 1,
              }}>
                <ReplyPreview />
                <Text style={{ fontSize: 15, lineHeight: 21, fontFamily: 'Quicksand-Medium', color: isDeleted ? colors.textSecondary : colors.textPrimary, fontStyle: isDeleted ? 'italic' : 'normal' }}>
                  {isDeleted ? i18n.t('client.messages.conversationDetail.messageDeleted') : message.text}
                </Text>
                {!isDeleted && (
                  <Text style={{ position: 'absolute', bottom: 6, right: 9, fontSize: 10, color: colors.textSecondary, fontFamily: 'Quicksand-Medium' }}>
                    {msgTime}
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Fonction pour supprimer un message
  const deleteMessage = async (messageId: string, forEveryone: boolean) => {
    try {
      await MessagingService.deleteMessage(messageId, forEveryone);
      // Mettre à jour les messages localement
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? {
              ...msg,
              text: i18n.t('client.messages.conversationDetail.messageDeleted'),
              metadata: { ...msg.metadata, deleted: true },
            }
            : msg
        )
      );

      // Mettre à jour le cache
      const cached = conversationCache.get(conversationId!);
      if (cached) {
        conversationCache.set(conversationId!, {
          ...cached,
          messages: cached.messages.map((msg) =>
            msg._id === messageId
              ? {
                ...msg,
                text: i18n.t('client.messages.conversationDetail.messageDeleted'),
                metadata: { ...msg.metadata, deleted: true },
              }
              : msg
          ),
          participants: cached.participants || [],
          timestamp: Date.now(),
        });
      }

      console.log(
        `✅ Message supprimé ${forEveryone ? "pour tout le monde" : "pour moi seulement"
        }`
      );
    } catch (error) {
      console.error("❌ Erreur suppression message:", error);
      showNotification("error", "Erreur", "Impossible de supprimer le message");
    }
  };

  // Fonctions pour gérer les confirmations de suppression
  const showDeleteConfirmation = (messageId: string) => {
    setConfirmationAction({
      messageId,
      title: "Supprimer le message",
      message: "Voulez-vous supprimer ce message ?",
      confirmText: "Supprimer",
      confirmColor: "#EF4444",
    });
    setConfirmationVisible(true);
  };

  const closeConfirmation = () => {
    setConfirmationVisible(false);
    setConfirmationAction(null);
  };

  const executeDeleteAction = async (messageId: string) => {
    // Afficher les options de suppression
    setDeleteOptionsModal({ visible: true, messageId });
  };

  const openActionsModal = (message: Message) => {
    slideActionsAnim.setValue(400);
    backdropActionsAnim.setValue(0);
    setMessageActionsModal({ visible: true, message });
    Animated.parallel([
      Animated.spring(slideActionsAnim, { toValue: 0, damping: 22, stiffness: 220, useNativeDriver: true }),
      Animated.timing(backdropActionsAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const closeActionsModal = () => {
    Animated.parallel([
      Animated.timing(slideActionsAnim, { toValue: 400, duration: 240, useNativeDriver: true }),
      Animated.timing(backdropActionsAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setMessageActionsModal({ visible: false, message: null }));
  };

  // Séparateurs de date
  const isSameDay = (a?: string, b?: string) => {
    if (!a || !b) return false;
    const da = new Date(a);
    const db = new Date(b);
    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate()
    );
  };

  const dayLabel = (ts?: string) => {
    if (!ts) return "";
    const d = new Date(ts);
    const today = new Date();
    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    ).getTime();
    const dStart = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate()
    ).getTime();
    const diffDays = Math.floor((todayStart - dStart) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return i18n.t('client.messages.conversationDetail.today');
    if (diffDays === 1) return i18n.t('client.messages.conversationDetail.yesterday');
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const renderMessageItem = ({
    item,
    index,
  }: {
    item: Message;
    index: number;
  }) => {
    // Si c'est un message système, on l'affiche différemment
    if (item.messageType === "SYSTEM") {
      return <SystemMessage message={item} />;
    }

    const currentTs = (item as any).createdAt || (item as any).sentAt;
    let showSep = false;
    if (index === 0) showSep = true;
    else {
      const prev = messages[index - 1];
      const prevTs = (prev as any)?.createdAt || (prev as any)?.sentAt;
      if (!isSameDay(currentTs, prevTs)) showSep = true;
    }

    const senderId = item.sender?._id || (item as any).senderId;
    const isCurrentUser = !!(getCurrentUserId() && senderId && senderId === getCurrentUserId());
    const isDeleted = item.metadata?.deleted || false;
    const isAnimated = item._localId === lastSentLocalId.current;

    const bubble = <MessageBubble message={item} />;
    const wrappedBubble = !isCurrentUser ? (
      <SwipeableRow onReply={() => setReplyingTo(item)} enabled={!isDeleted}>
        {bubble}
      </SwipeableRow>
    ) : bubble;

    return (
      <View>
        {showSep && currentTs ? (
          <View style={{ paddingVertical: 10, alignItems: 'center' }}>
            <View style={{ backgroundColor: 'rgba(16,185,129,0.10)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(16,185,129,0.18)' }}>
              <Text style={{ fontSize: 11, color: '#10B981', fontFamily: 'Quicksand-SemiBold', letterSpacing: 0.3 }}>
                {dayLabel(currentTs)}
              </Text>
            </View>
          </View>
        ) : null}
        {isAnimated ? (
          <Animated.View style={{ opacity: sendAnim, transform: [{ translateY: sendTranslateY }] }}>
            {wrappedBubble}
          </Animated.View>
        ) : wrappedBubble}
      </View>
    );
  };

  // Afficher le skeleton si on charge la conversation OU le produit
  if (loading || productLoading) {
    return renderSkeletonConversation();
  }

  // Ne montrer "Conversation non trouvée" que si la conversation n'existe vraiment pas
  // (chargement terminé mais pas de conversation)
  if (!conversation) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: colors.secondary }}>
        <ExpoStatusBar
          style="light"
          translucent
          backgroundColor="transparent"
        />
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text className="mt-4 text-lg font-quicksand-bold" style={{ color: colors.textPrimary }}>
          Conversation non trouvée
        </Text>
        <Text className="font-quicksand-medium mt-2" style={{ color: colors.textSecondary }}>
          Veuillez réessayer plus tard
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 bg-primary-500 rounded-xl px-6 py-3"
        >
          <Text className="text-white font-quicksand-bold">Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Si la conversation existe mais pas le produit, continuer à charger (cas normal)
  if (!effectiveProduct) {
    return renderSkeletonConversation();
  }

  // Déterminer le nom du correspondant depuis le tableau participants de l'API
  const currentUserId = getCurrentUserId();
  const otherParticipant = participants.find((p) => p._id !== currentUserId);

  const correspondentName = (() => {
    // 1. Priorité: utiliser le participant du tableau API
    if (otherParticipant) {
      if (otherParticipant.role === "ENTERPRISE") {
        return otherParticipant.companyName || `${otherParticipant.firstName} ${otherParticipant.lastName}`;
      }
      return `${otherParticipant.firstName} ${otherParticipant.lastName}`;
    }

    // 2. Fallback: utiliser les infos du produit
    if (typeof effectiveProduct?.enterprise === "object" && effectiveProduct.enterprise?.companyName) {
      return effectiveProduct.enterprise.companyName;
    }

    // 3. Fallback final
    console.warn("⚠️ CLIENT - Impossible de déterminer le nom du correspondant");
    return "Vendeur inconnu";
  })();

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0F1923' : '#EEF2F7' }}>
      <ChatWallpaper isDark={isDark} />
      <ExpoStatusBar style="light" translucent backgroundColor="transparent" />
      {/* Header */}
      <LinearGradient
        colors={["#047857", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 12,
          paddingLeft: insets.left + 16,
          paddingRight: insets.right + 16,
          paddingBottom: 14,
          shadowColor: "#059669",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 8,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Avatar correspondant */}
          {otherParticipant?.profileImage ? (
            <Image source={{ uri: otherParticipant.profileImage }} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', marginRight: 10 }} resizeMode="cover" />
          ) : (
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' }}>
              <Ionicons name="person" size={20} color="#FFFFFF" />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontFamily: 'Quicksand-Bold', color: '#FFFFFF' }} numberOfLines={1}>
              {correspondentName}
            </Text>
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontFamily: 'Quicksand-Medium' }} numberOfLines={1}>
              {effectiveProduct?.name || "Discussion produit"}
            </Text>
          </View>

          <TouchableOpacity
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' }}
            onPress={() => router.push(`/(app)/(client)/product/${effectiveProduct?._id}` as any)}
          >
            <Ionicons name="storefront-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Messages et input */}
      {Platform.OS === "android" ? (
        // Android edge-to-edge (SDK 35+) : adjustResize est inopérant, le header reste fixe hors du KAV.
        // behavior="padding" ajoute un padding bas = hauteur clavier → input toujours visible.
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item._id}
            className="flex-1 px-4"
            onScrollToIndexFailed={() => { flatListRef.current?.scrollToOffset({ offset: 0, animated: true }); }}
            ListHeaderComponent={
              effectiveProduct ? (
                <TouchableOpacity
                  style={{
                    marginBottom: 16,
                    borderRadius: 20,
                    overflow: 'hidden',
                    backgroundColor: colors.card,
                    shadowColor: '#10B981',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 3,
                    borderWidth: 1,
                    borderColor: colors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 12,
                  }}
                  onPress={() => {
                    router.push(
                      `/(app)/(client)/product/${effectiveProduct._id}` as any
                    );
                  }}
                >
                  <Image
                    source={{
                      uri:
                        effectiveProduct.images?.[0] ||
                        "https://via.placeholder.com/60x60/CCCCCC/FFFFFF?text=No+Image",
                    }}
                    style={{ width: 56, height: 56, borderRadius: 14 }}
                    resizeMode="cover"
                  />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text
                      style={{ fontSize: 14, fontFamily: 'Quicksand-SemiBold', color: colors.textPrimary, marginBottom: 4 }}
                      numberOfLines={1}
                    >
                      {effectiveProduct.name || i18n.t('client.messages.conversationDetail.productFallback')}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 13, fontFamily: 'Quicksand-Bold', color: '#10B981' }}>
                          {effectiveProduct.price
                            ? formatPrice(effectiveProduct.price)
                            : i18n.t('client.messages.conversationDetail.priceUnavailable')}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null
            }
            contentContainerStyle={{
              paddingTop: 8,
              paddingBottom: 20,
            }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
              }, 50);
            }}
            onScroll={(e) => {
              const { contentOffset, contentSize, layoutMeasurement } =
                e.nativeEvent;
              const distanceFromBottom =
                contentSize.height -
                (contentOffset.y + layoutMeasurement.height);
              setShowScrollToBottom(distanceFromBottom > 200);
            }}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80, paddingHorizontal: 32 }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(16,185,129,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1.5, borderColor: 'rgba(16,185,129,0.15)' }}>
                  <Ionicons name="chatbubbles-outline" size={30} color="#10B981" />
                </View>
                <Text style={{ fontSize: 17, fontFamily: 'Quicksand-Bold', color: '#1F2937', marginBottom: 8, textAlign: 'center' }}>
                  {i18n.t('client.messages.conversationDetail.emptyConversation.title')}
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'Quicksand-Medium', color: '#9CA3AF', textAlign: 'center', lineHeight: 20 }}>
                  {i18n.t('client.messages.conversationDetail.emptyConversation.subtitle')}
                </Text>
              </View>
            }
          />

          {/* Zone de réponse améliorée */}
          {replyingTo && (
            <View style={{ backgroundColor: '#ECFDF5', marginHorizontal: 16, marginBottom: 8, borderRadius: 16, padding: 16, borderLeftWidth: 4, borderLeftColor: '#10B981', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name="return-up-forward"
                      size={14}
                      color="#10B981"
                    />
                    <Text className="text-xs text-primary-600 font-quicksand-semibold ml-1">
                      {i18n.t('client.messages.conversationDetail.replyTo')} {replyingTo.sender.firstName}{" "}
                      {replyingTo.sender.lastName}
                    </Text>
                  </View>
                  <Text
                    className="text-sm text-neutral-700 font-quicksand-medium"
                    numberOfLines={2}
                  >
                    {replyingTo.text}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setReplyingTo(null)}
                  className="ml-3 w-8 h-8 bg-white rounded-full justify-center items-center shadow-sm"
                >
                  <Ionicons name="close" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Zone de saisie */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 8, paddingBottom: Math.max(insets.bottom + 4, 10), backgroundColor: isDark ? '#0F1923' : '#EEF2F7', gap: 8 }}>
            {/* Pill input */}
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 21, paddingHorizontal: 14, minHeight: 42, maxHeight: 120, borderWidth: 1, borderColor: colors.border }}>
              <TextInput
                ref={textInputRef}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder={i18n.t('client.messages.conversationDetail.placeholder')}
                multiline
                maxLength={2000}
                onContentSizeChange={(e) => {
                  const h = Math.max(24, Math.min(100, e.nativeEvent.contentSize.height));
                  setInputHeight(h);
                }}
                placeholderTextColor={colors.textSecondary}
                style={{ flex: 1, fontFamily: 'Quicksand-Medium', fontSize: 15, color: colors.textPrimary, height: Math.max(24, inputHeight), paddingVertical: 0, textAlignVertical: 'center' }}
                editable={!sending}
              />
              {newMessage.length > 1800 && (
                <Text style={{ fontSize: 10, color: newMessage.length > 1950 ? '#EF4444' : '#F97316', fontFamily: 'Quicksand-Medium', marginBottom: 2, marginLeft: 4 }}>
                  {2000 - newMessage.length}
                </Text>
              )}
            </View>

            {/* Bouton envoi */}
            <TouchableOpacity
              onPress={handleSendPress}
              disabled={sending || !newMessage.trim()}
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: newMessage.trim() ? '#10B981' : (isDark ? '#1E2A3A' : '#D1D5DB'), justifyContent: 'center', alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 3 }, shadowOpacity: newMessage.trim() ? 0.3 : 0, shadowRadius: 6, elevation: newMessage.trim() ? 4 : 0 }}
            >
              <Ionicons name="send" size={18} color={newMessage.trim() ? '#FFFFFF' : (isDark ? '#4B5563' : '#9CA3AF')} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        // Layout pour iOS avec KeyboardAvoidingView
        <KeyboardAvoidingView
          className="flex-1"
          behavior="padding"
          style={{ flex: 1 }}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item._id}
            className="flex-1 px-4"
            onScrollToIndexFailed={() => { flatListRef.current?.scrollToOffset({ offset: 0, animated: true }); }}
            ListHeaderComponent={
              effectiveProduct ? (
                <TouchableOpacity
                  style={{
                    marginBottom: 16,
                    borderRadius: 20,
                    overflow: 'hidden',
                    backgroundColor: colors.card,
                    shadowColor: '#10B981',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 3,
                    borderWidth: 1,
                    borderColor: colors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 12,
                  }}
                  onPress={() => {
                    router.push(
                      `/(app)/(client)/product/${effectiveProduct._id}` as any
                    );
                  }}
                >
                  <Image
                    source={{
                      uri:
                        effectiveProduct.images?.[0] ||
                        "https://via.placeholder.com/60x60/CCCCCC/FFFFFF?text=No+Image",
                    }}
                    style={{ width: 56, height: 56, borderRadius: 14 }}
                    resizeMode="cover"
                  />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text
                      style={{ fontSize: 14, fontFamily: 'Quicksand-SemiBold', color: colors.textPrimary, marginBottom: 4 }}
                      numberOfLines={1}
                    >
                      {effectiveProduct.name || i18n.t('client.messages.conversationDetail.productFallback')}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 13, fontFamily: 'Quicksand-Bold', color: '#10B981' }}>
                          {effectiveProduct.price
                            ? formatPrice(effectiveProduct.price)
                            : i18n.t('client.messages.conversationDetail.priceUnavailable')}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null
            }
            contentContainerStyle={{
              paddingTop: 8,
              paddingBottom: 120,
            }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
              }, 50);
            }}
            onScroll={(e) => {
              const { contentOffset, contentSize, layoutMeasurement } =
                e.nativeEvent;
              const distanceFromBottom =
                contentSize.height -
                (contentOffset.y + layoutMeasurement.height);
              setShowScrollToBottom(distanceFromBottom > 200);
            }}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80, paddingHorizontal: 32 }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(16,185,129,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1.5, borderColor: 'rgba(16,185,129,0.15)' }}>
                  <Ionicons name="chatbubbles-outline" size={30} color="#10B981" />
                </View>
                <Text style={{ fontSize: 17, fontFamily: 'Quicksand-Bold', color: '#1F2937', marginBottom: 8, textAlign: 'center' }}>
                  {i18n.t('client.messages.conversationDetail.emptyConversation.title')}
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'Quicksand-Medium', color: '#9CA3AF', textAlign: 'center', lineHeight: 20 }}>
                  {i18n.t('client.messages.conversationDetail.emptyConversation.subtitle')}
                </Text>
              </View>
            }
          />

          {/* Zone de réponse améliorée */}
          {replyingTo && (
            <View style={{ backgroundColor: '#ECFDF5', marginHorizontal: 16, marginBottom: 8, borderRadius: 16, padding: 16, borderLeftWidth: 4, borderLeftColor: '#10B981', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name="return-up-forward"
                      size={14}
                      color="#10B981"
                    />
                    <Text className="text-xs text-primary-600 font-quicksand-semibold ml-1">
                      {i18n.t('client.messages.conversationDetail.replyTo')} {replyingTo.sender.firstName}{" "}
                      {replyingTo.sender.lastName}
                    </Text>
                  </View>
                  <Text
                    className="text-sm text-neutral-700 font-quicksand-medium"
                    numberOfLines={2}
                  >
                    {replyingTo.text}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setReplyingTo(null)}
                  className="ml-3 w-8 h-8 bg-white rounded-full justify-center items-center shadow-sm"
                >
                  <Ionicons name="close" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Zone de saisie iOS */}
          {!isUserAloneInConversation() && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 8, paddingBottom: Math.max(insets.bottom + 4, 10), backgroundColor: isDark ? '#0F1923' : '#EEF2F7', gap: 8 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 21, paddingHorizontal: 14, minHeight: 42, maxHeight: 120, borderWidth: 1, borderColor: colors.border }}>
                <TextInput
                  ref={textInputRef}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder={i18n.t('client.messages.conversationDetail.placeholder')}
                  multiline
                  maxLength={2000}
                  onContentSizeChange={(e) => {
                    const h = Math.max(24, Math.min(100, e.nativeEvent.contentSize.height));
                    setInputHeight(h);
                  }}
                  placeholderTextColor={colors.textSecondary}
                  style={{ flex: 1, fontFamily: 'Quicksand-Medium', fontSize: 15, color: colors.textPrimary, height: Math.max(24, inputHeight), paddingVertical: 0, textAlignVertical: 'center' }}
                  editable={!sending}
                />
                {newMessage.length > 1800 && (
                  <Text style={{ fontSize: 10, color: newMessage.length > 1950 ? '#EF4444' : '#F97316', fontFamily: 'Quicksand-Medium', marginBottom: 2, marginLeft: 4 }}>
                    {2000 - newMessage.length}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={handleSendPress}
                disabled={sending || !newMessage.trim()}
                style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: newMessage.trim() ? '#10B981' : (isDark ? '#1E2A3A' : '#D1D5DB'), justifyContent: 'center', alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 3 }, shadowOpacity: newMessage.trim() ? 0.3 : 0, shadowRadius: 6, elevation: newMessage.trim() ? 4 : 0 }}
              >
                <Ionicons name="send" size={18} color={newMessage.trim() ? '#FFFFFF' : (isDark ? '#4B5563' : '#9CA3AF')} style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      )}

      {/* Bouton flottant descendre en bas */}
      {showScrollToBottom && (
        <TouchableOpacity
          onPress={() => {
            // Scroll immédiat sans animation pour plus de fiabilité
            flatListRef.current?.scrollToEnd({ animated: false });
            // Puis avec animation pour l'effet visuel
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 50);
          }}
          className="absolute right-4 rounded-full w-12 h-12 justify-center items-center"
          style={{
            bottom: 100 + insets.bottom,
            backgroundColor: "#10B981",
            shadowColor: "#10B981",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 8,
            zIndex: 1000,
          }}
        >
          <Ionicons name="arrow-down" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Modal de confirmation de suppression */}
      <Modal
        visible={confirmationVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeConfirmation}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={closeConfirmation}
        >
          <View className="flex-1 justify-center items-center px-6">
            <TouchableOpacity
              className="rounded-3xl w-full max-w-sm"
              style={{ backgroundColor: colors.card }}
              activeOpacity={1}
              onPress={() => { }}
            >
              {/* Icon */}
              <View className="items-center pt-8 pb-4">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: confirmationAction?.confirmColor + "20",
                  }}
                >
                  <Ionicons
                    name="trash"
                    size={28}
                    color={confirmationAction?.confirmColor}
                  />
                </View>
              </View>

              {/* Content */}
              <View className="px-6 pb-6">
                <Text className="text-xl font-quicksand-bold text-center mb-2" style={{ color: colors.textPrimary }}>
                  {confirmationAction?.title}
                </Text>
                <Text className="text-base font-quicksand-medium text-center leading-5" style={{ color: colors.textSecondary }}>
                  {confirmationAction?.message}
                </Text>
              </View>

              {/* Actions */}
              <View className="flex-row px-6 pb-6 gap-3">
                <TouchableOpacity
                  onPress={closeConfirmation}
                  className="flex-1 py-4 rounded-2xl items-center"
                  style={{ backgroundColor: colors.secondary }}
                >
                  <Text className="text-base font-quicksand-semibold" style={{ color: colors.textPrimary }}>
                    Annuler
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const messageId = confirmationAction?.messageId;
                    if (messageId) {
                      closeConfirmation();
                      executeDeleteAction(messageId);
                    }
                  }}
                  className="flex-1 py-4 rounded-2xl items-center"
                  style={{ backgroundColor: confirmationAction?.confirmColor }}
                >
                  <Text className="text-base font-quicksand-semibold text-white">
                    {confirmationAction?.confirmText}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Notification Modal */}
      {notification && (
        <NotificationModal
          visible={notification.visible}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={hideNotification}
        />
      )}

      {/* Modal Actions du message — slide-up animé */}
      <Modal
        visible={messageActionsModal.visible}
        transparent={true}
        animationType="none"
        onRequestClose={closeActionsModal}
      >
        <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', opacity: backdropActionsAnim, justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeActionsModal} />
          <Animated.View style={{ transform: [{ translateY: slideActionsAnim }] }}>
            <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', paddingBottom: Math.max(insets.bottom, 12) }}>
              {/* Handle */}
              <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
                <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
              </View>

              {/* Aperçu du message */}
              {messageActionsModal.message && !messageActionsModal.message.metadata?.deleted && (
                <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: colors.secondary, borderRadius: 14, padding: 12, borderLeftWidth: 3, borderLeftColor: '#10B981' }}>
                  <Text style={{ fontSize: 11, fontFamily: 'Quicksand-SemiBold', color: '#10B981', marginBottom: 4 }}>
                    {messageActionsModal.message.sender.firstName} {messageActionsModal.message.sender.lastName}
                  </Text>
                  <Text style={{ fontSize: 13, fontFamily: 'Quicksand-Medium', color: colors.textSecondary }} numberOfLines={2}>
                    {messageActionsModal.message.text}
                  </Text>
                </View>
              )}

              {/* Actions groupées */}
              <View style={{ marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                <TouchableOpacity
                  onPress={() => {
                    const msg = messageActionsModal.message;
                    closeActionsModal();
                    setTimeout(() => { if (msg) setReplyingTo(msg); }, 280);
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.card }}
                  activeOpacity={0.7}
                >
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(16,185,129,0.10)', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                    <Ionicons name="return-up-forward" size={20} color="#10B981" />
                  </View>
                  <Text style={{ fontSize: 15, fontFamily: 'Quicksand-SemiBold', color: colors.textPrimary, flex: 1 }}>
                    {i18n.t('client.messages.conversationDetail.replyTo').replace(':', '') || 'Répondre'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </TouchableOpacity>

                {messageActionsModal.message && messageActionsModal.message.sender._id === user?._id && (
                  <>
                    <View style={{ height: 1, backgroundColor: colors.border }} />
                    <TouchableOpacity
                      onPress={() => {
                        const msgId = messageActionsModal.message?._id;
                        closeActionsModal();
                        setTimeout(() => { if (msgId) showDeleteConfirmation(msgId); }, 280);
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.card }}
                      activeOpacity={0.7}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239,68,68,0.10)', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                        <Ionicons name="trash" size={20} color="#EF4444" />
                      </View>
                      <Text style={{ fontSize: 15, fontFamily: 'Quicksand-SemiBold', color: '#EF4444', flex: 1 }}>
                        Supprimer
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="#EF444470" />
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* Annuler */}
              <TouchableOpacity
                onPress={closeActionsModal}
                style={{ margin: 16, marginTop: 10, backgroundColor: colors.secondary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 15, fontFamily: 'Quicksand-SemiBold', color: colors.textSecondary }}>
                  Annuler
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Modal Options de suppression */}
      <Modal
        visible={deleteOptionsModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() =>
          setDeleteOptionsModal({ visible: false, messageId: null })
        }
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() =>
            setDeleteOptionsModal({ visible: false, messageId: null })
          }
        >
          <View className="flex-1 justify-end">
            <TouchableOpacity
              className="bg-white rounded-t-3xl"
              activeOpacity={1}
              onPress={() => { }}
            >
              {/* Handle bar */}
              <View className="w-full items-center pt-3 pb-2">
                <View className="w-12 h-1 bg-neutral-300 rounded-full" />
              </View>

              {/* Header */}
              <View className="px-6 pb-4 border-b border-neutral-100">
                <Text className="text-lg font-quicksand-bold text-neutral-800">
                  Supprimer le message
                </Text>
                <Text className="text-sm text-neutral-500 font-quicksand-medium mt-1">
                  Choisissez une option
                </Text>
              </View>

              {/* Options */}
              <View className="px-6 py-2">
                <TouchableOpacity
                  onPress={() => {
                    const msgId = deleteOptionsModal.messageId;
                    setDeleteOptionsModal({ visible: false, messageId: null });
                    if (msgId) deleteMessage(msgId, false);
                  }}
                  className="flex-row items-center py-4 border-b border-neutral-50"
                  activeOpacity={0.7}
                >
                  <View className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center mr-4">
                    <Ionicons name="eye-off" size={20} color="#F97316" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-quicksand-semibold text-neutral-800">
                      Pour moi seulement
                    </Text>
                    <Text className="text-sm text-neutral-500 font-quicksand-medium">
                      Le message sera supprimé uniquement pour vous
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    const msgId = deleteOptionsModal.messageId;
                    setDeleteOptionsModal({ visible: false, messageId: null });
                    if (msgId) deleteMessage(msgId, true);
                  }}
                  className="flex-row items-center py-4"
                  activeOpacity={0.7}
                >
                  <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center mr-4">
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-quicksand-semibold text-red-500">
                      Pour tout le monde
                    </Text>
                    <Text className="text-sm text-neutral-500 font-quicksand-medium">
                      Le message sera supprimé pour tous les participants
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {/* Cancel Button */}
              <View className="px-6 pb-6 pt-2">
                <TouchableOpacity
                  onPress={() =>
                    setDeleteOptionsModal({ visible: false, messageId: null })
                  }
                  className="w-full bg-neutral-100 py-4 rounded-2xl items-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-base font-quicksand-semibold text-neutral-700">
                    Annuler
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Renvoyer message échoué */}
      <Modal
        visible={retryModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setRetryModal({ visible: false, message: null })}
      >
        <TouchableOpacity
          className="flex-1"
          style={{ backgroundColor: colors.overlay }}
          activeOpacity={1}
          onPress={() => setRetryModal({ visible: false, message: null })}
        >
          <View className="flex-1 justify-center items-center px-6">
            <TouchableOpacity
              className="rounded-3xl w-full max-w-sm"
              style={{ backgroundColor: colors.card }}
              activeOpacity={1}
              onPress={() => { }}
            >
              {/* Icon */}
              <View className="items-center pt-8 pb-4">
                <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center">
                  <Ionicons name="alert-circle" size={32} color="#EF4444" />
                </View>
              </View>

              {/* Content */}
              <View className="px-6 pb-6">
                <Text className="text-xl font-quicksand-bold text-center mb-2" style={{ color: colors.textPrimary }}>
                  Échec d&apos;envoi
                </Text>
                <Text className="text-base font-quicksand-medium text-center leading-5" style={{ color: colors.textSecondary }}>
                  {retryModal.message?._sendError ||
                    "Le message n'a pas pu être envoyé"}
                </Text>
              </View>

              {/* Actions */}
              <View className="flex-row px-6 pb-6 gap-3">
                <TouchableOpacity
                  onPress={() =>
                    setRetryModal({ visible: false, message: null })
                  }
                  className="flex-1 py-4 rounded-2xl items-center"
                  style={{ backgroundColor: colors.tertiary }}
                  activeOpacity={0.7}
                >
                  <Text className="text-base font-quicksand-semibold" style={{ color: colors.textPrimary }}>
                    Annuler
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const msg = retryModal.message;
                    setRetryModal({ visible: false, message: null });
                    if (msg) retryFailedMessage(msg);
                  }}
                  className="flex-1 bg-primary-500 py-4 rounded-2xl items-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-base font-quicksand-semibold text-white">
                    Renvoyer
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Visionneuse de statut depuis une réponse */}
      {statusReplyViewer && (
        <StatusViewer
          visible={true}
          groups={[{
            enterprise: (statusReplyViewer.status as any).enterprise,
            statuses: [statusReplyViewer.status],
            hasUnviewed: false,
          }]}
          initialGroupIndex={0}
          currentUserId={statusReplyViewer.currentUserId}
          onClose={() => setStatusReplyViewer(null)}
          onViewed={(statusId) => StatusService.markViewed(statusId).catch(() => {})}
        />
      )}
    </View>
  );
}
