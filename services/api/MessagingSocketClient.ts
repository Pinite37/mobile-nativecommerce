import { io, Socket } from 'socket.io-client';
import TokenStorageService from '../TokenStorageService';

export interface SocketUser {
  id: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  role?: string;
}

export interface NewMessageData {
  message: any;
  conversation: any;
  sender?: SocketUser;
  timestamp?: Date;
}

export interface MessageNotificationData {
  message: any;
  conversation: any;
  sender: SocketUser;
}

export interface MessagesReadData {
  userId: string;
  conversationId: string;
  readCount: number;
  readAt: Date;
}

export interface MessageDeletedData {
  messageId: string;
  deleteForEveryone: boolean;
  deletedBy: string;
  deletedAt: Date;
}

export interface UserTypingData {
  userId: string;
  user: SocketUser;
  conversationId: string;
  timestamp: Date;
}

export interface UserOnlineData {
  userId: string;
  user: SocketUser;
}

export interface UserOfflineData {
  userId: string;
  user: SocketUser;
  disconnectedAt: Date;
}

class MessagingSocketClient {
  private socket: Socket | null = null;
  private connected: boolean = false;
  private currentConversation: string | null = null;
  private events: { [key: string]: Function[] } = {};

  // Configuration du serveur Socket.IO
  private serverUrl = __DEV__
    ? 'http://192.168.86.143:4000'  // Développement
    : 'https://your-production-server.com'; // Production

  constructor() {
    this.setupEventListeners = this.setupEventListeners.bind(this);
  }

  // === CONNEXION ===

