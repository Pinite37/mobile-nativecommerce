import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMQTTContext } from '../contexts/MQTTContext';
import mqttClient from '../services/api/MQTTClient';

export interface MQTTMessage {
  _id: string;
  conversation: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
    role: string;
  };
  text: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE';
  replyTo?: any;
  sentAt?: string;
  createdAt?: string;
  readBy: any[];
  metadata: {
    deleted: boolean;
    deletedAt?: string;
    deletedBy?: string;
  };
}

export interface MQTTConversation {
  _id: string;
  participants: any[];
  type: 'CLIENT_ENTERPRISE' | 'ENTERPRISE_ENTERPRISE';
  product: any;
  subject: string;
  lastMessage?: MQTTMessage;
  lastActivity: string;
  isActive: boolean;
  unreadCount?: number;
}

interface UseMQTTResult {
  isConnected: boolean;
  sendMessage: (
    productId: string,
    text: string,
    replyTo?: string,
    conversationId?: string,
    clientId?: string
  ) => void;
  sendMessageWithAttachment: (
    productId: string,
    text: string,
    attachment: {
      type: 'IMAGE' | 'FILE';
      data: string;
      mimeType: string;
      fileName?: string;
    },
    replyTo?: string,
    conversationId?: string,
    clientId?: string
  ) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId?: string) => void;
  markAsRead: (conversationId: string) => void;
  deleteMessage: (messageId: string, deleteForEveryone?: boolean) => void;
  createConversation: (productId: string) => void;
  onNewMessage: (callback: (data: { message: MQTTMessage; conversation: MQTTConversation }) => void) => void;
  onMessagesRead: (callback: (data: { userId: string; conversationId: string; readCount: number }) => void) => void;
  onMessageDeleted: (callback: (data: { messageId: string; deleteForEveryone: boolean }) => void) => void;
  onMessageSent: (callback: (data: { messageId: string; conversationId: string; timestamp: string }) => void) => void;
  offNewMessage: (callback?: Function) => void;
  offMessagesRead: (callback?: Function) => void;
  offMessageDeleted: (callback?: Function) => void;
  offMessageSent: (callback?: Function) => void;
}

