# 🚀 Migration MQTT → Socket.IO - Liste de contrôle

## ✅ Étapes complétées

- [x] Désinstallation des packages MQTT (mqtt, paho-mqtt, react_native_mqtt, etc.)
- [x] Suppression des fichiers MQTT
  - [x] services/api/MQTTClient.ts
  - [x] services/api/MQTTConfig.ts
  - [x] services/api/MQTTInitializer.ts
  - [x] services/api/MQTTInitializerService.ts
  - [x] services/api/mqttPolyfills.ts
  - [x] hooks/useMQTT.ts
  - [x] contexts/MQTTContext.tsx
  - [x] types/mqtt.d.ts
  - [x] types/react_native_mqtt.d.ts
- [x] Création du service Socket.IO (services/socket/SocketService.ts)
- [x] Création du hook useSocket (hooks/useSocket.ts)
- [x] Création du SocketContext (contexts/SocketContext.tsx)
- [x] Mise à jour du MQTTStatusIndicator → SocketStatusIndicator
- [x] Documentation de migration créée

## 🔄 Étapes à faire manuellement

### 1. Mettre à jour `app/_layout.tsx`

Remplacer le MQTTContext.Provider par SocketProvider:

```typescript
// Avant
import { MQTTProvider } from './contexts/MQTTContext';

<MQTTProvider>
  {children}
</MQTTProvider>

// Après
import { SocketProvider } from './contexts/SocketContext';

<SocketProvider>
  {children}
</SocketProvider>
```

### 2. Mettre à jour les fichiers de messages (Client)

#### `/app/(app)/(client)/(tabs)/messages/index.tsx`

```typescript
// Remplacer
import { useMQTT } from '../../../../../hooks/useMQTT';
const { onNewMessage, onMessagesRead, offNewMessage, offMessagesRead } = useMQTT();

// Par
import { useSocket } from '../../../../../hooks/useSocket';
const { onNewMessage, onMessagesRead } = useSocket();

// Mettre à jour les useEffect
useEffect(() => {
  const cleanupNewMessage = onNewMessage((data) => {
    // votre code
  });
  
  const cleanupMessagesRead = onMessagesRead((data) => {
    // votre code
  });
  
  return () => {
    cleanupNewMessage();
    cleanupMessagesRead();
  };
}, [onNewMessage, onMessagesRead]);
```

#### `/app/(app)/(client)/conversation/[conversationId].tsx`

```typescript
// Ajouter
import { useSocket } from '../../../../hooks/useSocket';
const { joinConversation, leaveConversation, startTyping, stopTyping, onNewMessage, onUserTyping, onUserStopTyping } = useSocket();

// Dans useEffect
useEffect(() => {
  // Rejoindre la conversation
  joinConversation(conversationId);
  
  // Écouter les nouveaux messages
  const cleanupNewMessage = onNewMessage((data) => {
    if (data.conversation._id === conversationId) {
      setMessages(prev => [...prev, data.message]);
    }
  });
  
  // Écouter le typing
  const cleanupTyping = onUserTyping((data) => {
    if (data.conversationId === conversationId && data.userId !== currentUserId) {
      setOtherUserTyping(true);
    }
  });
  
  const cleanupStopTyping = onUserStopTyping((data) => {
    if (data.conversationId === conversationId) {
      setOtherUserTyping(false);
    }
  });
  
  return () => {
    leaveConversation(conversationId);
    cleanupNewMessage();
    cleanupTyping();
    cleanupStopTyping();
  };
}, [conversationId, joinConversation, leaveConversation]);

// Dans le TextInput
const handleTextChange = (text: string) => {
  setInputText(text);
  if (text.length > 0 && !isTyping) {
    startTyping(conversationId);
    setIsTyping(true);
  } else if (text.length === 0 && isTyping) {
    stopTyping(conversationId);
    setIsTyping(false);
  }
};
```

### 3. Mettre à jour les fichiers de messages (Enterprise)

Même processus que pour le client:
- `/app/(app)/(enterprise)/(tabs)/messages/index.tsx`
- `/app/(app)/(enterprise)/conversation/[conversationId].tsx`

