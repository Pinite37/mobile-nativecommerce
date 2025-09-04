/**
 * EXEMPLE D'UTILISATION DU SYSTÈME MQTT
 *
 * Ce fichier montre comment intégrer MQTT dans vos composants React Native
 * pour recevoir des messages en temps réel et envoyer des messages.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useMQTT } from '../../hooks/useMQTT';
import messagingService, { Conversation, Message } from '../../services/api/MessagingService';

interface ChatScreenProps {
  productId: string;
  conversationId?: string;
}

export const ChatScreenExample: React.FC<ChatScreenProps> = ({ productId, conversationId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Hook MQTT pour la gestion des messages en temps réel
  const {
    isConnected,
    sendMessage,
    joinConversation,
    leaveConversation,
    markAsRead,
    onNewMessage,
    onMessagesRead,
    offNewMessage,
    offMessagesRead
  } = useMQTT();

  // Initialisation de la conversation
  useEffect(() => {
    const initializeChat = async () => {
      try {
        setIsLoading(true);

        let currentConversation: Conversation;

        if (conversationId) {
          // Récupérer la conversation existante
          const result = await messagingService.getConversationMessages(conversationId);
          currentConversation = result.conversation;
          setMessages(result.messages);
        } else {
          // Créer une nouvelle conversation
          currentConversation = await messagingService.createConversationForProduct(productId);
          setMessages([]);
        }

        setConversation(currentConversation);

        // Rejoindre la conversation pour recevoir les messages en temps réel
        joinConversation(currentConversation._id);

        console.log('✅ Chat initialisé pour la conversation:', currentConversation._id);

      } catch (error) {
        console.error('❌ Erreur initialisation chat:', error);
        Alert.alert('Erreur', 'Impossible de charger la conversation');
      } finally {
        setIsLoading(false);
      }
    };

    initializeChat();

    // Cleanup
    return () => {
      if (conversation) {
        leaveConversation(conversation._id);
      }
    };
  }, [productId, conversationId]);

  // Gestion des nouveaux messages en temps réel
  useEffect(() => {
    const handleNewMessage = (data: any) => {
      console.log('🔔 Nouveau message reçu:', data);

      if (data.conversation === conversation?._id) {
        // Ajouter le nouveau message à la liste
        setMessages(prevMessages => [data.message, ...prevMessages]);

        // Marquer automatiquement comme lu
        markAsRead(data.conversation).catch(console.error);
      }
    };

    const handleMessagesRead = (data: any) => {
      console.log('✅ Messages marqués comme lus:', data);

      if (data.conversationId === conversation?._id) {
        // Mettre à jour l'état des messages
        setMessages(prevMessages =>
          prevMessages.map(msg => ({
            ...msg,
            readBy: [...msg.readBy, { user: data.userId, readAt: data.readAt }]
          }))
        );
      }
    };

    // S'abonner aux événements
    onNewMessage(handleNewMessage);
    onMessagesRead(handleMessagesRead);

    // Cleanup
    return () => {
      offNewMessage(handleNewMessage);
      offMessagesRead(handleMessagesRead);
    };
  }, [conversation, onNewMessage, onMessagesRead, offNewMessage, offMessagesRead, markAsRead]);

  // Envoyer un message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversation) return;

    try {
      setIsLoading(true);

      await sendMessage(
        productId,
        newMessage.trim(),
        undefined, // replyTo
        conversation._id
      );

      // Vider le champ de saisie
      setNewMessage('');

      console.log('✅ Message envoyé');

    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
    } finally {
      setIsLoading(false);
    }
  };

  // Marquer tous les messages comme lus
  const handleMarkAsRead = async () => {
    if (!conversation) return;

    try {
      await markAsRead(conversation._id);
      console.log('✅ Messages marqués comme lus');
    } catch (error) {
      console.error('❌ Erreur marquage comme lu:', error);
    }
  };

  // Rendu d'un message
  const renderMessage = ({ item }: { item: Message }) => (
    <View style={{
      padding: 10,
      marginVertical: 5,
      backgroundColor: item.sender._id === 'currentUserId' ? '#007AFF' : '#E5E5EA',
      borderRadius: 10,
      alignSelf: item.sender._id === 'currentUserId' ? 'flex-end' : 'flex-start',
      maxWidth: '80%'
    }}>
      <Text style={{
        color: item.sender._id === 'currentUserId' ? 'white' : 'black'
      }}>
        {item.metadata.deleted ? '[Message supprimé]' : item.text}
      </Text>
      <Text style={{
        fontSize: 12,
        color: item.sender._id === 'currentUserId' ? '#CCCCCC' : '#666666',
        marginTop: 5
      }}>
        {new Date(item.createdAt || item.sentAt || '').toLocaleTimeString()}
      </Text>
    </View>
  );

  if (isLoading && !conversation) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Chargement de la conversation...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
      {/* Header avec statut de connexion */}
      <View style={{
        padding: 10,
        backgroundColor: isConnected ? '#4CAF50' : '#F44336',
        alignItems: 'center'
      }}>
        <Text style={{ color: 'white', fontWeight: 'bold' }}>
          {isConnected ? '🟢 Connecté' : '🔴 Déconnecté'}
        </Text>
        {conversation && (
          <Text style={{ color: 'white', fontSize: 12 }}>
            Conversation: {conversation.subject}
          </Text>
        )}
      </View>

      {/* Liste des messages */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessage}
        inverted // Pour afficher les messages du plus récent au plus ancien
        style={{ flex: 1, padding: 10 }}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* Zone de saisie */}
      <View style={{
        flexDirection: 'row',
        padding: 10,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA'
      }}>
        <TextInput
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Tapez votre message..."
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: '#E5E5EA',
            borderRadius: 20,
            paddingHorizontal: 15,
            paddingVertical: 10,
            marginRight: 10
          }}
          multiline
          maxLength={500}
        />

        <TouchableOpacity
          onPress={handleSendMessage}
          disabled={!newMessage.trim() || isLoading || !isConnected}
          style={{
            backgroundColor: (!newMessage.trim() || isLoading || !isConnected) ? '#CCCCCC' : '#007AFF',
            borderRadius: 20,
            paddingHorizontal: 20,
            paddingVertical: 10,
            justifyContent: 'center'
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>
            {isLoading ? '...' : 'Envoyer'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bouton pour marquer comme lu */}
      {conversation && (
        <TouchableOpacity
          onPress={handleMarkAsRead}
          style={{
            position: 'absolute',
            bottom: 80,
            right: 20,
            backgroundColor: '#4CAF50',
            borderRadius: 25,
            width: 50,
            height: 50,
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Text style={{ color: 'white', fontSize: 12 }}>Lu</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * EXEMPLE D'UTILISATION DANS UN COMPOSANT PARENT
 */
export const ParentComponentExample: React.FC = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  // Charger les conversations au montage
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const userConversations = await messagingService.getUserConversations();
        setConversations(userConversations);
      } catch (error) {
        console.error('Erreur chargement conversations:', error);
      }
    };

    loadConversations();
  }, []);

  if (selectedConversation) {
    return (
      <ChatScreenExample
        productId="example-product-id"
        conversationId={selectedConversation}
      />
    );
  }

  // Liste des conversations
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', padding: 20 }}>
        Mes Conversations
      </Text>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setSelectedConversation(item._id)}
            style={{
              padding: 15,
              borderBottomWidth: 1,
              borderBottomColor: '#E5E5EA',
              backgroundColor: 'white'
            }}
          >
            <Text style={{ fontWeight: 'bold' }}>{item.subject}</Text>
            <Text style={{ color: '#666666', marginTop: 5 }}>
              {item.lastMessage ? messagingService.getMessagePreview(item.lastMessage) : 'Aucun message'}
            </Text>
            {item.unreadCount && item.unreadCount > 0 && (
              <View style={{
                position: 'absolute',
                right: 15,
                top: 15,
                backgroundColor: '#FF3B30',
                borderRadius: 10,
                minWidth: 20,
                height: 20,
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>
                  {item.unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />

      {/* Bouton pour créer une nouvelle conversation */}
      <TouchableOpacity
        onPress={() => setSelectedConversation(null)}
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          backgroundColor: '#007AFF',
          borderRadius: 25,
          width: 50,
          height: 50,
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <Text style={{ color: 'white', fontSize: 24 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
};