export const useMQTT = (): UseMQTTResult => {
  const { user } = useAuth();
  const { isConnected } = useMQTTContext();
  const currentConversationRef = useRef<string | null>(null);

  // La connexion MQTT est maintenant gérée par MQTTProvider
  // Ce hook se concentre sur les fonctionnalités de messagerie

  // Gestion des événements de connexion (simplifiée car gérée par le contexte)
  useEffect(() => {
    console.log('🔌 useMQTT: Hook initialisé pour utilisateur:', user?._id);
    console.log('📊 useMQTT: État de connexion MQTT:', isConnected);
  (mqttClient as any).debugSnapshot?.('hook-mount');

    if (!isConnected) {
      console.log('🔁 useMQTT: tentative ensureConnected() au montage');
      (mqttClient as any).ensureConnected?.();
    }

    // Cleanup lors du démontage
    return () => {
      console.log('🧹 useMQTT: Cleanup - déconnexion conversation');
      if (currentConversationRef.current) {
        mqttClient.unsubscribeFromConversation(currentConversationRef.current);
      }
    };
  }, [user?._id, isConnected]);

  // Fonction pour rejoindre une conversation
  const joinConversation = useCallback((conversationId: string) => {
    if (!conversationId) return;
    console.log('🚪 useMQTT: joinConversation demandé:', conversationId, 'connected=', isConnected);
    currentConversationRef.current = conversationId;

    // Fonction interne pour tenter l'abonnement avec backoff léger
    const attempt = (tries: number) => {
      const maxTries = 6;
      if (mqttClient.isConnected()) {
        mqttClient.subscribeToConversation(conversationId);
        return;
      }
      if (tries >= maxTries) {
        console.warn('⚠️ useMQTT: Échec abonnement conversation après retries:', conversationId);
        return;
      }
      const delay = 300 + tries * 300; // backoff progressif
      console.log(`⏳ useMQTT: Connexion non prête, retry abonnement conversation dans ${delay}ms (try ${tries + 1}/${maxTries})`);
      setTimeout(() => attempt(tries + 1), delay);
    };

    if (!isConnected) {
      mqttClient.ensureConnected?.();
      attempt(0);
    } else {
      // Même si isConnected true, différer très légèrement pour éviter état disconnecting transitoire
      setTimeout(() => attempt(0), 150);
    }
  }, [isConnected]);

  // Fonction pour quitter une conversation
  const leaveConversation = useCallback((conversationId?: string) => {
    const convId = conversationId || currentConversationRef.current;
    if (!convId) return;

    console.log('🚪 useMQTT: Quitter conversation:', convId);
    mqttClient.unsubscribeFromConversation(convId);

    if (currentConversationRef.current === convId) {
      currentConversationRef.current = null;
    }
  }, []);

  // Fonction pour envoyer un message texte
  const sendMessage = useCallback((
    productId: string,
    text: string,
    replyTo?: string,
    conversationId?: string,
    clientId?: string
  ) => {
    console.log('📤 useMQTT: sendMessage appelé:', {
      productId,
      textLength: text.length,
      replyTo,
      conversationId,
      clientId,
      isConnected
    });
  (mqttClient as any).debugSnapshot?.('before-send');

    if (!isConnected) {
      console.warn('⚠️ useMQTT: Non connecté - message sera mis en file d\'attente');
      mqttClient.ensureConnected?.();
    } else {
      console.log('✅ useMQTT: Envoi du message via mqttClient...');
    }
    mqttClient.sendMessage(productId, text, replyTo, conversationId, clientId);
  }, [isConnected]);

  // Fonction pour envoyer un message avec pièce jointe
  const sendMessageWithAttachment = useCallback((
    productId: string,
    text: string,
    attachment: {
      type: 'IMAGE' | 'FILE';
      data: string;
      mimeType: string;
      fileName?: string;
    },
    replyTo?: string,
    conversationId?: string,
    clientId?: string
  ) => {
    if (!isConnected) {
      console.warn('⚠️ useMQTT: Non connecté - message (PJ) sera mis en file d\'attente');
      mqttClient.ensureConnected?.();
    }
  mqttClient.sendMessageWithAttachment(productId, text, replyTo, conversationId, clientId, attachment);
  }, [isConnected]);

  // Fonction pour marquer les messages comme lus
  const markAsRead = useCallback((conversationId: string) => {
    if (!isConnected) {
      mqttClient.ensureConnected?.();
      console.warn('⚠️ useMQTT: Non connecté - markAsRead ignoré pour le moment');
      return;
    }
    mqttClient.markMessagesAsRead(conversationId);
  }, [isConnected]);

  // Fonction pour supprimer un message
  const deleteMessage = useCallback((messageId: string, deleteForEveryone: boolean = false) => {
    if (!isConnected) {
      mqttClient.ensureConnected?.();
      console.warn('⚠️ useMQTT: Non connecté - delete ignoré');
      return;
    }
    mqttClient.deleteMessage(messageId, deleteForEveryone);
  }, [isConnected]);

  // Fonction pour créer une conversation
  const createConversation = useCallback((productId: string) => {
    if (!isConnected) {
      mqttClient.ensureConnected?.();
      console.warn('⚠️ useMQTT: Non connecté - création conversation ignorée');
      return;
    }
    mqttClient.createConversation(productId);
  }, [isConnected]);

  // Gestionnaires d'événements pour les nouveaux messages
  const onNewMessage = useCallback((callback: (data: { message: MQTTMessage; conversation: MQTTConversation }) => void) => {
    mqttClient.on('new_message', callback);
  }, []);

  const offNewMessage = useCallback((callback?: Function) => {
    mqttClient.off('new_message', callback);
  }, []);

  // Gestionnaires d'événements pour les messages lus
  const onMessagesRead = useCallback((callback: (data: { userId: string; conversationId: string; readCount: number }) => void) => {
    mqttClient.on('messages_read', callback);
  }, []);

  const offMessagesRead = useCallback((callback?: Function) => {
    mqttClient.off('messages_read', callback);
  }, []);

  // Gestionnaires d'événements pour les messages supprimés
  const onMessageDeleted = useCallback((callback: (data: { messageId: string; deleteForEveryone: boolean }) => void) => {
    mqttClient.on('message_deleted', callback);
  }, []);

  const offMessageDeleted = useCallback((callback?: Function) => {
    mqttClient.off('message_deleted', callback);
  }, []);

  // Gestionnaires d'événements pour les confirmations d'envoi
  const onMessageSent = useCallback((callback: (data: { messageId: string; conversationId: string; timestamp: string }) => void) => {
    mqttClient.on('message_sent', callback);
  }, []);

  const offMessageSent = useCallback((callback?: Function) => {
    mqttClient.off('message_sent', callback);
  }, []);

  return {
    isConnected,
    sendMessage,
    sendMessageWithAttachment,
    joinConversation,
    leaveConversation,
    markAsRead,
    deleteMessage,
    createConversation,
    onNewMessage,
    onMessagesRead,
    onMessageDeleted,
    onMessageSent,
    offNewMessage,
    offMessagesRead,
    offMessageDeleted,
    offMessageSent,
  };
};
