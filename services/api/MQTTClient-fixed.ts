import mqtt, { IClientOptions, MqttClient } from 'mqtt';
import { generateClientId, getMQTTConfig } from './MQTTConfig';
import { ensureMQTTPolyfills } from './mqttPolyfills';

ensureMQTTPolyfills();

export interface MQTTMessageData {
  type: 'new_message' | 'messages_read' | 'message_deleted' | 'message_sent';
  message?: any;
  conversation?: any;
  userId?: string;
  conversationId?: string;
  readCount?: number;
  readAt?: string;
  messageId?: string;
  deleteForEveryone?: boolean;
  deletedBy?: string;
  deletedAt?: string;
  timestamp?: string;
}

export interface MQTTUser {
  id: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  role?: string;
}

class MQTTClientService {
  private client: MqttClient | null = null;
  private connected: boolean = false;
  private currentUserId: string | null = null;
  private events: { [key: string]: Function[] } = {};
  private currentConversationId: string | null = null;
  private config = getMQTTConfig();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;

  constructor() {
    this.setupClient();
  }

  private setupClient(): void {
    const clientId = generateClientId();

    const host = this.config.host;
    const port = this.config.port;
    const path = '/mqtt';
    const protocol = this.config.useSSL ? 'wss' : 'ws';
    const url = `${protocol}://${host}:${port}${path}`;

    console.log('🔌 Configuration MQTT (mqtt.js) pour React Native:', {
      url,
      clientId,
      useSSL: this.config.useSSL
    });

    const options: IClientOptions = {
      clean: this.config.clean,
      keepalive: this.config.keepAliveInterval,
      reconnectPeriod: 1000, // 1s entre tentatives par défaut
      connectTimeout: this.config.connectTimeout,
      clientId,
      protocolVersion: 4, // v3.1.1 (plus largement supporté)
      // username: this.config.username, // si besoin
      // password: this.config.password, // si besoin
    };

    this.client = mqtt.connect(url, options);

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      this.onConnect();
    });

    this.client.on('reconnect', () => {
      console.log('🔄 MQTT: Tentative de reconnexion...');
      this.emit('reconnecting');
    });

    this.client.on('close', () => {
      if (this.connected) {
        console.log('📡 MQTT: Connexion fermée');
        this.connected = false;
        this.emit('disconnected');
      }
      // Gestion backoff manuel si besoin
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
      }
    });

    this.client.on('offline', () => {
      console.log('📴 MQTT: Hors ligne');
      this.connected = false;
      this.emit('disconnected');
    });

    this.client.on('error', (err) => {
      console.error('❌ MQTT: Erreur client:', err?.message || err);
      this.emit('error', err);
    });

    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload?.toString?.() ?? String(payload));
    });
  }

  private onConnect(): void {
    console.log('✅ MQTT: Connecté au broker (mqtt.js)');
    this.connected = true;
    this.reconnectAttempts = 0;
    this.emit('connected');

    // Ajouter un délai pour laisser la connexion se stabiliser
    setTimeout(() => {
      if (this.connected && this.client?.connected) {
        if (this.currentUserId) {
          this.subscribeToUserTopics(this.currentUserId);
        }

        if (this.currentConversationId) {
          this.subscribeToConversation(this.currentConversationId);
        }
      } else {
        console.warn('⚠️ MQTT: Connexion perdue avant abonnement aux topics');
      }
    }, 500); // 500ms de délai
  }

  private handleMessage(topic: string, message: string): void {
    try {
      console.log('📨 MQTT: Message reçu sur topic:', topic);

      let data: MQTTMessageData;
      try {
        data = JSON.parse(message);
      } catch (parseError) {
        console.warn('⚠️ MQTT: Message non-JSON reçu:', message, parseError);
        return;
      }

      this.routeMessage(data);
    } catch (error) {
      console.error('❌ MQTT: Erreur traitement message:', error);
    }
  }

  private routeMessage(data: MQTTMessageData): void {
    switch (data.type) {
      case 'new_message':
        this.emit('new_message', data);
        break;
      case 'messages_read':
        this.emit('messages_read', data);
        break;
      case 'message_deleted':
        this.emit('message_deleted', data);
        break;
      case 'message_sent':
        this.emit('message_sent', data);
        break;
      default:
        console.log('📨 MQTT: Type de message inconnu:', data.type);
        this.emit('unknown_message', data);
    }
  }

  // Connexion au broker (attend l'événement connecté)
  async connect(userId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        // Si le client n'existe pas encore, on l'initialise
        this.setupClient();
      }

      if (userId) {
        this.currentUserId = userId;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Timeout de connexion MQTT'));
      }, 10000);

      const onConnected = () => {
        clearTimeout(timeout);
        this.off('connected', onConnected);
        resolve();
      };

      const onError = (error: any) => {
        clearTimeout(timeout);
        this.off('error', onError);
        reject(error);
      };

      this.on('connected', onConnected);
      this.on('error', onError);

      if (this.connected) {
        clearTimeout(timeout);
        this.off('connected', onConnected);
        this.off('error', onError);
        resolve();
      } else if (this.client && (this.client as any).reconnect && !(this.client as any).connecting) {
        // Si non connecté, tenter une reconnexion manuelle si l'implémentation le permet
        try {
          this.client.reconnect();
        } catch {
          // pass
        }
      }
    });
  }

  // Publier un message
  publish(topic: string, message: string | object, qos: 0 | 1 | 2 = 1): void {
    if (!this.client || !this.connected) {
      console.warn('⚠️ MQTT: Client non connecté, impossible de publier');
      return;
    }

    const messageStr = typeof message === 'object' ? JSON.stringify(message) : message;

    this.client.publish(topic, messageStr, { qos }, (err) => {
      if (err) {
        console.error('❌ MQTT: Erreur publication:', err?.message || err);
        this.emit('error', err);
      } else {
        console.log('📤 MQTT: Message publié sur:', topic);
      }
    });
  }

  // S'abonner à un topic avec retry
  private subscribeWithRetry(topic: string, qos: 0 | 1 | 2 = 1, retryCount: number = 0): void {
    if (!this.client || !this.connected) {
      console.warn('⚠️ MQTT: Client non connecté, impossible de s\'abonner à', topic);
      return;
    }

    console.log(`📡 MQTT: Tentative d'abonnement à ${topic} (essai ${retryCount + 1})`);

    this.client.subscribe(topic, { qos }, (err, granted) => {
      if (err) {
        console.error(`❌ MQTT: Erreur abonnement à ${topic}:`, err?.message || err);

        // Retry si c'est une erreur de connexion et qu'on n'a pas dépassé le nombre max de tentatives
        if (retryCount < 3 && (err?.message?.includes('Connection closed') || err?.message?.includes('Not connected'))) {
          console.log(`🔄 MQTT: Retry abonnement à ${topic} dans 1s...`);
          setTimeout(() => {
            this.subscribeWithRetry(topic, qos, retryCount + 1);
          }, 1000);
        } else {
          this.emit('subscription_error', { topic, error: err });
        }
      } else {
        console.log(`✅ MQTT: Abonné au topic: ${topic}`, granted);
      }
    });
  }

  // S'abonner à un topic
  subscribe(topic: string, qos: 0 | 1 | 2 = 1): void {
    this.subscribeWithRetry(topic, qos);
  }

  // Se désabonner d'un topic
  unsubscribe(topic: string): void {
    if (!this.client || !this.connected) {
      console.warn('⚠️ MQTT: Client non connecté, impossible de se désabonner');
      return;
    }

    this.client.unsubscribe(topic, (err) => {
      if (err) {
        console.error('❌ MQTT: Erreur désabonnement:', err?.message || err);
      } else {
        console.log('📡 MQTT: Désabonné du topic:', topic);
      }
    });
  }

  // S'abonner aux topics personnels de l'utilisateur
  private subscribeToUserTopics(userId: string): void {
    const topics = [
      `users/${userId}/messages`,
      `users/${userId}/responses`,
      `users/${userId}/notifications`,
      `users/${userId}/status`
    ];

    topics.forEach(topic => {
      this.subscribe(topic);
    });
  }

  // S'abonner aux topics d'une conversation
  subscribeToConversation(conversationId: string): void {
    if (this.currentConversationId === conversationId) {
      return; // Déjà abonné
    }

    if (this.currentConversationId) {
      this.unsubscribeFromConversation(this.currentConversationId);
    }

    const topics = [
      `conversations/${conversationId}`,
      `conversations/${conversationId}/status`
    ];

    topics.forEach(topic => {
      this.subscribe(topic);
    });

    this.currentConversationId = conversationId;
    console.log('💬 MQTT: Abonné aux topics conversation:', conversationId);
  }

  // Se désabonner d'une conversation
  unsubscribeFromConversation(conversationId?: string): void {
    const convId = conversationId || this.currentConversationId;
    if (!convId) return;

    const topics = [
      `conversations/${convId}`,
      `conversations/${convId}/status`
    ];

    topics.forEach(topic => {
      this.unsubscribe(topic);
    });

    if (this.currentConversationId === convId) {
      this.currentConversationId = null;
    }

    console.log('💬 MQTT: Désabonné des topics conversation:', convId);
  }

  // === MÉTHODES DE MESSAGERIE ===

  sendMessage(
    productId: string,
    text: string,
    replyTo?: string,
    conversationId?: string,
    clientId?: string
  ): void {
    const messageData = {
      type: 'send_message',
      productId,
      text,
      replyTo,
      conversationId,
      clientId,
      userId: this.currentUserId,
      timestamp: new Date().toISOString()
    };

    this.publish('messages/send', messageData);
  }

  sendMessageWithAttachment(
    productId: string,
    text: string,
    replyTo?: string,
    conversationId?: string,
    clientId?: string,
    attachment?: {
      type: 'IMAGE' | 'FILE';
      data: string;
      mimeType: string;
      fileName?: string;
    }
  ): void {
    const messageData = {
      type: 'send_message',
      productId,
      text,
      messageType: attachment?.type,
      attachment: attachment ? {
        data: attachment.data,
        mimeType: attachment.mimeType,
        fileName: attachment.fileName
      } : undefined,
      replyTo,
      conversationId,
      clientId,
      userId: this.currentUserId,
      timestamp: new Date().toISOString()
    };

    this.publish('messages/send', messageData);
  }

  markMessagesAsRead(conversationId: string): void {
    const readData = {
      type: 'mark_read',
      conversationId,
      userId: this.currentUserId,
      timestamp: new Date().toISOString()
    };

    this.publish('messages/send', readData);
  }

  deleteMessage(messageId: string, deleteForEveryone: boolean = false): void {
    const deleteData = {
      type: 'delete_message',
      messageId,
      deleteForEveryone,
      userId: this.currentUserId,
      timestamp: new Date().toISOString()
    };

    this.publish('messages/send', deleteData);
  }

  createConversation(productId: string): void {
    const conversationData = {
      type: 'create_conversation',
      productId,
      userId: this.currentUserId,
      timestamp: new Date().toISOString()
    };

    this.publish('messages/send', conversationData);
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
      this.events[event] = [];
    }
  }

  private emit(event: string, data?: any): void {
    if (this.events[event]) {
      this.events[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('❌ MQTT: Erreur dans callback événement:', error);
        }
      });
    }
  }

  // === GETTERS ===

  isConnected(): boolean {
    return this.connected && this.client?.connected === true;
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  setCurrentUserId(userId: string): void {
    this.currentUserId = userId;
    if (this.connected) {
      this.subscribeToUserTopics(userId);
    }
  }

  disconnect(): void {
    if (this.client) {
      console.log('🔌 MQTT: Déconnexion manuelle');
      // true pour fermer immédiatement et nettoyer les sockets
      this.client.end(true, {}, () => {
        this.connected = false;
        this.currentConversationId = null;
        this.emit('disconnected');
      });
    }
  }

  reconnect(): void {
    if (this.client) {
      console.log('🔄 MQTT: Reconnexion forcée');
      try {
        this.client.reconnect();
      } catch (e) {
        console.warn('⚠️ MQTT: Échec reconnect(), on réinitialise le client', e);
        this.setupClient();
      }
    } else {
      this.setupClient();
    }
  }

  testConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isConnected()) {
        console.log('✅ MQTT: Test de connexion réussi - déjà connecté');
        resolve(true);
        return;
      }

      const timeout = setTimeout(() => {
        console.log('❌ MQTT: Test de connexion échoué - timeout');
        resolve(false);
      }, 5000);

      const onConnected = () => {
        clearTimeout(timeout);
        this.off('connected', onConnected);
        console.log('✅ MQTT: Test de connexion réussi');
        resolve(true);
      };

      const onError = () => {
        clearTimeout(timeout);
        this.off('error', onError);
        console.log('❌ MQTT: Test de connexion échoué - erreur');
        resolve(false);
      };

      this.on('connected', onConnected);
      this.on('error', onError);
    });
  }
}

// Instance singleton
const mqttClient = new MQTTClientService();

export default mqttClient;
