import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MessagingService, { Conversation, Message } from "../../../../../services/api/MessagingService";

export default function ClientConversationDetails() {
  const params = useLocalSearchParams<{ conversationId: string }>() || {};
  const conversationId = params.conversationId;
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const loadConversationData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await MessagingService.getConversationMessages(conversationId!);
      setConversation(data.conversation);
      setMessages(data.messages);
      console.log("✅ Conversation chargée:", data.messages.length, "messages");
    } catch (error) {
      console.error('❌ Erreur chargement conversation:', error);
      Alert.alert('Erreur', 'Impossible de charger la conversation');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const markAsRead = useCallback(async () => {
    try {
      await MessagingService.markMessagesAsRead(conversationId!);
    } catch (error) {
      console.error('❌ Erreur marquage lecture:', error);
    }
  }, [conversationId]);

  useEffect(() => {
    if (conversationId) {
      loadConversationData();
      markAsRead();
    }
  }, [conversationId, loadConversationData, markAsRead]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !conversation) return;
    
    try {
      setSending(true);
      const result = await MessagingService.sendMessage(
        conversation.product._id,
        newMessage.trim(),
        replyingTo?._id
      );
      
      // Ajouter le nouveau message à la liste
      setMessages(prev => [...prev, result.message]);
      setNewMessage('');
      setReplyingTo(null);
      
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

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  // Composant pour un message
  const MessageBubble = ({ message }: { message: Message }) => {
    const isCurrentUser = true; // TODO: Déterminer si c'est l'utilisateur actuel
    const isDeleted = message.metadata.deleted;

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
                              { text: 'Pour tout le monde', style: 'destructive', onPress: () => deleteMessage(message._id, true) }
                            ]
                          );
                        }}
                      ] : [])
                    ]
                  );
                }
              }}
              className={`px-4 py-3 rounded-2xl ${
                isCurrentUser 
                  ? isDeleted 
                    ? 'bg-neutral-200' 
                    : 'bg-primary-500'
                  : isDeleted 
                    ? 'bg-neutral-100' 
                    : 'bg-neutral-100'
              }`}
            >
              <Text className={`font-quicksand-medium ${
                isCurrentUser 
                  ? isDeleted 
                    ? 'text-neutral-600 italic' 
                    : 'text-white'
                  : isDeleted 
                    ? 'text-neutral-600 italic' 
                    : 'text-neutral-800'
              }`}>
                {isDeleted ? '[Message supprimé]' : message.text}
              </Text>
            </TouchableOpacity>
            
            {/* Heure */}
            <Text className={`text-xs text-neutral-500 mt-1 ${
              isCurrentUser ? 'text-right' : 'text-left'
            }`}>
              {formatMessageTime(message.sentAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const deleteMessage = async (messageId: string, deleteForEveryone: boolean) => {
    try {
      await MessagingService.deleteMessage(messageId, deleteForEveryone);
      // Recharger les messages
      loadConversationData();
    } catch (error) {
      console.error('❌ Erreur suppression message:', error);
      Alert.alert('Erreur', 'Impossible de supprimer le message');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FE8C00" />
          <Text className="mt-4 text-neutral-600 font-quicksand-medium">
            Chargement de la conversation...
          </Text>
        </View>
      </SafeAreaView>
    );
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

  const otherParticipant = conversation.otherParticipant || 
    conversation.participants.find(p => p.role === 'ENTERPRISE');

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 pt-16 bg-white border-b border-neutral-100">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 bg-neutral-100 rounded-full justify-center items-center mr-3"
          >
            <Ionicons name="chevron-back" size={20} color="#374151" />
          </TouchableOpacity>
          
          {otherParticipant?.profileImage ? (
            <Image
              source={{ uri: otherParticipant.profileImage }}
              className="w-10 h-10 rounded-full mr-3"
              resizeMode="cover"
            />
          ) : (
            <View className="w-10 h-10 bg-primary-100 rounded-full justify-center items-center mr-3">
              <Ionicons 
                name={otherParticipant?.role === 'ENTERPRISE' ? "business" : "person"} 
                size={18} 
                color="#FE8C00" 
              />
            </View>
          )}
          
          <View className="flex-1">
            <Text className="text-base font-quicksand-semibold text-neutral-800" numberOfLines={1}>
              {otherParticipant 
                ? `${otherParticipant.firstName} ${otherParticipant.lastName}`
                : 'Utilisateur inconnu'}
            </Text>
            <Text className="text-xs text-neutral-600" numberOfLines={1}>
              {conversation.product.name}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          className="w-10 h-10 bg-neutral-100 rounded-full justify-center items-center"
          onPress={() => {
            router.push(`/(app)/(client)/(tabs)/product/${conversation.product._id}` as any);
          }}
        >
          <Ionicons name="cube" size={18} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Informations du produit */}
      <TouchableOpacity 
        className="mx-4 mt-4 bg-neutral-50 rounded-2xl p-4 flex-row items-center"
        onPress={() => {
          router.push(`/(app)/(client)/(tabs)/product/${conversation.product._id}` as any);
        }}
      >
        <Image
          source={{ 
            uri: conversation.product.images[0] || "https://via.placeholder.com/60x60/CCCCCC/FFFFFF?text=No+Image" 
          }}
          className="w-12 h-12 rounded-xl"
          resizeMode="cover"
        />
        <View className="ml-3 flex-1">
          <Text className="text-sm font-quicksand-semibold text-neutral-800" numberOfLines={1}>
            {conversation.product.name}
          </Text>
          <Text className="text-base font-quicksand-bold text-primary-600">
            {formatPrice(conversation.product.price)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </TouchableOpacity>

      <KeyboardAvoidingView 
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => <MessageBubble message={item} />}
          keyExtractor={(item) => item._id}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 16 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
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

        {/* Zone de réponse */}
        {replyingTo && (
          <View className="bg-neutral-50 px-4 py-3 border-t border-neutral-200">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-xs text-neutral-600 font-quicksand-medium">
                  Réponse à {replyingTo.sender.firstName} {replyingTo.sender.lastName}
                </Text>
                <Text className="text-sm text-neutral-800" numberOfLines={1}>
                  {replyingTo.text}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setReplyingTo(null)}
                className="ml-3 w-8 h-8 justify-center items-center"
              >
                <Ionicons name="close" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Zone de saisie */}
        <View className="px-4 py-4 bg-white border-t border-neutral-200">
          <View className="flex-row items-end">
            <View className="flex-1 bg-neutral-50 rounded-2xl px-4 py-3 mr-3">
              <TextInput
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Tapez votre message..."
                multiline
                maxLength={2000}
                className="text-neutral-800 font-quicksand-medium max-h-24"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!newMessage.trim() || sending}
              className={`w-12 h-12 rounded-full justify-center items-center ${
                newMessage.trim() && !sending
                  ? 'bg-primary-500'
                  : 'bg-neutral-300'
              }`}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons 
                  name="send" 
                  size={18} 
                  color={newMessage.trim() ? "#FFFFFF" : "#9CA3AF"} 
                />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
