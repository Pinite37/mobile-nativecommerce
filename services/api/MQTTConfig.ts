// Configuration MQTT pour l'application
export const MQTT_CONFIG = {
    // Configuration de développement avec fallback
  development: {
    // Brokers de secours (testés pour leur stabilité)
    brokers: [
      // On se limite à un seul broker stable pour réduire les reconnections / rotations
      {
        host: process.env.EXPO_PUBLIC_MQTT_HOST || 'broker.emqx.io',
        port: parseInt(process.env.EXPO_PUBLIC_MQTT_PORT || '8084'),
        protocol: 'ws',
        useSSL: true,
        priority: 1
      }
    ],
    clean: true,
    reconnect: true,
    keepAliveInterval: parseInt(process.env.EXPO_PUBLIC_MQTT_KEEP_ALIVE_INTERVAL || '30'),
    connectTimeout: parseInt(process.env.EXPO_PUBLIC_MQTT_CONNECTION_TIMEOUT || '15000'),
    username: process.env.EXPO_PUBLIC_MQTT_USERNAME,
    password: process.env.EXPO_PUBLIC_MQTT_PASSWORD,
  },

  // Configuration de production
  production: {
    host: process.env.EXPO_PUBLIC_MQTT_HOST || 'localhost',
    port: parseInt(process.env.EXPO_PUBLIC_MQTT_PORT || '8083'),
    protocol: 'ws',
    useSSL: false,
    clean: true,
    reconnect: true,
    keepAliveInterval: parseInt(process.env.EXPO_PUBLIC_MQTT_KEEP_ALIVE_INTERVAL || '60'),
    connectTimeout: parseInt(process.env.EXPO_PUBLIC_MQTT_CONNECTION_TIMEOUT || '10000'),
  },

  // Topics MQTT
  topics: {
    // Topics utilisateur
    userMessages: (userId: string) => `users/${userId}/messages`,
    userResponses: (userId: string) => `users/${userId}/responses`,
    userNotifications: (userId: string) => `users/${userId}/notifications`,
    userStatus: (userId: string) => `users/${userId}/status`,

    // Topics conversation
    conversation: (conversationId: string) => `conversations/${conversationId}`,
    conversationStatus: (conversationId: string) => `conversations/${conversationId}/status`,

    // Topics serveur (envoi vers backend)
    sendMessage: 'messages/send',
    serverMessages: 'server/messages',
    serverMessagesRead: 'server/messages/read',
    serverMessagesDelete: 'server/messages/delete',
    serverConversations: 'server/conversations',
  },

  // QoS (Quality of Service)
  qos: {
    atMostOnce: 0,    // Au plus une fois (pas de garantie)
    atLeastOnce: 1,   // Au moins une fois (garantie de livraison)
    exactlyOnce: 2,   // Exactement une fois (garantie de livraison unique)
  },

  // Options de reconnexion
  reconnect: {
    maxAttempts: parseInt(process.env.EXPO_PUBLIC_MQTT_MAX_RECONNECT_ATTEMPTS || '10'),
    initialDelay: parseInt(process.env.EXPO_PUBLIC_MQTT_RECONNECT_DELAY || '1000'),
    maxDelay: parseInt(process.env.EXPO_PUBLIC_MQTT_MAX_RECONNECT_DELAY || '30000'),
    backoffMultiplier: parseInt(process.env.EXPO_PUBLIC_MQTT_RECONNECT_MULTIPLIER || '2'),
  },

  // Timeouts
  timeouts: {
    connection: 10000,
    message: 5000,
    heartbeat: 60000,
  },
};

// Fonction pour obtenir la configuration selon l'environnement
export const getMQTTConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  return isDevelopment ? MQTT_CONFIG.development : MQTT_CONFIG.production;
};

// Fonction pour générer un client ID unique
export const generateClientId = (prefix: string = 'nativecommerce-mobile') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timestamp}-${random}`;
};

export default MQTT_CONFIG;