  async connect(): Promise<void> {
    try {
      console.log('🔌 Connexion Socket.IO...');

      const token = await TokenStorageService.getAccessToken();
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      this.socket = io(this.serverUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 5000,
        forceNew: true,
      });

      this.setupEventListeners();

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout de connexion Socket.IO'));
        }, 10000);

        this.socket!.on('connected', (data) => {
          clearTimeout(timeout);
          console.log('✅ Connecté à Socket.IO:', data);
          this.connected = true;
          resolve();
        });

        this.socket!.on('connect_error', (error) => {
          clearTimeout(timeout);
          console.error('❌ Erreur de connexion Socket.IO:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('❌ Erreur lors de la connexion Socket.IO:', error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.socket) {
      console.log('🔌 Déconnexion Socket.IO');
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.currentConversation = null;
    }
  }

  isConnected(): boolean {
    return this.connected && this.socket?.connected === true;
  }

  // === GESTION DES ÉVÉNEMENTS ===

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Nouveau message reçu
    this.socket.on('new_message', (data: NewMessageData) => {
      console.log('💬 Nouveau message:', data);
      this.emit('new_message', data);

      // Marquer automatiquement comme lu si dans la conversation active
      if (this.currentConversation === data.conversation._id) {
        this.markMessagesAsRead(data.conversation._id);
      }
    });

    // Notification de nouveau message
    this.socket.on('new_message_notification', (data: MessageNotificationData) => {
      console.log('🔔 Notification message:', data);
      this.emit('message_notification', data);
    });

    // Accusé de réception d'envoi (ACK)
    this.socket.on('message_sent', (data: any) => {
      console.log('✅ ACK message_sent reçu du serveur:', data);
      this.emit('message_sent', data);
    });

    // Erreur lors de l'envoi
    this.socket.on('message_send_error', (error: any) => {
      console.error('❌ message_send_error reçu du serveur:', error);
      this.emit('message_send_error', error);
    });

    // Messages marqués comme lus
    this.socket.on('messages_read', (data: MessagesReadData) => {
      console.log('👁️ Messages lus:', data);
      this.emit('messages_read', data);
    });

    // Message supprimé
    this.socket.on('message_deleted', (data: MessageDeletedData) => {
      console.log('🗑️ Message supprimé:', data);
      this.emit('message_deleted', data);
    });

    // Utilisateur commence à taper
    this.socket.on('user_typing', (data: UserTypingData) => {
      console.log('✍️ Utilisateur tape:', data);
      this.emit('user_typing', data);
    });

    // Utilisateur arrête de taper
    this.socket.on('user_stop_typing', (data: UserTypingData) => {
      console.log('⏹️ Utilisateur arrête de taper:', data);
      this.emit('user_stop_typing', data);
    });

    // Statut utilisateur en ligne
    this.socket.on('user_online', (data: UserOnlineData) => {
      console.log('🟢 Utilisateur en ligne:', data);
      this.emit('user_online', data);
    });

    // Statut utilisateur hors ligne
    this.socket.on('user_offline', (data: UserOfflineData) => {
      console.log('🔴 Utilisateur hors ligne:', data);
      this.emit('user_offline', data);
    });

    // Erreur
    this.socket.on('error', (error: any) => {
      console.error('❌ Erreur Socket.IO:', error);
      this.emit('socket_error', error);
    });

    // Déconnexion
    this.socket.on('disconnect', () => {
      console.log('🔌 Déconnecté de Socket.IO');
      this.connected = false;
      this.emit('socket_disconnected');
    });
  }

  // === MÉTHODES D'ENVOI ===

  sendMessage(productId: string, text: string, replyTo?: string, conversationId?: string, clientId?: string): void {
    if (!this.isConnected()) {
      console.error('❌ Socket.IO non connecté');
      this.emit('message_send_error', { message: 'Connexion perdue', clientId });
      return;
    }

    console.log('📤 Envoi message via Socket.IO', { productId, hasText: !!text, conversationId, clientId });

    this.socket!.emit('send_message', {
      productId,
      text,
      replyTo,
      conversationId,
      clientId
    });
  }

  sendMessageWithAttachment(
    productId: string,
    text: string,
    attachment: {
      type: 'IMAGE' | 'FILE';
      data: string; // base64
      mimeType: string;
      fileName?: string;
    },
    replyTo?: string,
    conversationId?: string,
    clientId?: string
  ): void {
    if (!this.isConnected()) {
      console.error('❌ Socket.IO non connecté');
      this.emit('message_send_error', { message: 'Connexion perdue', clientId });
      return;
    }

    console.log('📤 Envoi message avec pièce jointe via Socket.IO', {
      productId,
      hasText: !!text,
      messageType: attachment.type,
      conversationId,
      clientId
    });

    this.socket!.emit('send_message', {
      productId,
      text,
      messageType: attachment.type,
      attachment: {
        data: attachment.data,
        mimeType: attachment.mimeType,
        fileName: attachment.fileName
      },
      replyTo,
      conversationId,
      clientId
    });
  }

  joinConversation(conversationId: string): void {
    if (!this.isConnected()) return;

    console.log('🚪 Rejoindre conversation:', conversationId);
    this.currentConversation = conversationId;

    this.socket!.emit('join_conversation', { conversationId });
  }

  leaveConversation(conversationId?: string): void {
    if (!this.isConnected()) return;

    const convId = conversationId || this.currentConversation;
    if (!convId) return;

    console.log('🚪 Quitter conversation:', convId);

    this.socket!.emit('leave_conversation', { conversationId: convId });

    if (this.currentConversation === convId) {
      this.currentConversation = null;
    }
  }

  markMessagesAsRead(conversationId: string): void {
    if (!this.isConnected()) return;

    console.log('👁️ Marquer messages comme lus:', conversationId);
    this.socket!.emit('mark_messages_read', { conversationId });
  }

  deleteMessage(messageId: string, deleteForEveryone: boolean = false): void {
    if (!this.isConnected()) return;

    console.log('🗑️ Supprimer message:', messageId);
    this.socket!.emit('delete_message', { messageId, deleteForEveryone });
  }

  createConversation(productId: string): void {
    if (!this.isConnected()) return;

    console.log('💬 Créer conversation pour produit:', productId);
    this.socket!.emit('create_conversation', { productId });
  }

  startTyping(conversationId: string): void {
    if (!this.isConnected()) return;
    this.socket!.emit('typing_start', { conversationId });
  }

  stopTyping(conversationId: string): void {
    if (!this.isConnected()) return;
    this.socket!.emit('typing_stop', { conversationId });
  }

  getOnlineUsers(): void {
    if (!this.isConnected()) return;
    this.socket!.emit('get_online_users');
  }

  ping(): void {
    if (!this.isConnected()) return;
    this.socket!.emit('ping');
  }

  // === SYSTÈME D'ÉVÉNEMENTS ===

  on(event: string, callback: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback?: Function): void {
    if (!this.events[event]) return;

    if (callback) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    } else {
      delete this.events[event];
    }
  }

  private emit(event: string, data?: any): void {
    if (this.events[event]) {
      this.events[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Erreur dans le callback de l'événement ${event}:`, error);
        }
      });
    }
  }

  // === GETTERS ===

  getCurrentConversation(): string | null {
    return this.currentConversation;
  }
}

// Instance singleton
const messagingSocket = new MessagingSocketClient();

export default messagingSocket;
