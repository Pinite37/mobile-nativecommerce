# Migration MQTT → Socket.IO 🚀

## 📋 Vue d'ensemble

Ce document décrit la migration complète de MQTT vers Socket.IO pour la communication en temps réel dans l'application NativeCommerce Mobile.

## ✅ Raisons de la migration

1. **Meilleure compatibilité React Native** - Socket.IO est mieux supporté
2. **Gestion simplifiée des connexions** - Reconnexion automatique native
3. **Performance améliorée** - Moins de latence, meilleure stabilité
4. **Backend unifié** - Socket.IO + Redis remplace MQTT
5. **Debugging facilité** - Meilleurs outils de diagnostic

## 📦 Dépendances

### Supprimées ❌
- `mqtt`
- `paho-mqtt`
- `react_native_mqtt`
- `@types/paho-mqtt`
- `react-native-tcp-socket`

### Ajoutées ✅
- `socket.io-client@^4.8.1` (déjà installé)

## 🗂️ Nouveaux fichiers créés

### 1. Service Socket.IO
**Fichier:** `/services/socket/SocketService.ts`

Service principal gérant:
- Connexion/déconnexion avec authentification JWT
- Gestion automatique des reconnexions
- Classification des erreurs (réseau, auth, serveur, timeout)
- Système d'événements robuste
- Gestion des conversations (join/leave)
- Indicateurs de typing (startTyping/stopTyping)

**Fonctionnalités clés:**
```typescript
// Connexion
await socketService.connect(userId);

// Rejoindre une conversation
socketService.joinConversation(conversationId);

// Écouter les événements
socketService.on('new_message', (data) => {
  console.log('Nouveau message:', data);
});

// Indicateur d'écriture
socketService.startTyping(conversationId);
socketService.stopTyping(conversationId);
```

### 2. Hook personnalisé
**Fichier:** `/hooks/useSocket.ts`

Hook React pour utiliser Socket.IO facilement:
```typescript
const {
  onNewMessage,
  onMessagesRead,
  onUserTyping,
  joinConversation,
  leaveConversation,
  startTyping,
  stopTyping,
  isConnected,
} = useSocket();
```

### 3. Context Provider
**Fichier:** `/contexts/SocketContext.tsx`

Context React pour l'état global de la connexion:
```typescript
const { isConnected, connectionStatus, error } = useSocketContext();
```

## 🔄 Fichiers à migrer

### Fichiers utilisant MQTT à remplacer:

1. **`/hooks/useMQTT.ts`** → Remplacé par `/hooks/useSocket.ts`
2. **`/contexts/MQTTContext.tsx`** → Remplacé par `/contexts/SocketContext.tsx`
3. **`/services/api/MQTTClient.ts`** → Remplacé par `/services/socket/SocketService.ts`
4. **Tous les fichiers dans `/services/api/` liés à MQTT:**
   - `MQTTConfig.ts`
   - `MQTTInitializer.ts`
   - `MQTTInitializerService.ts`
   - `mqttPolyfills.ts`
   - `MQTTUsageExample.ts`

## 📝 Guide de migration par composant

### Étape 1: Remplacer les imports

**Avant (MQTT):**
```typescript
import { useMQTT } from '../hooks/useMQTT';
```

**Après (Socket.IO):**
```typescript
import { useSocket } from '../hooks/useSocket';
```

### Étape 2: Remplacer les appels de hooks

**Avant (MQTT):**
```typescript
const { onNewMessage, onMessagesRead, offNewMessage, offMessagesRead } = useMQTT();
```

**Après (Socket.IO):**
```typescript
const { onNewMessage, onMessagesRead } = useSocket();
```

### Étape 3: Mettre à jour les écouteurs d'événements

**Avant (MQTT):**
```typescript
useEffect(() => {
  const handler = (data: any) => {
    console.log('Nouveau message:', data);
  };
  
  onNewMessage(handler);
  
  return () => {
    offNewMessage(handler);
  };
}, [onNewMessage, offNewMessage]);
```

**Après (Socket.IO):**
```typescript
useEffect(() => {
  const cleanup = onNewMessage((data: any) => {
    console.log('Nouveau message:', data);
  });
  
  return cleanup; // Retourne directement la fonction de nettoyage
}, [onNewMessage]);
```

### Étape 4: Rejoindre/Quitter une conversation

**Avant (MQTT):**
```typescript
// MQTT gérait les topics automatiquement
// Pas d'action explicite nécessaire
```

