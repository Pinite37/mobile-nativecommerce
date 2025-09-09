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
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NotificationModal, { useNotification } from "../../../../components/ui/NotificationModal";
import { useAuth } from "../../../../contexts/AuthContext";
import { useMQTT } from "../../../../hooks/useMQTT";
import MessagingService, { Conversation, Message } from "../../../../services/api/MessagingService";

// Cache simple pour les conversations et messages
const conversationCache = new Map<string, { conversation: Conversation; messages: Message[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes en millisecondes

export default function ConversationDetails() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);
  const { user } = useAuth(); // Récupérer l'utilisateur connecté
  const { isConnected: mqttConnected, sendMessage: mqttSendMessage, sendMessageWithAttachment, joinConversation: mqttJoinConversation, onNewMessage, onMessageDeleted, onMessagesRead, onMessageSent, offNewMessage, offMessageDeleted, offMessagesRead, offMessageSent } = useMQTT();
  const { notification, showNotification, hideNotification } = useNotification();
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  
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
          <ShimmerBlock width={isCurrentUser ? 120 : 150} height={16} borderRadius={4} />
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
      <ExpoStatusBar style="light" translucent />
      {/* Header skeleton */}
      <LinearGradient
        colors={['#10B981', '#34D399']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="px-6 pb-4 rounded-b-3xl shadow-sm"
        style={{ paddingTop: insets.top + 8 }}
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
      <View className="mx-4 mt-4 bg-neutral-50 rounded-2xl p-4 flex-row items-center">
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

      // Faire défiler vers le bas
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [conversationId, user?._id]);

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

  useEffect(() => {
    const loadConversationData = async () => {
      try {
        setLoading(true);
        
        // Vérifier le cache d'abord
        const cached = conversationCache.get(conversationId!);
        const now = Date.now();
        
        if (cached && (now - cached.timestamp) < CACHE_DURATION) {
          setConversation(cached.conversation);
          setMessages(cached.messages);
          setLoading(false);
          return;
        }
        
        const data = await MessagingService.getConversationMessages(conversationId!);
        console.log('📬 Messages rechargés:', data.messages);
        setConversation(data.conversation);
        setMessages(data.messages);
        
        // Mettre en cache
        conversationCache.set(conversationId!, {
          conversation: data.conversation,
          messages: data.messages,
          timestamp: now
        });
        
        // Marquer comme lu
        await MessagingService.markMessagesAsRead(conversationId!);
      } catch (error) {
        console.error('❌ Erreur chargement conversation:', error);
        showNotification('error', 'Erreur', 'Impossible de charger la conversation');
      } finally {
        setLoading(false);
      }
    };

    if (conversationId) {
      loadConversationData();
    }
  }, [conversationId, user?._id, showNotification]);

  // Assurer visibilité du dernier message pendant la saisie et les changements de clavier
  useEffect(() => {
    if (inputFocused || keyboardHeight > 0) {
      const t1 = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 50);
      const t2 = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [inputHeight, keyboardHeight, inputFocused, newMessage]);

  // === GESTION MQTT ===
  useEffect(() => {
    if (!conversationId || !mqttConnected) return;

    console.log('🔌 Configuration MQTT pour conversation:', conversationId);

    // Rejoindre la conversation MQTT
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

      // Créer un identifiant temporaire pour suivre ce message
      // Note: Nous n'utilisons plus cette logique, nous identifions nos messages par l'ID utilisateur

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

  // Fonction pour envoyer un message avec animation
  const handleSendPress = () => {
    console.log('🚀 handleSendPress appelé - Début envoi message');
    console.log('📝 Contenu du message:', newMessage);
    console.log('💬 Conversation ID:', conversationId);
    console.log('👤 Utilisateur actuel:', getCurrentUserId());

    if (!newMessage.trim() && !attachment || sending) {
      console.log('❌ Envoi annulé - message vide et pas de pièce jointe ou déjà en cours:', { messageVide: !newMessage.trim(), pasDePieceJointe: !attachment, sending });
      return;
    }

    console.log('✅ Conditions validées, lancement sendMessage()');
    sendMessage();
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
      showNotification('error', 'Erreur', 'Impossible de sélectionner l\'image');
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
      showNotification('error', 'Erreur', 'Impossible de prendre la photo');
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
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
            <Ionicons name="checkmark" size={12} color="#9CA3AF" style={{ marginLeft: -4 }} />
            <Ionicons name="checkmark" size={12} color="#9CA3AF" style={{ marginLeft: -6 }} />
          </View>
        );
      case 'read':
        return (
          <View className="flex-row">
            <Ionicons name="checkmark" size={12} color="#3B82F6" style={{ marginLeft: -4 }} />
            <Ionicons name="checkmark" size={12} color="#3B82F6" style={{ marginLeft: -6 }} />
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

    // Debug logs pour comprendre le problème d'affichage
    

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
              <Text className="text-xs text-neutral-500">
                {formatMessageTime(message.sentAt || (message as any).createdAt)}
              </Text>
              {isCurrentUser && !isDeleted && (
                <View className="ml-1">
                  <MessageStatusIndicator status={messageStatus} />
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

  const reloadMessages = async () => {
    if (!conversationId) return;
    
    try {
      const data = await MessagingService.getConversationMessages(conversationId);
      console.log('📬 Messages rechargés:', data.messages);
      setConversation(data.conversation);
      setMessages(data.messages);
    } catch (error) {
      console.error('❌ Erreur rechargement messages:', error);
    }
  };

  const deleteMessage = async (messageId: string, deleteForEveryone: boolean) => {
    try {
      await MessagingService.deleteMessage(messageId, deleteForEveryone);
      // Recharger les messages
      reloadMessages();
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

  // Helpers pour séparateurs de date
  const isSameDay = (a: string, b: string) => {
    const da = new Date(a);
    const db = new Date(b);
    return da.getFullYear() === db.getFullYear() &&
           da.getMonth() === db.getMonth() &&
           da.getDate() === db.getDate();
  };
  const dayLabel = (ts: string) => {
    const d = new Date(ts);
    const today = new Date();
    const diff = Math.floor((today.setHours(0,0,0,0) - new Date(d.setHours(0,0,0,0)).getTime()) / (1000*60*60*24));
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return "Hier";
    return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const renderMessageItem = ({ item, index }: { item: Message; index: number }) => {
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

  if (loading) {
    return renderSkeletonConversation();
  }

  if (!conversationId) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text className="mt-4 text-xl font-quicksand-bold text-neutral-800">
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
      </SafeAreaView>
    );
  }

  if (!conversation) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <Ionicons name="chatbubble-outline" size={64} color="#EF4444" />
          <Text className="mt-4 text-xl font-quicksand-bold text-neutral-800">
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
      </SafeAreaView>
    );
  }

  // Gestion sécurisée de otherParticipant
  const otherParticipant = conversation.otherParticipant || 
    (Array.isArray(conversation.participants) && typeof conversation.participants[0] === 'object' 
      ? conversation.participants.find(p => p.role !== 'CLIENT') 
      : null);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ExpoStatusBar style="light" translucent />
      {/* Header */}
      <LinearGradient
  colors={['#10B981', '#34D399']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="px-6 pb-4 rounded-b-3xl shadow-sm"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 bg-white/20 rounded-full justify-center items-center mr-3"
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
              <View className="w-10 h-10 bg-white/25 rounded-full justify-center items-center mr-3">
                <Ionicons 
                  name={otherParticipant?.role === 'ENTERPRISE' ? "business" : "person"} 
                  size={18} 
                  color="#FFFFFF" 
                />
              </View>
            )}

            <View className="flex-1">
              <Text className="text-base font-quicksand-semibold text-white" numberOfLines={1}>
                {otherParticipant 
                  ? MessagingService.formatParticipantName(otherParticipant)
                  : 'Conversation'}
              </Text>
              <Text className="text-xs text-white/90" numberOfLines={1}>
                {typeof conversation.product === 'object' && conversation.product?.name 
                  ? conversation.product.name 
                  : conversation.subject || 'Discussion produit'}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            className="w-10 h-10 bg-white/20 rounded-full justify-center items-center"
            onPress={() => {
              const productId = typeof conversation.product === 'string' 
                ? conversation.product 
                : conversation.product._id;
              router.push(`/(app)/(enterprise)/(tabs)/product/${productId}`);
            }}
          >
            <Ionicons name="cube" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Informations du produit */}
      {typeof conversation.product === 'object' && conversation.product && (
        <TouchableOpacity 
          className="mx-4 mt-4 bg-neutral-50 rounded-2xl p-4 flex-row items-center"
          onPress={() => {
            const productId = typeof conversation.product === 'string' 
              ? conversation.product 
              : conversation.product._id;
            router.push(`/(app)/(enterprise)/(tabs)/product/${productId}`);
          }}
        >
          <Image
            source={{ 
              uri: conversation.product.images?.[0] || "https://via.placeholder.com/60x60/CCCCCC/FFFFFF?text=No+Image" 
            }}
            className="w-12 h-12 rounded-xl"
            resizeMode="cover"
          />
          <View className="ml-3 flex-1">
            <Text className="text-sm font-quicksand-semibold text-neutral-800" numberOfLines={1}>
              {conversation.product.name || 'Produit'}
            </Text>
            <Text className="text-base font-quicksand-bold text-primary-600">
              {conversation.product.price ? formatPrice(conversation.product.price) : 'Prix non disponible'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      )}

  {Platform.OS === 'android' ? (
        // Layout spécifique pour Android
        <View 
          className="flex-1"
          style={{ 
    // On réserve toujours l'inset bas (si clavier fermé) pour éviter chevauchement navigation bar
    paddingBottom: keyboardHeight > 0 ? keyboardHeight : insets.bottom 
          }}
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
      // Ajout de l'inset bas + hauteur zone saisie estimée
      paddingBottom: (keyboardHeight > 0 ? keyboardHeight + 100 : 100 + insets.bottom)
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
              // Positionner juste au-dessus du clavier s'il est ouvert sinon sur l'inset
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
            <View className={`flex-row items-end rounded-3xl p-2 ${
              inputFocused ? 'bg-primary-50 border-2 border-primary-200' : 'bg-neutral-50 border-2 border-transparent'
            } transition-all duration-200`}>
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
                  style={{ height: Math.max(40, inputHeight) }}
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
              
              {/* Bouton d'envoi amélioré */}
              <TouchableOpacity
                onPress={handleSendPress}
                disabled={!newMessage.trim() || sending}
                className={`w-12 h-12 rounded-full justify-center items-center ml-2 ${
                  newMessage.trim() && !sending
                    ? 'bg-primary-500'
                    : 'bg-neutral-300'
                }`}
                style={{
                  shadowColor: newMessage.trim() ? '#10B981' : '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: newMessage.trim() ? 0.3 : 0.1,
                  shadowRadius: 4,
                  elevation: newMessage.trim() ? 8 : 2,
                  transform: [{ scale: newMessage.trim() && !sending ? 1 : 0.95 }],
                }}
              >
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
              <View className="flex-row items-center mt-2 px-4">
                <View className="flex-row items-center">
                  <View className="w-2 h-2 bg-primary-400 rounded-full mr-1" />
                  <View className="w-2 h-2 bg-primary-400 rounded-full mr-1" />
                  <View className="w-2 h-2 bg-primary-400 rounded-full" />
                </View>
                <Text className="text-xs text-primary-600 font-quicksand-medium ml-2">
                  Vous tapez...
                </Text>
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
      // On ajoute l'inset bas pour s'aligner avec la zone interactive
      paddingBottom: 40 + insets.bottom
            }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: false });
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
                    <Ionicons name="return-up-forward" size={14} color="#FE8C00" />
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
            <View className={`flex-row items-end rounded-3xl p-2 ${
              inputFocused ? 'bg-primary-50 border-2 border-primary-200' : 'bg-neutral-50 border-2 border-transparent'
            } transition-all duration-200`}>
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
                  style={{ height: Math.max(40, inputHeight) }}
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
              
              {/* Bouton d'envoi amélioré */}
              <TouchableOpacity
                onPress={handleSendPress}
                disabled={!newMessage.trim() || sending}
                className={`w-12 h-12 rounded-full justify-center items-center ml-2 ${
                  newMessage.trim() && !sending
                    ? 'bg-primary-500'
                    : 'bg-neutral-300'
                }`}
                style={{
                  shadowColor: newMessage.trim() ? '#10B981' : '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: newMessage.trim() ? 0.3 : 0.1,
                  shadowRadius: 4,
                  elevation: newMessage.trim() ? 8 : 2,
                  transform: [{ scale: newMessage.trim() && !sending ? 1 : 0.95 }],
                }}
              >
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
              <View className="flex-row items-center mt-2 px-4">
                <View className="flex-row items-center">
                  <View className="w-2 h-2 bg-primary-400 rounded-full mr-1" />
                  <View className="w-2 h-2 bg-primary-400 rounded-full mr-1" />
                  <View className="w-2 h-2 bg-primary-400 rounded-full" />
                </View>
                <Text className="text-xs text-primary-600 font-quicksand-medium ml-2">
                  Vous tapez...
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
    // Ajuster la position pour tenir compte de l'inset bas quand clavier fermé
    bottom: Platform.OS === 'android'
      ? (keyboardHeight > 0 ? keyboardHeight + 96 : 96 + insets.bottom)
      : 96 + insets.bottom,
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