### 4. Supprimer les références MQTT restantes

Rechercher et remplacer dans tout le projet:
- `useMQTT` → `useSocket`
- `MQTTContext` → `SocketContext`
- `MQTTProvider` → `SocketProvider`
- `MQTTStatusIndicator` → `SocketStatusIndicator` (optionnel, alias créé)

### 5. Vérifier les imports

Rechercher tous les imports MQTT restants:
```bash
grep -r "useMQTT\|MQTTContext\|MQTTClient" --include="*.tsx" --include="*.ts" app/
```

### 6. Nettoyer les fichiers README et documentation

Supprimer ou mettre à jour:
- `MQTT_INTEGRATION_COMPLETE.md`
- `MQTT_INTEGRATION_README.md`
- `MQTT_INTEGRATION.md`
- `MQTT_MIGRATION_README.md`

### 7. Supprimer les scripts de test MQTT

```bash
rm mqtt-advanced-diagnostic.js
rm test-mqtt-connection.js
rm test-mqtt-diagnostic.js
rm test-mqtt-integration.js
rm test-mqtt.js
```

### 8. Mettre à jour les variables d'environnement

Dans `.env`:
```env
# Supprimer toutes les variables MQTT
# EXPO_PUBLIC_MQTT_HOST=...
# EXPO_PUBLIC_MQTT_PORT=...
# etc.

# Garder seulement
EXPO_PUBLIC_API_URL=http://YOUR_SERVER_IP:4000/api
```

Socket.IO utilisera automatiquement la même base URL.

## 🧪 Tests à effectuer

1. **Test de connexion**
   - [ ] L'app se connecte au démarrage
   - [ ] La reconnexion fonctionne après perte réseau
   - [ ] L'authentification JWT fonctionne

2. **Test des messages**
   - [ ] Envoi de messages
   - [ ] Réception de messages en temps réel
   - [ ] Lecture de messages
   - [ ] Suppression de messages

3. **Test des conversations**
   - [ ] Rejoindre une conversation
   - [ ] Quitter une conversation
   - [ ] Liste des conversations mise à jour en temps réel

4. **Test du typing indicator (nouveau)**
   - [ ] L'indicateur s'affiche quand l'autre écrit
   - [ ] L'indicateur disparaît quand l'autre arrête

5. **Test de robustesse**
   - [ ] Pas de crash en cas d'erreur réseau
   - [ ] Gestion correcte des erreurs d'authentification
   - [ ] Messages d'erreur clairs pour l'utilisateur

## 📊 Avantages observés après migration

- ✅ Connexion plus stable
- ✅ Reconnexion plus rapide
- ✅ Moins de code boilerplate
- ✅ Meilleure gestion d'erreurs
- ✅ Typing indicators natifs
- ✅ Debugging plus facile
- ✅ Performance améliorée

## 🆘 En cas de problème

### Socket ne se connecte pas
1. Vérifier que le backend écoute sur WebSocket
2. Vérifier le token JWT dans AsyncStorage
3. Vérifier l'URL du serveur dans `.env`
4. Consulter les logs: `socketService.getConnectionStatus()`

### Événements non reçus
1. Vérifier que la conversation est bien rejointe (`joinConversation`)
2. Vérifier les logs dans la console
3. Tester avec Socket.IO devtools côté backend

### Erreurs TypeScript
1. S'assurer que tous les imports sont mis à jour
2. Supprimer `node_modules/.cache`
3. Redémarrer le serveur de développement

## 📚 Ressources

- Documentation Socket.IO: https://socket.io/docs/v4/
- Guide de migration complet: `MQTT_TO_SOCKET_MIGRATION.md`
- Backend Socket.IO: `SOCKET_IO_INTEGRATION.md`

## ✨ Prochaines étapes (optionnel)

- [ ] Ajouter un indicateur visuel de connexion dans l'UI
- [ ] Implémenter la file d'attente de messages hors ligne
- [ ] Ajouter des analytics pour la qualité de connexion
- [ ] Créer des tests unitaires pour SocketService
