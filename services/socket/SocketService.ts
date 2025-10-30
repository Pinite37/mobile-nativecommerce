import { Platform } from 'react-native';
import { io, Socket } from 'socket.io-client';
import TokenStorageService from '../TokenStorageService';

interface SocketEventCallback {
  (data: any): void;
}

interface TypingData {
  conversationId: string;
  userId: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  timestamp: string;
}

interface NewMessageData {
  message: any;
  conversation: any;
  recipientId: string;
}

interface MessageDeletedData {
  messageId: string;
  conversationId: string;
  deleteForEveryone: boolean;
  deletedBy: string;
  deletedAt: string;
}

interface MessagesReadData {
  conversationId: string;
  userId: string;
  readCount: number;
  readAt: string;
}

interface ConversationDeletedData {
  conversationId: string;
  deletedBy: string;
  timestamp: string;
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private currentUserId: string | null = null;
  private currentConversationId: string | null = null;
  private eventHandlers: Map<string, SocketEventCallback[]> = new Map();
  private connectionPromise: Promise<void> | null = null;
  private manualDisconnect: boolean = false;

  constructor() {
    console.log('🔌 SocketService initialized');
  }

  /**
   * Classification des erreurs
   */
  private classifyError(error: any): {
    type: 'network' | 'auth' | 'server' | 'timeout' | 'unknown';
    message: string;
    retryable: boolean;
  } {
    const errorMessage = error?.message || error?.toString() || 'Erreur inconnue';

    // Erreurs réseau
    if (errorMessage.includes('Network') || errorMessage.includes('ECONNREFUSED') || 
        errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      return {
        type: 'network',
        message: 'Problème de connexion réseau',
        retryable: true
      };
    }

    // Erreurs d'authentification
    if (errorMessage.includes('auth') || errorMessage.includes('token') || 
        errorMessage.includes('unauthorized') || error?.type === 'UnauthorizedError') {
      return {
        type: 'auth',
        message: 'Erreur d\'authentification',
        retryable: false
      };
    }

    // Erreurs serveur
    if (errorMessage.includes('server') || errorMessage.includes('500') || 
        errorMessage.includes('503')) {
      return {
        type: 'server',
        message: 'Erreur serveur temporaire',
        retryable: true
      };
    }

    // Timeout
    if (errorMessage.includes('timeout')) {
      return {
        type: 'timeout',
        message: 'Délai de connexion dépassé',
        retryable: true
      };
    }

    return {
      type: 'unknown',
      message: errorMessage,
      retryable: true
    };
  }

  /**
   * Connexion au serveur Socket.IO
   */
  async connect(userId?: string): Promise<void> {
    // Éviter les connexions multiples simultanées
    if (this.connectionPromise) {
      console.log('⏳ Connexion Socket.IO déjà en cours...');
      return this.connectionPromise;
    }

    if (this.isConnected && this.socket?.connected) {
      console.log('✅ Socket.IO déjà connecté');
      if (userId) this.currentUserId = userId;
      return Promise.resolve();
    }

    this.connectionPromise = this._performConnection(userId);
    
    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  private async _performConnection(userId?: string): Promise<void> {
    try {
      this.manualDisconnect = false;

      // Récupérer le token JWT
      const token = await TokenStorageService.getAccessToken();
      
      if (!token) {
        console.error('❌ Aucun token trouvé pour la connexion Socket.IO');
        throw new Error('Token manquant');
      }

      // Déconnecter l'ancienne socket si elle existe
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      console.log('🔄 Connexion à Socket.IO...', { userId });

      // URL du serveur - utiliser la même base URL que ApiService
      let serverUrl = 'http://localhost:4000';
      
      if (Platform.OS === 'android') {
        serverUrl = 'http://192.168.86.143:4000';
        // serverUrl = 'http://192.168.0.107:4000';
      } else if (Platform.OS === 'ios') {
        serverUrl = 'http://localhost:4000';
      }

      console.log('🌐 Socket.IO Server URL:', serverUrl);

      // Créer la socket avec configuration optimale
      console.log('🔧 Configuration Socket.IO:', {
        url: serverUrl,
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
      });

      this.socket = io(serverUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 20000, // Augmenté à 20 secondes
        autoConnect: true,
        forceNew: false,
        upgrade: true,
        // Paramètres WebSocket
        path: '/socket.io',
        secure: false,
      });

      if (userId) {
        this.currentUserId = userId;
      }

      // Configuration des événements de connexion
      this._setupConnectionEvents();

      // Attendre la connexion
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout de connexion Socket.IO'));
        }, 15000);

