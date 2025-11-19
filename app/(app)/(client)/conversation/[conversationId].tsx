import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import NotificationModal, { useNotification } from "../../../../components/ui/NotificationModal";
import { useAuth } from "../../../../contexts/AuthContext";
import { useSocket } from "../../../../hooks/useSocket";
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
  
  // Hook Socket.IO pour la communication temps réel
  const { isConnected, joinConversation, onNewMessage, onMessageDeleted, onMessagesRead } = useSocket();
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
  const [attachment, setAttachment] = useState<{
    type: 'IMAGE' | 'FILE';
    data: string;
    mimeType: string;
    fileName?: string;
    uri: string;
  } | null>(null);
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
  const [messageActionsModal, setMessageActionsModal] = useState<{ visible: boolean; message: Message | null }>({ visible: false, message: null });
  const [deleteOptionsModal, setDeleteOptionsModal] = useState<{ visible: boolean; messageId: string | null }>({ visible: false, messageId: null });
  const [attachmentModal, setAttachmentModal] = useState(false);
  const [retryModal, setRetryModal] = useState<{ visible: boolean; message: Message | null }>({ visible: false, message: null });

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
    <View className="flex-1 bg-white">
      <ExpoStatusBar style="light" translucent backgroundColor="transparent" />
      {/* Header skeleton */}
      <LinearGradient
        colors={['#10B981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-b-3xl shadow-sm"
        style={{ 
          paddingTop: insets.top + 16,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
          paddingBottom: 16
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
    </View>
  );

  // Gestionnaires d'événements Socket.IO avec useCallback pour stabilité
  const handleNewMessage = useCallback((data: any) => {
    // Extraire l'ID de conversation de manière robuste (peut être un objet ou un string)
    const receivedConvId = typeof data.conversation === 'string' ? data.conversation : data.conversation?._id;
    
    console.log('� CLIENT WebSocket - Message reçu:', {
      conversationId: receivedConvId,
      currentConvId: conversationId,
      messageId: data.message?._id,
      sender: data.message?.sender?._id,
      text: data.message?.text?.substring(0, 30)
    });
    
    if (receivedConvId !== conversationId) {
      console.log('⏭️ CLIENT - Message ignoré (autre conversation)');
      return;
    }

    // Vérifier si c'est un message que nous venons d'envoyer
    const currentUserId = user?._id || null;
    const isOurMessage = data.message.sender._id === currentUserId;
    const isSystemMessage = data.message.messageType === 'SYSTEM';

    // IMPORTANT: Ignorer nos propres messages via Socket.IO (sauf SYSTEM)
    // Ils sont déjà ajoutés via la réponse HTTP de sendMessage
    // Les messages SYSTEM doivent toujours être affichés même s'ils viennent de nous
    if (isOurMessage && !isSystemMessage) {
      console.log('⏭️ CLIENT - Message ignoré (notre propre message)');
      return;
    }

    console.log('✅ CLIENT - Ajout du message reçu');

    // Ne traiter QUE les messages des AUTRES participants
    try {
      setMessages(prev => {
        // Vérifier si le message existe déjà
        const existingIndex = prev.findIndex(msg => msg._id === data.message._id);
        
        if (existingIndex !== -1) {
          // Le message existe déjà, le mettre à jour
          const updated = [...prev];
          updated[existingIndex] = data.message;
          return updated;
        }
        
        // Nouveau message d'un autre participant, l'ajouter
        return [...prev, data.message];
      });

      // Marquer comme lu puisque c'est un message d'un autre participant
      try {
        MessagingService.markMessagesAsRead(conversationId!);
      } catch (e) {
        console.warn('⚠️ markAsRead échoué:', e);
      }

      // Faire défiler vers le bas
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

    } catch (error) {
      console.error('❌ CLIENT - Erreur ajout message:', error);
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
      setMessages(prev => {
        console.log(`👁️ CLIENT - Mise à jour readBy, messages: ${prev.length}`);
        return prev.map(msg => {
          // Vérifier si ce userId est déjà dans readBy pour éviter les doublons
          const alreadyRead = msg.readBy?.some(r => r.user === data.userId);
          if (alreadyRead) {
            return msg;
          }
          
          return {
            ...msg,
            readBy: msg.readBy ? [...msg.readBy, {
              user: data.userId,
              readAt: data.readAt
            }] : [{
              user: data.userId,
              readAt: data.readAt
            }]
          };
        });
      });
    }
  }, [conversationId]);

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
    setProductLoading(true);
    
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
      } finally {
        if (!cancelled) setProductLoading(false);
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

  // === GESTION SOCKET.IO ===
  useEffect(() => {
    if (!conversationId || !isConnected) {
      return;
    }

    console.log('🔌 CLIENT - Socket.IO setup pour conversation:', conversationId);

    // Rejoindre la conversation Socket.IO
    joinConversation(conversationId);

    // S'abonner aux événements Socket.IO via le hook
    const cleanupNewMessage = onNewMessage(handleNewMessage);
    const cleanupMessageDeleted = onMessageDeleted(handleMessageDeleted);
    const cleanupMessagesRead = onMessagesRead(handleMessagesRead);

    console.log('✅ CLIENT - Listeners Socket.IO configurés');

    // Cleanup function
    return () => {
      cleanupNewMessage?.();
      cleanupMessageDeleted?.();
      cleanupMessagesRead?.();
    };

  }, [conversationId, isConnected, user?._id, joinConversation, onNewMessage, onMessageDeleted, onMessagesRead, handleNewMessage, handleMessageDeleted, handleMessagesRead]);

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

    // Créer un ID temporaire pour le message optimiste
    const localId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageText = newMessage.trim();
    const messageAttachment = attachment;
    const messageReplyTo = replyingTo;

    // Créer un message optimiste
    const optimisticMessage: Message = {
      _id: localId,
      _localId: localId,
      _sendingStatus: 'pending',
      conversation: conversationId!,
      sender: {
        _id: user!._id,
        firstName: user!.firstName || '',
        lastName: user!.lastName || '',
        profileImage: user!.profileImage,
        role: user!.role
      },
      text: messageText,
      messageType: messageAttachment ? 'IMAGE' : 'TEXT',
      replyTo: messageReplyTo || undefined,
      sentAt: new Date().toISOString(),
      readBy: [{
        user: user!._id,
        readAt: new Date().toISOString()
      }],
      metadata: {
        deleted: false
      }
    };

    // Ajouter immédiatement le message optimiste à la liste
    setMessages(prev => [...prev, optimisticMessage]);

    // Réinitialiser les états immédiatement pour meilleure UX
    setNewMessage('');
    setReplyingTo(null);
    setAttachment(null);
    
    // Scroll vers le bas
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      setSending(true);

      const productId = typeof conversation.product === 'string'
        ? conversation.product
        : conversation.product._id;

      console.log('🚚 Envoi message - préparation', {
        productId,
        conversationId,
        hasAttachment: !!messageAttachment,
        textLength: messageText.length
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
            fileName: messageAttachment.fileName
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

      console.log('📨 CLIENT - Message envoyé avec succès', { messageId: sentMessage?.message?._id });

      // Remplacer le message optimiste par le vrai message du serveur
      if (sentMessage?.message) {
        setMessages(prev => prev.map(msg => 
          msg._localId === localId 
            ? { ...sentMessage.message, _sendingStatus: 'sent' as const }
            : msg
        ));

        // 🔥 IMPORTANT: Mettre à jour le cache avec le nouveau message
        const cached = conversationCache.get(conversationId!);
        if (cached) {
          const updatedMessages = cached.messages.map(msg => 
            msg._localId === localId 
              ? { ...sentMessage.message, _sendingStatus: 'sent' as const }
              : msg
          );
          
          // Si le message n'était pas dans le cache (nouveau message), l'ajouter
          const messageExists = updatedMessages.some(msg => msg._id === sentMessage.message._id);
          if (!messageExists) {
            updatedMessages.push({ ...sentMessage.message, _sendingStatus: 'sent' as const });
          }

          conversationCache.set(conversationId!, {
            ...cached,
            messages: updatedMessages,
            timestamp: Date.now()
          });
          console.log('✅ Cache mis à jour avec le nouveau message');
        }
      }

      setSending(false);

    } catch (error: any) {
      console.error('❌ Erreur envoi message:', error);
      
      // Marquer le message comme échoué au lieu de le supprimer
      setMessages(prev => prev.map(msg => 
        msg._localId === localId 
          ? { 
              ...msg, 
              _sendingStatus: 'failed' as const,
              _sendError: error?.message || 'Erreur inconnue'
            }
          : msg
      ));
      
      setSending(false);
    }
  };

  // Fonction pour renvoyer un message échoué
  const retryFailedMessage = async (failedMessage: Message) => {
    if (!failedMessage._localId || !conversation) return;

    const localId = failedMessage._localId;

    // Marquer le message comme en cours de renvoi
    setMessages(prev => prev.map(msg => 
      msg._localId === localId 
        ? { ...msg, _sendingStatus: 'pending' as const, _sendError: undefined }
        : msg
    ));

    try {
      const productId = typeof conversation.product === 'string'
        ? conversation.product
        : conversation.product._id;

      // Renvoyer le message
      const sentMessage = await MessagingService.sendMessage(
        productId,
        failedMessage.text,
        failedMessage.replyTo?._id,
        conversationId || undefined
      );

      console.log('✅ CLIENT - Message renvoyé avec succès', { messageId: sentMessage?.message?._id });

      // Remplacer le message par la version du serveur
      if (sentMessage?.message) {
        setMessages(prev => prev.map(msg => 
          msg._localId === localId 
            ? { ...sentMessage.message, _sendingStatus: 'sent' as const }
            : msg
        ));
      }

    } catch (error: any) {
      console.error('❌ Erreur renvoi message:', error);
      
      // Remettre en état échoué
      setMessages(prev => prev.map(msg => 
        msg._localId === localId 
          ? { 
              ...msg, 
              _sendingStatus: 'failed' as const,
              _sendError: error?.message || 'Erreur inconnue'
            }
          : msg
      ));
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

  // Fonction pour envoyer un message avec animation
  const handleSendPress = () => {
    if (!newMessage.trim() && !attachment || sending) return;
    
    // Animation du bouton d'envoi
    textInputRef.current?.blur();
    sendMessage();
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

  // Composant pour les messages système
  const SystemMessage = ({ message }: { message: Message }) => {
    // Détecter si c'est un message de livraison
    const isDeliveryMessage = message.text.toLowerCase().includes('livreur') || 
                               message.text.toLowerCase().includes('livraison') ||
                               message.text.toLowerCase().includes('livré');
    
    if (isDeliveryMessage) {
      return (
        <View style={{ paddingVertical: 16, alignItems: 'center', width: '100%' }}>
          <View style={{ 
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            paddingHorizontal: 20,
          paddingVertical: 16,
            maxWidth: '90%',
            width: '90%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            borderWidth: 1,
            borderColor: '#D1FAE5',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
              <View style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 20, 
                backgroundColor: '#D1FAE5',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <Ionicons name="bicycle" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  fontSize: 10,
                  color: '#059669',
                  fontFamily: 'Quicksand-Bold',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 4
                }}>
                  Notification de livraison
                </Text>
                <Text style={{ 
                  fontSize: 14,
                  color: '#262626',
                  fontFamily: 'Quicksand-SemiBold',
                  lineHeight: 20
                }}>
                  {message.text}
                </Text>
              </View>
            </View>
            <View style={{ 
              marginTop: 8,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: '#F5F5F5'
            }}>
              <Text style={{ 
                fontSize: 10,
                color: '#737373',
                fontFamily: 'Quicksand-Medium',
                textAlign: 'center'
              }}>
                {formatMessageTime(message.sentAt || (message as any).createdAt)}
              </Text>
            </View>
          </View>
        </View>
      );
    }
    
    // Message système standard
    return (
      <View style={{ paddingVertical: 12, alignItems: 'center' }}>
        <View style={{ 
          backgroundColor: '#F5F5F5',
          borderRadius: 999,
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderWidth: 1,
          borderColor: '#E5E5E5'
        }}>
          <Text style={{ 
            fontSize: 12,
            color: '#525252',
            fontFamily: 'Quicksand-Medium',
            textAlign: 'center'
          }}>
            {message.text}
          </Text>
        </View>
      </View>
    );
  };

  // Composant pour l'indicateur de statut
  const MessageStatusIndicator = ({ message }: { message: Message }) => {
    // Vérifier d'abord l'état d'envoi local
    if (message._sendingStatus === 'pending') {
      return <Ionicons name="time-outline" size={12} color="#9CA3AF" />;
    }
    
    if (message._sendingStatus === 'failed') {
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
                  setMessageActionsModal({ visible: true, message });
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
                  style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 }}
                >
                  <Text className="font-quicksand-medium text-white" style={{ fontSize: 15, lineHeight: 20 }}>
                    {message.text}
                  </Text>
                </LinearGradient>
              ) : (
                <View className="bg-neutral-100" style={{ paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 }}>
                  <Text className={`font-quicksand-medium ${isDeleted ? 'text-neutral-600 italic' : 'text-neutral-800'}`} style={{ fontSize: 15, lineHeight: 20 }}>
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
              {isCurrentUser && <MessageStatusIndicator message={message} />}
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

  const executeDeleteAction = async (messageId: string) => {
    // Afficher les options de suppression
    setDeleteOptionsModal({ visible: true, messageId });
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
    // Si c'est un message système, on l'affiche différemment
    if (item.messageType === 'SYSTEM') {
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

  // Afficher le skeleton si on charge la conversation OU le produit
  if (loading || productLoading) {
    return renderSkeletonConversation();
  }

  // Ne montrer "Conversation non trouvée" que si la conversation n'existe vraiment pas
  // (chargement terminé mais pas de conversation)
  if (!conversation) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ExpoStatusBar style="light" translucent backgroundColor="transparent" />
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
      </View>
    );
  }

  // Si la conversation existe mais pas le produit, continuer à charger (cas normal)
  if (!effectiveProduct) {
    return renderSkeletonConversation();
  }  // Déterminer le nom du correspondant (entreprise)
  const correspondentName = (typeof effectiveProduct.enterprise === 'object' && effectiveProduct.enterprise?.companyName)
    ? effectiveProduct.enterprise.companyName
    : 'Vendeur inconnu';

  return (
    <View className="flex-1 bg-white">
      <ExpoStatusBar style="light" translucent backgroundColor="transparent" />
      {/* Header */}
      <LinearGradient
        colors={['#10B981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-b-3xl shadow-sm"
        style={{ 
          paddingTop: insets.top + 16,
          paddingLeft: insets.left + 24,
          paddingRight: insets.right + 24,
          paddingBottom: 16
        }}
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
    // Layout pour Android avec KeyboardAvoidingView
    <KeyboardAvoidingView 
      className="flex-1"
      behavior="padding"
      keyboardVerticalOffset={0}
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
              paddingBottom: 120
            }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              // Scroll uniquement si l'utilisateur est déjà en bas
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
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

          {/* Zone de saisie Android - seulement si pas seul */}
          {!isUserAloneInConversation() && (
            <View 
              className="px-4 bg-white"
              style={{ 
                borderTopWidth: 1, 
                borderTopColor: '#F3F4F6',
                paddingTop: 12,
                paddingBottom: Math.max(12, insets.bottom)
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
            <View className="flex-row items-end rounded-3xl p-2 shadow-sm bg-neutral-50 border-2 border-transparent">
              {/* Bouton d'attachement */}
              <TouchableOpacity
                onPress={() => setAttachmentModal(true)}
                className="w-10 h-10 bg-white rounded-full justify-center items-center mr-2 shadow-sm"
                disabled={sending}
                style={{ opacity: sending ? 0.6 : 1 }}
                activeOpacity={0.7}
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
                disabled={!newMessage.trim()}
                className="w-12 h-12 rounded-full justify-center items-center ml-2"
                style={{
                  shadowColor: newMessage.trim() ? '#10B981' : '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: newMessage.trim() ? 0.3 : 0.1,
                  shadowRadius: 4,
                  elevation: newMessage.trim() ? 8 : 2,
                  transform: [{ scale: newMessage.trim() ? 1 : 0.95 }],
                  overflow: 'hidden',
                  backgroundColor: newMessage.trim() ? undefined : '#D1D5DB',
                }}
              >
                {newMessage.trim() && (
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: 0,
                    }}
                  />
                )}
                <Ionicons 
                name={newMessage.trim() ? "send" : "send-outline"} 
                size={18} 
                color={newMessage.trim() ? "#FFFFFF" : "#9CA3AF"} 
              />
              </TouchableOpacity>
            </View>
            </View>
          )}
        </KeyboardAvoidingView>
  ) : (
        // Layout pour iOS avec KeyboardAvoidingView
        <KeyboardAvoidingView 
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
              paddingBottom: 120
            }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              // Scroll uniquement si l'utilisateur est déjà en bas
              if (messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
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

          {/* Zone de saisie iOS - seulement si pas seul */}
          {!isUserAloneInConversation() && (
            <View 
              className="px-4 bg-white"
              style={{ 
                borderTopWidth: 1, 
                borderTopColor: '#F3F4F6',
                paddingTop: 12,
                paddingBottom: Math.max(12, insets.bottom)
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
            <View className="flex-row items-end rounded-3xl p-2 shadow-sm bg-neutral-50 border-2 border-transparent">
              {/* Bouton d'attachement */}
              <TouchableOpacity
                onPress={() => setAttachmentModal(true)}
                className="w-10 h-10 bg-white rounded-full justify-center items-center mr-2 shadow-sm"
                disabled={sending}
                style={{ opacity: sending ? 0.6 : 1 }}
                activeOpacity={0.7}
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
                disabled={!newMessage.trim()}
                className="w-12 h-12 rounded-full justify-center items-center ml-2"
                style={{
                  shadowColor: newMessage.trim() ? '#10B981' : '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: newMessage.trim() ? 0.3 : 0.1,
                  shadowRadius: 4,
                  elevation: newMessage.trim() ? 8 : 2,
                  transform: [{ scale: newMessage.trim() ? 1 : 0.95 }],
                  overflow: 'hidden',
                  backgroundColor: newMessage.trim() ? undefined : '#D1D5DB',
                }}
              >
                {newMessage.trim() && (
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: 0,
                    }}
                  />
                )}
                <Ionicons 
                name={newMessage.trim() ? "send" : "send-outline"} 
                size={18} 
                color={newMessage.trim() ? "#FFFFFF" : "#9CA3AF"} 
              />
              </TouchableOpacity>
            </View>
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
            backgroundColor: '#10B981',
            shadowColor: '#10B981',
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

      {/* Modal Actions du message */}
      <Modal
        visible={messageActionsModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMessageActionsModal({ visible: false, message: null })}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setMessageActionsModal({ visible: false, message: null })}
        >
          <View className="flex-1 justify-end">
            <TouchableOpacity
              className="bg-white rounded-t-3xl"
              activeOpacity={1}
              onPress={() => {}}
            >
              {/* Handle bar */}
              <View className="w-full items-center pt-3 pb-2">
                <View className="w-12 h-1 bg-neutral-300 rounded-full" />
              </View>

              {/* Header */}
              <View className="px-6 pb-4 border-b border-neutral-100">
                <Text className="text-lg font-quicksand-bold text-neutral-800">
                  Actions du message
                </Text>
              </View>

              {/* Options */}
              <View className="px-6 py-2">
                <TouchableOpacity
                  onPress={() => {
                    const msg = messageActionsModal.message;
                    setMessageActionsModal({ visible: false, message: null });
                    if (msg) setReplyingTo(msg);
                  }}
                  className="flex-row items-center py-4 border-b border-neutral-50"
                  activeOpacity={0.7}
                >
                  <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-4">
                    <Ionicons name="return-up-forward" size={20} color="#3B82F6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-quicksand-semibold text-neutral-800">
                      Répondre
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>

                {messageActionsModal.message && messageActionsModal.message.sender._id === user?._id && (
                  <TouchableOpacity
                    onPress={() => {
                      const msgId = messageActionsModal.message?._id;
                      setMessageActionsModal({ visible: false, message: null });
                      if (msgId) showDeleteConfirmation(msgId);
                    }}
                    className="flex-row items-center py-4"
                    activeOpacity={0.7}
                  >
                    <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center mr-4">
                      <Ionicons name="trash" size={20} color="#EF4444" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-quicksand-semibold text-red-500">
                        Supprimer
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Cancel Button */}
              <View className="px-6 pb-6 pt-2">
                <TouchableOpacity
                  onPress={() => setMessageActionsModal({ visible: false, message: null })}
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

      {/* Modal Options de suppression */}
      <Modal
        visible={deleteOptionsModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteOptionsModal({ visible: false, messageId: null })}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setDeleteOptionsModal({ visible: false, messageId: null })}
        >
          <View className="flex-1 justify-end">
            <TouchableOpacity
              className="bg-white rounded-t-3xl"
              activeOpacity={1}
              onPress={() => {}}
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
                  onPress={() => setDeleteOptionsModal({ visible: false, messageId: null })}
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

      {/* Modal Pièce jointe */}
      <Modal
        visible={attachmentModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAttachmentModal(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setAttachmentModal(false)}
        >
          <View className="flex-1 justify-end">
            <TouchableOpacity
              className="bg-white rounded-t-3xl"
              activeOpacity={1}
              onPress={() => {}}
            >
              {/* Handle bar */}
              <View className="w-full items-center pt-3 pb-2">
                <View className="w-12 h-1 bg-neutral-300 rounded-full" />
              </View>

              {/* Header */}
              <View className="px-6 pb-4 border-b border-neutral-100">
                <Text className="text-lg font-quicksand-bold text-neutral-800">
                  Ajouter une pièce jointe
                </Text>
                <Text className="text-sm text-neutral-500 font-quicksand-medium mt-1">
                  Choisissez une option
                </Text>
              </View>

              {/* Options */}
              <View className="px-6 py-2">
                <TouchableOpacity
                  onPress={() => {
                    setAttachmentModal(false);
                    takePhoto();
                  }}
                  className="flex-row items-center py-4 border-b border-neutral-50"
                  activeOpacity={0.7}
                >
                  <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-4">
                    <Ionicons name="camera" size={20} color="#3B82F6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-quicksand-semibold text-neutral-800">
                      Prendre une photo
                    </Text>
                    <Text className="text-sm text-neutral-500 font-quicksand-medium">
                      Utiliser l&apos;appareil photo
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setAttachmentModal(false);
                    pickImageFromGallery();
                  }}
                  className="flex-row items-center py-4"
                  activeOpacity={0.7}
                >
                  <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mr-4">
                    <Ionicons name="images" size={20} color="#10B981" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-quicksand-semibold text-neutral-800">
                      Choisir depuis la galerie
                    </Text>
                    <Text className="text-sm text-neutral-500 font-quicksand-medium">
                      Sélectionner depuis vos photos
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {/* Cancel Button */}
              <View className="px-6 pb-6 pt-2">
                <TouchableOpacity
                  onPress={() => setAttachmentModal(false)}
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
          className="flex-1 bg-black/50"
          activeOpacity={1}
          onPress={() => setRetryModal({ visible: false, message: null })}
        >
          <View className="flex-1 justify-center items-center px-6">
            <TouchableOpacity
              className="bg-white rounded-3xl w-full max-w-sm"
              activeOpacity={1}
              onPress={() => {}}
            >
              {/* Icon */}
              <View className="items-center pt-8 pb-4">
                <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center">
                  <Ionicons name="alert-circle" size={32} color="#EF4444" />
                </View>
              </View>

              {/* Content */}
              <View className="px-6 pb-6">
                <Text className="text-xl font-quicksand-bold text-neutral-800 text-center mb-2">
                  Échec d&apos;envoi
                </Text>
                <Text className="text-base text-neutral-600 font-quicksand-medium text-center leading-5">
                  {retryModal.message?._sendError || 'Le message n\'a pas pu être envoyé'}
                </Text>
              </View>

              {/* Actions */}
              <View className="flex-row px-6 pb-6 gap-3">
                <TouchableOpacity
                  onPress={() => setRetryModal({ visible: false, message: null })}
                  className="flex-1 bg-neutral-100 py-4 rounded-2xl items-center"
                  activeOpacity={0.7}
                >
                  <Text className="text-base font-quicksand-semibold text-neutral-700">
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
    </View>
  );
}