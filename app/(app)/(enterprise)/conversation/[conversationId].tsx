import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Easing,
  FlatList,
  Image,
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
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NotificationModal, {
  useNotification,
} from "../../../../components/ui/NotificationModal";
import { useAuth } from "../../../../contexts/AuthContext";
import { useSocket } from "../../../../hooks/useSocket";
import { useTheme } from "../../../../contexts/ThemeContext";
import i18n from "../../../../i18n/i18n";
import DeliveryService, {
  CreateOfferPayload,
  UrgencyLevel,
} from "../../../../services/api/DeliveryService";
import MessagingService, {
  Conversation,
  Message,
} from "../../../../services/api/MessagingService";

// Cache simple pour les conversations et messages
const conversationCache = new Map<
  string,
  { conversation: Conversation; messages: Message[]; timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes en millisecondes

// DateTimePicker custom iOS en mode clair (texte noir sur fond blanc)
const IOSLightDateTimePicker = ({
  value,
  onChange,
  colors,
}: {
  value: Date;
  onChange: (date: Date) => void;
  colors: any;
}) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  const formatNumber = (n: number) => n.toString().padStart(2, "0");

  const handleHourChange = (hour: number) => {
    const next = new Date(value);
    next.setHours(hour);
    onChange(next);
  };

  const handleMinuteChange = (minute: number) => {
    const next = new Date(value);
    next.setMinutes(minute);
    onChange(next);
  };

  return (
    <View
      style={{
        backgroundColor: colors.card,
        paddingVertical: 16,
        paddingHorizontal: 12,
      }}
    >
      {/* Date affichée */}
      <Text
        style={{
          textAlign: "center",
          color: "#111827",
          fontFamily: "Quicksand-Bold",
          fontSize: 18,
          marginBottom: 12,
        }}
      >
        {value.toLocaleDateString("fr-FR", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </Text>

      {/* Sélecteur date (calendrier) + heures / minutes */}

      {/* Calendrier personnalisé */}
      <View
        style={{
          marginBottom: 16,
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: 16,
        }}
      >
        {/* En-tête du mois */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              const prev = new Date(value);
              prev.setMonth(prev.getMonth() - 1);
              onChange(prev);
            }}
            style={{ padding: 8 }}
          >
            <Text style={{ fontSize: 18, color: "#111827" }}>‹</Text>
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 16,
              fontFamily: "Quicksand-Bold",
              color: "#111827",
            }}
          >
            {value.toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            })}
          </Text>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              const next = new Date(value);
              next.setMonth(next.getMonth() + 1);
              onChange(next);
            }}
            style={{ padding: 8 }}
          >
            <Text style={{ fontSize: 18, color: "#111827" }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Jours de la semaine */}
        <View style={{ flexDirection: "row", marginBottom: 8 }}>
          {["L", "M", "M", "J", "V", "S", "D"].map((day, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Quicksand-Medium",
                  color: "#6B7280",
                }}
              >
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Grille des dates */}
        <View>
          {(() => {
            const year = value.getFullYear();
            const month = value.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Lundi = 0
            const daysInMonth = lastDay.getDate();
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const weeks = [];
            let days = [];

            // Jours vides avant le début du mois
            for (let i = 0; i < startDayOfWeek; i++) {
              days.push(
                <View key={`empty-${i}`} style={{ flex: 1, height: 40 }} />
              );
            }

            // Jours du mois
            for (let day = 1; day <= daysInMonth; day++) {
              const date = new Date(year, month, day);
              date.setHours(0, 0, 0, 0);
              const isSelected =
                date.getDate() === value.getDate() &&
                date.getMonth() === value.getMonth() &&
                date.getFullYear() === value.getFullYear();
              const isPast = date < today;
              const isToday = date.getTime() === today.getTime();

              days.push(
                <TouchableOpacity
                  key={day}
                  activeOpacity={1}
                  disabled={isPast}
                  onPress={() => {
                    if (!isPast) {
                      const next = new Date(value);
                      next.setDate(day);
                      onChange(next);
                    }
                  }}
                  style={{
                    flex: 1,
                    height: 40,
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 8,
                    backgroundColor: isSelected ? "#10B981" : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontFamily: "Quicksand-Medium",
                      color: isPast
                        ? "#D1D5DB"
                        : isSelected
                        ? "#FFFFFF"
                        : isToday
                        ? "#10B981"
                        : "#111827",
                    }}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );

              if (days.length === 7) {
                weeks.push(
                  <View
                    key={`week-${weeks.length}`}
                    style={{ flexDirection: "row", marginBottom: 4 }}
                  >
                    {days}
                  </View>
                );
                days = [];
              }
            }

            // Compléter la dernière semaine si nécessaire
            if (days.length > 0) {
              while (days.length < 7) {
                days.push(
                  <View
                    key={`empty-end-${days.length}`}
                    style={{ flex: 1, height: 40 }}
                  />
                );
              }
              weeks.push(
                <View
                  key={`week-${weeks.length}`}
                  style={{ flexDirection: "row", marginBottom: 4 }}
                >
                  {days}
                </View>
              );
            }

            return weeks;
          })()}
        </View>
      </View>

      {/* Sélecteur heures / minutes */}
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 24 }}>
        {/* Heures */}
        <View>
          <Text
            style={{
              textAlign: "center",
              color: "#6B7280",
              fontFamily: "Quicksand-Medium",
              marginBottom: 8,
            }}
          >
            {i18n.t("enterprise.messages.conversationDetail.hour")}
          </Text>
          <View
            style={{
              height: 140,
              width: 80,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: "hidden",
            }}
          >
            <ScrollView
              contentContainerStyle={{ paddingVertical: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {hours.map((h) => {
                const selected = h === value.getHours();
                return (
                  <TouchableOpacity
                    key={h}
                    onPress={() => handleHourChange(h)}
                    style={{
                      paddingVertical: 6,
                      alignItems: "center",
                      backgroundColor: selected ? "#ECFDF5" : "transparent",
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        color: selected ? "#10B981" : "#111827",
                        fontFamily: selected
                          ? "Quicksand-Bold"
                          : "Quicksand-Medium",
                        fontSize: 16,
                      }}
                    >
                      {formatNumber(h)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Minutes */}
        <View>
          <Text
            style={{
              textAlign: "center",
              color: "#6B7280",
              fontFamily: "Quicksand-Medium",
              marginBottom: 8,
            }}
          >
            {i18n.t("enterprise.messages.conversationDetail.minutes")}
          </Text>
          <View
            style={{
              height: 140,
              width: 80,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: "hidden",
            }}
          >
            <ScrollView
              contentContainerStyle={{ paddingVertical: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {minutes.map((m) => {
                const selected = m === value.getMinutes();
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => handleMinuteChange(m)}
                    style={{
                      paddingVertical: 6,
                      alignItems: "center",
                      backgroundColor: selected ? "#ECFDF5" : "transparent",
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        color: selected ? "#10B981" : "#111827",
                        fontFamily: selected
                          ? "Quicksand-Bold"
                          : "Quicksand-Medium",
                        fontSize: 16,
                      }}
                    >
                      {formatNumber(m)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>
    </View>
  );
};

export default function ConversationDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);
  const { user } = useAuth(); // Récupérer l'utilisateur connecté
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
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [inputHeight, setInputHeight] = useState(50);
  const [attachment, setAttachment] = useState<{
    type: "IMAGE" | "FILE";
    data: string;
    mimeType: string;
    fileName?: string;
    uri: string;
  } | null>(null);

  // Offre de livraison (création depuis la conversation)
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [creatingOffer, setCreatingOffer] = useState(false);
  const [offerForm, setOfferForm] = useState<{
    deliveryZone: string;
    deliveryFee: string; // string pour TextInput, converti en nombre à l'envoi
    urgency: UrgencyLevel;
    specialInstructions: string;
    expiresAt: string; // ISO string
  }>({
    deliveryZone: "",
    deliveryFee: "",
    urgency: "MEDIUM",
    specialInstructions: "",
    expiresAt: "",
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempExpiryDate, setTempExpiryDate] = useState<Date | null>(null);
  const [tempPickerDate, setTempPickerDate] = useState<Date>(
    new Date(Date.now() + 60 * 60 * 1000)
  );

  const openOfferModal = () => {
    // Pré-remplir l'expiration à +1h si vide
    if (!offerForm.expiresAt) {
      const defaultExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      setOfferForm((prev) => ({ ...prev, expiresAt: defaultExpiry }));
    }
    setOfferModalVisible(true);
  };
  const closeOfferModal = () => setOfferModalVisible(false);

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
      const sellerId = conv.participants[1]; // Second élément = vendeur
      return sellerId === currentUserId;
    }

    // Fallback: vérifier via le produit si disponible
    if (typeof conv.product === "object" && conv.product?.enterprise) {
      const enterpriseId =
        typeof conv.product.enterprise === "string"
          ? conv.product.enterprise
          : conv.product.enterprise._id;
      return enterpriseId === currentUserId;
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
        // Fallback: prendre l'autre participant différent de l'utilisateur courant
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
          // Dernier recours: retourner le premier si on ne connaît pas l'utilisateur courant
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
      <LinearGradient
        colors={["#047857", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="px-6 pb-4 rounded-b-3xl"
        style={{
          paddingTop: insets.top + 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <ShimmerBlock width={32} height={32} borderRadius={16} />
            <ShimmerBlock width={32} height={32} borderRadius={16} />
            <View className="flex-1 ml-3">
              <ShimmerBlock width="60%" height={16} borderRadius={4} />
              <ShimmerBlock width="40%" height={12} borderRadius={4} />
            </View>
          </View>
          <ShimmerBlock width={32} height={32} borderRadius={16} />
        </View>
      </LinearGradient>

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

      console.log("✅ ENTERPRISE - Ajout du message reçu");

      // Ne traiter QUE les messages des AUTRES participants
      try {
        setMessages((prev) => {
          // Vérifier si le message existe déjà
          const existingIndex = prev.findIndex(
            (msg) => msg._id === data.message._id
          );

          if (existingIndex !== -1) {
            console.log("⚠️ ENTERPRISE - Message existe déjà, mise à jour");
            const updated = [...prev];
            updated[existingIndex] = data.message;
            return updated;
          }

          // Nouveau message d'un autre participant, l'ajouter
          const newList = [...prev, data.message];
          console.log(
            `📊 ENTERPRISE - Messages avant: ${prev.length}, après: ${newList.length}`
          );
          return newList;
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
      try {
        setLoading(true);

        // Vérifier le cache d'abord
        const cached = conversationCache.get(conversationId!);
        const now = Date.now();

        if (cached && now - cached.timestamp < CACHE_DURATION) {
          console.log("💾 ENTERPRISE - Utilisation du cache");
          setConversation(cached.conversation);
          setMessages(cached.messages);
          setLoading(false);
          loadedConversationRef.current = conversationId;
          return;
        }

        console.log("🔄 ENTERPRISE - Chargement depuis API");
        const data = await MessagingService.getConversationMessages(
          conversationId!
        );

        console.log("📦 ENTERPRISE - Données reçues de l'API:", {
          conversationId: data.conversation._id,
          participantsCount: data.conversation.participants?.length,
          participants: data.conversation.participants?.map((p: any) => ({
            id: typeof p === "object" ? p._id : p,
            type: typeof p,
            firstName: typeof p === "object" ? p.firstName : "N/A",
            lastName: typeof p === "object" ? p.lastName : "N/A",
          })),
          hasOtherParticipant: !!data.conversation.otherParticipant,
          otherParticipant: data.conversation.otherParticipant,
          messagesCount: data.messages.length,
        });

        setConversation(data.conversation);
        setMessages(data.messages);
        loadedConversationRef.current = conversationId;

        // Mettre en cache
        conversationCache.set(conversationId!, {
          conversation: data.conversation,
          messages: data.messages,
          timestamp: now,
        });

        // Marquer comme lu
        await MessagingService.markMessagesAsRead(conversationId!);
      } catch (error) {
        console.error("❌ Erreur chargement conversation:", error);
        showNotification(
          "error",
          i18n.t("messages.error"),
          i18n.t("enterprise.messages.conversationDetail.errors.loadConversation")
        );
      } finally {
        setLoading(false);
      }
    };

    if (conversationId) {
      loadConversationData();
    }

    // Cleanup: reset le ref si la conversation change
    return () => {
      if (loadedConversationRef.current !== conversationId) {
        loadedConversationRef.current = null;
      }
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
  const submitOffer = async () => {
    if (!conversation) return;
    try {
      // Déduire les IDs depuis la conversation
      console.log("🚀 Soumission offre - début validation");
      const productId =
        typeof conversation.product === "string"
          ? conversation.product
          : conversation.product?._id;
      console.log("🚀 Soumission offre - produit ID:", productId);
      const customerId = getCustomerIdFromConversation(
        conversation,
        getCurrentUserId()
      );
      console.log("🚀 Soumission offre - client ID:", customerId);
      if (!productId || !customerId) {
        showNotification(
          "error",
          "Données manquantes",
          "Produit ou client introuvable pour créer l'offre"
        );
        return;
      }
      if (
        !offerForm.deliveryZone ||
        !offerForm.deliveryFee ||
        !offerForm.expiresAt
      ) {
        showNotification(
          "warning",
          "Champs requis",
          "Zone, frais et expiration sont requis"
        );
        return;
      }
      const fee = Number(offerForm.deliveryFee);
      if (isNaN(fee) || fee <= 0) {
        showNotification(
          "warning",
          "Frais invalide",
          "Le frais de livraison doit être un nombre positif"
        );
        return;
      }
      const expires = new Date(offerForm.expiresAt);
      if (isNaN(expires.getTime()) || expires <= new Date()) {
        showNotification(
          "warning",
          "Expiration invalide",
          "La date d'expiration doit être future"
        );
        return;
      }

      setCreatingOffer(true);
      const payload: CreateOfferPayload = {
        product: productId,
        customer: customerId,
        deliveryZone: offerForm.deliveryZone.trim(),
        deliveryFee: fee,
        urgency: offerForm.urgency,
        specialInstructions: offerForm.specialInstructions.trim(),
        expiresAt: expires.toISOString(),
      };

      await DeliveryService.createOffer(payload);
      showNotification(
        "success",
        "Offre publiée",
        "Votre offre de livraison a été créée"
      );
      setOfferModalVisible(false);
      // Message système de confirmation dans la conversation (optionnel)

      // Réinitialiser le formulaire
      setOfferForm({
        deliveryZone: "",
        deliveryFee: "",
        urgency: "MEDIUM",
        specialInstructions: "",
        expiresAt: "",
      });
    } catch (error: any) {
      console.error("❌ Erreur création offre:", error);

      // Gestion spécifique des erreurs métier
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message;
        if (errorMessage?.includes("n'appartient pas à votre entreprise")) {
          showNotification(
            "error",
            "Produit non autorisé",
            "Vous ne pouvez créer une offre que pour vos propres produits"
          );
          return;
        }
        if (errorMessage?.includes("produit")) {
          showNotification("error", "Produit invalide", errorMessage);
          return;
        }
      }

      // Erreur générique
      showNotification(
        "error",
        "Erreur",
        error.message || "Impossible de créer l'offre"
      );
    } finally {
      setCreatingOffer(false);
    }
  };

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
              color="#3B82F6"
              style={{ marginLeft: -4 }}
            />
            <Ionicons
              name="checkmark"
              size={12}
              color="#3B82F6"
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

    // Logique améliorée pour déterminer si c'est un message de l'utilisateur actuel
    // Vérifier plusieurs champs possibles pour l'ID de l'expéditeur
    const senderId = message.sender?._id || (message as any).senderId;
    const isCurrentUser =
      currentUserId && senderId && senderId === currentUserId;

    const isDeleted = message.metadata?.deleted || false;

    return (
      <View className={`mb-4 ${isCurrentUser ? "items-end" : "items-start"}`}>
        <View className="flex-row items-end max-w-xs">
          {!isCurrentUser && (
            <View className="mr-2">
              {message.sender.profileImage ? (
                <Image
                  source={{ uri: message.sender.profileImage }}
                  className="w-8 h-8 rounded-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-8 h-8 rounded-full justify-center items-center" style={{ backgroundColor: colors.secondary }}>
                  <Ionicons
                    name={
                      message.sender.role === "ENTERPRISE"
                        ? "business"
                        : "person"
                    }
                    size={14}
                    color="#9CA3AF"
                  />
                </View>
              )}
            </View>
          )}

          <View className="flex-1">
            {/* Message de réponse */}
            {message.replyTo && !message.replyTo.metadata.deleted && (
              <View
                className={`mb-2 px-3 py-2 rounded-xl border-l-4 ${
                  isCurrentUser
                    ? "bg-primary-50 border-primary-300"
                    : "bg-neutral-100 border-neutral-300"
                }`}
              >
                <Text className="text-xs text-neutral-600 font-quicksand-medium mb-1">
                  Réponse à {message.replyTo.sender.firstName}{" "}
                  {message.replyTo.sender.lastName}
                </Text>
                <Text className="text-sm text-neutral-700" numberOfLines={2}>
                  {message.replyTo.metadata.deleted
                    ? "[Message supprimé]"
                    : message.replyTo.text}
                </Text>
              </View>
            )}

            {/* Bulle du message */}
            <TouchableOpacity
              onLongPress={() => {
                if (!isDeleted) {
                  setMessageActionsModal({ visible: true, message });
                }
              }}
              activeOpacity={0.9}
              className="rounded-2xl overflow-hidden"
            >
              {isCurrentUser && !isDeleted ? (
                <LinearGradient
                  colors={["#047857", "#10B981"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 16,
                    shadowColor: "#10B981",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  <Text
                    className="font-quicksand-medium text-white"
                    style={{ fontSize: 15, lineHeight: 20 }}
                  >
                    {message.text}
                  </Text>
                </LinearGradient>
              ) : (
                <View
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 16,
                    backgroundColor: colors.secondary,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    className="font-quicksand-medium"
                    style={{ 
                      fontSize: 15, 
                      lineHeight: 20,
                      color: isDeleted ? "#9CA3AF" : colors.textPrimary,
                      fontStyle: isDeleted ? "italic" : "normal"
                    }}
                  >
                    {isDeleted ? "[Message supprimé]" : message.text}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Heure et statut */}
            <View
              className={`flex-row items-center mt-1 ${
                isCurrentUser ? "justify-end" : "justify-start"
              }`}
            >
              <Text className="text-xs text-neutral-500">
                {formatMessageTime(
                  message.sentAt || (message as any).createdAt
                )}
              </Text>
              {isCurrentUser && !isDeleted && (
                <View className="ml-1">
                  <MessageStatusIndicator message={message} />
                </View>
              )}
            </View>
          </View>

          {isCurrentUser && (
            <View className="ml-2">
              {message.sender.profileImage ? (
                <Image
                  source={{ uri: message.sender.profileImage }}
                  className="w-8 h-8 rounded-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-8 h-8 rounded-full justify-center items-center" style={{ backgroundColor: colors.secondary }}>
                  <Ionicons
                    name={
                      message.sender.role === "ENTERPRISE"
                        ? "business"
                        : "person"
                    }
                    size={14}
                    color="#9CA3AF"
                  />
                </View>
              )}
            </View>
          )}
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
                    color: "#262626",
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
                borderTopColor: "#F5F5F5",
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  color: "#737373",
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
            backgroundColor: "#F5F5F5",
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderWidth: 1,
            borderColor: "#E5E5E5",
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: "#525252",
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
    return (
      <View>
        {showSeparator && currentTs ? (
          <View className="py-2 items-center">
            <View className="bg-neutral-100 rounded-full px-3 py-1">
              <Text className="text-xs text-neutral-600 font-quicksand-medium">
                {dayLabel(currentTs)}
              </Text>
            </View>
          </View>
        ) : null}
        <MessageBubble message={item} />
      </View>
    );
  };

  // Si la conversation est en cours de chargement, afficher le skeleton
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
          <Text className="mt-4 text-xl font-quicksand-bold" style={{ color: colors.textPrimary }}>
            Paramètre manquant
          </Text>
          <Text className="mt-2 text-neutral-600 font-quicksand-medium text-center px-6">
            L&apos;identifiant de la conversation est requis.
          </Text>
          <TouchableOpacity
            className="mt-6 bg-primary-500 rounded-2xl px-6 py-3"
            onPress={() => router.back()}
          >
            <Text className="text-white font-quicksand-semibold">Retour</Text>
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
          <Text className="mt-4 text-xl font-quicksand-bold text-textPrimary">
            Conversation introuvable
          </Text>
          <Text className="mt-2 text-neutral-600 font-quicksand-medium text-center px-6">
            Cette conversation n&apos;existe pas ou n&apos;est plus accessible.
          </Text>
          <TouchableOpacity
            className="mt-6 bg-primary-500 rounded-2xl px-6 py-3"
            onPress={() => router.back()}
          >
            <Text className="text-white font-quicksand-semibold">Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Gestion sécurisée de otherParticipant
  // Extraire l'autre participant depuis la liste des participants
  const currentUserId = getCurrentUserId();
  const otherParticipant = (() => {
    // 1. Vérifier d'abord si otherParticipant est déjà fourni par le backend
    if (conversation.otherParticipant) {
      return conversation.otherParticipant;
    }

    // 2. Si participants sont des objets, extraire l'autre participant
    if (
      Array.isArray(conversation.participants) &&
      conversation.participants.length > 0
    ) {
      if (typeof conversation.participants[0] === "object") {
        const other = (conversation.participants as any[]).find(
          (p) => p._id !== currentUserId
        );
        if (other) {
          return other;
        }
      }
    }

    // 3. Si participants sont des IDs (strings), extraire depuis les messages
    // Les messages contiennent les infos complètes du sender
    if (messages.length > 0) {
      // Trouver le premier message d'un autre participant
      const otherMessage = messages.find((msg) => {
        const senderId = msg.sender?._id || (msg as any).senderId;
        return senderId && senderId !== currentUserId;
      });

      if (otherMessage?.sender) {
        console.log(
          "✅ Participant extrait depuis les messages:",
          otherMessage.sender
        );
        return otherMessage.sender;
      }
    }

    // 4. Fallback: retourner null
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
  return (
    <View style={{ flex: 1, backgroundColor: colors.card }}>
      <ExpoStatusBar style={isDark ? "light" : "dark"} translucent backgroundColor="transparent" />
      {/* Header */}
      <LinearGradient
        colors={["#047857", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="px-6 pb-4 rounded-b-3xl"
        style={{
          paddingTop: insets.top + 16,
          paddingBottom: 16,
          paddingLeft: insets.left + 10,
          paddingRight: insets.right + 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 bg-card/20 rounded-full justify-center items-center mr-3"
            >
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            {otherParticipant?.profileImage ? (
              <Image
                source={{ uri: otherParticipant.profileImage }}
                className="w-10 h-10 rounded-full mr-3"
                resizeMode="cover"
              />
            ) : (
              <View className="w-10 h-10 bg-card/25 rounded-full justify-center items-center mr-3">
                <Ionicons
                  name={
                    otherParticipant?.role === "ENTERPRISE"
                      ? "business"
                      : "person"
                  }
                  size={18}
                  color="#FFFFFF"
                />
              </View>
            )}

            <View className="flex-1">
              <Text
                className="text-base font-quicksand-semibold text-white"
                numberOfLines={1}
              >
                {otherParticipant
                  ? MessagingService.formatParticipantName(otherParticipant)
                  : "Conversationn"}
              </Text>
              <Text className="text-xs text-white/90" numberOfLines={1}>
                {typeof conversation.product === "object" &&
                conversation.product?.name
                  ? conversation.product.name
                  : conversation.subject || "Discussion produit"}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center">
            {isCurrentUserProductOwner(conversation, user?._id) && (
              <TouchableOpacity
                className="w-10 h-10 bg-card/20 rounded-full justify-center items-center mr-2"
                onPress={openOfferModal}
              >
                <Ionicons name="bicycle" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className="w-10 h-10 bg-card/20 rounded-full justify-center items-center"
              onPress={() => {
                const productId =
                  typeof conversation.product === "string"
                    ? conversation.product
                    : conversation.product._id;
                router.push(`/(app)/(enterprise)/product/${productId}`);
              }}
            >
              <Ionicons name="cube" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Header - Position absolue pour rester fixe */}
      <LinearGradient
        colors={["#047857", "#10B981"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          paddingTop: insets.top + 16,
          paddingBottom: 16,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 bg-card/20 rounded-full justify-center items-center mr-3"
            >
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            {otherParticipant?.profileImage ? (
              <Image
                source={{ uri: otherParticipant.profileImage }}
                className="w-10 h-10 rounded-full mr-3"
                resizeMode="cover"
              />
            ) : (
              <View className="w-10 h-10 bg-card/25 rounded-full justify-center items-center mr-3">
                <Ionicons
                  name={
                    otherParticipant?.role === "ENTERPRISE"
                      ? "business"
                      : "person"
                  }
                  size={18}
                  color="#FFFFFF"
                />
              </View>
            )}

            <View className="flex-1">
              <Text
                className="text-base font-quicksand-semibold text-white"
                numberOfLines={1}
              >
                {otherParticipant
                  ? MessagingService.formatParticipantName(otherParticipant)
                  : "Conversation"}
              </Text>
              <Text className="text-xs text-white/90" numberOfLines={1}>
                {typeof conversation.product === "object" &&
                conversation.product?.name
                  ? conversation.product.name
                  : conversation.subject || "Discussion produit"}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center">
            {isCurrentUserProductOwner(conversation, user?._id) && (
              <TouchableOpacity
                className="w-10 h-10 bg-card/20 rounded-full justify-center items-center mr-2"
                onPress={openOfferModal}
              >
                <Ionicons name="bicycle" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className="w-10 h-10 bg-card/20 rounded-full justify-center items-center"
              onPress={() => {
                const productId =
                  typeof conversation.product === "string"
                    ? conversation.product
                    : conversation.product._id;
                router.push(`/(app)/(enterprise)/product/${productId}`);
              }}
            >
              <Ionicons name="cube" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Zone de contenu principal avec KeyboardAvoidingView */}
      {Platform.OS === "android" ? (
        <KeyboardAvoidingView
          className="flex-1"
          behavior="padding"
          keyboardVerticalOffset={0}
          style={{ flex: 1 }}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item._id}
            className="flex-1 px-4"
            ListHeaderComponent={
              typeof conversation.product === "object" &&
              conversation.product ? (
                <TouchableOpacity
                  className="mb-4 bg-neutral-50 rounded-2xl p-4 flex-row items-center"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.03,
                    shadowRadius: 4,
                    elevation: 1,
                    borderWidth: 1,
                    borderColor: colors.border,
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
                    className="w-12 h-12 rounded-xl"
                    resizeMode="cover"
                  />
                  <View className="ml-3 flex-1">
                    <Text
                      className="text-sm font-quicksand-semibold text-textPrimary"
                      numberOfLines={1}
                    >
                      {conversation.product.name || "Produit"}
                    </Text>
                    <Text className="text-base font-quicksand-bold text-primary-600">
                      {conversation.product.price
                        ? formatPrice(conversation.product.price)
                        : "Prix non disponible"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null
            }
            contentContainerStyle={{
              paddingTop: insets.top + 70,
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
              <View className="flex-1 justify-center items-center py-20">
                <View className="bg-neutral-50 rounded-full w-16 h-16 justify-center items-center mb-4">
                  <Ionicons
                    name="chatbubble-outline"
                    size={24}
                    color="#9CA3AF"
                  />
                </View>
                <Text className="text-lg font-quicksand-bold text-neutral-600 mb-2">
                  Début de la conversation
                </Text>
                <Text className="text-neutral-500 font-quicksand-medium text-center px-6">
                  Commencez la discussion à propos de ce produit
                </Text>
              </View>
            }
          />

          {/* Zone de réponse améliorée */}
          {replyingTo && (
            <View className="bg-gradient-to-r from-primary-50 to-blue-50 mx-4 mb-2 rounded-2xl p-4 border-l-4 border-primary-400 shadow-sm">
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name="return-up-forward"
                      size={14}
                      color="#10B981"
                    />
                    <Text className="text-xs text-primary-600 font-quicksand-semibold ml-1">
                      Réponse à {replyingTo.sender.firstName}{" "}
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
                  className="ml-3 w-8 h-8 bg-card rounded-full justify-center items-center shadow-sm"
                >
                  <Ionicons name="close" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Zone de saisie Android */}
          <View
            className="px-4"
            style={{
              backgroundColor: colors.card,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 2),
            }}
          >
            <View
              className="flex-row items-center rounded-3xl p-2"
              style={{
                backgroundColor: colors.secondary,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 4,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              {/* Zone de texte */}
              <View className="flex-1 min-h-[40px] max-h-32 justify-center">
                <TextInput
                  ref={textInputRef}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder={i18n.t("enterprise.messages.conversationDetail.placeholder")}
                  multiline
                  maxLength={2000}
                  onContentSizeChange={(e) => {
                    const height = Math.max(
                      40,
                      Math.min(128, e.nativeEvent.contentSize.height)
                    );
                    setInputHeight(height);
                  }}
                  className="font-quicksand-medium text-base px-4 py-2"
                  placeholderTextColor="#9CA3AF"
                  style={{
                    height: Math.max(40, inputHeight),
                    opacity: sending ? 0.95 : 1,
                    color: colors.textPrimary,
                  }}
                  editable={!sending}
                  textAlignVertical="center"
                />
              </View>

              {/* Compteur de caractères */}
              {newMessage.length > 1800 && (
                <View className="absolute top-1 right-20 bg-card rounded-full px-2 py-1">
                  <Text
                    className={`text-xs font-quicksand-medium ${
                      newMessage.length > 1950
                        ? "text-red-500"
                        : "text-orange-500"
                    }`}
                  >
                    {2000 - newMessage.length}
                  </Text>
                </View>
              )}

              {/* Bouton d'envoi amélioré */}
              {newMessage.trim() || attachment ? (
                <LinearGradient
                  colors={["#047857", "#10B981"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    marginLeft: 8,
                    shadowColor: "#10B981",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                  }}
                >
                  <TouchableOpacity
                    onPress={handleSendPress}
                    disabled={sending}
                    className="w-full h-full justify-center items-center"
                    style={{
                      transform: [{ scale: sending ? 0.95 : 1 }],
                    }}
                  >
                    <Ionicons name="send" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </LinearGradient>
              ) : (
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    marginLeft: 8,
                    backgroundColor: "#E5E7EB",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="send-outline" size={20} color="#9CA3AF" />
                </View>
              )}
            </View>
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
            ListHeaderComponent={
              typeof conversation.product === "object" &&
              conversation.product ? (
                <TouchableOpacity
                  className="mb-4 bg-neutral-50 rounded-2xl p-4 flex-row items-center"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.03,
                    shadowRadius: 4,
                    elevation: 1,
                    borderWidth: 1,
                    borderColor: colors.border,
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
                    className="w-12 h-12 rounded-xl"
                    resizeMode="cover"
                  />
                  <View className="ml-3 flex-1">
                    <Text
                      className="text-sm font-quicksand-semibold text-textPrimary"
                      numberOfLines={1}
                    >
                      {conversation.product.name || "Produit"}
                    </Text>
                    <Text className="text-base font-quicksand-bold text-primary-600">
                      {conversation.product.price
                        ? formatPrice(conversation.product.price)
                        : "Prix non disponible"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ) : null
            }
            contentContainerStyle={{
              paddingTop: insets.top + 70,
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
              <View className="flex-1 justify-center items-center py-20">
                <View className="bg-neutral-50 rounded-full w-16 h-16 justify-center items-center mb-4">
                  <Ionicons
                    name="chatbubble-outline"
                    size={24}
                    color="#9CA3AF"
                  />
                </View>
                <Text className="text-lg font-quicksand-bold text-neutral-600 mb-2">
                  Début de la conversation
                </Text>
                <Text className="text-neutral-500 font-quicksand-medium text-center px-6">
                  Commencez la discussion à propos de ce produit
                </Text>
              </View>
            }
          />

          {/* Zone de réponse améliorée */}
          {replyingTo && (
            <View className="bg-gradient-to-r from-primary-50 to-blue-50 mx-4 mb-2 rounded-2xl p-4 border-l-4 border-primary-400 shadow-sm">
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name="return-up-forward"
                      size={14}
                      color="#FE8C00"
                    />
                    <Text className="text-xs text-primary-600 font-quicksand-semibold ml-1">
                      Réponse à {replyingTo.sender.firstName}{" "}
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
                  className="ml-3 w-8 h-8 bg-card rounded-full justify-center items-center shadow-sm"
                >
                  <Ionicons name="close" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Zone de saisie iOS */}
          <View
            className="px-4"
            style={{
              backgroundColor: colors.card,
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 12),
            }}
          >
            <View
              className="flex-row items-center rounded-3xl p-2"
              style={{
                backgroundColor: colors.secondary,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 4,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              {/* Zone de texte */}
              <View className="flex-1 min-h-[40px] max-h-32 justify-center">
                <TextInput
                  ref={textInputRef}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder={i18n.t("enterprise.messages.conversationDetail.placeholder")}
                  multiline
                  maxLength={2000}
                  onContentSizeChange={(e) => {
                    const height = Math.max(
                      40,
                      Math.min(128, e.nativeEvent.contentSize.height)
                    );
                    setInputHeight(height);
                  }}
                  className="font-quicksand-medium text-base px-4 py-2"
                  placeholderTextColor="#9CA3AF"
                  style={{
                    height: Math.max(40, inputHeight),
                    opacity: sending ? 0.95 : 1,
                    color: colors.textPrimary,
                  }}
                  editable={!sending}
                  textAlignVertical="center"
                />
              </View>

              {/* Compteur de caractères */}
              {newMessage.length > 1800 && (
                <View className="absolute top-1 right-20 bg-card rounded-full px-2 py-1">
                  <Text
                    className={`text-xs font-quicksand-medium ${
                      newMessage.length > 1950
                        ? "text-red-500"
                        : "text-orange-500"
                    }`}
                  >
                    {2000 - newMessage.length}
                  </Text>
                </View>
              )}

              {/* Bouton d'envoi amélioré */}
              {newMessage.trim() || attachment ? (
                <LinearGradient
                  colors={["#047857", "#10B981"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    marginLeft: 8,
                    shadowColor: "#10B981",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 8,
                  }}
                >
                  <TouchableOpacity
                    onPress={handleSendPress}
                    disabled={sending}
                    className="w-full h-full justify-center items-center"
                    style={{
                      transform: [{ scale: sending ? 0.95 : 1 }],
                    }}
                  >
                    <Ionicons name="send" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </LinearGradient>
              ) : (
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    marginLeft: 8,
                    backgroundColor: "#E5E7EB",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="send-outline" size={20} color="#9CA3AF" />
                </View>
              )}
            </View>

            {/* Compteur de caractères */}
            {newMessage.length > 1800 && (
              <View className="absolute top-1 right-20 bg-card rounded-full px-2 py-1">
                <Text
                  className={`text-xs font-quicksand-medium ${
                    newMessage.length > 1950
                      ? "text-red-500"
                      : "text-orange-500"
                  }`}
                >
                  {2000 - newMessage.length}
                </Text>
              </View>
            )}
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
                <Text className="text-xl font-quicksand-bold text-textPrimary text-center mb-2">
                  {confirmationAction?.title}
                </Text>
                <Text className="text-base text-neutral-600 font-quicksand-medium text-center leading-5">
                  {confirmationAction?.message}
                </Text>
              </View>

              {/* Actions */}
              <View className="flex-row px-6 pb-6 gap-3">
                <TouchableOpacity
                  onPress={closeConfirmation}
                  className="flex-1 bg-neutral-100 py-4 rounded-2xl items-center"
                >
                  <Text className="text-base font-quicksand-semibold text-neutral-700">
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
      {notification ? (
        <NotificationModal
          visible={!!notification.visible}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={hideNotification}
        />
      ) : null}

      {/* Modal pour la création d'offre de livraison */}
      <Modal
        visible={offerModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeOfferModal}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <TouchableOpacity
            className="flex-1"
            activeOpacity={1}
            onPress={closeOfferModal}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            style={{ maxHeight: "85%" }}
          >
            <View
              className="bg-card rounded-t-[32px] shadow-2xl"
              style={{ height: "100%" }}
            >
              {/* Header avec dégradé - FIXE */}
              <LinearGradient
                colors={["#10B981", "#34D399"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="px-6 pt-6 pb-4 rounded-t-[32px]"
                style={{
                  paddingTop: 24,
                  paddingBottom: 16,
                  paddingLeft: 12,
                  paddingRight: 12,
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 bg-card/20 rounded-full justify-center items-center mr-3">
                      <Ionicons name="bicycle" size={20} color="#FFFFFF" />
                    </View>
                    <Text className="text-xl font-quicksand-bold text-white flex-1">
                      Nouvelle offre de livraison
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={closeOfferModal}
                    className="w-10 h-10 bg-card/20 rounded-full justify-center items-center"
                  >
                    <Ionicons name="close" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>

              {/* Contenu scrollable - flex-1 pour prendre tout l'espace disponible */}
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
                className="flex-1 px-6"
                contentContainerStyle={{ paddingTop: 20, paddingBottom: 290 }}
                nestedScrollEnabled={true}
              >
                {/* Zone de livraison */}
                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="location" size={16} color="#10B981" />
                    <Text className="text-sm text-neutral-700 font-quicksand-semibold ml-2">
                      Zone de livraison
                    </Text>
                  </View>
                  <View className="bg-neutral-50 rounded-2xl border-2 border-neutral-200 overflow-hidden">
                    <TextInput
                      value={offerForm.deliveryZone}
                      onChangeText={(text) =>
                        setOfferForm({ ...offerForm, deliveryZone: text })
                      }
                      placeholder="Ex: Cocody, Angré 8ème tranche"
                      className="px-4 py-3 text-textPrimary font-quicksand-medium text-base"
                      placeholderTextColor="#9CA3AF"
                      returnKeyType="next"
                    />
                  </View>
                </View>

                {/* Frais de livraison */}
                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="cash" size={16} color="#10B981" />
                    <Text className="text-sm text-neutral-700 font-quicksand-semibold ml-2">
                      Frais de livraison
                    </Text>
                  </View>
                  <View className="bg-neutral-50 rounded-2xl border-2 border-neutral-200 overflow-hidden flex-row items-center">
                    <TextInput
                      value={offerForm.deliveryFee}
                      onChangeText={(text) =>
                        setOfferForm({ ...offerForm, deliveryFee: text })
                      }
                      placeholder="0"
                      keyboardType="numeric"
                      className="flex-1 px-4 py-3 text-textPrimary font-quicksand-semibold text-base"
                      placeholderTextColor="#9CA3AF"
                      returnKeyType="next"
                    />
                    <Text className="text-neutral-500 font-quicksand-medium text-sm pr-4">
                      FCFA
                    </Text>
                  </View>
                </View>

                {/* Urgence */}
                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="speedometer" size={16} color="#10B981" />
                    <Text className="text-sm text-neutral-700 font-quicksand-semibold ml-2">
                      Niveau d&apos;urgence
                    </Text>
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() =>
                        setOfferForm({ ...offerForm, urgency: "LOW" })
                      }
                      className={`flex-1 rounded-2xl px-4 py-4 justify-center items-center border-2 ${
                        offerForm.urgency === "LOW"
                          ? "bg-green-50 border-green-400"
                          : "bg-neutral-50 border-neutral-200"
                      }`}
                      activeOpacity={1}
                    >
                      <Ionicons
                        name="walk"
                        size={20}
                        color={
                          offerForm.urgency === "LOW" ? "#10B981" : "#9CA3AF"
                        }
                      />
                      <Text
                        className={`font-quicksand-semibold text-xs mt-1 ${
                          offerForm.urgency === "LOW"
                            ? "text-green-700"
                            : "text-neutral-600"
                        }`}
                      >
                        Basse
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        setOfferForm({ ...offerForm, urgency: "MEDIUM" })
                      }
                      className={`flex-1 rounded-2xl px-4 py-4 justify-center items-center border-2 ${
                        offerForm.urgency === "MEDIUM"
                          ? "bg-orange-50 border-orange-400"
                          : "bg-neutral-50 border-neutral-200"
                      }`}
                      activeOpacity={1}
                    >
                      <Ionicons
                        name="bicycle"
                        size={20}
                        color={
                          offerForm.urgency === "MEDIUM" ? "#F97316" : "#9CA3AF"
                        }
                      />
                      <Text
                        className={`font-quicksand-semibold text-xs mt-1 ${
                          offerForm.urgency === "MEDIUM"
                            ? "text-orange-700"
                            : "text-neutral-600"
                        }`}
                      >
                        Moyenne
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() =>
                        setOfferForm({ ...offerForm, urgency: "HIGH" })
                      }
                      className={`flex-1 rounded-2xl px-4 py-4 justify-center items-center border-2 ${
                        offerForm.urgency === "HIGH"
                          ? "bg-red-50 border-red-400"
                          : "bg-neutral-50 border-neutral-200"
                      }`}
                      activeOpacity={1}
                    >
                      <Ionicons
                        name="rocket"
                        size={20}
                        color={
                          offerForm.urgency === "HIGH" ? "#EF4444" : "#9CA3AF"
                        }
                      />
                      <Text
                        className={`font-quicksand-semibold text-xs mt-1 ${
                          offerForm.urgency === "HIGH"
                            ? "text-red-700"
                            : "text-neutral-600"
                        }`}
                      >
                        Haute
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Date d'expiration */}
                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="time" size={16} color="#10B981" />
                    <Text className="text-sm text-neutral-700 font-quicksand-semibold ml-2">
                      Date d&apos;expiration
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      if (Platform.OS === "ios") {
                        setTempPickerDate(
                          offerForm.expiresAt
                            ? new Date(offerForm.expiresAt)
                            : new Date(Date.now() + 60 * 60 * 1000)
                        );
                        setOfferModalVisible(false); // Fermer le modal d'offre
                        setTimeout(() => setShowDatePicker(true), 300); // Ouvrir le sélecteur de date
                      } else {
                        setShowDatePicker(true);
                      }
                    }}
                    className="bg-neutral-50 rounded-2xl border-2 border-neutral-200 px-4 py-3 flex-row items-center justify-between"
                  >
                    <Text
                      className={`font-quicksand-medium text-base ${
                        offerForm.expiresAt
                          ? "text-textPrimary"
                          : "text-neutral-400"
                      }`}
                    >
                      {offerForm.expiresAt
                        ? new Date(offerForm.expiresAt).toLocaleString(
                            "fr-FR",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )
                        : "Choisir la date et l'heure"}
                    </Text>
                    <Ionicons name="calendar" size={18} color="#10B981" />
                  </TouchableOpacity>
                  {Platform.OS === "android" && showDatePicker && (
                    <DateTimePicker
                      value={
                        offerForm.expiresAt
                          ? new Date(offerForm.expiresAt)
                          : new Date(Date.now() + 60 * 60 * 1000)
                      }
                      mode={"date"}
                      display={"default"}
                      minimumDate={new Date()}
                      onChange={(
                        event: DateTimePickerEvent,
                        selectedDate?: Date
                      ) => {
                        setShowDatePicker(false);
                        if ((event as any).type === "dismissed") return;
                        const picked = selectedDate || new Date();
                        setTempExpiryDate(picked);
                        setShowTimePicker(true);
                      }}
                    />
                  )}
                  {Platform.OS === "android" && showTimePicker && (
                    <DateTimePicker
                      value={tempExpiryDate || new Date()}
                      mode={"time"}
                      display={"default"}
                      onChange={(
                        event: DateTimePickerEvent,
                        selectedTime?: Date
                      ) => {
                        setShowTimePicker(false);
                        if ((event as any).type === "dismissed") return;
                        const base = tempExpiryDate || new Date();
                        const time = selectedTime || new Date();
                        const final = new Date(base);
                        final.setHours(
                          time.getHours(),
                          time.getMinutes(),
                          0,
                          0
                        );
                        setOfferForm({
                          ...offerForm,
                          expiresAt: final.toISOString(),
                        });
                        setTempExpiryDate(null);
                      }}
                    />
                  )}
                </View>

                {/* Instructions spéciales */}
                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="document-text" size={16} color="#10B981" />
                    <Text className="text-sm text-neutral-700 font-quicksand-semibold ml-2">
                      Instructions spéciales (optionnel)
                    </Text>
                  </View>
                  <View className="bg-neutral-50 rounded-2xl border-2 border-neutral-200 overflow-hidden">
                    <TextInput
                      value={offerForm.specialInstructions}
                      onChangeText={(text) =>
                        setOfferForm({
                          ...offerForm,
                          specialInstructions: text,
                        })
                      }
                      placeholder="Ex: Livraison en mains propres uniquement, Appeler 30 min avant..."
                      className="px-4 py-3 text-textPrimary font-quicksand-medium text-base min-h-[100px]"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      textAlignVertical="top"
                      returnKeyType="done"
                    />
                  </View>
                </View>
              </ScrollView>

              {/* Actions - Fixés en bas avec safe area */}
              <View
                className="px-6 py-4 border-t border-neutral-100 flex-row gap-3 bg-card"
                style={{ paddingBottom: Math.max(insets.bottom, 16) }}
              >
                <TouchableOpacity
                  onPress={closeOfferModal}
                  className="flex-1 bg-neutral-100 py-4 rounded-2xl justify-center items-center"
                  disabled={creatingOffer}
                >
                  <Text className="text-neutral-700 font-quicksand-bold text-base">
                    Annuler
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={submitOffer}
                  disabled={creatingOffer}
                  className="flex-1"
                  style={{
                    opacity: creatingOffer ? 0.7 : 1,
                    borderRadius: 16,
                    overflow: "hidden",
                  }}
                  activeOpacity={1}
                >
                  <LinearGradient
                    colors={["#10B981", "#059669"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      width: "100%",
                      paddingVertical: 16,
                      justifyContent: "center",
                      alignItems: "center",
                      borderRadius: 16,
                    }}
                  >
                    {creatingOffer ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <View className="flex-row items-center">
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#FFFFFF"
                        />
                        <Text className="text-white font-quicksand-bold text-base ml-2">
                          Publier l&apos;offre
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modal iOS pour le sélecteur de date */}
      {Platform.OS === "ios" && (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setShowDatePicker(false);
            setTimeout(() => setOfferModalVisible(true), 300);
          }}
        >
          <View className="flex-1 bg-black/60 justify-center items-center px-6">
            <View
              className="bg-card rounded-3xl w-full"
              style={{
                maxWidth: 400,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              {/* Header */}
              <View className="px-6 pt-6 pb-4">
                <Text className="text-xl font-quicksand-bold text-textPrimary text-center mb-2">
                  Date d&apos;expiration
                </Text>
                <Text className="text-sm font-quicksand-medium text-neutral-500 text-center">
                  Choisissez la date et l&apos;heure d&apos;expiration de
                  l&apos;offre
                </Text>
              </View>

              {/* DateTimePicker custom iOS en mode clair */}
              <View
                style={{
                  marginHorizontal: 16,
                  borderRadius: 16,
                  overflow: "hidden",
                  backgroundColor: colors.card,
                }}
              >
                <IOSLightDateTimePicker
                  value={tempPickerDate}
                  colors={colors}
                  onChange={(nextDate) => {
                    // Empêcher la sélection d'une date passée
                    const now = new Date();
                    if (nextDate > now) {
                      setTempPickerDate(nextDate);
                    }
                  }}
                />
              </View>

              {/* Actions */}
              <View className="flex-row px-6 py-6 gap-3">
                <TouchableOpacity
                  onPress={() => {
                    setShowDatePicker(false);
                    setTimeout(() => setOfferModalVisible(true), 300);
                  }}
                  className="flex-1 bg-neutral-100 py-4 rounded-2xl"
                  activeOpacity={0.7}
                >
                  <Text className="text-neutral-700 font-quicksand-bold text-base text-center">
                    Annuler
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setOfferForm({
                      ...offerForm,
                      expiresAt: tempPickerDate.toISOString(),
                    });
                    setShowDatePicker(false);
                    setTimeout(() => setOfferModalVisible(true), 300);
                  }}
                  className="flex-1 py-4 rounded-2xl"
                  style={{ backgroundColor: "#10B981" }}
                  activeOpacity={0.7}
                >
                  <Text className="text-white font-quicksand-bold text-base text-center">
                    OK
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

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
          className="flex-1 bg-black/50 justify-center items-center px-6"
        >
          <TouchableOpacity
            activeOpacity={1}
            className="bg-card rounded-3xl p-6 w-full max-w-sm"
          >
            {/* Icon d'alerte */}
            <View className="items-center mb-4">
              <View className="w-16 h-16 bg-red-100 rounded-full justify-center items-center">
                <Ionicons name="alert-circle" size={32} color="#EF4444" />
              </View>
            </View>

            {/* Titre */}
            <Text className="text-xl font-quicksand-bold text-textPrimary text-center mb-2">
              Échec d&apos;envoi
            </Text>

            {/* Message */}
            <Text className="text-base font-quicksand-medium text-neutral-600 text-center mb-6">
              {retryModal.message?._sendError ||
                "Le message n'a pas pu être envoyé"}
            </Text>

            {/* Actions */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setRetryModal({ visible: false, message: null })}
                className="flex-1 bg-neutral-100 py-3 rounded-xl"
                activeOpacity={0.7}
              >
                <Text className="text-neutral-700 font-quicksand-bold text-center">
                  Annuler
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
                <Text className="text-white font-quicksand-bold text-center">
                  Renvoyer
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal d'actions du message */}
      <Modal
        visible={messageActionsModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setMessageActionsModal({ visible: false, message: null })
        }
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() =>
            setMessageActionsModal({ visible: false, message: null })
          }
          className="flex-1 bg-black/50 justify-end"
        >
          <TouchableOpacity
            activeOpacity={1}
            className="bg-card rounded-t-3xl p-6"
          >
            {/* Barre de handle */}
            <View className="w-12 h-1.5 bg-neutral-300 rounded-full self-center mb-6" />

            {/* Titre */}
            <Text className="text-xl font-quicksand-bold text-textPrimary mb-4">
              {i18n.t("enterprise.messages.conversationDetail.messageActions.title")}
            </Text>

            {/* Options */}
            <View className="space-y-2">
              {/* Répondre */}
              <TouchableOpacity
                onPress={() => {
                  if (messageActionsModal.message) {
                    setReplyingTo(messageActionsModal.message);
                  }
                  setMessageActionsModal({ visible: false, message: null });
                }}
                className="flex-row items-center p-4 bg-primary-50 rounded-xl"
                activeOpacity={0.7}
              >
                <View className="w-10 h-10 bg-primary-100 rounded-full justify-center items-center mr-3">
                  <Ionicons name="arrow-undo" size={20} color="#10B981" />
                </View>
                <Text className="text-textPrimary font-quicksand-semibold flex-1">
                  {i18n.t("enterprise.messages.conversationDetail.messageActions.reply")}
                </Text>
              </TouchableOpacity>

              {/* Supprimer (seulement si c'est notre message) */}
              {(() => {
                const currentUserId = getCurrentUserId();
                const senderId =
                  messageActionsModal.message?.sender?._id ||
                  (messageActionsModal.message as any)?.senderId;
                return currentUserId && senderId && senderId === currentUserId;
              })() && (
                <TouchableOpacity
                  onPress={() => {
                    if (messageActionsModal.message) {
                      setDeleteOptionsModal({
                        visible: true,
                        messageId: messageActionsModal.message._id,
                      });
                    }
                    setMessageActionsModal({ visible: false, message: null });
                  }}
                  className="flex-row items-center p-4 bg-red-50 rounded-xl"
                  activeOpacity={0.7}
                >
                  <View className="w-10 h-10 bg-red-100 rounded-full justify-center items-center mr-3">
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </View>
                  <Text className="text-textPrimary font-quicksand-semibold flex-1">
                    {i18n.t("enterprise.messages.conversationDetail.messageActions.delete")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Bouton Annuler */}
            <TouchableOpacity
              onPress={() =>
                setMessageActionsModal({ visible: false, message: null })
              }
              className="mt-4 bg-neutral-100 py-4 rounded-xl"
              activeOpacity={0.7}
            >
              <Text className="text-neutral-700 font-quicksand-bold text-center">
                {i18n.t("enterprise.messages.conversationDetail.cancel")}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
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
          className="flex-1 bg-black/50 justify-end"
        >
          <TouchableOpacity
            activeOpacity={1}
            className="bg-card rounded-t-3xl p-6"
          >
            {/* Barre de handle */}
            <View className="w-12 h-1.5 bg-neutral-300 rounded-full self-center mb-6" />

            {/* Titre */}
            <Text className="text-xl font-quicksand-bold text-textPrimary mb-2">
              {i18n.t("enterprise.messages.conversationDetail.deleteOptions.title")}
            </Text>
            <Text className="text-neutral-600 font-quicksand-medium mb-4">
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
                <Text className="text-textPrimary font-quicksand-semibold flex-1">
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
                <Text className="text-textPrimary font-quicksand-semibold flex-1">
                  {i18n.t("enterprise.messages.conversationDetail.deleteOptions.forEveryone")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bouton Annuler */}
            <TouchableOpacity
              onPress={() =>
                setDeleteOptionsModal({ visible: false, messageId: null })
              }
              className="mt-4 bg-neutral-100 py-4 rounded-xl"
              activeOpacity={0.7}
            >
              <Text className="text-neutral-700 font-quicksand-bold text-center">
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
          className="flex-1 bg-black/50 justify-end"
        >
          <TouchableOpacity
            activeOpacity={1}
            className="bg-card rounded-t-3xl p-6"
          >
            {/* Barre de handle */}
            <View className="w-12 h-1.5 bg-neutral-300 rounded-full self-center mb-6" />

            {/* Titre */}
            <Text className="text-xl font-quicksand-bold text-textPrimary mb-4">
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
                <Text className="text-textPrimary font-quicksand-semibold flex-1">
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
                <Text className="text-textPrimary font-quicksand-semibold flex-1">
                  {i18n.t("enterprise.messages.conversationDetail.attachmentOptions.gallery")}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bouton Annuler */}
            <TouchableOpacity
              onPress={() => setAttachmentModal(false)}
              className="mt-4 bg-neutral-100 py-4 rounded-xl"
              activeOpacity={0.7}
            >
              <Text className="text-neutral-700 font-quicksand-bold text-center">
                Annuler
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
