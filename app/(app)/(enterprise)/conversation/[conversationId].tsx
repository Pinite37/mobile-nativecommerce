import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Animated as RNAnimated,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// Removed reanimated Animated import since we are not using transition classes here
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NotificationModal, {
  useNotification,
} from "../../../../components/ui/NotificationModal";
import { useAuth } from "../../../../contexts/AuthContext";
import { useTheme } from "../../../../contexts/ThemeContext";
import { useSocket } from "../../../../hooks/useSocket";
import i18n from "../../../../i18n/i18n";
import DeliveryService, {
  CreateOfferPayload,
  UrgencyLevel,
} from "../../../../services/api/DeliveryService";
import MessagingService, {
  Conversation,
  Message,
} from "../../../../services/api/MessagingService";
import StatusService, { StatusItem } from "../../../../services/api/StatusService";
import EnterpriseService from "../../../../services/api/EnterpriseService";
import CommandeService, { Commande } from "../../../../services/api/CommandeService";
import DeliveryAddressRequestService, {
  DeliveryAddressRequest,
} from "../../../../services/api/DeliveryAddressRequestService";
import { StatusViewer } from "../../../../components/ui/StatusViewer";
import ConversationSearch from "../../../../components/messaging/ConversationSearch";
import ChatWallpaper from "../../../../components/messaging/ChatWallpaper";
import SwipeableMessageRow from "../../../../components/messaging/SwipeableMessageRow";
import ConversationCacheService from "../../../../services/ConversationCacheService";
import ConversationPreviewStore from "../../../../services/ConversationPreviewStore";

// Cache simple pour les conversations et messages
const conversationCache = new Map<
  string,
  { 
    conversation: Conversation; 
    messages: Message[]; 
    participants: any[]; 
    timestamp: number 
  }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes en millisecondes


const ChatWallpaperEnt = ChatWallpaper;
const SwipeableRow = SwipeableMessageRow;

