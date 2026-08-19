import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
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
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
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

// DateTimePicker custom iOS avec support du mode sombre
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
          color: colors.textPrimary,
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
            <Text style={{ fontSize: 18, color: colors.textPrimary }}>‹</Text>
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 16,
              fontFamily: "Quicksand-Bold",
              color: colors.textPrimary,
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
            <Text style={{ fontSize: 18, color: colors.textPrimary }}>›</Text>
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
                  color: colors.textSecondary,
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
                        ? colors.textSecondary + "60"
                        : isSelected
                        ? "#FFFFFF"
                        : isToday
                        ? "#10B981"
                        : colors.textPrimary,
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
              color: colors.textSecondary,
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
                      backgroundColor: selected ? (colors.textPrimary === "#111827" ? "#ECFDF5" : "rgba(16, 185, 129, 0.15)") : "transparent",
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        color: selected ? "#10B981" : colors.textPrimary,
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
              color: colors.textSecondary,
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
                      backgroundColor: selected ? (colors.textPrimary === "#111827" ? "#ECFDF5" : "rgba(16, 185, 129, 0.15)") : "transparent",
                    }}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        color: selected ? "#10B981" : colors.textPrimary,
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

const ENT_SWIPE_THRESHOLD = 65;

const WALLPAPER_ICONS_ENT = [
  'chatbubble-outline', 'heart-outline', 'star-outline', 'sparkles-outline',
  'leaf-outline', 'bag-handle-outline', 'storefront-outline', 'happy-outline',
  'flower-outline', 'ribbon-outline', 'pricetag-outline', 'gift-outline',
] as const;

const WALLPAPER_ITEMS_ENT = Array.from({ length: 16 }, (_, r) =>
  Array.from({ length: 7 }, (_, c) => ({
    key: `${r}-${c}`,
    top: r * 64 + (c % 2 === 1 ? 32 : 0),
    left: c * 72,
    icon: WALLPAPER_ICONS_ENT[(r * 5 + c * 3) % WALLPAPER_ICONS_ENT.length],
    rot: (r * 47 + c * 83) % 360,
  }))
).flat();

