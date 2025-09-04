import Paho from 'paho-mqtt';
import { generateClientId, getMQTTConfig } from './MQTTConfig';

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
  private client: Paho.Client | null = null;
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

    // Configuration pour React Native avec Paho MQTT
    const host = this.config.host;
    const port = this.config.port;
    const path = '/mqtt';

    console.log('🔌 Configuration MQTT Paho pour React Native:', {
      host,
      port,
      path,
      clientId,
      useSSL: this.config.useSSL
    });

    // Créer le client Paho MQTT
    this.client = new Paho.Client(host, port, path, clientId);

    // Configuration des options de connexion
    this.client.connect({
      onSuccess: this.onConnect.bind(this),
      onFailure: this.onFailure.bind(this),
      keepAliveInterval: this.config.keepAliveInterval,
      cleanSession: this.config.clean,
      useSSL: this.config.useSSL,
      reconnect: true,
      timeout: this.config.connectTimeout / 1000, // Convertir en secondes
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    // Gestionnaire de connexion
    this.client.onConnectionLost = (responseObject) => {
      console.log('📡 MQTT: Connexion perdue:', responseObject.errorMessage);
      this.connected = false;
      this.emit('disconnected', responseObject);

      // Tentative de reconnexion automatique
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`🔄 MQTT: Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        setTimeout(() => {
          this.client?.connect({
            onSuccess: this.onConnect.bind(this),
            onFailure: this.onFailure.bind(this),
            keepAliveInterval: this.config.keepAliveInterval,
            cleanSession: this.config.clean,
            useSSL: this.config.useSSL,
            reconnect: true,
            timeout: this.config.connectTimeout / 1000,
          });
        }, 1000 * this.reconnectAttempts);
      }
    };

    // Gestionnaire de messages
    this.client.onMessageArrived = (message) => {
      this.handleMessage(message.destinationName, message.payloadString);
    };
  }

  private onConnect(): void {
    console.log('✅ MQTT: Connecté au broker avec Paho');
    this.connected = true;
    this.reconnectAttempts = 0;
    this.emit('connected');

    // S'abonner aux topics utilisateur si on a un userId
    if (this.currentUserId) {
      this.subscribeToUserTopics(this.currentUserId);
    }

    // S'abonner à la conversation actuelle si elle existe
    if (this.currentConversationId) {
      this.subscribeToConversation(this.currentConversationId);
    }
  }

  private onFailure(responseObject: any): void {
    console.error('❌ MQTT: Échec de connexion:', responseObject.errorMessage);
    this.connected = false;
    this.emit('error', responseObject);
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

      // Router le message selon son type
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

  // Connexion au broker
  async connect(userId?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('Client MQTT non initialisé'));
        return;
      }

      if (userId) {
        this.currentUserId = userId;
      }

      // Le client se connecte automatiquement grâce aux options de reconnexion
      // On attend juste la connexion
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

      // Si déjà connecté, résoudre immédiatement
      if (this.connected) {
        clearTimeout(timeout);
        this.off('connected', onConnected);
        this.off('error', onError);
        resolve();
      }
    });
  }

  // Publier un message
  publish(topic: string, message: string | object, qos: number = 1): void {
    if (!this.client || !this.connected) {
      console.warn('⚠️ MQTT: Client non connecté, impossible de publier');
      return;
    }

    const messageStr = typeof message === 'object' ? JSON.stringify(message) : message;

    const mqttMessage = new Paho.Message(messageStr);
    mqttMessage.destinationName = topic;
    mqttMessage.qos = qos as Paho.Qos;

    this.client.send(mqttMessage);
    console.log('📤 MQTT: Message publié sur:', topic);
  }

  // S'abonner à un topic
  subscribe(topic: string, qos: number = 1): void {
    if (!this.client || !this.connected) {
      console.warn('⚠️ MQTT: Client non connecté, impossible de s\'abonner');
      return;
    }

    this.client.subscribe(topic, {
      qos: qos as Paho.Qos,
      onSuccess: () => {
        console.log('📡 MQTT: Abonné au topic:', topic);
      },
      onFailure: (responseObject) => {
        console.error('❌ MQTT: Erreur abonnement:', responseObject.errorMessage);
      }
    });
  }

  // Se désabonner d'un topic
  unsubscribe(topic: string): void {
    if (!this.client || !this.connected) {
      console.warn('⚠️ MQTT: Client non connecté, impossible de se désabonner');
      return;
    }

    this.client.unsubscribe(topic, {
      onSuccess: () => {
        console.log('📡 MQTT: Désabonné du topic:', topic);
      },
      onFailure: (responseObject) => {
        console.error('❌ MQTT: Erreur désabonnement:', responseObject.errorMessage);
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

    // Se désabonner de l'ancienne conversation si nécessaire
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

  // Envoyer un message texte
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

  // Envoyer un message avec pièce jointe
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

  // Marquer les messages comme lus
  markMessagesAsRead(conversationId: string): void {
    const readData = {
      type: 'mark_read',
      conversationId,
      userId: this.currentUserId,
      timestamp: new Date().toISOString()
    };

    this.publish('messages/send', readData);
  }

  // Supprimer un message
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

  // Créer une conversation
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
    return this.connected && this.client?.isConnected() === true;
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
      this.client.disconnect();
      this.connected = false;
      this.currentConversationId = null;
    }
  }

  // Méthode pour forcer la reconnexion
  reconnect(): void {
    if (this.client) {
      console.log('🔄 MQTT: Reconnexion forcée');
      this.client.connect({
        onSuccess: this.onConnect.bind(this),
        onFailure: this.onFailure.bind(this),
        keepAliveInterval: this.config.keepAliveInterval,
        cleanSession: this.config.clean,
        useSSL: this.config.useSSL,
        reconnect: true,
        timeout: this.config.connectTimeout / 1000,
      });
    }
  }

  // Test de connexion simple
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