export default function ConversationDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const { user, isAuthenticated } = useAuth(); // Récupérer l'utilisateur connecté
  const {
    isConnected,
    joinConversation,
    onNewMessage,
    onMessageDeleted,
    onMessagesRead,
  } = useSocket();
  const { notification, showNotification, hideNotification } =
    useNotification();
  const { colors, isDark } = useTheme();
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // Animations send + actions modal
  const sendAnim = useRef(new RNAnimated.Value(1)).current;
  const sendTranslateY = useRef(new RNAnimated.Value(0)).current;
  const lastSentLocalId = useRef<string | null>(null);
  const slideActionsAnim = useRef(new RNAnimated.Value(400)).current;
  const backdropActionsAnim = useRef(new RNAnimated.Value(0)).current;

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
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [statusReplyViewer, setStatusReplyViewer] = useState<{ status: StatusItem; currentUserId: string } | null>(null);
  const [inputHeight, setInputHeight] = useState(0);
  const [attachment, setAttachment] = useState<{
    type: "IMAGE" | "FILE";
    data: string;
    mimeType: string;
    fileName?: string;
    uri: string;
  } | null>(null);

  // Offre de livraison (création depuis la conversation)
  // La zone de livraison a disparu du formulaire : c'est désormais le CLIENT
  // qui fournit son adresse en confirmant la commande. L'expiration aussi —
  // elle concerne la mission, fixée au moment de la publier, pas l'accord.

  // Commandes déjà proposées à ce client, pour ce produit.
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempExpiryDate, setTempExpiryDate] = useState<Date | null>(null);
  const [tempPickerDate, setTempPickerDate] = useState<Date>(
    new Date(Date.now() + 60 * 60 * 1000)
  );

  const zoneInputRef = useRef<any>(null);
  const feeInputRef = useRef<any>(null);
  const instructionsInputRef = useRef<any>(null);

  // Demande d'adresse envoyée par le client lui-même (bouton "Partager mon
  // adresse de livraison" dans SA conversation) — quand elle existe, elle
  // remplace la saisie manuelle de la zone de livraison au lieu de la
  // dupliquer. Récupérée dès que la conversation est chargée (pas seulement
  // à l'ouverture du formulaire) pour l'afficher en bandeau permanent — sinon
  // l'entreprise ne sait jamais que le client a déjà transmis une adresse
  // tant qu'elle n'a pas ouvert "Créer une offre".
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  /** Index visé par un saut en cours, pour que onScrollToIndexFailed puisse le rattraper. */
  const pendingScrollIndexRef = useRef<number | null>(null);

  const [matchedDeliveryRequest, setMatchedDeliveryRequest] =
    useState<DeliveryAddressRequest | null>(null);

  // Sans point de retrait, le backend refuse de publier la mission : on
  // prévient dans le formulaire plutôt que de laisser l'entreprise le
  // remplir en entier pour échouer à l'envoi.

  const conversationProductId =
    typeof conversation?.product === "string"
      ? conversation.product
      : conversation?.product?._id;

  const refreshMatchedDeliveryRequest = useCallback(async () => {
    try {
      const customerId = getCustomerIdFromConversation(
        conversation,
        getCurrentUserId()
      );
      if (!conversationProductId || !customerId) {
        setMatchedDeliveryRequest(null);
        return null;
      }

      const pending = await DeliveryAddressRequestService.listPending(customerId);
      const match = pending.find((r) => r.product?._id === conversationProductId) || null;
      setMatchedDeliveryRequest(match);
      return match;
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation, conversationProductId]);

  const publishMission = async (commande: Commande) => {
    setPublishingId(commande._id);
    try {
      await CommandeService.publishMission(commande._id);
      showNotification("success", "Livraison publiée", "Les livreurs à proximité sont notifiés");
      await refreshCommandes();
    } catch (e: any) {
      showNotification("error", "Publication impossible", e?.message || "Réessayez");
    } finally {
      setPublishingId(null);
    }
  };

  const refreshCommandes = useCallback(async () => {
    const customerId = getCustomerIdFromConversation(conversation, getCurrentUserId());
    if (!customerId) return;
    setCommandes(await CommandeService.listMine({ client: customerId }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation]);

  useEffect(() => {
    if (!conversation) return;
    // `refreshCommandes` n'est plus appelé ici : le useFocusEffect ci-dessous
    // s'en charge, y compris au premier affichage — les deux ensemble
    // faisaient deux appels identiques au montage.
    refreshMatchedDeliveryRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?._id, conversationProductId]);

  // Au retour de l'écran de proposition. Tant que le formulaire était une
  // feuille dans cette page, la création mettait la liste à jour par un
  // setCommandes local ; sur un écran séparé, cet appel n'existe plus et la
  // commande n'apparaissait qu'après avoir quitté puis rouvert la
  // conversation.
  useFocusEffect(
    useCallback(() => {
      if (conversation) refreshCommandes();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversation?._id])
  );

  // La proposition de commande a quitté cet écran : c'était une feuille en
  // position absolue couvrant tout l'écran, avec laquelle le clavier n'a
  // jamais cohabité correctement — quatre tentatives. Une route laisse le
  // système gérer le clavier, et supprime le fond cliquable ainsi que
  // l'interception du bouton retour Android.
  const openOfferModal = () => {
    if (!conversation) return;
    const productId =
      typeof conversation.product === "string"
        ? conversation.product
        : conversation.product?._id;
    const customerId = getCustomerIdFromConversation(conversation, getCurrentUserId());

    if (!productId || !customerId) {
      showNotification(
        "error",
        "Données manquantes",
        "Produit ou client introuvable pour proposer une commande"
      );
      return;
    }

    // Une conversation couvre toute la relation avec un client, donc
    // plusieurs produits. On transmet ceux abordés dans ce fil pour que
    // l'entreprise choisisse : `conversation.product` seul désigne le dernier
    // produit d'où le client est arrivé, pas celui dont on parle.
    const normalizeProduct = (p: any) =>
      p && typeof p === "object" && p._id
        ? { _id: p._id, name: p.name, price: p.price }
        : null;

    let threadProducts = (Array.isArray((conversation as any).products)
      ? (conversation as any).products.map(normalizeProduct).filter(Boolean)
      : []) as { _id: string; name?: string; price?: number }[];

    // `products[]` est vide sur les fils antérieurs à son introduction, et le
    // restera tant que le client n'aura pas rouvert la discussion depuis une
    // fiche produit. On retombe alors sur le produit current : l'écran doit
    // toujours dire sur quoi porte la commande, même sans historique.
    if (threadProducts.length === 0) {
      const current = normalizeProduct(conversation.product);
      if (current) threadProducts = [current];
    }

    router.push({
      pathname: "/(app)/(enterprise)/commande/nouvelle",
      params: {
        conversationId: conversationId ?? "",
        clientId: customerId,
        productId,
        products: JSON.stringify(threadProducts),
        // `otherParticipant` est déclaré plus bas dans le composant ; il est
        // bien initialisé au moment où cette fonction s'exécute (à l'appui),
        // mais on reste tolérant : le sous-titre est décoratif.
        clientName: otherParticipant
          ? `${otherParticipant.firstName ?? ""} ${otherParticipant.lastName ?? ""}`.trim()
          : "",
      },
    } as any);
  };


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
  const [attachmentModal, setAttachmentModal] = useState(false);
  const [retryModal, setRetryModal] = useState<{
    visible: boolean;
    message: Message | null;
  }>({ visible: false, message: null });

  // États pour la gestion des offres de livraison
  // (déjà déclarés plus haut)

  // Récupérer l'ID de l'utilisateur connecté depuis le contexte d'auth
  const getCurrentUserId = () => {
    return user?._id || null; // Utiliser l'ID du contexte d'authentification
  };

  // Helper: vérifier si l'utilisateur actuel est propriétaire du produit
  const isCurrentUserProductOwner = (
    conv: any,
    currentUserId?: string | null
  ): boolean => {
    if (!conv?.participants || !currentUserId) return false;

    // Dans les conversations CLIENT_ENTERPRISE, le vendeur est toujours le second participant
    if (Array.isArray(conv.participants) && conv.participants.length >= 2) {
      const seller = conv.participants[1];
      // participants peut être des objets populés ou des string IDs
      const sellerId = typeof seller === "object" ? seller?._id : seller;
      return sellerId ? String(sellerId) === String(currentUserId) : false;
    }

    // Fallback: vérifier via le produit si disponible
    if (typeof conv.product === "object" && conv.product?.enterprise) {
      const enterpriseId =
        typeof conv.product.enterprise === "string"
          ? conv.product.enterprise
          : conv.product.enterprise._id;
      return String(enterpriseId) === String(currentUserId);
    }

    return false;
  };

  // Helper: récupérer l'ID du client depuis la conversation
  const getCustomerIdFromConversation = (
    conv: any,
    currentUserId?: string | null
  ): string | undefined => {
    try {
      // 1) Préférence: otherParticipant explicit et role CLIENT
      if (conv?.otherParticipant) {
        if (conv.otherParticipant.role === "CLIENT")
          return conv.otherParticipant._id;
        // otherParticipant est l'entreprise → chercher le client dans participants si objets
        if (
          Array.isArray(conv.participants) &&
          conv.participants.length > 0 &&
          typeof conv.participants[0] === "object"
        ) {
          const clientObj = (conv.participants as any[]).find(
            (p) => p.role === "CLIENT"
          );
          if (clientObj) return clientObj._id;
        }
      }

      // 2) Participants sous forme d'objets avec roles
      if (
        Array.isArray(conv?.participants) &&
        conv.participants.length > 0 &&
        typeof conv.participants[0] === "object"
      ) {
        const clientObj = (conv.participants as any[]).find(
          (p) => p.role === "CLIENT"
        );
        if (clientObj) return clientObj._id;
        // Fallback: prendre l'autre participant différent de l'utilisateur current
        const otherObj = (conv.participants as any[]).find(
          (p) => p._id !== currentUserId
        );
        if (otherObj) return otherObj._id;
      }

      // 3) Participants sous forme d'IDs (strings)
      if (
        Array.isArray(conv?.participants) &&
        conv.participants.length > 0 &&
        typeof conv.participants[0] === "string"
      ) {
        const ids = (conv.participants as string[]).filter(Boolean);
        if (ids.length) {
          if (currentUserId && ids.includes(currentUserId)) {
            return ids.find((id) => id !== currentUserId);
          }
          // Dernier recours: retourner le premier si on ne connaît pas l'utilisateur current
          return ids[0];
        }
      }
    } catch (e) {
      console.warn("getCustomerIdFromConversation error:", e);
    }
    return undefined;
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
    const shimmerAnim = React.useRef(new RNAnimated.Value(0)).current;

    React.useEffect(() => {
      const shimmerAnimation = RNAnimated.loop(
        RNAnimated.timing(shimmerAnim, {
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

    // Couleurs adaptées au thème
    const baseColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';
    const shimmerColor = isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.04)';

    return (
      <View
        style={{ 
          width: width as any, 
          height, 
          borderRadius,
          backgroundColor: baseColor,
          overflow: 'hidden'
        }}
      >
        <RNAnimated.View
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: shimmerColor,
            transform: [{ translateX }] 
          }}
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
            borderRadius={4}
          />
          <View className="mt-2">
            <ShimmerBlock
              width={isCurrentUser ? 200 : 180}
              height={40}
              borderRadius={16}
            />
          </View>
          <View
            className={`flex-row items-center mt-1 ${
              isCurrentUser ? "justify-end" : "justify-start"
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
    <View style={{ flex: 1, backgroundColor: colors.card }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} translucent backgroundColor="transparent" />
      {/* Header skeleton */}
      <View style={{ backgroundColor: colors.surface, paddingTop: insets.top + 8, paddingLeft: insets.left + 16, paddingRight: insets.right + 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ShimmerBlock width={38} height={38} borderRadius={12} />
          <View style={{ width: 10 }} />
          <ShimmerBlock width={38} height={38} borderRadius={19} />
          <View style={{ width: 10 }} />
          <View style={{ flex: 1 }}>
            <ShimmerBlock width="60%" height={16} borderRadius={4} />
            <View style={{ height: 4 }} />
            <ShimmerBlock width="40%" height={12} borderRadius={4} />
          </View>
          <ShimmerBlock width={32} height={32} borderRadius={12} />
        </View>
      </View>

      {/* Product info skeleton */}
      <View className="mx-4 mt-4 rounded-2xl p-4 flex-row items-center" style={{ backgroundColor: colors.card }}>
        <ShimmerBlock width={48} height={48} borderRadius={12} />
        <View className="ml-3 flex-1">
          <ShimmerBlock width="70%" height={14} borderRadius={4} />
          <ShimmerBlock width="50%" height={16} borderRadius={4} />
        </View>
        <ShimmerBlock width={16} height={16} borderRadius={8} />
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

      console.log("� ENTERPRISE WebSocket - Message reçu:", {
        conversationId: receivedConvId,
        currentConvId: conversationId,
        messageId: data.message?._id,
        sender: data.message?.sender?._id,
        text: data.message?.text?.substring(0, 30),
      });

      if (receivedConvId !== conversationId) {
        console.log("⏭️ ENTERPRISE - Message ignoré (autre conversation)");
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
        console.log("⏭️ ENTERPRISE - Message ignoré (notre propre message)");
        return;
      }

      console.log("✅ ENTERPRISE - Ajout du message reçu:", {
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
            console.log("⚠️ ENTERPRISE - Message existe déjà, mise à jour");
            updatedMessages = [...prev];
            updatedMessages[existingIndex] = data.message;
          } else {
            // Nouveau message d'un autre participant, l'ajouter
            updatedMessages = [...prev, data.message];
            console.log(
              `📊 ENTERPRISE - Messages avant: ${prev.length}, après: ${updatedMessages.length}`
            );
          }
          
          // Persister le nouveau message dans le cache AsyncStorage
          if (conversationId) {
            ConversationCacheService.appendMessage(conversationId, data.message);
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
        console.error("❌ ENTERPRISE - Erreur ajout message:", error);
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
            `👁️ ENTERPRISE - Mise à jour readBy, messages: ${prev.length}`
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

  // S'assurer que le dernier message est toujours visible
  useEffect(() => {
    console.log(
      `📋 ENTERPRISE - Liste messages mise à jour: ${messages.length} messages`
    );
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Ref pour éviter les rechargements multiples
  const loadedConversationRef = useRef<string | null>(null);

  useEffect(() => {
    // Éviter de recharger si déjà chargé
    if (loadedConversationRef.current === conversationId) {
      console.log("⏭️ ENTERPRISE - Conversation déjà chargée, skip");
      return;
    }

    const loadConversationData = async () => {
      // 1. Lire le cache persistant — bloquer "Conversation introuvable" pendant ce temps
      const cached = await ConversationCacheService.get(conversationId!);

      if (cached) {
        setConversation(cached.conversation);
        setMessages(cached.messages);
        setParticipants(cached.participants || []);
      } else {
        setLoading(true);
      }
      setInitialized(true);

      // 2. Rafraîchir depuis l'API silencieusement en arrière-plan
      try {
        const data = await MessagingService.getConversationMessages(conversationId!);
        setConversation(data.conversation);
        setMessages(data.messages);
        setParticipants(data.participants || []);
        loadedConversationRef.current = conversationId;
        ConversationCacheService.set(conversationId!, {
          conversation: data.conversation,
          messages: data.messages,
          participants: data.participants || [],
        });
        MessagingService.markMessagesAsRead(conversationId!).catch(() => {});
      } catch (error) {
        if (!cached) {
          showNotification(
            "error",
            i18n.t("messages.error"),
            i18n.t("enterprise.messages.conversationDetail.errors.loadConversation")
          );
        }
      } finally {
        setLoading(false);
      }
    };

    if (conversationId) {
      loadConversationData();
    }

    return () => {
      loadedConversationRef.current = null;
    };
  }, [conversationId, showNotification]);

  // === GESTION SOCKET.IO ===
  useEffect(() => {
    if (!conversationId || !isConnected) {
      return;
    }

    console.log(
      "🔌 ENTERPRISE - Socket.IO setup pour conversation:",
      conversationId
    );

    // Rejoindre la conversation Socket.IO
    joinConversation(conversationId);

    // S'abonner aux événements Socket.IO via le hook
    const cleanupNewMessage = onNewMessage(handleNewMessage);
    const cleanupMessageDeleted = onMessageDeleted(handleMessageDeleted);
    const cleanupMessagesRead = onMessagesRead(handleMessagesRead);

    console.log("✅ ENTERPRISE - Listeners Socket.IO configurés");

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
    if ((!newMessage.trim() && !attachment) || sending || !conversation) {
      console.log("⏸️ Envoi annulé: données insuffisantes ou envoi en cours", {
        hasText: !!newMessage.trim(),
        hasAttachment: !!attachment,
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
    const messageAttachment = attachment;
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
      messageType: messageAttachment ? "IMAGE" : "TEXT",
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
    RNAnimated.parallel([
      RNAnimated.spring(sendTranslateY, { toValue: 0, damping: 14, stiffness: 180, useNativeDriver: true }),
      RNAnimated.timing(sendAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    // Réinitialiser les états immédiatement pour meilleure UX
    setNewMessage("");
    setReplyingTo(null);
    setAttachment(null);

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
        hasAttachment: !!messageAttachment,
        textLength: messageText.length,
      });

      // Émission du message via MessagingService
      let sentMessage: any;
      if (messageAttachment) {
        sentMessage = await MessagingService.sendMessageWithAttachment(
          productId,
          messageText,
          {
            type: messageAttachment.type,
            data: messageAttachment.data,
            mimeType: messageAttachment.mimeType,
            fileName: messageAttachment.fileName,
          },
          messageReplyTo?._id,
          conversationId || undefined
        );
      } else {
        sentMessage = await MessagingService.sendMessage(
          productId,
          messageText,
          messageReplyTo?._id,
          conversationId || undefined
        );
      }

      console.log("📨 ENTERPRISE - Message envoyé avec succès", {
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

        // Persister le message envoyé dans le cache AsyncStorage
        ConversationCacheService.appendMessage(conversationId!, {
          ...sentMessage.message,
          _sendingStatus: "sent" as const,
        });
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

      console.log("✅ ENTERPRISE - Message renvoyé avec succès", {
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

  // Création de l'offre de livraison

  // Fonction pour envoyer un message avec animation
  const handleSendPress = () => {
    console.log("🚀 handleSendPress appelé - Début envoi message");
    console.log("📝 Contenu du message:", newMessage);
    console.log("💬 Conversation ID:", conversationId);
    console.log("👤 Utilisateur actuel:", getCurrentUserId());

    if ((!newMessage.trim() && !attachment) || sending) {
      console.log(
        "❌ Envoi annulé - message vide et pas de pièce jointe ou déjà en cours:",
        {
          messageVide: !newMessage.trim(),
          pasDePieceJointe: !attachment,
          sending,
        }
      );
      return;
    }

    console.log("✅ Conditions validées, lancement sendMessage()");
    sendMessage();
  };

  // Fonctions pour gérer les pièces jointes
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showNotification(
        "warning",
        "Permission requise",
        "Nous avons besoin de l'autorisation pour accéder à vos photos."
      );
      return false;
    }
    return true;
  };

  const requestCameraPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showNotification(
        "warning",
        "Permission requise",
        "Nous avons besoin de l'autorisation pour utiliser votre caméra."
      );
      return false;
    }
    return true;
  };

  const pickImageFromGallery = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAttachment({
          type: "IMAGE",
          data: asset.base64 || "",
          mimeType: asset.mimeType || "image/jpeg",
          fileName: asset.fileName || undefined,
          uri: asset.uri,
        });
      }
    } catch (error) {
      console.error("Erreur sélection image:", error);
      showNotification("error", "Erreur", "Impossible de sélectionner l'image");
    }
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAttachment({
          type: "IMAGE",
          data: asset.base64 || "",
          mimeType: asset.mimeType || "image/jpeg",
          fileName: asset.fileName || undefined,
          uri: asset.uri,
        });
      }
    } catch (error) {
      console.error("Erreur prise photo:", error);
      showNotification("error", "Erreur", "Impossible de prendre la photo");
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
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
            <Ionicons
              name="checkmark"
              size={12}
              color="#9CA3AF"
              style={{ marginLeft: -4 }}
            />
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
          <View className="flex-row">
            <Ionicons
              name="checkmark"
              size={12}
              color="#53BDEB"
              style={{ marginLeft: -4 }}
            />
            <Ionicons
              name="checkmark"
              size={12}
              color="#53BDEB"
              style={{ marginLeft: -6 }}
            />
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
    const msgTime = formatMessageTime(message.sentAt || (message as any).createdAt || '');
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
      if (otherParticipant) return `${(otherParticipant as any).firstName ?? ''} ${(otherParticipant as any).lastName ?? ''}`.trim();
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
        backgroundColor: sentOnLight ? 'rgba(0,0,0,0.06)' : isCurrentUser ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.06)',
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
          <Text style={{ fontSize: 10, fontFamily: 'PlusJakartaSans-Bold', color: '#8B5CF6', marginBottom: 1 }}>Statut</Text>
          <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans-Medium', color: sentOnLight ? '#374151' : isCurrentUser ? 'rgba(255,255,255,0.75)' : colors.textSecondary }} numberOfLines={1}>
            {(message as any).statusReply.preview === 'IMAGE' ? '📷 Image' : ((message as any).statusReply.preview || 'Voir le statut')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color="#8B5CF6" />
      </TouchableOpacity>
    ) : null;

    const ReplyPreview = () => hasReply ? (
      <TouchableOpacity onPress={scrollToReplied} activeOpacity={0.7} style={{ backgroundColor: sentOnLight ? 'rgba(0,0,0,0.06)' : isCurrentUser ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.06)', borderRadius: 10, borderLeftWidth: 3, borderLeftColor: sentOnLight ? '#10B981' : isCurrentUser ? 'rgba(255,255,255,0.6)' : '#10B981', paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6 }}>
        <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans-Bold', color: sentOnLight ? '#10B981' : isCurrentUser ? 'rgba(255,255,255,0.9)' : '#10B981', marginBottom: 2 }}>
          {replyAuthorName}
        </Text>
        <Text style={{ fontSize: 12, fontFamily: 'PlusJakartaSans-Medium', color: sentOnLight ? '#374151' : isCurrentUser ? 'rgba(255,255,255,0.75)' : colors.textSecondary }} numberOfLines={2}>
          {message.replyTo!.text}
        </Text>
      </TouchableOpacity>
    ) : null;

    return (
      <View style={{ marginBottom: 6, alignItems: isCurrentUser ? 'flex-end' : 'flex-start', paddingHorizontal: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', maxWidth: '80%' }}>

          {/* Avatar — messages reçus uniquement */}
          {!isCurrentUser && (
            <View style={{ marginRight: 8, marginBottom: 4 }}>
              {message.sender.profileImage ? (
                <Image source={{ uri: message.sender.profileImage }} style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border }} resizeMode="cover" />
              ) : (
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: isDark ? '#2D3748' : '#E5E7EB', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border }}>
                  <Ionicons name={message.sender.role === 'ENTERPRISE' ? 'business' : 'person'} size={15} color="#9CA3AF" />
                </View>
              )}
            </View>
          )}

          <View>
            {/* Bulle principale */}
            <TouchableOpacity
              onLongPress={() => { if (!isDeleted) openActionsModal(message); }}
              activeOpacity={0.85}
            >
              {isCurrentUser && !isDeleted ? (
                <View style={{
                  paddingHorizontal: 14,
                  paddingTop: 10,
                  paddingBottom: 7,
                  borderRadius: 20,
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
                  <Text style={{ fontSize: 15, lineHeight: 22, color: isDark ? '#D1FAE5' : '#000000', fontFamily: 'PlusJakartaSans-Medium' }}>
                    {message.text}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 3, gap: 4 }}>
                    <Text style={{ fontSize: 10, color: isDark ? 'rgba(209,250,229,0.6)' : '#667781', fontFamily: 'PlusJakartaSans-Medium' }}>
                      {msgTime}
                    </Text>
                    {!isDeleted && <MessageStatusIndicator message={message} />}
                  </View>
                </View>
              ) : (
                <View style={{
                  paddingHorizontal: 14,
                  paddingTop: 10,
                  paddingBottom: 7,
                  borderRadius: 20,
                  borderBottomLeftRadius: isCurrentUser ? 20 : 5,
                  backgroundColor: isDeleted ? (isDark ? '#1A2332' : '#F3F4F6') : receivedBg,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 3,
                  elevation: 1,
                }}>
                  {!isDeleted && <StatusReplyPreview />}
                  {!isDeleted && <ReplyPreview />}
                  <Text style={{ fontSize: 15, lineHeight: 22, fontFamily: 'PlusJakartaSans-Medium', color: isDeleted ? colors.textSecondary : colors.textPrimary, fontStyle: isDeleted ? 'italic' : 'normal' }}>
                    {isDeleted ? '[Message supprimé]' : message.text}
                  </Text>
                  {!isDeleted && (
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 3 }}>
                      <Text style={{ fontSize: 10, color: colors.textSecondary, fontFamily: 'PlusJakartaSans-Medium' }}>
                        {msgTime}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const reloadMessages = async () => {
    if (!conversationId) return;

    try {
      const data = await MessagingService.getConversationMessages(
        conversationId
      );
      console.log("📬 Messages rechargés:", data.messages);
      setConversation(data.conversation);
      setMessages(data.messages);
    } catch (error) {
      console.error("❌ Erreur rechargement messages:", error);
    }
  };

  const deleteMessage = async (
    messageId: string,
    deleteForEveryone: boolean
  ) => {
    try {
      await MessagingService.deleteMessage(messageId, deleteForEveryone);
      // Recharger les messages
      reloadMessages();
    } catch (error) {
      console.error("❌ Erreur suppression message:", error);
      showNotification("error", "Erreur", "Impossible de supprimer le message");
    }
  };

  // Fonctions pour gérer les confirmations de suppression
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
    RNAnimated.parallel([
      RNAnimated.spring(slideActionsAnim, { toValue: 0, damping: 22, stiffness: 220, useNativeDriver: true }),
      RNAnimated.timing(backdropActionsAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const closeActionsModal = () => {
    RNAnimated.parallel([
      RNAnimated.timing(slideActionsAnim, { toValue: 400, duration: 240, useNativeDriver: true }),
      RNAnimated.timing(backdropActionsAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setMessageActionsModal({ visible: false, message: null }));
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
              borderColor: colors.border,
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
                  backgroundColor: "#10B98120",
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
                    fontFamily: "PlusJakartaSans-Bold",
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
                    fontFamily: "PlusJakartaSans-SemiBold",
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
                  fontFamily: "PlusJakartaSans-Medium",
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
              fontFamily: "PlusJakartaSans-Medium",
              textAlign: "center",
            }}
          >
            {message.text}
          </Text>
        </View>
      </View>
    );
  };

  // Helpers pour séparateurs de date
  const isSameDay = (a: string, b: string) => {
    const da = new Date(a);
    const db = new Date(b);
    return (
      da.getFullYear() === db.getFullYear() &&
      da.getMonth() === db.getMonth() &&
      da.getDate() === db.getDate()
    );
  };
  const dayLabel = (ts: string) => {
    const d = new Date(ts);
    const today = new Date();
    const diff = Math.floor(
      (today.setHours(0, 0, 0, 0) -
        new Date(d.setHours(0, 0, 0, 0)).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return "Hier";
    return new Date(ts).toLocaleDateString("fr-FR", {
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

    let showSeparator = false;
    const currentTs = item.sentAt || (item as any).createdAt;
    if (index === 0) {
      showSeparator = true;
    } else {
      const prev = messages[index - 1];
      const prevTs = prev?.sentAt || (prev as any)?.createdAt;
      if (currentTs && prevTs && !isSameDay(currentTs, prevTs)) {
        showSeparator = true;
      }
    }
    const senderId = item.sender?._id || (item as any).senderId;
    const isCurrentUser = !!(getCurrentUserId() && senderId && senderId === getCurrentUserId());
    const isDeleted = item.metadata?.deleted || false;
    const isAnimated = item._localId === lastSentLocalId.current;
    // Le message ramené par la recherche : sans repère visuel, l'utilisateur
    // ne sait pas lequel des messages à l'écran il venait chercher.
    const isHighlighted = item._id === highlightedMessageId;

    const bubble = <MessageBubble message={item} />;
    const wrappedBubble = !isCurrentUser ? (
      <SwipeableRow onReply={() => setReplyingTo(item)} enabled={!isDeleted}>
        {bubble}
      </SwipeableRow>
    ) : bubble;

    return (
      <View style={isHighlighted ? { backgroundColor: 'rgba(16,185,129,0.14)', borderRadius: 14 } : undefined}>
        {showSeparator && currentTs ? (
          <View style={{ paddingVertical: 10, alignItems: 'center' }}>
            <View style={{ backgroundColor: 'rgba(16,185,129,0.10)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(16,185,129,0.18)' }}>
              <Text style={{ fontSize: 11, color: '#10B981', fontFamily: 'PlusJakartaSans-SemiBold', letterSpacing: 0.3 }}>
                {dayLabel(currentTs)}
              </Text>
            </View>
          </View>
        ) : null}
        {isAnimated ? (
          <RNAnimated.View style={{ opacity: sendAnim, transform: [{ translateY: sendTranslateY }] }}>
            {wrappedBubble}
          </RNAnimated.View>
        ) : wrappedBubble}
      </View>
    );
  };

  // Pendant la lecture du cache (~50ms) — header immédiat depuis le store
  if (!initialized) {
    const preview = ConversationPreviewStore.get(conversationId!);
    return (
      <View style={{ flex: 1, backgroundColor: colors.secondary }}>
        <ChatWallpaperEnt isDark={isDark} />
        <ExpoStatusBar style={isDark ? "light" : "dark"} translucent backgroundColor="transparent" />
        <View style={{ backgroundColor: colors.surface, paddingTop: insets.top + 8, paddingLeft: insets.left + 16, paddingRight: insets.right + 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => router.back()} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.tertiary, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </TouchableOpacity>
            {preview?.participantAvatar ? (
              <Image source={{ uri: preview.participantAvatar }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }} resizeMode="cover" />
            ) : (
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.tertiary, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                <Ionicons name="person" size={18} color={colors.textSecondary} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontFamily: 'PlusJakartaSans-SemiBold', color: colors.text }} numberOfLines={1}>{preview?.participantName || 'Conversation'}</Text>
              {preview?.productName && <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: 'PlusJakartaSans-Medium' }} numberOfLines={1}>{preview.productName}</Text>}
            </View>
          </View>
        </View>
      </View>
    );
  }

  // Skeleton uniquement si pas de cache et attente API (première visite)
  if (loading) {
    return renderSkeletonConversation();
  }

  // Si pas d'ID de conversation, afficher un message d'erreur
  if (!conversationId) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.card, paddingTop: insets.top }}
      >
        <View className="flex-1 justify-center items-center">
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text className="mt-4 text-xl font-jakarta-bold" style={{ color: colors.textPrimary }}>
            Paramètre manquant
          </Text>
          <Text className="mt-2 text-neutral-600 font-jakarta-medium text-center px-6">
            L&apos;identifiant de la conversation est requis.
          </Text>
          <TouchableOpacity
            className="mt-6 bg-primary-500 rounded-2xl px-6 py-3"
            onPress={() => router.back()}
          >
            <Text className="text-white font-jakarta-semibold">Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Si la conversation n'a pas pu être chargée, afficher un message d'erreur
  if (!conversation) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.card, paddingTop: insets.top }}
      >
        <View className="flex-1 justify-center items-center">
          <Ionicons name="chatbubble-outline" size={64} color="#EF4444" />
          <Text className="mt-4 text-xl font-jakarta-bold text-textPrimary">
            Conversation introuvable
          </Text>
          <Text className="mt-2 text-neutral-600 font-jakarta-medium text-center px-6">
            Cette conversation n&apos;existe pas ou n&apos;est plus accessible.
          </Text>
          <TouchableOpacity
            className="mt-6 bg-primary-500 rounded-2xl px-6 py-3"
            onPress={() => router.back()}
          >
            <Text className="text-white font-jakarta-semibold">Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Gestion sécurisée de otherParticipant
  // Extraire l'autre participant depuis le tableau participants de l'API
  const currentUserId = getCurrentUserId();
  const otherParticipant = (() => {
    // 1. PRIORITÉ: Utiliser le tableau participants de l'API (nouveau schéma)
    if (participants && participants.length > 0) {
      const other = participants.find((p) => p._id !== currentUserId);
      if (other) {
        console.log("✅ Participant extrait depuis le tableau API participants:", other);
        return other;
      }
    }

    // 2. Fallback: vérifier si otherParticipant est fourni directement (ancien schéma)
    if (conversation?.otherParticipant) {
      console.log("✅ Participant extrait depuis conversation.otherParticipant");
      return conversation.otherParticipant;
    }

    // 3. Fallback: extraire depuis conversation.participants si ce sont des objets
    if (
      Array.isArray(conversation.participants) &&
      conversation.participants.length > 0 &&
      typeof conversation.participants[0] === "object"
    ) {
      const other = (conversation.participants as any[]).find(
        (p) => p._id !== currentUserId
      );
      if (other) {
        console.log("✅ Participant extrait depuis conversation.participants");
        return other;
      }
    }

    // 4. Fallback: extraire depuis les messages
    if (messages.length > 0) {
      const otherMessage = messages.find((msg) => {
        const senderId = msg.sender?._id || (msg as any).senderId;
        return senderId && senderId !== currentUserId;
      });

      if (otherMessage?.sender) {
        console.log("✅ Participant extrait depuis les messages");
        return otherMessage.sender;
      }
    }

    // 5. Fallback final: retourner null
    console.warn("⚠️ Impossible de trouver l'autre participant");
    return null;
  })();

  console.log("💬 Rendu conversation avec:", {
    conversationId: conversation._id,
    currentUserId,
    participantsCount: conversation.participants?.length,
    participantsTypes: conversation.participants?.map((p) => typeof p),
    participantsIds: Array.isArray(conversation.participants)
      ? conversation.participants.map((p) =>
          typeof p === "object" ? p._id : p
        )
      : [],
    otherParticipant: otherParticipant
      ? {
          id: otherParticipant._id,
          name: `${otherParticipant.firstName} ${otherParticipant.lastName}`,
        }
      : null,
  });
  // Aller à un message trouvé par la recherche. S'il n'est pas dans les 50
  // derniers — le cas justement intéressant — on recharge le fil DEPUIS ce
  // message, puis on défile jusqu'à lui et on le met brièvement en évidence.
  const jumpToMessage = async (messageId: string) => {
    setSearchOpen(false);

    const scrollTo = (list: Message[]) => {
      const index = list.findIndex((m) => m._id === messageId);
      if (index < 0) return false;
      setHighlightedMessageId(messageId);
      pendingScrollIndexRef.current = index;
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      }, 120);
      setTimeout(() => { pendingScrollIndexRef.current = null; }, 1500);
      setTimeout(() => setHighlightedMessageId(null), 2600);
      return true;
    };

    if (scrollTo(messages)) return;

    const data = await MessagingService.getMessagesUntil(conversationId!, messageId);
    if (!data?.messages) return;
    setMessages(data.messages);
    if (data.truncated) {
      // Cible hors de portée de la limite serveur : on l'annonce plutôt que
      // de laisser l'utilisateur croire à un bug.
      showNotification(
        "info",
        "Message trop ancien",
        "La discussion est trop longue pour y accéder directement."
      );
      return;
    }
    setTimeout(() => scrollTo(data.messages), 200);
  };


  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0F1923' : '#EEF2F7' }}>
      <ChatWallpaperEnt isDark={isDark} />
      <ExpoStatusBar style={isDark ? "light" : "dark"} translucent backgroundColor="transparent" />
      {/* Header */}
      <View style={{ backgroundColor: colors.surface, paddingTop: insets.top + 8, paddingLeft: insets.left + 16, paddingRight: insets.right + 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.tertiary, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>

          {otherParticipant?.profileImage ? (
            <Image
              source={{ uri: otherParticipant.profileImage }}
              style={{ width: 40, height: 40, borderRadius: 20, marginRight: 10 }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.tertiary, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
              <Ionicons
                name={otherParticipant?.role === "ENTERPRISE" ? "business" : "person"}
                size={18}
                color={colors.textSecondary}
              />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontFamily: 'PlusJakartaSans-SemiBold', color: colors.text }} numberOfLines={1}>
              {otherParticipant
                ? MessagingService.formatParticipantName(otherParticipant)
                : "Conversation"}
            </Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary, fontFamily: 'PlusJakartaSans-Medium' }} numberOfLines={1}>
              {typeof conversation.product === "object" && conversation.product?.name
                ? conversation.product.name
                : conversation.subject || "Discussion produit"}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {isCurrentUserProductOwner(conversation, user?._id) && (
              <TouchableOpacity
                style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.tertiary, justifyContent: 'center', alignItems: 'center' }}
                onPress={openOfferModal}
              >
                <Ionicons name="car" size={18} color={colors.text} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.tertiary, justifyContent: 'center', alignItems: 'center' }}
              onPress={() => setSearchOpen((v) => !v)}
            >
              <Ionicons name="search" size={18} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.tertiary, justifyContent: 'center', alignItems: 'center' }}
              onPress={() => {
                const productId =
                  typeof conversation.product === "string"
                    ? conversation.product
                    : conversation.product._id;
                router.push(`/(app)/(enterprise)/product/${productId}`);
              }}
            >
              <Ionicons name="storefront" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ConversationSearch
        conversationId={conversationId!}
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onJumpToMessage={jumpToMessage}
      />

      {/* Commandes en cours avec ce client — l'entreprise suit leur état
          sans quitter le fil. Trois étapes distinctes, car la commande reste
          CONFIRMEE après publication (elle ne passe EN_LIVRAISON qu'à
          l'acceptation d'un livreur) : sans distinguer « publiée » de
          « à publier », le bouton restait affiché indéfiniment. */}
      {commandes
        .filter((c) => ["PROPOSEE", "CONFIRMEE", "EN_LIVRAISON"].includes(c.status))
        .map((c) => {
          const published = (c.missions?.length ?? 0) > 0;
          const step: "ATTENTE_CLIENT" | "A_PUBLIER" | "PUBLIEE" | "EN_COURS" =
            c.status === "PROPOSEE"
              ? "ATTENTE_CLIENT"
              : c.status === "EN_LIVRAISON"
              ? "EN_COURS"
              : published
              ? "PUBLIEE"
              : "A_PUBLIER";

          const meta = {
            ATTENTE_CLIENT: {
              icon: "hourglass-outline" as const,
              tint: colors.textSecondary,
              bg: colors.secondary,
              line: "En attente de confirmation et d'adresse du client",
            },
            A_PUBLIER: {
              icon: "checkmark-circle" as const,
              tint: colors.brandPrimary,
              bg: "rgba(16,185,129,0.08)",
              line: c.deliveryAddress?.address || "Adresse confirmée",
            },
            PUBLIEE: {
              icon: "paper-plane-outline" as const,
              tint: colors.brandPrimary,
              bg: "rgba(16,185,129,0.08)",
              line: "Livraison publiée · en attente d'un livreur",
            },
            EN_COURS: {
              icon: "bicycle" as const,
              tint: colors.brandPrimary,
              bg: "rgba(16,185,129,0.08)",
              line: "Un livreur a pris la course",
            },
          }[step];

          return (
            <View
              key={c._id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: meta.bg,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderLight,
              }}
            >
              <Ionicons name={meta.icon} size={16} color={meta.tint} />
              <View style={{ flex: 1, marginLeft: 9 }}>
                <Text style={{ color: colors.textPrimary, fontFamily: "PlusJakartaSans-SemiBold", fontSize: 12.5 }} numberOfLines={1}>
                  {c.items?.[0]?.nameSnapshot || "Commande"} · {c.agreedTotal} FCFA
                </Text>
                <Text style={{ color: colors.textSecondary, fontFamily: "PlusJakartaSans-Medium", fontSize: 11.5 }} numberOfLines={1}>
                  {meta.line}
                </Text>
              </View>

              {step === "A_PUBLIER" && (
                <TouchableOpacity
                  onPress={() => publishMission(c)}
                  disabled={publishingId === c._id}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor: colors.brandPrimary,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    opacity: publishingId === c._id ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: "#FFFFFF", fontFamily: "PlusJakartaSans-Bold", fontSize: 12 }}>
                    {publishingId === c._id ? "…" : "Publier"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

      {/* Zone de contenu principal avec KeyboardAvoidingView */}
      {/* Android edge-to-edge (SDK 35+) : adjustResize est inopérant, le header reste fixe hors du KAV.
          behavior="padding" ajoute un padding bas = hauteur clavier → input toujours visible. */}
      {Platform.OS === "android" ? (
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item._id}
            className="flex-1 px-4"
            onScrollToIndexFailed={(info) => {
              // Un saut vers un message lointain échoue tant que la liste n'a
              // pas mesuré les lignes intermédiaires : on approche à l'estime,
              // puis on retente une fois le rendu fait.
              const target = pendingScrollIndexRef.current;
              if (target != null) {
                flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * target, animated: false });
                setTimeout(() => {
                  flatListRef.current?.scrollToIndex({ index: target, animated: true, viewPosition: 0.5 });
                  pendingScrollIndexRef.current = null;
                }, 280);
                return;
              }
              flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }}
            ListHeaderComponent={
              typeof conversation.product === "object" &&
              conversation.product ? (
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
                    const productId =
                      typeof conversation.product === "string"
                        ? conversation.product
                        : conversation.product._id;
                    router.push(
                      `/(app)/(enterprise)/product/${productId}`
                    );
                  }}
                >
                  <Image
                    source={{
                      uri:
                        conversation.product.images?.[0] ||
                        "https://via.placeholder.com/60x60/CCCCCC/FFFFFF?text=No+Image",
                    }}
                    style={{ width: 56, height: 56, borderRadius: 14 }}
                    resizeMode="cover"
                  />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text
                      style={{ fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', color: colors.textPrimary, marginBottom: 4 }}
                      numberOfLines={1}
                    >
                      {conversation.product.name || "Produit"}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', color: '#10B981' }}>
                          {conversation.product.price
                            ? formatPrice(conversation.product.price)
                            : "Prix non disponible"}
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
              // Scroll automatique vers le bas quand le contenu change
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
                <Text style={{ fontSize: 17, fontFamily: 'PlusJakartaSans-Bold', color: '#1F2937', marginBottom: 8, textAlign: 'center' }}>
                  Début de la conversation
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: '#9CA3AF', textAlign: 'center', lineHeight: 20 }}>
                  Commencez la discussion à propos de ce produit
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
                    <Text className="text-xs text-primary-600 font-jakarta-semibold ml-1">
                      Réponse à {replyingTo.sender.firstName}{" "}
                      {replyingTo.sender.lastName}
                    </Text>
                  </View>
                  <Text
                    className="text-sm text-neutral-700 font-jakarta-medium"
                    numberOfLines={2}
                  >
                    {replyingTo.text}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setReplyingTo(null)}
                  className="ml-3 w-8 h-8 bg-card rounded-full justify-center items-center shadow-sm"
                >
                  <Ionicons name="close" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Zone de saisie Android */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 8, paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom + 4, 10) : Math.max(insets.bottom + 14, 20), backgroundColor: isDark ? '#0F1923' : '#EEF2F7', gap: 8 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 21, paddingHorizontal: 14, minHeight: 42, maxHeight: 120, borderWidth: 1, borderColor: colors.border }}>
              <TextInput
                ref={textInputRef}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder={i18n.t("enterprise.messages.conversationDetail.placeholder")}
                multiline
                maxLength={2000}
                onContentSizeChange={(e) => {
                  const h = Math.max(24, Math.min(100, e.nativeEvent.contentSize.height));
                  setInputHeight(h);
                }}
                placeholderTextColor="#9CA3AF"
                style={{ flex: 1, fontFamily: 'PlusJakartaSans-Medium', fontSize: 15, color: colors.textPrimary, height: Math.max(24, inputHeight), paddingVertical: 0, textAlignVertical: 'center' }}
                editable={!sending}
              />
              {newMessage.length > 1800 && (
                <Text style={{ fontSize: 10, color: newMessage.length > 1950 ? '#EF4444' : '#F97316', fontFamily: 'PlusJakartaSans-Medium', marginBottom: 2, marginLeft: 4 }}>
                  {2000 - newMessage.length}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={handleSendPress}
              disabled={sending || (!newMessage.trim() && !attachment)}
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: (newMessage.trim() || attachment) ? '#10B981' : (isDark ? '#1E2A3A' : '#D1D5DB'), justifyContent: 'center', alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 3 }, shadowOpacity: (newMessage.trim() || attachment) ? 0.3 : 0, shadowRadius: 6, elevation: (newMessage.trim() || attachment) ? 4 : 0 }}
            >
              <Ionicons name="send" size={18} color={(newMessage.trim() || attachment) ? '#FFFFFF' : (isDark ? '#4B5563' : '#9CA3AF')} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item._id}
            className="flex-1 px-4"
            onScrollToIndexFailed={(info) => {
              // Un saut vers un message lointain échoue tant que la liste n'a
              // pas mesuré les lignes intermédiaires : on approche à l'estime,
              // puis on retente une fois le rendu fait.
              const target = pendingScrollIndexRef.current;
              if (target != null) {
                flatListRef.current?.scrollToOffset({ offset: info.averageItemLength * target, animated: false });
                setTimeout(() => {
                  flatListRef.current?.scrollToIndex({ index: target, animated: true, viewPosition: 0.5 });
                  pendingScrollIndexRef.current = null;
                }, 280);
                return;
              }
              flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            }}
            ListHeaderComponent={
              typeof conversation.product === "object" &&
              conversation.product ? (
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
                    const productId =
                      typeof conversation.product === "string"
                        ? conversation.product
                        : conversation.product._id;
                    router.push(
                      `/(app)/(enterprise)/product/${productId}`
                    );
                  }}
                >
                  <Image
                    source={{
                      uri:
                        conversation.product.images?.[0] ||
                        "https://via.placeholder.com/60x60/CCCCCC/FFFFFF?text=No+Image",
                    }}
                    style={{ width: 56, height: 56, borderRadius: 14 }}
                    resizeMode="cover"
                  />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text
                      style={{ fontSize: 14, fontFamily: 'PlusJakartaSans-SemiBold', color: colors.textPrimary, marginBottom: 4 }}
                      numberOfLines={1}
                    >
                      {conversation.product.name || "Produit"}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Bold', color: '#10B981' }}>
                          {conversation.product.price
                            ? formatPrice(conversation.product.price)
                            : "Prix non disponible"}
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
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
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
                <Text style={{ fontSize: 17, fontFamily: 'PlusJakartaSans-Bold', color: '#1F2937', marginBottom: 8, textAlign: 'center' }}>
                  Début de la conversation
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: '#9CA3AF', textAlign: 'center', lineHeight: 20 }}>
                  Commencez la discussion à propos de ce produit
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
                      color="#FE8C00"
                    />
                    <Text className="text-xs text-primary-600 font-jakarta-semibold ml-1">
                      Réponse à {replyingTo.sender.firstName}{" "}
                      {replyingTo.sender.lastName}
                    </Text>
                  </View>
                  <Text
                    className="text-sm text-neutral-700 font-jakarta-medium"
                    numberOfLines={2}
                  >
                    {replyingTo.text}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setReplyingTo(null)}
                  className="ml-3 w-8 h-8 bg-card rounded-full justify-center items-center shadow-sm"
                >
                  <Ionicons name="close" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Zone de saisie iOS */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 8, paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom + 4, 10) : Math.max(insets.bottom + 14, 20), backgroundColor: isDark ? '#0F1923' : '#EEF2F7', gap: 8 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 21, paddingHorizontal: 14, minHeight: 42, maxHeight: 120, borderWidth: 1, borderColor: colors.border }}>
              <TextInput
                ref={textInputRef}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder={i18n.t("enterprise.messages.conversationDetail.placeholder")}
                multiline
                maxLength={2000}
                onContentSizeChange={(e) => {
                  const h = Math.max(24, Math.min(100, e.nativeEvent.contentSize.height));
                  setInputHeight(h);
                }}
                placeholderTextColor="#9CA3AF"
                style={{ flex: 1, fontFamily: 'PlusJakartaSans-Medium', fontSize: 15, color: colors.textPrimary, height: Math.max(24, inputHeight), paddingVertical: 0, textAlignVertical: 'center' }}
                editable={!sending}
              />
              {newMessage.length > 1800 && (
                <Text style={{ fontSize: 10, color: newMessage.length > 1950 ? '#EF4444' : '#F97316', fontFamily: 'PlusJakartaSans-Medium', marginBottom: 2, marginLeft: 4 }}>
                  {2000 - newMessage.length}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={handleSendPress}
              disabled={sending || (!newMessage.trim() && !attachment)}
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: (newMessage.trim() || attachment) ? '#10B981' : (isDark ? '#1E2A3A' : '#D1D5DB'), justifyContent: 'center', alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 3 }, shadowOpacity: (newMessage.trim() || attachment) ? 0.3 : 0, shadowRadius: 6, elevation: (newMessage.trim() || attachment) ? 4 : 0 }}
            >
              <Ionicons name="send" size={18} color={(newMessage.trim() || attachment) ? '#FFFFFF' : (isDark ? '#4B5563' : '#9CA3AF')} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Bouton flottant descendre en bas */}
      {showScrollToBottom && (
        <TouchableOpacity
          onPress={() => flatListRef.current?.scrollToEnd({ animated: true })}
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
              className="bg-card rounded-3xl w-full max-w-sm"
              activeOpacity={1}
              onPress={() => {}}
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
                <Text className="text-xl font-jakarta-bold text-textPrimary text-center mb-2">
                  {confirmationAction?.title}
                </Text>
                <Text className="text-base text-neutral-600 font-jakarta-medium text-center leading-5">
                  {confirmationAction?.message}
                </Text>
              </View>

              {/* Actions */}
              <View className="flex-row px-6 pb-6 gap-3">
                <TouchableOpacity
                  onPress={closeConfirmation}
                  className="flex-1 bg-neutral-100 py-4 rounded-2xl items-center"
                >
                  <Text className="text-base font-jakarta-semibold text-neutral-700">
                    Annuler
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (confirmationAction?.messageId) {
                      executeDeleteAction(confirmationAction.messageId);
                    }
                  }}
                  className="flex-1 py-4 rounded-2xl items-center"
                  style={{ backgroundColor: confirmationAction?.confirmColor }}
                >
                  <Text className="text-base font-jakarta-semibold text-white">
                    {confirmationAction?.confirmText}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Notification Modal */}
      {notification ? (
        <NotificationModal
          visible={!!notification.visible}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={hideNotification}
        />
      ) : null}

      {/* Modal de retry pour message échoué */}
      <Modal
        visible={retryModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setRetryModal({ visible: false, message: null })}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setRetryModal({ visible: false, message: null })}
          className="flex-1 justify-center items-center px-6"
          style={{ backgroundColor: colors.overlay }}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="rounded-3xl p-6 w-full max-w-sm"
            style={{ backgroundColor: colors.card }}
          >
            {/* Icon d'alerte */}
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-red-100 rounded-full justify-center items-center">
                <Ionicons name="alert-circle" size={32} color="#EF4444" />
              </View>
            </View>

            {/* Titre */}
            <Text className="text-xl font-jakarta-bold text-textPrimary text-center mb-2">
              {i18n.t("enterprise.messages.conversationDetail.retry.title")}
            </Text>

            {/* Message */}
            <Text className="text-base font-jakarta-medium text-center mb-6" style={{ color: colors.textSecondary }}>
              {retryModal.message?._sendError ||
                i18n.t("enterprise.messages.conversationDetail.retry.message")}
            </Text>

            {/* Actions */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setRetryModal({ visible: false, message: null })}
                className="flex-1 py-3 rounded-xl"
                style={{ backgroundColor: colors.tertiary }}
                activeOpacity={0.7}
              >
                <Text className="font-jakarta-bold text-center" style={{ color: colors.textPrimary }}>
                  {i18n.t("enterprise.messages.conversationDetail.retry.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (retryModal.message) {
                    retryFailedMessage(retryModal.message);
                  }
                  setRetryModal({ visible: false, message: null });
                }}
                className="flex-1 bg-red-500 py-3 rounded-xl"
                activeOpacity={0.7}
              >
                <Text className="text-white font-jakarta-bold text-center">
                  {i18n.t("enterprise.messages.conversationDetail.retry.retry")}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal d'actions du message — slide-up animé */}
      <Modal
        visible={messageActionsModal.visible}
        transparent
        animationType="none"
        onRequestClose={closeActionsModal}
      >
        <RNAnimated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', opacity: backdropActionsAnim, justifyContent: 'flex-end' }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeActionsModal} />
          <RNAnimated.View style={{ transform: [{ translateY: slideActionsAnim }] }}>
            <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', paddingBottom: Math.max(insets.bottom, 12) }}>
              {/* Handle */}
              <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
                <View style={{ width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2 }} />
              </View>

              {/* Aperçu du message */}
              {messageActionsModal.message && !messageActionsModal.message.metadata?.deleted && (
                <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: colors.secondary, borderRadius: 14, padding: 12, borderLeftWidth: 3, borderLeftColor: '#10B981' }}>
                  <Text style={{ fontSize: 11, fontFamily: 'PlusJakartaSans-SemiBold', color: '#10B981', marginBottom: 4 }}>
                    {messageActionsModal.message.sender?.firstName} {messageActionsModal.message.sender?.lastName}
                  </Text>
                  <Text style={{ fontSize: 13, fontFamily: 'PlusJakartaSans-Medium', color: colors.textSecondary }} numberOfLines={2}>
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
                  <Text style={{ fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: colors.textPrimary, flex: 1 }}>
                    {i18n.t("enterprise.messages.conversationDetail.messageActions.reply")}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </TouchableOpacity>

                {(() => {
                  const currentUserId = getCurrentUserId();
                  const senderId = messageActionsModal.message?.sender?._id || (messageActionsModal.message as any)?.senderId;
                  return currentUserId && senderId && senderId === currentUserId;
                })() && (
                  <>
                    <View style={{ height: 1, backgroundColor: colors.border }} />
                    <TouchableOpacity
                      onPress={() => {
                        const msgId = messageActionsModal.message?._id;
                        closeActionsModal();
                        setTimeout(() => {
                          if (msgId) setDeleteOptionsModal({ visible: true, messageId: msgId });
                        }, 280);
                      }}
                      style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.card }}
                      activeOpacity={0.7}
                    >
                      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239,68,68,0.10)', justifyContent: 'center', alignItems: 'center', marginRight: 14 }}>
                        <Ionicons name="trash" size={20} color="#EF4444" />
                      </View>
                      <Text style={{ fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: '#EF4444', flex: 1 }}>
                        {i18n.t("enterprise.messages.conversationDetail.messageActions.delete")}
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
                <Text style={{ fontSize: 15, fontFamily: 'PlusJakartaSans-SemiBold', color: colors.textSecondary }}>
                  {i18n.t("enterprise.messages.conversationDetail.cancel")}
                </Text>
              </TouchableOpacity>
            </View>
          </RNAnimated.View>
        </RNAnimated.View>
      </Modal>

      {/* Modal d'options de suppression */}
      <Modal
        visible={deleteOptionsModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setDeleteOptionsModal({ visible: false, messageId: null })
        }
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() =>
            setDeleteOptionsModal({ visible: false, messageId: null })
          }
          className="flex-1 justify-end"
          style={{ backgroundColor: colors.overlay }}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="bg-card rounded-t-3xl p-6"
          >
            {/* Barre de handle */}
            <View className="w-12 h-1.5 bg-neutral-300 rounded-full self-center mb-6" />

            {/* Titre */}
            <Text className="text-xl font-jakarta-bold text-textPrimary mb-2">
              {i18n.t("enterprise.messages.conversationDetail.deleteOptions.title")}
            </Text>
            <Text className="text-neutral-600 font-jakarta-medium mb-4">
              Choisissez comment supprimer le message
            </Text>

            {/* Options */}
            <View className="space-y-2">
              {/* Pour moi seulement */}
              <TouchableOpacity
                onPress={() => {
                  if (deleteOptionsModal.messageId) {
                    deleteMessage(deleteOptionsModal.messageId, false);
                  }
                  setDeleteOptionsModal({ visible: false, messageId: null });
                }}
                className="flex-row items-center p-4 bg-orange-50 rounded-xl"
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 bg-orange-100 rounded-full justify-center items-center mr-3">
                  <Ionicons name="eye-off" size={20} color="#F97316" />
                </View>
                <Text className="text-textPrimary font-jakarta-semibold flex-1">
                  {i18n.t("enterprise.messages.conversationDetail.deleteOptions.forMe")}
                </Text>
              </TouchableOpacity>

              {/* Pour tout le monde */}
              <TouchableOpacity
                onPress={() => {
                  if (deleteOptionsModal.messageId) {
                    deleteMessage(deleteOptionsModal.messageId, true);
                  }
                  setDeleteOptionsModal({ visible: false, messageId: null });
                }}
                className="flex-row items-center p-4 bg-red-50 rounded-xl"
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 bg-red-100 rounded-full justify-center items-center mr-3">
                  <Ionicons name="trash" size={20} color="#EF4444" />
                </View>
                <Text className="text-textPrimary font-jakarta-semibold flex-1">
                  {i18n.t("enterprise.messages.conversationDetail.deleteOptions.forEveryone")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bouton Annuler */}
            <TouchableOpacity
              onPress={() =>
                setDeleteOptionsModal({ visible: false, messageId: null })
              }
              className="mt-4 py-4 rounded-xl"
              style={{ backgroundColor: colors.tertiary }}
              activeOpacity={0.7}
            >
              <Text className="font-jakarta-bold text-center" style={{ color: colors.textPrimary }}>
                Annuler
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal de sélection de pièce jointe */}
      <Modal
        visible={attachmentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAttachmentModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setAttachmentModal(false)}
          className="flex-1 justify-end"
          style={{ backgroundColor: colors.overlay }}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="bg-card rounded-t-3xl p-6"
          >
            {/* Barre de handle */}
            <View className="w-12 h-1.5 bg-neutral-300 rounded-full self-center mb-6" />

            {/* Titre */}
            <Text className="text-xl font-jakarta-bold text-textPrimary mb-4">
              {i18n.t("enterprise.messages.conversationDetail.attachmentOptions.title")}
            </Text>

            {/* Options */}
            <View className="space-y-2">
              {/* Prendre une photo */}
              <TouchableOpacity
                onPress={() => {
                  setAttachmentModal(false);
                  takePhoto();
                }}
                className="flex-row items-center p-4 bg-primary-50 rounded-xl"
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 bg-primary-100 rounded-full justify-center items-center mr-3">
                  <Ionicons name="camera" size={20} color="#10B981" />
                </View>
                <Text className="text-textPrimary font-jakarta-semibold flex-1">
                  {i18n.t("enterprise.messages.conversationDetail.attachmentOptions.camera")}
                </Text>
              </TouchableOpacity>

              {/* Choisir depuis la galerie */}
              <TouchableOpacity
                onPress={() => {
                  setAttachmentModal(false);
                  pickImageFromGallery();
                }}
                className="flex-row items-center p-4 bg-green-50 rounded-xl"
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 bg-green-100 rounded-full justify-center items-center mr-3">
                  <Ionicons name="images" size={20} color="#22C55E" />
                </View>
                <Text className="text-textPrimary font-jakarta-semibold flex-1">
                  {i18n.t("enterprise.messages.conversationDetail.attachmentOptions.gallery")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bouton Annuler */}
            <TouchableOpacity
              onPress={() => setAttachmentModal(false)}
              className="mt-4 py-4 rounded-xl"
              style={{ backgroundColor: colors.tertiary }}
              activeOpacity={0.7}
            >
              <Text className="font-jakarta-bold text-center" style={{ color: colors.textPrimary }}>
                Annuler
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* StatusViewer pour afficher le statut depuis la conversation */}
      {isAuthenticated && statusReplyViewer && (
        <StatusViewer
          visible={true}
          groups={[{
            enterprise: (statusReplyViewer.status as any).enterprise,
            statuses: [statusReplyViewer.status],
          }]}
          initialGroupIndex={0}
          currentUserId={statusReplyViewer.currentUserId}
          onClose={() => setStatusReplyViewer(null)}
          onViewed={() => {}}
          onDelete={async (statusId) => {
            try { await StatusService.remove(statusId); setStatusReplyViewer(null); } catch {}
          }}
        />
      )}
    </View>
  );
}
