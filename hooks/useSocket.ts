import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import socketService from '../services/socket/SocketService';

/**
 * Hook personnalisé pour gérer Socket.IO
 * Remplace complètement useMQTT
 */
export const useSocket = () => {
  const { user } = useAuth();
  const isInitialized = useRef(false);

  // Initialiser la connexion Socket.IO
  useEffect(() => {
    if (!isInitialized.current && user?._id) {
      console.log('🔌 Initialisation Socket.IO avec utilisateur:', user._id);
      
      socketService.connect(user._id).catch((error) => {
        console.error('❌ Erreur initialisation Socket.IO:', error);
      });
      
      isInitialized.current = true;
    }

    // Cleanup lors du démontage
    return () => {
      if (isInitialized.current) {
        console.log('🧹 Cleanup Socket.IO');
        isInitialized.current = false;
      }
    };
  }, [user?._id]);

  // Événement: nouveau message
  const onNewMessage = useCallback((callback: (data: any) => void) => {
    socketService.on('new_message', callback);
    return () => socketService.off('new_message', callback);
  }, []);

  // Événement: messages lus
  const onMessagesRead = useCallback((callback: (data: any) => void) => {
    socketService.on('messages_read', callback);
    return () => socketService.off('messages_read', callback);
  }, []);

  // Événement: message supprimé
  const onMessageDeleted = useCallback((callback: (data: any) => void) => {
    socketService.on('message_deleted', callback);
    return () => socketService.off('message_deleted', callback);
  }, []);

  // Événement: conversation supprimée
  const onConversationDeleted = useCallback((callback: (data: any) => void) => {
    socketService.on('conversation_deleted', callback);
    return () => socketService.off('conversation_deleted', callback);
  }, []);

  // Événement: utilisateur en train d'écrire
  const onUserTyping = useCallback((callback: (data: any) => void) => {
    socketService.on('user_typing', callback);
    return () => socketService.off('user_typing', callback);
  }, []);

  // Événement: utilisateur a arrêté d'écrire
  const onUserStopTyping = useCallback((callback: (data: any) => void) => {
    socketService.on('user_stop_typing', callback);
    return () => socketService.off('user_stop_typing', callback);
  }, []);

  // Événements de connexion
  const onConnect = useCallback((callback: (data: any) => void) => {
    socketService.on('connect', callback);
    return () => socketService.off('connect', callback);
  }, []);

  const onDisconnect = useCallback((callback: (data: any) => void) => {
    socketService.on('disconnect', callback);
    return () => socketService.off('disconnect', callback);
  }, []);

  const onConnectError = useCallback((callback: (data: any) => void) => {
    socketService.on('connect_error', callback);
    return () => socketService.off('connect_error', callback);
  }, []);

  const onError = useCallback((callback: (data: any) => void) => {
    socketService.on('error', callback);
    return () => socketService.off('error', callback);
  }, []);

  // Rejoindre une conversation
  const joinConversation = useCallback((conversationId: string) => {
    socketService.joinConversation(conversationId);
  }, []);

  // Quitter une conversation
  const leaveConversation = useCallback((conversationId?: string) => {
    socketService.leaveConversation(conversationId);
  }, []);

  // Indiquer qu'on écrit
  const startTyping = useCallback((conversationId: string) => {
    socketService.startTyping(conversationId);
  }, []);

  // Arrêter l'indicateur d'écriture
  const stopTyping = useCallback((conversationId: string) => {
    socketService.stopTyping(conversationId);
  }, []);

  // Vérifier si connecté
  const isConnected = useCallback(() => {
    return socketService.isSocketConnected();
  }, []);

  // Obtenir le statut de connexion
  const getConnectionStatus = useCallback(() => {
    return socketService.getConnectionStatus();
  }, []);

  // Retourner toutes les fonctions et handlers
  return {
    // Événements de messages
    onNewMessage,
    onMessagesRead,
    onMessageDeleted,
    onConversationDeleted,
    
    // Événements de typing
    onUserTyping,
    onUserStopTyping,
    
    // Événements de connexion
    onConnect,
    onDisconnect,
    onConnectError,
    onError,
    
    // Actions
    joinConversation,
    leaveConversation,
    startTyping,
    stopTyping,
    
    // Utilitaires
    isConnected,
    getConnectionStatus,
    reconnect: () => socketService.reconnect(),
  };
};

export default useSocket;
