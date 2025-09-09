import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NotificationModal, { useNotification } from "../../../../components/ui/NotificationModal";
import { useAuth } from "../../../../contexts/AuthContext";
import { useMQTT } from "../../../../hooks/useMQTT";
import MessagingService, { Conversation, Message } from "../../../../services/api/MessagingService";
import ProductService from "../../../../services/api/ProductService";
import { Product } from "../../../../types/product";

// Cache simple pour les conversations et messages
const conversationCache = new Map<string, { conversation: Conversation; messages: Message[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes en millisecondes

export default function ConversationDetails() {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);
  const { user } = useAuth(); // Récupérer l'utilisateur connecté
  const insets = useSafeAreaInsets();
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  
  // Hook MQTT pour la communication temps réel
  const { isConnected: mqttConnected, sendMessage: mqttSendMessage, sendMessageWithAttachment, joinConversation: mqttJoinConversation, markAsRead: mqttMarkAsRead, onNewMessage, onMessageDeleted, onMessagesRead, onMessageSent, offNewMessage, offMessageDeleted, offMessagesRead, offMessageSent } = useMQTT();
  const { notification, showNotification, hideNotification } = useNotification();
  // Garde-fous pour éviter les rechargements multiples
  const initialLoadRef = useRef(false);
  const productLoadRef = useRef(false);
  
  // Récupération sécurisée des paramètres
  let conversationId: string | null = null;
  try {
    const params = useLocalSearchParams<{ conversationId: string }>();
    conversationId = params?.conversationId || null;
  } catch (error) {
    console.warn('Erreur récupération params:', error);
  }
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [effectiveProduct, setEffectiveProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [inputHeight, setInputHeight] = useState(50);
  const [inputFocused, setInputFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [attachment, setAttachment] = useState<{
    type: 'IMAGE' | 'FILE';
    data: string;
    mimeType: string;
    fileName?: string;
    uri: string;
  } | null>(null);

  // États pour la gestion des confirmations de suppression
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<{
    messageId: string;
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
  } | null>(null);

  // Récupérer l'ID de l'utilisateur connecté depuis le contexte d'auth
  const getCurrentUserId = () => {
    return user?._id || null; // Utiliser l'ID du contexte d'authentification
  };

  // Composant ShimmerBlock pour l'animation de chargement
  const ShimmerBlock = ({ width, height, borderRadius = 8 }: { width: number | string; height: number; borderRadius?: number }) => {
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
      <View className="bg-gray-200 overflow-hidden" style={{ width: width as any, height, borderRadius }}>
        <Animated.View
          className="bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 absolute inset-0"
          style={{ transform: [{ translateX }] }}
        />
      </View>
    );
  };

  // Composant SkeletonMessage pour simuler un message en chargement
  const SkeletonMessage = ({ isCurrentUser = false }: { isCurrentUser?: boolean }) => (
    <View className={`mb-4 ${isCurrentUser ? 'items-end' : 'items-start'}`}>
      <View className="flex-row items-end max-w-xs">
        {!isCurrentUser && (
          <ShimmerBlock width={32} height={32} borderRadius={16} />
        )}
        <View className="flex-1">
          <ShimmerBlock width={isCurrentUser ? 120 : 150} height={16} borderRadius={8} />
          <View className="mt-2">
            <ShimmerBlock width={isCurrentUser ? 200 : 180} height={40} borderRadius={16} />
          </View>
          <View className={`flex-row items-center mt-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
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
    <SafeAreaView className="flex-1 bg-white">
      <ExpoStatusBar style="light" translucent backgroundColor="transparent" />
      {/* Header skeleton */}
      <LinearGradient
        colors={['#10B981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="px-4 pb-3 rounded-b-3xl shadow-sm"
        style={{ paddingTop: insets.top + 8 }}
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
      <View className="bg-neutral-50 px-4 py-3 border-b border-neutral-100 flex-row items-center">
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
    </SafeAreaView>
  );

  // Gestionnaires d'événements MQTT avec useCallback pour stabilité
  const handleNewMessage = useCallback((data: any) => {
    if (data.conversation._id === conversationId) {
      console.log('💬 Nouveau message reçu via MQTT');

      // Vérifier si c'est un message que nous venons d'envoyer
      const currentUserId = user?._id || null;
      const isOurMessage = data.message.sender._id === currentUserId;

      setMessages(prev => {
        // Éviter les doublons
        const exists = prev.some(msg => msg._id === data.message._id);
        if (exists) return prev;
        return [...prev, data.message];
      });

  // Si c'est notre message, mettre à jour le cache immédiatement
      if (isOurMessage) {
        console.log('📝 Notre message confirmé - mise à jour du cache');
        const cached = conversationCache.get(conversationId!);
        if (cached) {
          const updatedCache = {
            ...cached,
            messages: [...cached.messages, data.message],
            timestamp: Date.now()
          };
          conversationCache.set(conversationId!, updatedCache);
        }
      }

      // Marquer comme lu si le message vient d'un autre participant
      if (!isOurMessage) {
        try {
          mqttMarkAsRead(conversationId!);
        } catch (e) {
          console.warn('⚠️ markAsRead échoué côté client:', e);
        }
      }

      // Faire défiler vers le bas
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 80);
    }
  }, [conversationId, user?._id, mqttMarkAsRead]);

  const handleMessageDeleted = useCallback((data: any) => {
    if (data.conversationId === conversationId) {
      setMessages(prev => prev.filter(msg => msg._id !== data.messageId));
    }
  }, [conversationId]);

  const handleMessagesRead = useCallback((data: any) => {
    if (data.conversationId === conversationId) {
      // Mettre à jour le statut des messages
      setMessages(prev => prev.map(msg => ({
        ...msg,
        readBy: msg.readBy ? [...msg.readBy, {
          user: data.userId,
          readAt: data.readAt
        }] : [{
          user: data.userId,
          readAt: data.readAt
        }]
      })));
    }
  }, [conversationId]);

  const handleMessageSent = useCallback((data: any) => {
    console.log('✅ Confirmation d\'envoi reçue:', data);
    
    // Mettre à jour le statut du message pour indiquer qu'il a été envoyé avec succès
    setMessages(prev => prev.map(msg => {
      if (msg._id === data.messageId) {
        return {
          ...msg,
          deliveryStatus: 'SENT' as const,
          // On peut aussi mettre à jour d'autres propriétés si nécessaire
        };
      }
      return msg;
    }));
    
    // Mettre à jour le cache aussi
    const cached = conversationCache.get(conversationId!);
    if (cached) {
      const updatedMessages = cached.messages.map(msg => {
        if (msg._id === data.messageId) {
          return {
            ...msg,
            deliveryStatus: 'SENT' as const,
          };
        }
        return msg;
      });
      
      conversationCache.set(conversationId!, {
        ...cached,
        messages: updatedMessages
      });
    }
  }, [conversationId]);

  // S'assurer que le dernier message est toujours visible
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Gestion du clavier spécifique pour Android et iOS
  useEffect(() => {
    const keyboardShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const keyboardHeight = e.endCoordinates.height;
        setKeyboardHeight(keyboardHeight);
        
        // Scroll vers le bas avec un délai optimisé
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, Platform.OS === 'android' ? 100 : 150);
      }
    );

    const keyboardHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        // Petit délai pour s'assurer que le layout est mis à jour
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);
      }
    );

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  // Chargement initial de la conversation (une seule fois par conversationId)
  useEffect(() => {
    if (!conversationId) return;
    if (initialLoadRef.current) return; // déjà chargé
    initialLoadRef.current = true;

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const cached = conversationCache.get(conversationId!);
        const now = Date.now();
        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
          if (cancelled) return;
            setConversation(cached.conversation);
            setMessages(cached.messages);
          return;
        }

        const data = await MessagingService.getConversationMessages(conversationId!);
        if (cancelled) return;
        setConversation(data.conversation);
        setMessages(data.messages);

        conversationCache.set(conversationId!, {
          conversation: data.conversation,
          messages: data.messages,
          timestamp: Date.now()
        });

        // Marquer comme lu (fire & forget)
        MessagingService.markMessagesAsRead(conversationId!).catch(e => console.warn('markMessagesAsRead échoué', e));
      } catch (error) {
        if (!cancelled) {
          console.error('❌ Erreur chargement conversation:', error);
          showNotification('error', 'Erreur', 'Impossible de charger la conversation');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Chargement du produit associé (séparé pour éviter relances multiples)
  useEffect(() => {
    if (!conversation) return;
    if (productLoadRef.current) return; // déjà chargé
    productLoadRef.current = true;
    let cancelled = false;
    const loadProduct = async () => {
      try {
        const conv = conversation;
        if (typeof conv.product === 'string') {
          const prod = await ProductService.getPublicProductById(conv.product);
          if (!cancelled) setEffectiveProduct(prod);
        } else {
          if (!cancelled) setEffectiveProduct(conv.product as Product);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('❌ Erreur chargement produit:', error);
          setEffectiveProduct(null);
        }
      }
    };
    loadProduct();
    return () => { cancelled = true; };
  }, [conversation]);

  // Reset flags si l'identifiant de conversation change
  useEffect(() => {
    initialLoadRef.current = false;
    productLoadRef.current = false;
    setEffectiveProduct(null);
  }, [conversationId]);

  // === GESTION MQTT ===
  useEffect(() => {
  if (!conversationId || !mqttConnected) return;

    console.log('🔌 Configuration MQTT pour conversation:', conversationId);

    // Rejoindre la conversation MQTT
  // Rejoindre / s'abonner explicitement à la conversation pour recevoir les événements
  mqttJoinConversation(conversationId);

    // S'abonner aux événements MQTT via le hook
    onNewMessage(handleNewMessage);
    onMessageDeleted(handleMessageDeleted);
    onMessagesRead(handleMessagesRead);
    onMessageSent(handleMessageSent);

    // Cleanup function
    return () => {
    offNewMessage(handleNewMessage);
      offMessageDeleted(handleMessageDeleted);
      offMessagesRead(handleMessagesRead);
      offMessageSent(handleMessageSent);
    };

  }, [conversationId, mqttConnected, user?._id, mqttJoinConversation, onNewMessage, onMessageDeleted, onMessagesRead, onMessageSent, offNewMessage, offMessageDeleted, offMessagesRead, offMessageSent, handleNewMessage, handleMessageDeleted, handleMessagesRead, handleMessageSent]);

  const sendMessage = async () => {
    if ((!newMessage.trim() && !attachment) || sending || !conversation) {
      console.log('⏸️ Envoi annulé: données insuffisantes ou envoi en cours', {
        hasText: !!newMessage.trim(),
        hasAttachment: !!attachment,
        sending,
        hasConversation: !!conversation
      });
      return;
    }

    try {
      setSending(true);

      const productId = typeof conversation.product === 'string'
        ? conversation.product
        : conversation.product._id;

      console.log('🚚 Envoi message - préparation', {
        productId,
        conversationId,
        hasAttachment: !!attachment,
        textLength: newMessage.trim().length
      });

      // Émission directe du message via MQTT
      if (attachment) {
        sendMessageWithAttachment(
          productId,
          newMessage.trim(),
          {
            type: attachment.type,
            data: attachment.data,
            mimeType: attachment.mimeType,
            fileName: attachment.fileName
          },
          replyingTo?._id,
          conversationId || undefined
        );
      } else {
        mqttSendMessage(
          productId,
          newMessage.trim(),
          replyingTo?._id,
          conversationId || undefined
        );
      }

      console.log('📨 Message émis via MQTT', { conversationId });

      // Réinitialiser les états immédiatement
      setNewMessage('');
      setReplyingTo(null);
      setAttachment(null);
      setSending(false);

      // S'assurer que le dernier message est visible après l'envoi
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error('❌ Exception pendant l\'envoi:', error);
      setSending(false);
      showNotification('error', 'Erreur', 'Impossible d\'envoyer le message');
    }
  };

  // Fonctions pour gérer les pièces jointes
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showNotification('warning', 'Permission requise', 'Nous avons besoin de l\'autorisation pour accéder à vos photos.');
      return false;
    }
    return true;
  };

  const requestCameraPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showNotification('warning', 'Permission requise', 'Nous avons besoin de l\'autorisation pour utiliser votre caméra.');
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
          type: 'IMAGE',
          data: asset.base64 || '',
          mimeType: asset.mimeType || 'image/jpeg',
          fileName: asset.fileName || undefined,
          uri: asset.uri
        });
      }
    } catch (error) {
      console.error('Erreur sélection image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
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
          type: 'IMAGE',
          data: asset.base64 || '',
          mimeType: asset.mimeType || 'image/jpeg',
          fileName: asset.fileName || undefined,
          uri: asset.uri
        });
      }
    } catch (error) {
      console.error('Erreur prise photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  // Fonction pour envoyer un message avec animation
  const handleSendPress = () => {
    if (!newMessage.trim() && !attachment || sending) return;
    
    // Animation du bouton d'envoi
    textInputRef.current?.blur();
    sendMessage();
  };

  // Fonction pour gérer le focus de l'input
  const handleInputFocus = () => {
    setInputFocused(true);
    // Scroll vers le bas avec délai optimisé pour la plateforme
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, Platform.OS === 'android' ? 200 : 250);
  };

  const handleInputBlur = () => {
    setInputFocused(false);
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      // Si le timestamp est undefined ou null, essayer d'utiliser createdAt
      if (!timestamp) {
        console.warn('Timestamp manquant, impossible de formater la date');
        return new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      const date = new Date(timestamp);
      // Vérifier si la date est valide
      if (isNaN(date.getTime())) {
        console.warn('Date invalide reçue:', timestamp);
        // Essayer de parser différents formats
        const isoDate = new Date(timestamp.replace(' ', 'T'));
        if (!isNaN(isoDate.getTime())) {
          return isoDate.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
          });
        }
        return new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      
      const now = new Date();
      const diffInMs = now.getTime() - date.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      
      // Si c'est aujourd'hui, afficher l'heure
      if (diffInDays === 0) {
        return date.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      // Si c'est hier
      else if (diffInDays === 1) {
        return `Hier ${date.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        })}`;
      }
      // Si c'est dans la semaine
      else if (diffInDays < 7) {
        return date.toLocaleDateString('fr-FR', { weekday: 'short' }) + ' ' + 
               date.toLocaleTimeString('fr-FR', {
                 hour: '2-digit',
                 minute: '2-digit'
               });
      }
      // Sinon, afficher la date
      else {
        return date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: diffInDays > 365 ? '2-digit' : undefined
        });
      }
    } catch (error) {
      console.warn('Erreur formatage date:', error, timestamp);
      return new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
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
      return 'read';
    } else if (message.readBy && message.readBy.length === 1) {
      // Le message a été envoyé mais pas encore lu par les autres
      return 'delivered';
    } else {
      // Le message vient d'être envoyé
      return 'sent';
    }
  };

  // Composant pour l'indicateur de statut
  const MessageStatusIndicator = ({ status }: { status: 'sent' | 'delivered' | 'read' | null }) => {
    if (!status) return null;

    switch (status) {
      case 'sent':
        return <Ionicons name="checkmark" size={12} color="#9CA3AF" />;
      case 'delivered':
        return (
          <View className="flex-row">
            <Ionicons name="checkmark" size={12} color="#9CA3AF" />
            <Ionicons name="checkmark" size={12} color="#9CA3AF" style={{ marginLeft: -6 }} />
          </View>
        );
      case 'read':
        return (
          <View className="flex-row">
            <Ionicons name="checkmark" size={12} color="#10B981" />
            <Ionicons name="checkmark" size={12} color="#10B981" style={{ marginLeft: -6 }} />
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
    const isCurrentUser = currentUserId && senderId && senderId === currentUserId;

    const isDeleted = message.metadata?.deleted || false;
    const messageStatus = getMessageStatus(message, currentUserId || undefined);

    return (
      <View className={`mb-4 ${isCurrentUser ? 'items-end' : 'items-start'}`}>
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
                <View className="w-8 h-8 bg-neutral-200 rounded-full justify-center items-center">
                  <Ionicons 
                    name={message.sender.role === 'ENTERPRISE' ? "business" : "person"} 
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
              <View className={`mb-2 px-3 py-2 rounded-xl border-l-4 ${
                isCurrentUser 
                  ? 'bg-primary-50 border-primary-300' 
                  : 'bg-neutral-100 border-neutral-300'
              }`}>
                <Text className="text-xs text-neutral-600 font-quicksand-medium mb-1">
                  Réponse à {message.replyTo.sender.firstName} {message.replyTo.sender.lastName}
                </Text>
                <Text className="text-sm text-neutral-700" numberOfLines={2}>
                  {message.replyTo.metadata.deleted 
                    ? '[Message supprimé]' 
                    : message.replyTo.text}
                </Text>
              </View>
            )}
            
            {/* Bulle du message */}
            <TouchableOpacity
              onLongPress={() => {
                if (!isDeleted) {
                  Alert.alert(
                    'Actions du message',
                    '',
                    [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Répondre', onPress: () => setReplyingTo(message) },
                      ...(isCurrentUser ? [
                        { text: 'Supprimer', style: 'destructive' as const, onPress: () => showDeleteConfirmation(message._id) },
                      ] : []),
                    ]
                  );
                }
              }}
              activeOpacity={0.9}
              className="rounded-2xl overflow-hidden"
            >
              {isCurrentUser && !isDeleted ? (
                <LinearGradient
                  colors={['#10B981', '#34D399']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  className="px-4 py-3"
                >
                  <Text className="font-quicksand-medium text-white">
                    {message.text}
                  </Text>
                </LinearGradient>
              ) : (
                <View className={`${isDeleted ? 'bg-neutral-100' : 'bg-neutral-100'} px-4 py-3`}>
                  <Text className={`font-quicksand-medium ${isDeleted ? 'text-neutral-600 italic' : 'text-neutral-800'}`}>
                    {isDeleted ? '[Message supprimé]' : message.text}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            
            {/* Heure et statut */}
            <View className={`flex-row items-center mt-1 ${
              isCurrentUser ? 'justify-end' : 'justify-start'
            }`}>
              <Text className="text-xs text-neutral-400 font-quicksand-medium mr-1">
                {formatMessageTime(message.createdAt || message.sentAt || '')}
              </Text>
              {isCurrentUser && <MessageStatusIndicator status={messageStatus} />}
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
                <View className="w-8 h-8 bg-neutral-200 rounded-full justify-center items-center">
                  <Ionicons 
                    name={message.sender.role === 'ENTERPRISE' ? "business" : "person"} 
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

  // Fonction pour supprimer un message
  const deleteMessage = async (messageId: string, forEveryone: boolean) => {
    try {
      await MessagingService.deleteMessage(messageId, forEveryone);
      // Mettre à jour les messages localement
      setMessages(prev => prev.map(msg => 
        msg._id === messageId 
          ? { ...msg, text: '[Message supprimé]', metadata: { ...msg.metadata, deleted: true } }
          : msg
      ));
      
      // Mettre à jour le cache
      const cached = conversationCache.get(conversationId!);
      if (cached) {
        conversationCache.set(conversationId!, {
          ...cached,
          messages: cached.messages.map(msg => 
            msg._id === messageId 
              ? { ...msg, text: '[Message supprimé]', metadata: { ...msg.metadata, deleted: true } }
              : msg
          ),
          timestamp: Date.now()
        });
      }
      
      console.log(`✅ Message supprimé ${forEveryone ? 'pour tout le monde' : 'pour moi seulement'}`);
    } catch (error) {
      console.error('❌ Erreur suppression message:', error);
      showNotification('error', 'Erreur', 'Impossible de supprimer le message');
    }
  };

  // Fonctions pour gérer les confirmations de suppression
  const showDeleteConfirmation = (messageId: string) => {
    setConfirmationAction({
      messageId,
      title: 'Supprimer le message',
      message: 'Voulez-vous supprimer ce message ?',
      confirmText: 'Supprimer',
      confirmColor: '#EF4444'
    });
    setConfirmationVisible(true);
  };

  const closeConfirmation = () => {
    setConfirmationVisible(false);
    setConfirmationAction(null);
  };

  const executeDeleteAction = async () => {
    if (!confirmationAction) return;

    const { messageId } = confirmationAction;
    closeConfirmation();

    try {
      // Afficher les options de suppression
      Alert.alert(
        'Supprimer le message',
        'Choisissez comment supprimer le message :',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Pour moi seulement', onPress: () => deleteMessage(messageId, false) },
          { text: 'Pour tout le monde', style: 'destructive', onPress: () => deleteMessage(messageId, true) },
        ]
      );
    } catch (error) {
      console.error('❌ Erreur lors de l\'affichage des options:', error);
      showNotification('error', 'Erreur', 'Impossible d\'afficher les options de suppression');
    }
  };

  // Séparateurs de date
  const isSameDay = (a?: string, b?: string) => {
    if (!a || !b) return false;
    const da = new Date(a);
    const db = new Date(b);
    return da.getFullYear() === db.getFullYear() &&
           da.getMonth() === db.getMonth() &&
           da.getDate() === db.getDate();
  };

  const dayLabel = (ts?: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.floor((todayStart - dStart) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const renderMessageItem = ({ item, index }: { item: Message; index: number }) => {
    const currentTs = (item as any).createdAt || (item as any).sentAt;
    let showSep = false;
    if (index === 0) showSep = true;
    else {
      const prev = messages[index - 1];
      const prevTs = (prev as any)?.createdAt || (prev as any)?.sentAt;
      if (!isSameDay(currentTs, prevTs)) showSep = true;
    }

    return (
      <View>
        {showSep && currentTs ? (
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

  if (loading) {
    return renderSkeletonConversation();
  }

  if (!conversation || !effectiveProduct) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text className="mt-4 text-lg font-quicksand-bold text-neutral-800">
          Conversation non trouvée
        </Text>
        <Text className="text-neutral-500 font-quicksand-medium mt-2">
          Veuillez réessayer plus tard
        </Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mt-6 bg-primary-500 rounded-xl px-6 py-3"
        >
          <Text className="text-white font-quicksand-bold">
            Retour
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Déterminer le nom du correspondant (entreprise)
  const correspondentName = (typeof effectiveProduct.enterprise === 'object' && effectiveProduct.enterprise?.companyName)
    ? effectiveProduct.enterprise.companyName
    : 'Vendeur inconnu';

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ExpoStatusBar style="light" translucent backgroundColor="transparent" />
      {/* Header */}
      <LinearGradient
  colors={['#10B981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="px-4 pb-3 rounded-b-3xl shadow-sm"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center justify-between">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="flex-row items-center"
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            <Text className="text-base font-quicksand-bold text-white ml-2" numberOfLines={1}>
              {correspondentName}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center">
            <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Informations sur le produit */}
      <View className="bg-neutral-50 px-4 py-3 border-b border-neutral-100 flex-row items-center">
        <Image
          source={{ uri: effectiveProduct.images[0] || 'https://via.placeholder.com/40x40/CCCCCC/FFFFFF?text=No+Image' }}
          className="w-10 h-10 rounded-xl mr-3"
          resizeMode="cover"
        />
        <View className="flex-1">
          <Text className="text-sm font-quicksand-bold text-neutral-800" numberOfLines={1}>
            {effectiveProduct.name}
          </Text>
          <Text className="text-xs text-neutral-600 font-quicksand-medium">
            {formatPrice(effectiveProduct.price)}
          </Text>
        </View>
      </View>

  {/* Messages et input */}
  {Platform.OS === 'android' ? (
    // Layout pour Android avec gestion des insets bas
    <View className="flex-1" style={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight : insets.bottom }}>
          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item._id}
            className="flex-1 px-4"
            contentContainerStyle={{ 
              paddingVertical: 16,
      paddingBottom: keyboardHeight > 0 ? keyboardHeight + 120 : 100 + insets.bottom
            }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              // Scroll automatique vers le bas quand le contenu change
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
              }, 50);
            }}
            onScroll={(e) => {
              const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
              const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
              setShowScrollToBottom(distanceFromBottom > 200);
            }}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            ListEmptyComponent={
              <View className="flex-1 justify-center items-center py-20">
                <View className="bg-neutral-50 rounded-full w-16 h-16 justify-center items-center mb-4">
                  <Ionicons name="chatbubble-outline" size={24} color="#9CA3AF" />
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
                    <Ionicons name="return-up-forward" size={14} color="#10B981" />
                    <Text className="text-xs text-primary-600 font-quicksand-semibold ml-1">
                      Réponse à {replyingTo.sender.firstName} {replyingTo.sender.lastName}
                    </Text>
                  </View>
                  <Text className="text-sm text-neutral-700 font-quicksand-medium" numberOfLines={2}>
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

          {/* Zone de saisie Android */}
          <View 
            className="px-4 py-4 bg-white absolute left-0 right-0"
            style={{ 
              borderTopWidth: 1, 
              borderTopColor: '#F3F4F6',
              bottom: keyboardHeight > 0 ? keyboardHeight : insets.bottom
            }}
          >
            {/* Affichage de l'image sélectionnée */}
            {attachment && (
              <View className="mb-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <Image
                      source={{ uri: attachment.uri }}
                      className="w-12 h-12 rounded-lg mr-3"
                      resizeMode="cover"
                    />
                    <View className="flex-1">
                      <Text className="text-sm font-quicksand-semibold text-neutral-800">
                        Image sélectionnée
                      </Text>
                      <Text className="text-xs text-neutral-500 font-quicksand-medium">
                        {attachment.fileName || 'image.jpg'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={removeAttachment}
                    className="w-8 h-8 bg-red-100 rounded-full justify-center items-center ml-2"
                  >
                    <Ionicons name="close" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <View className={`flex-row items-end rounded-3xl p-2 shadow-sm ${
              inputFocused ? 'bg-primary-50 border-2 border-primary-200' : 'bg-neutral-50 border-2 border-transparent'
            }`}>
              {/* Bouton d'attachement */}
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Ajouter une pièce jointe',
                    'Choisissez une option',
                    [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Prendre une photo', onPress: takePhoto },
                      { text: 'Choisir depuis la galerie', onPress: pickImageFromGallery },
                    ]
                  );
                }}
                className="w-10 h-10 bg-white rounded-full justify-center items-center mr-2 shadow-sm"
                disabled={sending}
                style={{ opacity: sending ? 0.6 : 1 }}
              >
                <Ionicons name="add" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Zone de texte */}
              <View className="flex-1 min-h-[40px] max-h-32 justify-center">
                <TextInput
                  ref={textInputRef}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder="Tapez votre message..."
                  multiline
                  maxLength={2000}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  onContentSizeChange={(e) => {
                    const height = Math.max(40, Math.min(128, e.nativeEvent.contentSize.height));
                    setInputHeight(height);
                  }}
                  className="text-neutral-800 font-quicksand-medium text-base px-4 py-2"
                  placeholderTextColor="#9CA3AF"
                  style={{ height: Math.max(40, inputHeight), opacity: sending ? 0.95 : 1 }}
                  editable={!sending}
                  textAlignVertical="center"
                />
              </View>

              {/* Compteur de caractères */}
              {newMessage.length > 1800 && (
                <View className="absolute top-1 right-20 bg-white rounded-full px-2 py-1">
                  <Text className={`text-xs font-quicksand-medium ${
                    newMessage.length > 1950 ? 'text-red-500' : 'text-orange-500'
                  }`}>
                    {2000 - newMessage.length}
                  </Text>
                </View>
              )}

              {/* Bouton d'envoi avec dégradé / état envoi */}
              <TouchableOpacity
                onPress={handleSendPress}
                disabled={!newMessage.trim() || sending}
                className="w-12 h-12 rounded-full justify-center items-center ml-2 overflow-hidden"
                style={{
                  shadowColor: newMessage.trim() && !sending ? '#10B981' : '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: newMessage.trim() && !sending ? 0.3 : 0.1,
                  shadowRadius: 4,
                  elevation: newMessage.trim() && !sending ? 8 : 2,
                  transform: [{ scale: newMessage.trim() && !sending ? 1 : 0.95 }],
                  opacity: sending ? 0.85 : 1,
                }}
              >
                {newMessage.trim() && !sending ? (
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="absolute inset-0"
                  />
                ) : (
                  <View className="absolute inset-0 bg-neutral-300" />
                )}
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons 
                    name={newMessage.trim() ? "send" : "send-outline"} 
                    size={18} 
                    color={newMessage.trim() ? "#FFFFFF" : "#9CA3AF"} 
                  />
                )}
              </TouchableOpacity>
            </View>

            {/* Indicateur de frappe */}
            {inputFocused && (
              <View className="flex-row items-center mt-2">
                <View className="mx-4 bg-primary-50 border border-primary-100 rounded-full px-3 py-1 flex-row items-center">
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 bg-primary-500 rounded-full mr-1" />
                    <View className="w-2 h-2 bg-primary-500 rounded-full mr-1" />
                    <View className="w-2 h-2 bg-primary-500 rounded-full" />
                  </View>
                  <Text className="text-xs text-primary-700 font-quicksand-semibold ml-2">
                    Vous tapez...
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
  ) : (
        // Layout pour iOS avec KeyboardAvoidingView
        <KeyboardAvoidingView 
          className="flex-1"
          behavior="padding"
          keyboardVerticalOffset={100}
          style={{ flex: 1 }}
        >
          {/* Messages */}
      <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessageItem}
            keyExtractor={(item) => item._id}
            className="flex-1 px-4"
            contentContainerStyle={{ 
              paddingVertical: 16,
        paddingBottom: 40 + insets.bottom
            }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              // Scroll automatique vers le bas quand le contenu change
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
              }, 50);
            }}
            onScroll={(e) => {
              const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
              const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
              setShowScrollToBottom(distanceFromBottom > 200);
            }}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            ListEmptyComponent={
              <View className="flex-1 justify-center items-center py-20">
                <View className="bg-neutral-50 rounded-full w-16 h-16 justify-center items-center mb-4">
                  <Ionicons name="chatbubble-outline" size={24} color="#9CA3AF" />
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
                    <Ionicons name="return-up-forward" size={14} color="#10B981" />
                    <Text className="text-xs text-primary-600 font-quicksand-semibold ml-1">
                      Réponse à {replyingTo.sender.firstName} {replyingTo.sender.lastName}
                    </Text>
                  </View>
                  <Text className="text-sm text-neutral-700 font-quicksand-medium" numberOfLines={2}>
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
          <View 
            className="px-4 py-4 bg-white"
            style={{ 
              borderTopWidth: 1, 
              borderTopColor: '#F3F4F6',
              paddingBottom: insets.bottom
            }}
          >
            {/* Affichage de l'image sélectionnée */}
            {attachment && (
              <View className="mb-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <Image
                      source={{ uri: attachment.uri }}
                      className="w-12 h-12 rounded-lg mr-3"
                      resizeMode="cover"
                    />
                    <View className="flex-1">
                      <Text className="text-sm font-quicksand-semibold text-neutral-800">
                        Image sélectionnée
                      </Text>
                      <Text className="text-xs text-neutral-500 font-quicksand-medium">
                        {attachment.fileName || 'image.jpg'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={removeAttachment}
                    className="w-8 h-8 bg-red-100 rounded-full justify-center items-center ml-2"
                  >
                    <Ionicons name="close" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <View className={`flex-row items-end rounded-3xl p-2 shadow-sm ${
              inputFocused ? 'bg-primary-50 border-2 border-primary-200' : 'bg-neutral-50 border-2 border-transparent'
            }`}>
              {/* Bouton d'attachement */}
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Ajouter une pièce jointe',
                    'Choisissez une option',
                    [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Prendre une photo', onPress: takePhoto },
                      { text: 'Choisir depuis la galerie', onPress: pickImageFromGallery },
                    ]
                  );
                }}
                className="w-10 h-10 bg-white rounded-full justify-center items-center mr-2 shadow-sm"
                disabled={sending}
                style={{ opacity: sending ? 0.6 : 1 }}
              >
                <Ionicons name="add" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Zone de texte */}
              <View className="flex-1 min-h-[40px] max-h-32 justify-center">
                <TextInput
                  ref={textInputRef}
                  value={newMessage}
                  onChangeText={setNewMessage}
                  placeholder="Tapez votre message..."
                  multiline
                  maxLength={2000}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  onContentSizeChange={(e) => {
                    const height = Math.max(40, Math.min(128, e.nativeEvent.contentSize.height));
                    setInputHeight(height);
                  }}
                  className="text-neutral-800 font-quicksand-medium text-base px-4 py-2"
                  placeholderTextColor="#9CA3AF"
                  style={{ height: Math.max(40, inputHeight), opacity: sending ? 0.95 : 1 }}
                  editable={!sending}
                  textAlignVertical="center"
                />
              </View>

              {/* Compteur de caractères */}
              {newMessage.length > 1800 && (
                <View className="absolute top-1 right-20 bg-white rounded-full px-2 py-1">
                  <Text className={`text-xs font-quicksand-medium ${
                    newMessage.length > 1950 ? 'text-red-500' : 'text-orange-500'
                  }`}>
                    {2000 - newMessage.length}
                  </Text>
                </View>
              )}

              {/* Bouton d'envoi avec dégradé / état envoi */}
              <TouchableOpacity
                onPress={handleSendPress}
                disabled={!newMessage.trim() || sending}
                className="w-12 h-12 rounded-full justify-center items-center ml-2 overflow-hidden"
                style={{
                  shadowColor: newMessage.trim() && !sending ? '#10B981' : '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: newMessage.trim() && !sending ? 0.3 : 0.1,
                  shadowRadius: 4,
                  elevation: newMessage.trim() && !sending ? 8 : 2,
                  transform: [{ scale: newMessage.trim() && !sending ? 1 : 0.95 }],
                  opacity: sending ? 0.85 : 1,
                }}
              >
                {newMessage.trim() && !sending ? (
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="absolute inset-0"
                  />
                ) : (
                  <View className="absolute inset-0 bg-neutral-300" />
                )}
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons 
                    name={newMessage.trim() ? "send" : "send-outline"} 
                    size={18} 
                    color={newMessage.trim() ? "#FFFFFF" : "#9CA3AF"} 
                  />
                )}
              </TouchableOpacity>
            </View>

            {/* Indicateur de frappe */}
            {inputFocused && (
              <View className="flex-row items-center mt-2">
                <View className="mx-4 bg-primary-50 border border-primary-100 rounded-full px-3 py-1 flex-row items-center">
                  <View className="flex-row items-center">
                    <View className="w-2 h-2 bg-primary-500 rounded-full mr-1" />
                    <View className="w-2 h-2 bg-primary-500 rounded-full mr-1" />
                    <View className="w-2 h-2 bg-primary-500 rounded-full" />
                  </View>
                  <Text className="text-xs text-primary-700 font-quicksand-semibold ml-2">
                    Vous tapez...
                  </Text>
                </View>
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
    bottom: (keyboardHeight > 0 ? keyboardHeight + 96 : 96 + insets.bottom),
            backgroundColor: '#10B981',
            shadowColor: '#10B981',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 8,
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
              className="bg-white rounded-3xl w-full max-w-sm"
              activeOpacity={1}
              onPress={() => {}}
            >
              {/* Icon */}
              <View className="items-center pt-8 pb-4">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center"
                  style={{ backgroundColor: confirmationAction?.confirmColor + '20' }}
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
                <Text className="text-xl font-quicksand-bold text-neutral-800 text-center mb-2">
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
                  onPress={executeDeleteAction}
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
    </SafeAreaView>
  );
}