        this.socket!.once('connect', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.socket!.once('connect_error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

    } catch (error: any) {
      console.error('❌ Erreur connexion Socket.IO:', error);
      const classified = this.classifyError(error);
      console.error('Type d\'erreur:', classified.type, '-', classified.message);
      
      // Notifier les listeners d'erreur
      this._emitToHandlers('error', { error, classified });
      
      throw error;
    }
  }

  /**
   * Configuration des événements de connexion
   */
  private _setupConnectionEvents(): void {
    if (!this.socket) return;

    // Connexion réussie
    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connecté - ID:', this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this._emitToHandlers('connect', { socketId: this.socket?.id });
    });

    // Déconnexion
    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO déconnecté:', reason);
      this.isConnected = false;
      this._emitToHandlers('disconnect', { reason });

      // Ne pas reconnecter si déconnexion manuelle
      if (this.manualDisconnect) {
        console.log('Déconnexion manuelle, pas de reconnexion');
        return;
      }

      // Gestion des reconnexions selon la raison
      if (reason === 'io server disconnect') {
        // Le serveur a forcé la déconnexion, reconnecter manuellement
        console.log('🔄 Reconnexion forcée après déconnexion serveur');
        setTimeout(() => this.reconnect(), 1000);
      }
    });

    // Erreur de connexion
    this.socket.on('connect_error', (error) => {
      console.error('❌ Erreur de connexion Socket.IO:', error.message);
      this.reconnectAttempts++;
      
      const classified = this.classifyError(error);
      console.error('Type d\'erreur:', classified.type, '-', classified.message);
      
      this._emitToHandlers('connect_error', { error, classified, attempt: this.reconnectAttempts });

      // Arrêter les tentatives si erreur non retryable ou limite atteinte
      if (!classified.retryable || this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Abandon des tentatives de reconnexion');
        this._emitToHandlers('connection_failed', { error, classified });
      }
    });

    // Confirmation d'authentification
    this.socket.on('connected', (data) => {
      console.log('✅ Socket.IO authentifié:', data);
      this._emitToHandlers('authenticated', data);
    });

    // Erreur d'authentification
    this.socket.on('auth_error', (error) => {
      console.error('❌ Erreur d\'authentification Socket.IO:', error);
      this._emitToHandlers('auth_error', error);
    });

    // Configuration des événements métier
    this._setupBusinessEvents();
  }

  /**
   * Configuration des événements métier (messages, typing, etc.)
   */
  private _setupBusinessEvents(): void {
    if (!this.socket) return;

    // Nouveau message
    this.socket.on('new_message', (data: NewMessageData) => {
      try {
        const convId = typeof data.conversation === 'string' ? data.conversation : data.conversation?._id;
        console.log('📨 SocketService - Message reçu:', {
          conv: convId,
          msg: data.message?._id,
          from: data.message?.sender?._id
        });
        this._emitToHandlers('new_message', data);
      } catch (error) {
        console.error('❌ Erreur traitement new_message:', error);
        this._emitToHandlers('error', { event: 'new_message', error });
      }
    });

    // Message supprimé
    this.socket.on('message_deleted', (data: MessageDeletedData) => {
      try {
        this._emitToHandlers('message_deleted', data);
      } catch (error) {
        console.error('❌ Erreur traitement message_deleted:', error);
        this._emitToHandlers('error', { event: 'message_deleted', error });
      }
    });

    // Messages lus
    this.socket.on('messages_read', (data: MessagesReadData) => {
      try {
        this._emitToHandlers('messages_read', data);
      } catch (error) {
        console.error('❌ Erreur traitement messages_read:', error);
        this._emitToHandlers('error', { event: 'messages_read', error });
      }
    });

    // Conversation supprimée
    this.socket.on('conversation_deleted', (data: ConversationDeletedData) => {
      try {
        this._emitToHandlers('conversation_deleted', data);
      } catch (error) {
        console.error('❌ Erreur traitement conversation_deleted:', error);
        this._emitToHandlers('error', { event: 'conversation_deleted', error });
      }
    });

    // Utilisateur en train d'écrire
    this.socket.on('user_typing', (data: TypingData) => {
      try {
        this._emitToHandlers('user_typing', data);
      } catch (error) {
        console.error('❌ Erreur traitement user_typing:', error);
        this._emitToHandlers('error', { event: 'user_typing', error });
      }
    });

    // Utilisateur a arrêté d'écrire
    this.socket.on('user_stop_typing', (data: TypingData) => {
      try {
        this._emitToHandlers('user_stop_typing', data);
      } catch (error) {
        console.error('❌ Erreur traitement user_stop_typing:', error);
        this._emitToHandlers('error', { event: 'user_stop_typing', error });
      }
    });
  }

  /**
   * Rejoindre une conversation
   */
  joinConversation(conversationId: string): void {
    if (!this.socket || !this.isConnected) {
      console.warn('⚠️ Socket non connecté, impossible de rejoindre la conversation');
      console.warn('   Socket existe:', !!this.socket);
      console.warn('   isConnected:', this.isConnected);
      return;
    }

    try {
      console.log('🚪 SocketService - Rejoindre conversation:', conversationId);
      console.log('   Socket ID:', this.socket.id);
      console.log('   User ID:', this.currentUserId);
      this.socket.emit('join_conversation', conversationId);
      this.currentConversationId = conversationId;
      console.log('✅ SocketService - Émission join_conversation réussie');
    } catch (error) {
      console.error('❌ Erreur lors de la jonction à la conversation:', error);
      this._emitToHandlers('error', { action: 'join_conversation', error });
    }
  }

  /**
   * Quitter une conversation
   */
  leaveConversation(conversationId?: string): void {
    if (!this.socket || !this.isConnected) {
      console.warn('⚠️ Socket non connecté');
      return;
    }

    try {
      const convId = conversationId || this.currentConversationId;
      if (convId) {
        console.log('🚪 Quitter conversation:', convId);
        this.socket.emit('leave_conversation', convId);
        if (convId === this.currentConversationId) {
          this.currentConversationId = null;
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de la sortie de la conversation:', error);
      this._emitToHandlers('error', { action: 'leave_conversation', error });
    }
  }

  /**
   * Indiquer que l'utilisateur est en train d'écrire
   */
  startTyping(conversationId: string): void {
    if (!this.socket || !this.isConnected) return;

    try {
      this.socket.emit('typing_start', { conversationId });
    } catch (error) {
      console.error('❌ Erreur startTyping:', error);
    }
  }

  /**
   * Arrêter l'indicateur d'écriture
   */
  stopTyping(conversationId: string): void {
    if (!this.socket || !this.isConnected) return;

    try {
      this.socket.emit('typing_stop', { conversationId });
    } catch (error) {
      console.error('❌ Erreur stopTyping:', error);
    }
  }

  /**
   * Système d'événements - Écouter un événement
   */
  on(event: string, callback: SocketEventCallback): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
  }

  /**
   * Système d'événements - Se désabonner d'un événement
   */
  off(event: string, callback?: SocketEventCallback): void {
    if (!callback) {
      this.eventHandlers.delete(event);
      return;
    }

    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Émettre un événement aux handlers enregistrés
   */
  private _emitToHandlers(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`❌ Erreur dans le handler de l'événement ${event}:`, error);
        }
      });
    }
  }

  /**
   * Reconnecter manuellement
   */
  async reconnect(): Promise<void> {
    console.log('🔄 Reconnexion Socket.IO...');
    
    if (this.socket) {
      this.socket.connect();
    } else {
      await this.connect(this.currentUserId || undefined);
    }
  }

  /**
   * Vérifier si connecté
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Obtenir l'ID de l'utilisateur courant
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Définir l'ID de l'utilisateur courant
   */
  setCurrentUserId(userId: string): void {
    this.currentUserId = userId;
  }

  /**
   * Obtenir le statut de la connexion
   */
  getConnectionStatus(): {
    connected: boolean;
    socketId?: string;
    userId: string | null;
    currentConversation: string | null;
    reconnectAttempts: number;
  } {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id,
      userId: this.currentUserId,
      currentConversation: this.currentConversationId,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Instance singleton
const socketService = new SocketService();

export default socketService;
