# 🚀 MQTT Intégré - Démarrage Automatique

## ✅ Configuration Terminée

L'application se connecte maintenant automatiquement à MQTT dès le démarrage grâce au `MQTTProvider` intégré dans `_layout.tsx`.

## 🔧 Fonctionnement

### 1. **Connexion Automatique**
- Au lancement de l'app, le `MQTTProvider` se connecte automatiquement à EMQX
- La connexion s'adapte selon l'état d'authentification de l'utilisateur
- Reconexion automatique en cas de perte de connexion

### 2. **Gestion des États**
- **Connecté** : Communication MQTT active
- **Connexion en cours** : Tentative de connexion
- **Erreur** : Problème de connexion (affiché dans les logs)

### 3. **Utilisation dans les Composants**

```typescript
// Dans vos composants de messagerie
import { useMQTT } from '../hooks/useMQTT';

const MyComponent = () => {
  const {
    isConnected,      // État de connexion
    sendMessage,      // Envoyer un message
    joinConversation, // Rejoindre une conversation
    markAsRead,       // Marquer comme lu
    onNewMessage      // Écouter les nouveaux messages
  } = useMQTT();

  // Vos fonctionnalités de messagerie ici
};
```

### 4. **Indicateur de Statut** (Optionnel)

```typescript
import MQTTStatusIndicator from '../components/MQTTStatusIndicator';

// Indicateur simple (point coloré)
<MQTTStatusIndicator />

// Indicateur détaillé avec texte
<MQTTStatusIndicator showDetails={true} />
```

## 📊 Logs MQTT

Surveillez les logs de la console pour voir l'activité MQTT :

```
🚀 Initialisation MQTT au démarrage de l'app
👤 Connexion MQTT avec utilisateur: [userId]
✅ MQTT initialisé avec succès
📨 MQTT: Message reçu sur [topic]
📤 MQTT: Message publié sur [topic]
```

## ⚙️ Configuration

### Variables d'environnement (`.env`)
```bash
EXPO_PUBLIC_MQTT_HOST=broker.emqx.io
EXPO_PUBLIC_MQTT_PORT=8084
EXPO_PUBLIC_MQTT_CONNECTION_TIMEOUT=10000
EXPO_PUBLIC_MQTT_KEEP_ALIVE_INTERVAL=60
```

### Production
Pour la production, changez les variables d'environnement :
```bash
EXPO_PUBLIC_MQTT_HOST=votre-serveur.com
EXPO_PUBLIC_MQTT_PORT=8083
```

## 🎯 Avantages

- ✅ **Connexion automatique** dès le démarrage
- ✅ **Gestion transparente** des états de connexion
- ✅ **Reconnexion automatique** en cas de perte
- ✅ **Intégration parfaite** avec le système d'authentification
- ✅ **Performance optimisée** pour mobile

## 🔍 Dépannage

### Problème : Pas de connexion
1. Vérifiez les logs de la console
2. Assurez-vous que EMQX est accessible
3. Vérifiez les variables d'environnement

### Problème : Messages non reçus
1. Vérifiez que l'utilisateur est connecté
2. Assurez-vous que les topics sont corrects
3. Vérifiez les permissions côté serveur

---

**L'application est maintenant prête avec MQTT intégré ! 🎉**
