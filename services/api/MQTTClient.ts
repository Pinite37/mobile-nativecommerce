import mqtt, { IClientOptions, MqttClient } from 'mqtt';
import { getMQTTConfig } from './MQTTConfig';
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

  // Anti-duplication et gestion d'état
  private subscribedTopics = new Set<string>();
  private initialSubscriptionsDone = false;
  private subscribeTimer: ReturnType<typeof setTimeout> | null = null;
  private manualDisconnect = false;
  private lastError: string | null = null;
  private connectionStartTime: number | null = null;
  private connectionAttempts: number = 0;
  // Nouvelle stratégie de reconnexion
  private brokerIndex: number = 0; // Gardé mais sans rotation
  private brokerRotationCount: number = 0; // Non utilisé après simplification
  private scheduledReconnectTimer: ReturnType<typeof setTimeout> | null = null; // plus utilisé après simplification
  private lastReconnectReason: string | null = null; // debug léger
  private lastConnectionAttemptAt: number = 0;
  private customReconnectActive: boolean = false; // plus utilisé
  private consecutiveFailures: number = 0; // plus utilisé
  private lastErrorAt: number = 0;
  private lastConnectAt: number = 0;
  // Gestion des décalages d'abonnement pour éviter les boucles de spam lorsque disconnecting persiste
  private subscribeCooldowns = new Map<string, number>(); // topic -> nextAllowedTimestamp
  private firstDeferralAt = new Map<string, number>(); // topic -> first time we saw deferral (disconnecting/reconnecting)
  private disconnectingStartAt: number | null = null; // timestamp quand on a détecté disconnecting
  private pendingSubscriptions = new Set<string>(); // topics à (re)abonner après reconnexion
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;

  // Paramètres calculés de backoff
  private baseDelay = (process.env.EXPO_PUBLIC_MQTT_RECONNECT_DELAY && parseInt(process.env.EXPO_PUBLIC_MQTT_RECONNECT_DELAY, 10)) || 1000;
  private backoffMultiplier = (process.env.EXPO_PUBLIC_MQTT_RECONNECT_MULTIPLIER && parseInt(process.env.EXPO_PUBLIC_MQTT_RECONNECT_MULTIPLIER, 10)) || 2;
  private maxDelay = (process.env.EXPO_PUBLIC_MQTT_MAX_RECONNECT_DELAY && parseInt(process.env.EXPO_PUBLIC_MQTT_MAX_RECONNECT_DELAY, 10)) || 30000;
  private maxAttempts = (process.env.EXPO_PUBLIC_MQTT_MAX_RECONNECT_ATTEMPTS && parseInt(process.env.EXPO_PUBLIC_MQTT_MAX_RECONNECT_ATTEMPTS, 10)) || 10;
  // File d'attente des envois pendant déconnexion
  private outboundQueue: (() => void)[] = [];
  private maxQueueSize = 50;

  private createClientId(extra?: string) {
    // ClientId vraiment unique (horodatage haute résolution + aléatoire + compteur)
    const time = Date.now();
    const rand = Math.random().toString(36).slice(2, 10);
    const attempt = this.reconnectAttempts;
    const user = this.currentUserId ? this.currentUserId.slice(0, 6) : 'anon';
    return `nc-${user}-${time}-${attempt}-${rand}${extra ? '-' + extra : ''}`;
  }

  getClientId(): string | null {
    return (this.client as any)?.options?.clientId || null;
  }

  // Plus de constructeur: initialisation différée jusqu'à la première connexion.

  private cleanupState(): void {
    // Nettoyer les timers
    if (this.subscribeTimer) {
      clearTimeout(this.subscribeTimer);
      this.subscribeTimer = null;
    }

    // Réinitialiser les flags
    this.initialSubscriptionsDone = false;
    this.manualDisconnect = false;
  }

  private resetConnectionState(): void {
    this.connected = false;
    this.reconnectAttempts = 0;
    this.cleanupState();
  }

  private setupClient(forceNewId: boolean = false): void {
    // Éviter de recréer si connexion active
    if (!forceNewId && this.client && (this.client.connected || (this as any).connecting)) {
      return;
    }

  const brokerConfig = ('brokers' in this.config) ? (this.config as any).brokers[0] : this.config;
    const host = brokerConfig.host;
    const port = brokerConfig.port;
    const path = '/mqtt';
    const protocol = brokerConfig.useSSL ? 'wss' : 'ws';
    const url = `${protocol}://${host}:${port}${path}`;
    const clientId = this.createClientId(`${this.brokerIndex}`);

    console.log('🔌 MQTT: Initialisation client', {
      url,
      clientId,
      brokerIndex: this.brokerIndex,
      rotationCount: this.brokerRotationCount,
      reconnectAttempts: this.reconnectAttempts
    });

    // Fermer ancien client proprement si on force
    if (forceNewId && this.client) {
      try { this.client.end(true); } catch {}
    }

    const options: IClientOptions = {
      clean: this.config.clean,
      keepalive: this.config.keepAliveInterval,
      // On désactive le reconnect interne pour gérer notre stratégie personnalisée
  // On laisse mqtt.js gérer la reconnexion automatique simple
  reconnectPeriod: 3000,
      connectTimeout: Math.max(this.config.connectTimeout, 15000),
      clientId,
      protocolVersion: 4,
      resubscribe: true,
      queueQoSZero: true,
      will: {
        topic: 'clients/status',
        payload: JSON.stringify({ clientId, status: 'offline' }),
        qos: 0,
        retain: false
      }
    };

    this.client = mqtt.connect(url, options);
    this.manualDisconnect = false;
  this.customReconnectActive = false;
    this.lastConnectionAttemptAt = Date.now();
    this.connectionAttempts++;

    this.setupEventHandlers();

    // Démarrer watchdog si pas déjà
    if (!this.watchdogTimer) {
      this.watchdogTimer = setInterval(() => {
        this.watchdogCheck();
      }, 4000);
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    // Éviter les handlers dupliqués
    (this.client as any).removeAllListeners?.();

    this.client.on('connect', () => {
      console.log('✅ MQTT: Connecté au broker');
      this.onConnect();
    });

    // L'événement 'reconnect' ne devrait plus être émis (reconnectPeriod=0) mais on garde un log
    this.client.on('reconnect', () => {
      console.log('🔄 MQTT: Reconnexion automatique (mqtt.js)');
    });

    this.client.on('close', () => {
      if (this.manualDisconnect) {
        console.log('🔇 MQTT: Fermeture (manuelle)');
        return;
      }
      this.connected = false;
      this.emit('disconnected');
  // Reset marqueur disconnecting
  this.disconnectingStartAt = null;
    });

    this.client.on('offline', () => {
      if (this.manualDisconnect) return;
      this.connected = false;
      this.emit('disconnected');
  // Reset marqueur disconnecting
  this.disconnectingStartAt = null;
    });

    this.client.on('error', (err) => {
      if (this.manualDisconnect) return;
      const msg = err?.message || String(err);
      console.error('❌ MQTT: Erreur client:', msg);
      this.lastError = msg;
      this.lastErrorAt = Date.now();
      // Gestion spécifique keepalive timeout: forcer une reconnexion propre si état incohérent
      if (/keepalive timeout/i.test(msg)) {
        // Si le client pense encore être connecté ou en train de reconnecter trop longtemps, on repart proprement
        setTimeout(() => {
          const stale = this.client && ((this.client as any).reconnecting || this.client.connected);
          if (stale && !this.manualDisconnect) {
            console.warn('🧪 MQTT: Reset forcé suite à keepalive timeout (état potentiellement bloqué)');
            try { this.client?.end(true); } catch {}
            this.client = null;
            this.connected = false;
            this.subscribedTopics.clear();
            this.initialSubscriptionsDone = false;
            // Recréation rapide avec nouvel ID
            this.setupClient(true);
          }
        }, 500);
      }
      this.emit('error', err);
    });

    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload?.toString?.() ?? String(payload));
    });
  }

  private onConnect(): void {
    console.log('✅ MQTT: Connecté au broker (mqtt.js) - Initialisation des abonnements...');
    this.connected = true;
  this.lastConnectAt = Date.now();
  this.reconnectAttempts = 0;
    this.manualDisconnect = false; // Réinitialiser le flag de déconnexion manuelle
  this.lastReconnectReason = null;
  this.brokerRotationCount = 0; // reset rotation après succès
  this.connectionStartTime = Date.now();
  this.disconnectingStartAt = null; // Clear état disconnecting éventuel

    // Nettoyer les timers existants
    if (this.subscribeTimer) {
      clearTimeout(this.subscribeTimer);
      this.subscribeTimer = null;
    }

    this.emit('connected');

    // Attendre plus longtemps pour s'assurer que la connexion est vraiment stable
    this.subscribeTimer = setTimeout(() => {
      if (!this.connected || !this.client?.connected) {
        console.warn('⚠️ MQTT: Connexion perdue avant abonnement aux topics - annulation');
        return;
      }

      console.log('🚀 MQTT: Démarrage des abonnements automatiques');

      try {
        // Si resubscribe est actif, le client restaure déjà les abonnements.
        // On ne souscrit que les topics manquants, ou la première fois.
        if (this.currentUserId) {
          this.subscribeToUserTopics(this.currentUserId);
        }

        if (this.currentConversationId) {
          this.subscribeToConversation(this.currentConversationId);
        }

        // Traiter les abonnements en attente
        if (this.pendingSubscriptions.size) {
          console.log('📦 MQTT: Application des abonnements en attente:', this.pendingSubscriptions.size);
          Array.from(this.pendingSubscriptions).forEach(t => this.subscribe(t));
          this.pendingSubscriptions.clear();
        }

        this.initialSubscriptionsDone = true;
        console.log('✅ MQTT: Abonnements initiaux terminés avec succès');
        // Flush de la file d'attente
        if (this.outboundQueue.length) {
          console.log(`📤 MQTT: Envoi des messages en attente (${this.outboundQueue.length})`);
          const queue = [...this.outboundQueue];
          this.outboundQueue = [];
          queue.forEach(fn => {
            try { fn(); } catch(e) { console.warn('⚠️ MQTT: Échec envoi différé', e); }
          });
        }
      } catch (error) {
        console.error('❌ MQTT: Erreur lors des abonnements initiaux:', error);
        this.emit('error', error);
      }
    }, 2000); // Augmenté à 2 secondes pour plus de stabilité
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
      // Recréer un client si inexistant ou si précédent semble mort (pas connecté et dernière tentative trop ancienne)
      const now = Date.now();
      const stale = this.client && !this.client.connected && (now - this.lastConnectionAttemptAt) > (this.config.connectTimeout + 2000);
      if (!this.client || stale) {
        if (stale) {
          try { console.log('♻️ MQTT: Client obsolète, recréation...'); this.client?.end(true); } catch {}
        }
        this.setupClient(true);
      }

      if (userId) {
        this.currentUserId = userId;
      }

      const timeout = setTimeout(() => {
  // Si timeout on force une recréation au prochain appel
  console.warn('⏱️ MQTT: Timeout de connexion, marquage client pour recréation');
  try { this.client?.end(true); } catch {}
  this.client = null;
  reject(new Error('Timeout de connexion MQTT'));
      }, 15000);

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
    if (!this.client || !this.connected || (this.client as any)?.disconnecting) {
      console.warn('⚠️ MQTT: Client non connecté ou disconnecting, mise en file d\'attente publication', { topic });
      const msgStr = typeof message === 'object' ? JSON.stringify(message) : message;
      // Enqueue publication
      this.enqueue(() => this.publish(topic, msgStr, qos));
      this.ensureConnected();
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

  // S'abonner avec dédoublonnage + retry
  private subscribeWithRetry(topic: string, qos: 0 | 1 | 2 = 1, retryCount: number = 0): void {
    if (!this.client || !this.connected) {
      console.warn('⚠️ MQTT: Client non connecté, impossible de s\'abonner à', topic);
      return;
    }

    // Si déjà abonné on ignore
    if (this.subscribedTopics.has(topic)) {
      console.log(`ℹ️ MQTT: Abonnement ignoré, déjà abonné à ${topic}`);
      return;
    }

    // Si le client est en phase de reconnexion ou de déconnexion, on diffère
    const reconnecting = (this.client as any)?.reconnecting;
    const disconnecting = (this.client as any)?.disconnecting;
  if (reconnecting || disconnecting) {
      const now = Date.now();
      const cooldown = this.subscribeCooldowns.get(topic) || 0;
      if (now < cooldown) {
        // Ignorer pour éviter le spam de logs et de timers
        return;
      }
      this.subscribeCooldowns.set(topic, now + 600); // 600ms de cooldown
      if (!this.firstDeferralAt.has(topic)) {
        this.firstDeferralAt.set(topic, now);
      }
      const first = this.firstDeferralAt.get(topic)!;
      const waited = now - first;
      console.log(`⏳ MQTT: Abonnement ${topic} différé (${reconnecting ? 'reconnexion' : 'déconnexion'} en cours, attente ${waited}ms)`);
      // Si on est bloqué trop longtemps on tente une action corrective
      if (waited > 5000) {
        console.warn(`🧊 MQTT: Abonnement ${topic} bloqué depuis >5s (état ${reconnecting ? 'reconnecting' : 'disconnecting'}). Tentative de réconciliation.`);
        this.ensureConnected();
      }
      setTimeout(() => this.subscribeWithRetry(topic, qos, retryCount), 700);
      return;
    }

    console.log(`📡 MQTT: Tentative d'abonnement à ${topic} (essai ${retryCount + 1})`);

    this.client.subscribe(topic, { qos }, (err, granted) => {
      if (err) {
        const msg = err?.message || String(err);
        console.error(`❌ MQTT: Erreur abonnement à ${topic}:`, msg);

        // Catégories d'erreurs considérées transitoires
    const isTransient = /Connection closed|Not connected|ECONNRESET|client disconnecting|premature close/i.test(msg) || !this.connected;

        if (isTransient && retryCount < 5) {
          const delay = msg.includes('client disconnecting') ? 500 : 1500;
          console.log(`🔄 MQTT: Retry abonnement à ${topic} dans ${delay}ms... (tentative ${retryCount + 1}/5)`);
          setTimeout(() => {
            if (this.connected && this.client?.connected && !(this.client as any)?.disconnecting) {
              this.subscribeWithRetry(topic, qos, retryCount + 1);
            } else {
              console.warn(`⚠️ MQTT: Retry annulé pour ${topic} - état non stable`);
        // Stocker comme abonnement en attente
        this.pendingSubscriptions.add(topic);
            }
          }, delay);
        } else {
          console.error(`💥 MQTT: Échec définitif abonnement à ${topic} après ${retryCount + 1} tentatives`);
          this.emit('subscription_error', { topic, error: err });
      // Conserver pour tentative future après reconnexion
      this.pendingSubscriptions.add(topic);
        }
      } else {
  this.subscribedTopics.add(topic);
  // Nettoyage des marqueurs de déferral
  this.subscribeCooldowns.delete(topic);
  this.firstDeferralAt.delete(topic);
  console.log(`✅ MQTT: Abonné au topic: ${topic}`, granted);
      }
    });
  }

  // S'abonner à un topic (publique)
  subscribe(topic: string, qos: 0 | 1 | 2 = 1): void {
    // Si pas connectable maintenant, stocker en attente
    if (!this.client || !this.connected || (this.client as any)?.disconnecting) {
      this.pendingSubscriptions.add(topic);
      this.ensureConnected();
      return;
    }
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
        this.subscribedTopics.delete(topic);
        console.log('📡 MQTT: Désabonné du topic:', topic);
      }
    });
  }

  // S'abonner aux topics personnels de l'utilisateur (ne souscrit que les manquants)
  private subscribeToUserTopics(userId: string): void {
    const topics = [
      `users/${userId}/messages`,
      `users/${userId}/responses`,
      `users/${userId}/notifications`,
      `users/${userId}/status`
    ];

    console.log(`👤 MQTT: Vérification abonnements utilisateur ${userId}`);
    topics.forEach(topic => {
      if (!this.subscribedTopics.has(topic)) {
        console.log(`📡 MQTT: Abonnement nécessaire à ${topic}`);
        this.subscribe(topic);
      } else {
        console.log(`ℹ️ MQTT: Déjà abonné à ${topic}`);
      }
    });
  }

  // S'abonner aux topics d'une conversation (ne souscrit que les manquants)
  subscribeToConversation(conversationId: string): void {
    if (!conversationId) return;

    // Si nous sommes déjà positionnés sur cette conversation, s'assurer des abonnements manquants
    if (this.currentConversationId === conversationId) {
      const existingTopics = [
        `conversations/${conversationId}`,
        `conversations/${conversationId}/status`
      ];
      existingTopics.forEach(t => {
        if (!this.subscribedTopics.has(t)) {
          this.subscribe(t);
        }
      });
      return;
    }

    // Désabonnement de l'ancienne si différente
    if (this.currentConversationId && this.currentConversationId !== conversationId) {
      this.unsubscribeFromConversation(this.currentConversationId);
    }

    this.currentConversationId = conversationId;
    console.log('💬 MQTT: Demande d\'abonnement aux topics conversation:', conversationId);
    const topics = [
      `conversations/${conversationId}`,
      `conversations/${conversationId}/status`
    ];
    topics.forEach(t => {
      if (!this.subscribedTopics.has(t)) this.subscribe(t);
    });
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
      if (this.subscribedTopics.has(topic)) {
        this.unsubscribe(topic);
      }
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
    if (!this.isConnected()) {
      console.warn('⚠️ MQTT: Hors ligne, mise en file d\'attente du message');
      const payload = { productId, text, replyTo, conversationId, clientId };
      this.enqueue(() => this.sendMessage(payload.productId, payload.text, payload.replyTo, payload.conversationId, payload.clientId));
      this.ensureConnected();
      return;
    }
    if (!clientId) {
      clientId = this.getClientId() || this.createClientId('msg');
    }
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
    if (!this.isConnected()) {
      console.warn('⚠️ MQTT: Hors ligne, mise en file d\'attente du message (pièce jointe)');
      const cached = { productId, text, replyTo, conversationId, clientId, attachment };
      this.enqueue(() => this.sendMessageWithAttachment(cached.productId, cached.text, cached.replyTo, cached.conversationId, cached.clientId, cached.attachment));
      this.ensureConnected();
      return;
    }
    if (!clientId) {
      clientId = this.getClientId() || this.createClientId('msg');
    }
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
    if (this.currentUserId === userId) {
      // S'assurer que les topics existent
      if (this.connected) {
        this.subscribeToUserTopics(userId);
      }
      return;
    }
    this.currentUserId = userId;
    if (this.connected) {
      this.subscribeToUserTopics(userId);
    }
  }

  disconnect(): void {
    if (this.client) {
      console.log('🔌 MQTT: Déconnexion manuelle');
      this.manualDisconnect = true;

      // Nettoyer l'état
      this.cleanupState();

      // Fermer immédiatement et ne pas tenter de reconnect
      this.client.end(true, {}, () => {
        this.connected = false;
        this.currentConversationId = null;
        this.subscribedTopics.clear(); // Vider la liste des topics abonnés
  this.pendingSubscriptions.clear();
        // Libérer la référence pour forcer une recréation avec nouveau clientId lors d'un prochain connect()
        this.client = null;
        this.emit('disconnected');
      });
    }
  }

  reconnect(): void {
    console.log('🔄 MQTT: Reconnexion forcée');
    if (this.client) {
      try { this.client.reconnect(); } catch {}
    } else {
      this.setupClient(true);
    }
  }

  // Assurer une connexion immédiate si on détecte un état déconnecté
  ensureConnected(): void {
    if (this.isConnected()) return;
    const debug = {
      hasClient: Boolean(this.client),
      clientConnected: this.client?.connected,
      reconnecting: (this.client as any)?.reconnecting,
  disconnecting: (this.client as any)?.disconnecting,
      manualDisconnect: this.manualDisconnect,
      lastError: this.lastError,
      clientId: this.getClientId()
    };
    console.log('🛠️ MQTT.ensureConnected()', debug);

    // Réconciliation: si mqtt.js dit connected mais notre flag interne pas encore mis à jour
    if (this.client?.connected && !this.connected && !this.manualDisconnect) {
      console.warn('🔧 MQTT: Réconciliation état - client.connected=true mais internal connected=false. Forçage emit connected.');
      this.connected = true;
      this.emit('connected');
  // Après réconciliation, revérifier les abonnements (peut être vide)
  this.ensureSubscriptions();
    }

    // Détection d'un état bloqué (reconnecting très prolongé sans nouvel onConnect)
    const now = Date.now();
    if (this.client && (this.client as any).reconnecting) {
      const sinceError = this.lastErrorAt ? now - this.lastErrorAt : 0;
      if (sinceError > 12000) { // 12s en état reconnecting -> reset
        console.warn('🧊 MQTT: État reconnecting prolongé, reset forcé du client');
        try { this.client.end(true); } catch {}
        this.client = null;
        this.connected = false;
      }
    }

    if (this.client) {
      // Gestion d'un état disconnecting prolongé
      if ((this.client as any)?.disconnecting) {
        if (this.disconnectingStartAt == null) this.disconnectingStartAt = Date.now();
        const elapsed = Date.now() - this.disconnectingStartAt;
        if (elapsed > 4000) {
          console.warn('🧯 MQTT: État disconnecting >4s, reset client');
          this.forceReset('stuck-disconnecting');
          return;
        }
      } else {
        this.disconnectingStartAt = null;
      }
      try { this.client.reconnect(); } catch (e) { console.warn('⚠️ MQTT: reconnect() a échoué, recréation', e); this.setupClient(true); }
    } else {
      this.setupClient(true);
    }
  }

  private enqueue(fn: () => void) {
    if (this.outboundQueue.length >= this.maxQueueSize) {
      // Drop le plus ancien pour éviter croissance infinie
      this.outboundQueue.shift();
    }
    this.outboundQueue.push(fn);
  }

  private rotateBroker(): void { /* rotation désactivée */ }

  private computeBackoffDelay(): number { return 3000; }

  private scheduleReconnect(): void { /* plus utilisé - reconnectPeriod gère */ }

  // Diagnostic de la stratégie de reconnexion
  getReconnectPlan() {
    return {
      reconnectAttempts: this.reconnectAttempts,
      lastReason: this.lastReconnectReason,
      nextDelayEstimate: 3000,
      brokerIndex: this.brokerIndex
    };
  }

  // Méthode pour vérifier et restaurer les abonnements si nécessaire
  private ensureSubscriptions(): void {
    if (!this.connected || !this.client?.connected) {
      console.warn('⚠️ MQTT: Impossible de vérifier les abonnements - client non connecté');
      return;
    }

    console.log('🔍 MQTT: Vérification des abonnements...');

    if (this.currentUserId) {
      this.subscribeToUserTopics(this.currentUserId);
    }

    if (this.currentConversationId) {
      this.subscribeToConversation(this.currentConversationId);
    }

    // Appliquer les pending si encore présents
    if (this.pendingSubscriptions.size) {
      console.log('📦 MQTT: ensureSubscriptions applique pending topics:', this.pendingSubscriptions.size);
      Array.from(this.pendingSubscriptions).forEach(t => this.subscribe(t));
    }
  }

  testConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isConnected()) {
        console.log('✅ MQTT: Test de connexion réussi - déjà connecté');
        // Vérifier que les abonnements sont bien en place
        this.ensureSubscriptions();
        resolve(true);
        return;
      }

      console.log('🔍 MQTT: Test de connexion en cours...');

      const timeout = setTimeout(() => {
        console.log('❌ MQTT: Test de connexion échoué - timeout');
        resolve(false);
      }, 10000); // Augmenté à 10 secondes

      const onConnected = () => {
        clearTimeout(timeout);
        this.off('connected', onConnected);
        console.log('✅ MQTT: Test de connexion réussi');
        resolve(true);
      };

      const onError = (error: any) => {
        clearTimeout(timeout);
        this.off('error', onError);
        console.log('❌ MQTT: Test de connexion échoué - erreur:', error?.message || error);
        resolve(false);
      };

      this.on('connected', onConnected);
      this.on('error', onError);

      // Si pas connecté, essayer de se connecter
      if (!this.connected && this.client) {
        try {
          this.client.reconnect();
        } catch (e) {
          console.warn('⚠️ MQTT: Impossible de reconnecter pour le test', e);
        }
      }
    });
  }

  // Méthode publique pour vérifier les abonnements
  checkSubscriptions(): void {
    this.ensureSubscriptions();
  }

  // Getter pour connaître l'état des abonnements
  getSubscribedTopics(): string[] {
    return Array.from(this.subscribedTopics);
  }

  // Méthode de diagnostic pour déboguer les problèmes de connexion
  getConnectionStatus(): {
    connected: boolean;
    clientConnected: boolean;
    currentUserId: string | null;
    currentConversationId: string | null;
    subscribedTopicsCount: number;
    subscribedTopics: string[];
    reconnectAttempts: number;
    manualDisconnect: boolean;
    initialSubscriptionsDone: boolean;
    queuedMessages: number;
    clientId?: string | null;
    lastError?: string | null;
  } {
    return {
      connected: this.connected,
      clientConnected: this.client?.connected || false,
      currentUserId: this.currentUserId,
      currentConversationId: this.currentConversationId,
      subscribedTopicsCount: this.subscribedTopics.size,
      subscribedTopics: Array.from(this.subscribedTopics),
      reconnectAttempts: this.reconnectAttempts,
      manualDisconnect: this.manualDisconnect,
      initialSubscriptionsDone: this.initialSubscriptionsDone,
      queuedMessages: this.outboundQueue.length,
      clientId: this.getClientId(),
      lastError: this.lastError,
    };
  }

  debugSnapshot(label: string = 'snapshot') {
    console.log('🐞 MQTT Snapshot:', label, this.getConnectionStatus());
  }

  private watchdogCheck() {
    if (this.manualDisconnect) return;
    const c = this.client as any;
    if (!this.client) return;
    // Stuck disconnecting
    if (c?.disconnecting) {
      if (this.disconnectingStartAt == null) this.disconnectingStartAt = Date.now();
      const elapsed = Date.now() - this.disconnectingStartAt;
      if (elapsed > 6000) {
        console.warn('🛟 MQTT: Watchdog reset (disconnecting >6s)');
        this.forceReset('watchdog-disconnecting');
        return;
      }
    }
    // Stuck neither connected nor reconnecting for >10s since last attempt
    const now = Date.now();
    if (!this.connected && !c?.reconnecting && !c?.disconnecting && (now - this.lastConnectionAttemptAt) > 10000) {
      console.warn('🛟 MQTT: Watchdog detecte un client inactif, reset');
      this.forceReset('watchdog-inactive');
    }
  }

  private forceReset(reason: string) {
    console.warn('♻️ MQTT: forceReset()', reason);
    try { this.client?.end(true); } catch {}
    this.client = null;
    this.connected = false;
    this.subscribedTopics.clear();
    this.pendingSubscriptions.clear();
    this.initialSubscriptionsDone = false;
    this.disconnectingStartAt = null;
    this.lastError = reason;
    setTimeout(() => this.setupClient(true), 200);
  }

  // Méthode de diagnostic complète pour tester la connexion
  async diagnoseConnection(): Promise<{
    connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
    brokerInfo: string;
    lastError?: string;
    subscribedTopics: string[];
    connectionAttempts: number;
    uptime: number;
  }> {
    const isProduction = process.env.NODE_ENV === 'production';
    let brokerConfig;

    if (!isProduction && 'brokers' in this.config) {
      brokerConfig = this.config.brokers.sort((a, b) => a.priority - b.priority)[0];
    } else {
      brokerConfig = this.config as any;
    }

    const currentTime = Date.now();

    let connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error' = 'disconnected';
    if (this.connected && this.client?.connected) {
      connectionStatus = 'connected';
    } else if (this.client?.reconnecting) {
      connectionStatus = 'connecting';
    } else if (this.lastError) {
      connectionStatus = 'error';
    }

    return {
      connectionStatus,
      brokerInfo: `${brokerConfig.useSSL ? 'wss' : 'ws'}://${brokerConfig.host}:${brokerConfig.port}`,
      lastError: this.lastError || undefined,
      subscribedTopics: Array.from(this.subscribedTopics),
      connectionAttempts: this.connectionAttempts,
      uptime: this.connectionStartTime ? currentTime - this.connectionStartTime : 0
    };
  }

  // Méthode pour tester un abonnement spécifique
  async testSubscription(topic: string, timeout: number = 5000): Promise<{
    success: boolean;
    error?: string;
    timeToSubscribe?: number;
  }> {
    const startTime = Date.now();

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          error: 'Subscription timeout',
          timeToSubscribe: Date.now() - startTime
        });
      }, timeout);

      try {
        this.client?.subscribe(topic, { qos: 1 }, (err) => {
          clearTimeout(timeoutId);
          if (err) {
            resolve({
              success: false,
              error: err.message,
              timeToSubscribe: Date.now() - startTime
            });
          } else {
            this.subscribedTopics.add(topic);
            resolve({
              success: true,
              timeToSubscribe: Date.now() - startTime
            });
          }
        });
      } catch (error) {
        clearTimeout(timeoutId);
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timeToSubscribe: Date.now() - startTime
        });
      }
    });
  }
}

// Instance singleton
const mqttClient = new MQTTClientService();

export default mqttClient;
