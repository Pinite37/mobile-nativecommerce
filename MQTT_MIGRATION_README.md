# Migration vers MQTT - Remplacement de Socket.IO

## Vue d'ensemble

Ce document explique la migration de Socket.IO vers MQTT (EMQX) dans l'application React Native NativeCommerce.

## Architecture MQTT

### Client MQTT (`MQTTClient.ts`)
- Utilise `react_native_mqtt` avec Paho MQTT
- Se connecte automatiquement au broker EMQX au démarrage
- Gère les topics pour les messages, conversations et notifications
- Supporte la reconnexion automatique

### Topics MQTT

#### Topics utilisateur
- `users/{userId}/messages` - Messages personnels
- `users/{userId}/notifications` - Notifications
- `users/{userId}/status` - Statuts utilisateur

#### Topics conversation
- `conversations/{conversationId}` - Nouveaux messages
- `conversations/{conversationId}/status` - Statuts (lu, supprimé)

#### Topics serveur
- `server/messages` - Envoi de messages
- `server/messages/read` - Marquage comme lu
- `server/messages/delete` - Suppression de messages
- `server/conversations` - Création de conversations

## Configuration

### Développement
```typescript
// Connexion à broker.emqx.io (port 8084 WebSocket)
host: "broker.emqx.io"
port: 8084
useSSL: true
```

### Production
```typescript
// Connexion au broker local
host: "localhost" // ou votre serveur EMQX
port: 8083       // ou 1883 pour MQTT pur
useSSL: false
```

## Utilisation

### Hook `useMQTT`
```typescript
import { useMQTT } from '../hooks/useMQTT';

const MyComponent = () => {
  const {
    isConnected,
    sendMessage,
    joinConversation,
    markAsRead,
    onNewMessage
  } = useMQTT();

  // Écouter les nouveaux messages
  onNewMessage((data) => {
    console.log('Nouveau message:', data);
  });

  // Rejoindre une conversation
  joinConversation('conversationId');

  // Envoyer un message
  sendMessage('productId', 'Hello World!');
};
```

### Client MQTT direct
```typescript
import mqttClient from '../services/api/MQTTClient';

// Se connecter
await mqttClient.connect();

// Écouter les événements
mqttClient.on('new_message', (data) => {
  console.log('Nouveau message:', data);
});

// Publier un message
mqttClient.publish('topic', { message: 'Hello' });
```

## Événements MQTT

### Messages
- `new_message` - Nouveau message reçu
- `messages_read` - Messages marqués comme lus
- `message_deleted` - Message supprimé

### Connexion
- `connected` - Connexion établie
- `disconnected` - Connexion perdue
- `error` - Erreur de connexion

### Notifications
- `notification` - Nouvelle notification

## Intégration dans l'application

### 1. Initialisation
L'initialisation MQTT se fait automatiquement via le hook `useMQTT` dans les composants qui en ont besoin.

### 2. Gestion des conversations
- Le hook `useMQTT` gère automatiquement l'abonnement/désabonnement aux topics de conversation
- Les messages sont automatiquement synchronisés via MQTT

### 3. Notifications
- Le `NotificationService` écoute les événements MQTT pour les notifications
- Les notifications push sont affichées quand l'app n'est pas au premier plan

## Avantages de MQTT vs Socket.IO

1. **Plus léger** : Protocole optimisé pour IoT et mobile
2. **Meilleure gestion de la batterie** : Connexion persistante efficace
3. **Scalabilité** : Supporte des milliers de connexions simultanées
4. **Fiabilité** : Mécanismes de QoS et reconnexion automatique
5. **Sécurité** : Authentification JWT intégrée

## Dépannage

### Problèmes de connexion
1. Vérifier que le broker EMQX est accessible
2. Vérifier les credentials et permissions
3. Vérifier les ports (8083/8084 pour WebSocket, 1883/8883 pour MQTT)

### Messages non reçus
1. Vérifier l'abonnement aux topics corrects
2. Vérifier les permissions utilisateur
3. Vérifier les logs du broker EMQX

### Performance
1. Utiliser QoS 1 pour garantir la livraison
2. Implémenter un cache local pour les messages
3. Optimiser les topics (éviter les wildcards excessifs)

## Migration depuis Socket.IO

### Fichiers modifiés
- `MQTTClient.ts` - Nouveau client MQTT
- `useMQTT.ts` - Hook mis à jour
- `NotificationService.ts` - Intégration MQTT
- `messages/index.tsx` - Remplacement Socket.IO par MQTT
- `MQTTInitializer.ts` - Initialisation automatique

### Changements à effectuer
1. ✅ Installer `react_native_mqtt` et `paho-mqtt`
2. ✅ Créer le nouveau client MQTT
3. ✅ Mettre à jour les hooks et services
4. ✅ Remplacer les références Socket.IO
5. ✅ Tester la connectivité MQTT

## Configuration EMQX

### Broker de développement (broker.emqx.io)
- Gratuit pour les tests
- Port WebSocket: 8084
- SSL: requis

### Broker de production
```bash
# Installation EMQX
docker run -d --name emqx -p 1883:1883 -p 8083:8083 -p 8084:8084 -p 8883:8883 emqx/emqx

# Configuration authentification
# Ajouter dans emqx.conf:
allow_anonymous = false
auth.jwt.secret = your-jwt-secret
```

## Sécurité

1. **Authentification JWT** : Tokens validés par le broker
2. **Chiffrement** : Connexions SSL/TLS en production
3. **Autorisation** : Topics protégés par utilisateur
4. **Audit** : Logs des connexions et messages

## Monitoring

### Métriques importantes
- Nombre de connexions actives
- Taux de livraison des messages
- Latence des messages
- Taux d'erreur de connexion

### Outils de monitoring
- Dashboard EMQX
- Logs applicatifs
- Métriques React Native (batterie, mémoire)