**Après (Socket.IO):**
```typescript
const { joinConversation, leaveConversation } = useSocket();

useEffect(() => {
  joinConversation(conversationId);
  
  return () => {
    leaveConversation(conversationId);
  };
}, [conversationId, joinConversation, leaveConversation]);
```

### Étape 5: Indicateur de typing (nouveau!)

**Socket.IO (nouveau):**
```typescript
const { startTyping, stopTyping, onUserTyping, onUserStopTyping } = useSocket();

// Quand l'utilisateur commence à écrire
const handleTextChange = (text: string) => {
  setText(text);
  if (text.length > 0) {
    startTyping(conversationId);
  } else {
    stopTyping(conversationId);
  }
};

// Écouter quand l'autre utilisateur écrit
useEffect(() => {
  const cleanup = onUserTyping((data) => {
    if (data.conversationId === conversationId && data.userId !== currentUserId) {
      setOtherUserTyping(true);
    }
  });
  
  return cleanup;
}, [onUserTyping, conversationId]);
```

## 🎯 Fichiers à modifier en priorité

### 1. Messages (Client)
- `/app/(app)/(client)/(tabs)/messages/index.tsx`
- `/app/(app)/(client)/conversation/[conversationId].tsx`

### 2. Messages (Enterprise)
- `/app/(app)/(enterprise)/(tabs)/messages/index.tsx`
- `/app/(app)/(enterprise)/conversation/[conversationId].tsx`

### 3. Layout principal
- `/app/_layout.tsx` - Ajouter le SocketProvider

## 🔧 Configuration requise

### Variables d'environnement

Aucune variable MQTT n'est plus nécessaire. Socket.IO utilise la même URL que l'API:

```env
# .env
EXPO_PUBLIC_API_URL=http://YOUR_SERVER_IP:4000/api
```

Socket.IO se connectera automatiquement à `http://YOUR_SERVER_IP:4000`

### Backend

Le backend doit implémenter Socket.IO avec les événements suivants:

**Événements Client → Serveur:**
- `join_conversation` - Rejoindre une conversation
- `leave_conversation` - Quitter une conversation
- `typing_start` - Commencer à écrire
- `typing_stop` - Arrêter d'écrire

**Événements Serveur → Client:**
- `connected` - Confirmation de connexion
- `new_message` - Nouveau message
- `message_deleted` - Message supprimé
- `messages_read` - Messages lus
- `conversation_deleted` - Conversation supprimée
- `user_typing` - Utilisateur écrit
- `user_stop_typing` - Arrêt d'écriture

## 🚀 Intégration dans l'app

### Ajouter le Provider dans `_layout.tsx`

```typescript
import { SocketProvider } from './contexts/SocketContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SocketProvider>
        {/* Le reste de votre app */}
      </SocketProvider>
    </AuthProvider>
  );
}
```

## 📊 Avantages de Socket.IO

1. **Connexion permanente** - Maintenue automatiquement
2. **Reconnexion intelligente** - Backoff exponentiel avec gestion d'erreurs
3. **Typing indicators** - Savoir quand l'autre écrit
4. **Meilleure gestion d'erreurs** - Classification automatique (réseau, auth, serveur)
5. **Debugging facile** - Status et logs détaillés
6. **Transport fallback** - WebSocket → Polling automatique

## 🧪 Testing

```typescript
// Vérifier le statut de connexion
const status = socketService.getConnectionStatus();
console.log('Socket.IO Status:', status);
// {
//   connected: true,
//   socketId: "abc123",
//   userId: "user123",
//   currentConversation: "conv456",
//   reconnectAttempts: 0
// }
```

## 📚 Documentation complète

Voir `SOCKET_IO_INTEGRATION.md` pour la documentation détaillée du backend.

## ⚠️ Notes importantes

1. **Token JWT requis** - La connexion nécessite un token valide dans AsyncStorage
2. **Authentification automatique** - Le service s'authentifie automatiquement avec le JWT
3. **Gestion d'erreurs** - Toutes les erreurs sont classifiées et loggées
4. **Pas de polling manuel** - Socket.IO gère tout automatiquement
5. **Cleanup automatique** - Les hooks gèrent le nettoyage des listeners

## 🎉 Conclusion

Socket.IO offre une solution plus robuste, plus simple et mieux adaptée à React Native que MQTT. La migration améliore significativement la stabilité et l'expérience utilisateur en temps réel.
