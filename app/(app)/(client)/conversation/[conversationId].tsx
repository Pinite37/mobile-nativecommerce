import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../../../contexts/AuthContext";
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

  // Récupérer l'ID de l'utilisateur connecté depuis le contexte d'auth
  const getCurrentUserId = () => {
    return user?._id || null; // Utiliser l'ID du contexte d'authentification
  };

  // Gestion du clavier spécifique pour Android et iOS
  useEffect(() => {
    const keyboardShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const keyboardHeight = e.endCoordinates.height;
        setKeyboardHeight(keyboardHeight);
        
        // Pour Android, on fait défiler immédiatement vers le bas
        if (Platform.OS === 'android') {
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 50);
        } else {
          // Pour iOS, on attend un peu plus
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    );

    const keyboardHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
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
          await loadEffectiveProduct(cached.conversation);
          setLoading(false);
          return;
        }
        
        const data = await MessagingService.getConversationMessages(conversationId!);
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

        await loadEffectiveProduct(data.conversation);
      } catch (error) {
        console.error('❌ Erreur chargement conversation:', error);
        Alert.alert('Erreur', 'Impossible de charger la conversation');
      } finally {
        setLoading(false);
      }
    };

    const loadEffectiveProduct = async (conv: Conversation) => {
      try {
        if (typeof conv.product === 'string') {
          const prod = await ProductService.getPublicProductById(conv.product);
          setEffectiveProduct(prod);
        } else {
          setEffectiveProduct(conv.product);
        }
      } catch (error) {
        console.error('❌ Erreur chargement produit:', error);
        setEffectiveProduct(null);
      }
    };

    if (conversationId) {
      loadConversationData();
    }
  }, [conversationId, user?._id]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !conversation) return;
    
    try {
      setSending(true);
      const productId = typeof conversation.product === 'string' 
        ? conversation.product 
        : conversation.product._id;
      
      const result = await MessagingService.sendMessage(
        productId,
        newMessage.trim(),
        replyingTo?._id
      );
      
      // Ajouter le nouveau message à la liste
      setMessages(prev => [...prev, result.message]);
      setNewMessage('');
      setReplyingTo(null);
      
      // Mettre à jour le cache
      const cached = conversationCache.get(conversationId!);
      if (cached) {
        conversationCache.set(conversationId!, {
          ...cached,
          messages: [...cached.messages, result.message],
          timestamp: Date.now()
        });
      }
      
      // Faire défiler vers le bas
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      console.log("✅ Message envoyé");
    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
    } finally {
      setSending(false);
    }
  };

  // Fonction pour envoyer un message avec animation
  const handleSendPress = () => {
    if (!newMessage.trim() || sending) return;
    
    // Animation du bouton d'envoi
    textInputRef.current?.blur();
    sendMessage();
  };

  // Fonction pour gérer le focus de l'input
  const handleInputFocus = () => {
    setInputFocused(true);
    // Pour Android, on scrolle plus rapidement
    if (Platform.OS === 'android') {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    } else {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
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
    const isCurrentUser = currentUserId ? message.sender._id === currentUserId : false;
    const isDeleted = message.metadata.deleted;
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
                        { text: 'Supprimer', style: 'destructive' as const, onPress: () => {
                          Alert.alert(
                            'Supprimer le message',
                            'Voulez-vous supprimer ce message ?',
                            [
                              { text: 'Annuler', style: 'cancel' },
                              { text: 'Pour moi seulement', onPress: () => deleteMessage(message._id, false) },
                              { text: 'Pour tout le monde', style: 'destructive', onPress: () => deleteMessage(message._id, true) },
                            ]
                          );
                        }},
                      ] : []),
                    ]
                  );
                }
              }}
              className={`rounded-2xl px-4 py-3 shadow-sm ${
                isCurrentUser 
                  ? 'bg-primary-500 rounded-br-none' 
                  : 'bg-white rounded-bl-none border border-neutral-100'
              }`}
            >
              {isDeleted ? (
                <Text className={`italic text-xs ${
                  isCurrentUser ? 'text-primary-200' : 'text-neutral-400'
                }`}>
                  [Message supprimé]
                </Text>
              ) : (
                <Text className={`text-sm font-quicksand-medium ${
                  isCurrentUser ? 'text-white' : 'text-neutral-800'
                }`}>
                  {message.text}
                </Text>
              )}
            </TouchableOpacity>
            
            {/* Heure et statut */}
            <View className={`flex-row items-center mt-1 ${
              isCurrentUser ? 'justify-end' : 'justify-start'
            }`}>
              <Text className="text-xs text-neutral-400 font-quicksand-medium mr-1">
                {formatMessageTime(message.createdAt)}
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
      const result = await MessagingService.deleteMessage(conversationId!, messageId, forEveryone);
      
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
      Alert.alert('Erreur', 'Impossible de supprimer le message');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#FE8C00" />
        <Text className="mt-4 text-neutral-600 font-quicksand-medium">
          Chargement de la conversation...
        </Text>
      </SafeAreaView>
    );
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
  const correspondentName = effectiveProduct.enterprise.companyName || 'Vendeur inconnu';

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-white border-b border-neutral-100 px-4 py-3 pt-16 flex-row items-center justify-between">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <Ionicons name="chevron-back" size={24} color="#374151" />
          <Text className="text-base font-quicksand-bold text-neutral-800 ml-2">
            {correspondentName}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity className="flex-row items-center">
          <Ionicons name="ellipsis-vertical" size={20} color="#374151" />
        </TouchableOpacity>
      </View>

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
        // Layout pour Android sans KeyboardAvoidingView
        <View className="flex-1">
          {/* Messages */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={({ item }) => <MessageBubble message={item} />}
            keyExtractor={(item) => item._id}
            className="flex-1 px-4"
            contentContainerStyle={{ 
              paddingVertical: 16,
              paddingBottom: 20
            }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }}
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

          {/* Zone de saisie Android */}
          <View 
            className="px-4 py-4 bg-white absolute bottom-0 left-0 right-0"
            style={{ 
              borderTopWidth: 1, 
              borderTopColor: '#F3F4F6',
              bottom: keyboardHeight > 0 ? keyboardHeight : 0
            }}
          >
            <View className={`flex-row items-end rounded-3xl p-2 ${
              inputFocused ? 'bg-primary-50 border-2 border-primary-200' : 'bg-neutral-50 border-2 border-transparent'
            } transition-all duration-200`}>
              {/* Bouton d'attachement */}
              <TouchableOpacity
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
                  shadowColor: newMessage.trim() ? '#FE8C00' : '#000',
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
            renderItem={({ item }) => <MessageBubble message={item} />}
            keyExtractor={(item) => item._id}
            className="flex-1 px-4"
            contentContainerStyle={{ 
              paddingVertical: 16,
              paddingBottom: 20
            }}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }}
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
              borderTopColor: '#F3F4F6'
            }}
          >
            <View className={`flex-row items-end rounded-3xl p-2 ${
              inputFocused ? 'bg-primary-50 border-2 border-primary-200' : 'bg-neutral-50 border-2 border-transparent'
            } transition-all duration-200`}>
              {/* Bouton d'attachement */}
              <TouchableOpacity
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
                  shadowColor: newMessage.trim() ? '#FE8C00' : '#000',
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
    </SafeAreaView>
  );
}