const ChatWallpaperEnt = React.memo(({ isDark }: { isDark: boolean }) => {
  const opacity = isDark ? 0.07 : 0.09;
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
      {WALLPAPER_ITEMS_ENT.map(item => (
        <View key={item.key} style={{ position: 'absolute', top: item.top, left: item.left, opacity, transform: [{ rotate: `${item.rot}deg` }] }}>
          <Ionicons name={item.icon} size={22} color="#10B981" />
        </View>
      ))}
    </View>
  );
});

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
        return gs.dx > 22 && Math.abs(gs.dx) > Math.abs(gs.dy) * 3;
      },
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderMove: (_, gs) => {
        if (gs.dx > 0) {
          translateX.setValue(Math.min(gs.dx, ENT_SWIPE_THRESHOLD + 20));
          if (gs.dx >= ENT_SWIPE_THRESHOLD && !triggered.current) {
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

  const iconOpacity = translateX.interpolate({ inputRange: [0, 20, ENT_SWIPE_THRESHOLD], outputRange: [0, 0.4, 1], extrapolate: 'clamp' });
  const iconScale = translateX.interpolate({ inputRange: [0, ENT_SWIPE_THRESHOLD], outputRange: [0.5, 1], extrapolate: 'clamp' });

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
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [inputHeight, setInputHeight] = useState(0);
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

  const zoneInputRef = useRef<any>(null);
  const feeInputRef = useRef<any>(null);
  const instructionsInputRef = useRef<any>(null);
  const formScrollRef = useRef<ScrollView>(null);

  const openOfferModal = () => {
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
          setParticipants(cached.participants || []);
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
          participantsCount: data.participants?.length,
          participants: data.participants,
          messagesCount: data.messages.length,
        });

        setConversation(data.conversation);
        setMessages(data.messages);
        setParticipants(data.participants || []);
        loadedConversationRef.current = conversationId;

        // Mettre en cache
        conversationCache.set(conversationId!, {
          conversation: data.conversation,
          messages: data.messages,
          participants: data.participants || [],
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

    // Cleanup: reset le ref si la conversation change et invalider le cache
    return () => {
      if (loadedConversationRef.current !== conversationId) {
        loadedConversationRef.current = null;
      }
      // Invalider le cache quand on quitte la conversation
      if (conversationId) {
        conversationCache.delete(conversationId);
        console.log("🗑️ ENTERPRISE - Cache invalidé pour:", conversationId);
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
      closeOfferModal();
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

    const ReplyPreview = () => hasReply ? (
      <TouchableOpacity onPress={scrollToReplied} activeOpacity={0.7} style={{ backgroundColor: sentOnLight ? 'rgba(0,0,0,0.06)' : isCurrentUser ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.06)', borderRadius: 10, borderLeftWidth: 3, borderLeftColor: sentOnLight ? '#10B981' : isCurrentUser ? 'rgba(255,255,255,0.6)' : '#10B981', paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6 }}>
        <Text style={{ fontSize: 11, fontFamily: 'Quicksand-Bold', color: sentOnLight ? '#10B981' : isCurrentUser ? 'rgba(255,255,255,0.9)' : '#10B981', marginBottom: 2 }}>
          {replyAuthorName}
        </Text>
        <Text style={{ fontSize: 12, fontFamily: 'Quicksand-Medium', color: sentOnLight ? '#374151' : isCurrentUser ? 'rgba(255,255,255,0.75)' : colors.textSecondary }} numberOfLines={2}>
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
                  paddingBottom: 26,
                  borderRadius: 20,
                  borderBottomRightRadius: 5,
                  backgroundColor: isDark ? '#064E3B' : '#E0FCD7',
                  shadowColor: '#10B981',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 5,
                  elevation: 3,
                }}>
                  <ReplyPreview />
                  <Text style={{ fontSize: 15, lineHeight: 22, color: isDark ? '#D1FAE5' : '#000000', fontFamily: 'Quicksand-Medium' }}>
                    {message.text}
                  </Text>
                  <View style={{ position: 'absolute', bottom: 7, right: 10, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Text style={{ fontSize: 10, color: isDark ? 'rgba(209,250,229,0.6)' : '#667781', fontFamily: 'Quicksand-Medium' }}>
                      {msgTime}
                    </Text>
                    {!isDeleted && <MessageStatusIndicator message={message} />}
                  </View>
                </View>
              ) : (
                <View style={{
                  paddingHorizontal: 14,
                  paddingTop: 10,
                  paddingBottom: isDeleted ? 12 : 26,
                  borderRadius: 20,
                  borderBottomLeftRadius: isCurrentUser ? 20 : 5,
                  backgroundColor: isDeleted ? (isDark ? '#1A2332' : '#F3F4F6') : receivedBg,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 3,
                  elevation: 1,
                }}>
                  {!isDeleted && <ReplyPreview />}
                  <Text style={{ fontSize: 15, lineHeight: 22, fontFamily: 'Quicksand-Medium', color: isDeleted ? colors.textSecondary : colors.textPrimary, fontStyle: isDeleted ? 'italic' : 'normal' }}>
                    {isDeleted ? '[Message supprimé]' : message.text}
                  </Text>
                  {!isDeleted && (
                    <View style={{ position: 'absolute', bottom: 7, right: 10 }}>
                      <Text style={{ fontSize: 10, color: colors.textSecondary, fontFamily: 'Quicksand-Medium' }}>
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

    const bubble = <MessageBubble message={item} />;
    const wrappedBubble = !isCurrentUser ? (
      <SwipeableRow onReply={() => setReplyingTo(item)} enabled={!isDeleted}>
        {bubble}
      </SwipeableRow>
    ) : bubble;

    return (
      <View>
        {showSeparator && currentTs ? (
          <View style={{ paddingVertical: 10, alignItems: 'center' }}>
            <View style={{ backgroundColor: 'rgba(16,185,129,0.10)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(16,185,129,0.18)' }}>
              <Text style={{ fontSize: 11, color: '#10B981', fontFamily: 'Quicksand-SemiBold', letterSpacing: 0.3 }}>
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
  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0F1923' : '#EEF2F7' }}>
      <ChatWallpaperEnt isDark={isDark} />
      <ExpoStatusBar style="light" translucent backgroundColor="transparent" />
      {/* Header - spacer de mise en page uniquement, les touches sont gérées par le header absolu */}
      <LinearGradient
        pointerEvents="none"
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
                <Ionicons name="car" size={18} color="#FFFFFF" />
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
              <Ionicons name="storefront" size={18} color="#FFFFFF" />
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
                <Ionicons name="car" size={18} color="#FFFFFF" />
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
              <Ionicons name="storefront" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Zone de contenu principal avec KeyboardAvoidingView */}
      {/* Sur Android, softwareKeyboardLayoutMode="pan" gère déjà le décalage —
          un KeyboardAvoidingView en plus créerait un double offset (espace vide). */}
      {Platform.OS === "android" ? (
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item._id}
            className="flex-1 px-4"
            onScrollToIndexFailed={() => { flatListRef.current?.scrollToOffset({ offset: 0, animated: true }); }}
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
                      style={{ fontSize: 14, fontFamily: 'Quicksand-SemiBold', color: colors.textPrimary, marginBottom: 4 }}
                      numberOfLines={1}
                    >
                      {conversation.product.name || "Produit"}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 13, fontFamily: 'Quicksand-Bold', color: '#10B981' }}>
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
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80, paddingHorizontal: 32 }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(16,185,129,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1.5, borderColor: 'rgba(16,185,129,0.15)' }}>
                  <Ionicons name="chatbubbles-outline" size={30} color="#10B981" />
                </View>
                <Text style={{ fontSize: 17, fontFamily: 'Quicksand-Bold', color: '#1F2937', marginBottom: 8, textAlign: 'center' }}>
                  Début de la conversation
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'Quicksand-Medium', color: '#9CA3AF', textAlign: 'center', lineHeight: 20 }}>
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
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 8, paddingBottom: Math.max(insets.bottom + 4, 10), backgroundColor: isDark ? '#0F1923' : '#EEF2F7', gap: 8 }}>
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
              disabled={sending || (!newMessage.trim() && !attachment)}
              style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: (newMessage.trim() || attachment) ? '#10B981' : (isDark ? '#1E2A3A' : '#D1D5DB'), justifyContent: 'center', alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 3 }, shadowOpacity: (newMessage.trim() || attachment) ? 0.3 : 0, shadowRadius: 6, elevation: (newMessage.trim() || attachment) ? 4 : 0 }}
            >
              <Ionicons name="send" size={18} color={(newMessage.trim() || attachment) ? '#FFFFFF' : (isDark ? '#4B5563' : '#9CA3AF')} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
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
                      style={{ fontSize: 14, fontFamily: 'Quicksand-SemiBold', color: colors.textPrimary, marginBottom: 4 }}
                      numberOfLines={1}
                    >
                      {conversation.product.name || "Produit"}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 13, fontFamily: 'Quicksand-Bold', color: '#10B981' }}>
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
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80, paddingHorizontal: 32 }}>
                <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(16,185,129,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 1.5, borderColor: 'rgba(16,185,129,0.15)' }}>
                  <Ionicons name="chatbubbles-outline" size={30} color="#10B981" />
                </View>
                <Text style={{ fontSize: 17, fontFamily: 'Quicksand-Bold', color: '#1F2937', marginBottom: 8, textAlign: 'center' }}>
                  Début de la conversation
                </Text>
                <Text style={{ fontSize: 13, fontFamily: 'Quicksand-Medium', color: '#9CA3AF', textAlign: 'center', lineHeight: 20 }}>
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
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 10, paddingVertical: 8, paddingBottom: Math.max(insets.bottom + 4, 10), backgroundColor: isDark ? '#0F1923' : '#EEF2F7', gap: 8 }}>
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          {/* Backdrop */}
          <Pressable
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }}
            onPress={closeOfferModal}
          />

          {/* Sheet */}
          <View style={{ flex: 1, maxHeight: '90%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.card, overflow: 'hidden' }}>

            {/* Handle pill */}
            <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
              <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            </View>

            {/* Header compact */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(16,185,129,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Ionicons name="car" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 18, lineHeight: 22 }}>
                  {i18n.t('enterprise.messages.conversationDetail.deliveryOffer')}
                </Text>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-Medium', fontSize: 12, marginTop: 1 }}>
                  Renseignez les détails de votre offre
                </Text>
              </View>
              <TouchableOpacity
                onPress={closeOfferModal}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' }}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Séparateur */}
            <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 20 }} />

            {/* Formulaire scrollable */}
            <ScrollView
              ref={formScrollRef}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}
            >
              {/* Zone de livraison */}
              <View style={{ marginBottom: 18 }}>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-SemiBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                  {i18n.t('enterprise.messages.conversationDetail.offerForm.deliveryZone')}
                </Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: colors.secondary,
                  borderWidth: 1.5,
                  borderColor: colors.border,
                  borderRadius: 14,
                  paddingHorizontal: 14,
                }}>
                  <Ionicons name="location-outline" size={16} color="#10B981" style={{ marginRight: 8 }} />
                  <TextInput
                    ref={zoneInputRef}
                    value={offerForm.deliveryZone}
                    onChangeText={(text) => setOfferForm({ ...offerForm, deliveryZone: text })}
                    placeholder={i18n.t('enterprise.messages.conversationDetail.offerForm.deliveryZonePlaceholder')}
                    style={{ flex: 1, color: colors.textPrimary, fontFamily: 'Quicksand-Medium', fontSize: 15, paddingVertical: 13 }}
                    placeholderTextColor={colors.textSecondary}
                    returnKeyType="next"
                    onSubmitEditing={() => feeInputRef.current?.focus()}
                    blurOnSubmit={false}
                    onFocus={() => formScrollRef.current?.scrollTo({ y: 0, animated: true })}
                  />
                </View>
              </View>

              {/* Frais de livraison */}
              <View style={{ marginBottom: 18 }}>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-SemiBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                  {i18n.t('enterprise.messages.conversationDetail.offerForm.deliveryFee')}
                </Text>
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  backgroundColor: colors.secondary,
                  borderWidth: 1.5,
                  borderColor: colors.border,
                  borderRadius: 14,
                  paddingHorizontal: 14,
                }}>
                  <Ionicons name="cash-outline" size={16} color="#10B981" style={{ marginRight: 8 }} />
                  <TextInput
                    ref={feeInputRef}
                    value={offerForm.deliveryFee}
                    onChangeText={(text) => setOfferForm({ ...offerForm, deliveryFee: text })}
                    placeholder="0"
                    keyboardType="numeric"
                    style={{ flex: 1, color: colors.textPrimary, fontFamily: 'Quicksand-SemiBold', fontSize: 15, paddingVertical: 13 }}
                    placeholderTextColor={colors.textSecondary}
                    returnKeyType="next"
                    onSubmitEditing={() => instructionsInputRef.current?.focus()}
                    blurOnSubmit={false}
                    onFocus={() => formScrollRef.current?.scrollTo({ y: 0, animated: true })}
                  />
                  <View style={{ backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ color: '#10B981', fontFamily: 'Quicksand-Bold', fontSize: 12 }}>FCFA</Text>
                  </View>
                </View>
              </View>

              {/* Urgence — chips horizontaux */}
              <View style={{ marginBottom: 18 }}>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-SemiBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                  {i18n.t('enterprise.messages.conversationDetail.offerForm.urgencyLevel')}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {([
                    { value: 'LOW',    label: i18n.t('enterprise.messages.conversationDetail.offerForm.urgencyLow'),    icon: 'walk',    activeColor: '#10B981', activeBg: isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5' },
                    { value: 'MEDIUM', label: i18n.t('enterprise.messages.conversationDetail.offerForm.urgencyMedium'), icon: 'bicycle', activeColor: '#F97316', activeBg: isDark ? 'rgba(249,115,22,0.15)' : '#FFF7ED' },
                    { value: 'HIGH',   label: i18n.t('enterprise.messages.conversationDetail.offerForm.urgencyHigh'),   icon: 'rocket',  activeColor: '#EF4444', activeBg: isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2' },
                  ] as const).map(({ value, label, icon, activeColor, activeBg }) => {
                    const active = offerForm.urgency === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        onPress={() => setOfferForm({ ...offerForm, urgency: value })}
                        activeOpacity={0.75}
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          paddingVertical: 10,
                          paddingHorizontal: 6,
                          borderRadius: 12,
                          borderWidth: 1.5,
                          borderColor: active ? activeColor : colors.border,
                          backgroundColor: active ? activeBg : colors.secondary,
                        }}
                      >
                        <Ionicons name={icon as any} size={15} color={active ? activeColor : colors.textSecondary} />
                        <Text style={{ color: active ? activeColor : colors.textSecondary, fontFamily: 'Quicksand-SemiBold', fontSize: 12 }}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Date d'expiration */}
              <View style={{ marginBottom: 18 }}>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-SemiBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                  {i18n.t('enterprise.messages.conversationDetail.offerForm.expirationDate')}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (Platform.OS === "ios") {
                      setTempPickerDate(offerForm.expiresAt ? new Date(offerForm.expiresAt) : new Date(Date.now() + 60 * 60 * 1000));
                      closeOfferModal();
                      setTimeout(() => setShowDatePicker(true), 300);
                    } else {
                      setShowDatePicker(true);
                    }
                  }}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: colors.secondary,
                    borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
                    paddingHorizontal: 14, paddingVertical: 13,
                  }}
                >
                  <Ionicons name="calendar-outline" size={16} color="#10B981" style={{ marginRight: 10 }} />
                  <Text style={{ flex: 1, color: offerForm.expiresAt ? colors.textPrimary : colors.textSecondary, fontFamily: 'Quicksand-Medium', fontSize: 15 }}>
                    {offerForm.expiresAt
                      ? new Date(offerForm.expiresAt).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                      : i18n.t('enterprise.messages.conversationDetail.offerForm.chooseDateTime')}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
                {Platform.OS === "android" && showDatePicker && (
                  <DateTimePicker
                    value={offerForm.expiresAt ? new Date(offerForm.expiresAt) : new Date(Date.now() + 60 * 60 * 1000)}
                    mode={"date"}
                    display={"default"}
                    minimumDate={new Date()}
                    onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
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
                    onChange={(event: DateTimePickerEvent, selectedTime?: Date) => {
                      setShowTimePicker(false);
                      if ((event as any).type === "dismissed") return;
                      const base = tempExpiryDate || new Date();
                      const time = selectedTime || new Date();
                      const final = new Date(base);
                      final.setHours(time.getHours(), time.getMinutes(), 0, 0);
                      setOfferForm({ ...offerForm, expiresAt: final.toISOString() });
                      setTempExpiryDate(null);
                    }}
                  />
                )}
              </View>

              {/* Instructions spéciales */}
              <View style={{ marginBottom: 4 }}>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Quicksand-SemiBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                  {i18n.t('enterprise.messages.conversationDetail.offerForm.specialInstructions')}
                </Text>
                <View style={{
                  backgroundColor: colors.secondary,
                  borderWidth: 1.5, borderColor: colors.border, borderRadius: 14,
                  padding: 14,
                }}>
                  <TextInput
                    ref={instructionsInputRef}
                    value={offerForm.specialInstructions}
                    onChangeText={(text) => setOfferForm({ ...offerForm, specialInstructions: text })}
                    placeholder={i18n.t('enterprise.messages.conversationDetail.offerForm.specialInstructionsPlaceholder')}
                    style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Medium', fontSize: 15, minHeight: 90, textAlignVertical: 'top' }}
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onFocus={() => setTimeout(() => formScrollRef.current?.scrollToEnd({ animated: true }), 100)}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Actions fixées en bas */}
            <View style={{
              flexDirection: 'row', gap: 10,
              paddingHorizontal: 20, paddingTop: 12,
              paddingBottom: Math.max(insets.bottom + 4, 20),
              borderTopWidth: 1, borderTopColor: colors.border,
              backgroundColor: colors.card,
            }}>
              <TouchableOpacity
                onPress={closeOfferModal}
                disabled={creatingOffer}
                style={{ flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ color: colors.textPrimary, fontFamily: 'Quicksand-Bold', fontSize: 15 }}>
                  {i18n.t('enterprise.messages.conversationDetail.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitOffer}
                disabled={creatingOffer}
                style={{ flex: 2, borderRadius: 14, overflow: 'hidden', opacity: creatingOffer ? 0.7 : 1 }}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#10B981", "#059669"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ paddingVertical: 14, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 }}
                >
                  {creatingOffer ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontFamily: 'Quicksand-Bold', fontSize: 15 }}>
                        {i18n.t('enterprise.messages.conversationDetail.offerForm.publishOffer')}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal iOS pour le sélecteur de date */}
      {Platform.OS === "ios" && (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setShowDatePicker(false);
            setTimeout(() => openOfferModal(), 300);
          }}
        >
          <View className="flex-1 bg-black/60 justify-center items-center px-6">
            <View
              className="rounded-3xl w-full"
              style={{
                backgroundColor: colors.card,
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
                <Text style={{ color: colors.textPrimary }} className="text-xl font-quicksand-bold text-center mb-2">
                  {i18n.t('enterprise.messages.conversationDetail.offerForm.expirationDate')}
                </Text>
                <Text style={{ color: colors.textSecondary }} className="text-sm font-quicksand-medium text-center">
                  {i18n.t('enterprise.messages.conversationDetail.offerForm.chooseDateTimeDescription')}
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
                    setTimeout(() => openOfferModal(), 300);
                  }}
                  style={{ backgroundColor: colors.secondary }}
                  className="flex-1 py-4 rounded-2xl"
                  activeOpacity={0.7}
                >
                  <Text style={{ color: colors.textPrimary }} className="font-quicksand-bold text-base text-center">
                    {i18n.t('enterprise.messages.conversationDetail.cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setOfferForm({
                      ...offerForm,
                      expiresAt: tempPickerDate.toISOString(),
                    });
                    setShowDatePicker(false);
                    setTimeout(() => openOfferModal(), 300);
                  }}
                  className="flex-1 py-4 rounded-2xl"
                  style={{ backgroundColor: "#10B981" }}
                  activeOpacity={0.7}
                >
                  <Text className="text-white font-quicksand-bold text-base text-center">
                    {i18n.t('common.actions.understood')}
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
            <Text className="text-xl font-quicksand-bold text-textPrimary text-center mb-2">
              {i18n.t("enterprise.messages.conversationDetail.retry.title")}
            </Text>

            {/* Message */}
            <Text className="text-base font-quicksand-medium text-center mb-6" style={{ color: colors.textSecondary }}>
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
                <Text className="font-quicksand-bold text-center" style={{ color: colors.textPrimary }}>
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
                <Text className="text-white font-quicksand-bold text-center">
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
                  <Text style={{ fontSize: 11, fontFamily: 'Quicksand-SemiBold', color: '#10B981', marginBottom: 4 }}>
                    {messageActionsModal.message.sender?.firstName} {messageActionsModal.message.sender?.lastName}
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
                      <Text style={{ fontSize: 15, fontFamily: 'Quicksand-SemiBold', color: '#EF4444', flex: 1 }}>
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
                <Text style={{ fontSize: 15, fontFamily: 'Quicksand-SemiBold', color: colors.textSecondary }}>
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
              className="mt-4 py-4 rounded-xl"
              style={{ backgroundColor: colors.tertiary }}
              activeOpacity={0.7}
            >
              <Text className="font-quicksand-bold text-center" style={{ color: colors.textPrimary }}>
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
              className="mt-4 py-4 rounded-xl"
              style={{ backgroundColor: colors.tertiary }}
              activeOpacity={0.7}
            >
              <Text className="font-quicksand-bold text-center" style={{ color: colors.textPrimary }}>
                Annuler
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
