# Intégration Socket.IO - Guide d'utilisation

## 🎯 Vue d'ensemble

Le système de messagerie en temps réel a été intégré avec Socket.IO pour offrir une expérience utilisateur fluide avec :

- ✅ Envoi de messages en temps réel
- ✅ Réception instantanée des nouveaux messages
- ✅ Notifications de messages non lus
- ✅ Marquage automatique comme lu
- ✅ Statut de connexion en temps réel

## 📁 Fichiers modifiés

### 1. Service Socket.IO Client

**Fichier :** `services/api/MessagingSocketClient.ts`

- Client Socket.IO complet avec gestion des événements
- Connexion automatique avec authentification JWT
- Gestion des erreurs et reconnexions

### 2. Page de conversation

**Fichier :** `app/(app)/(enterprise)/conversation/[conversationId].tsx`

- Envoi de messages via Socket.IO
- Réception en temps réel des nouveaux messages
- Gestion des erreurs de connexion

### 3. Page des messages

**Fichier :** `app/(app)/(enterprise)/(tabs)/messages/index.tsx`

- Notifications de nouveaux messages
- Mise à jour des compteurs de messages non lus
- Gestion des statuts de conversation

## 🚀 Utilisation

### Connexion automatique

Le système se connecte automatiquement au serveur Socket.IO lors de l'accès aux pages de messagerie.

### Envoi de messages

```typescript
// Dans la page de conversation
messagingSocket.sendMessage(productId, messageText, replyToId, conversationId);
```

### Réception de messages

Les nouveaux messages sont automatiquement ajoutés à la liste sans rechargement de page.

### Gestion des erreurs

En cas de perte de connexion, le système :

- Affiche une notification discrète
- Tente une reconnexion automatique
- Bascule sur les appels API classiques en fallback

## 🔧 Configuration

### Serveur de développement

```typescript
// Dans MessagingSocketClient.ts
private serverUrl = __DEV__
  ? 'http://localhost:5000'  // Développement
  : 'https://your-production-server.com'; // Production
```

### Authentification

Le token JWT est automatiquement récupéré depuis le TokenStorageService.

## 📊 Événements gérés

### Événements émis par le client

- `send_message` : Envoi d'un message
- `join_conversation` : Rejoindre une conversation
- `leave_conversation` : Quitter une conversation
- `mark_messages_read` : Marquer comme lu
- `delete_message` : Supprimer un message

### Événements reçus du serveur

- `new_message` : Nouveau message dans une conversation active
- `message_notification` : Notification de nouveau message
- `messages_read` : Messages marqués comme lus
- `message_deleted` : Message supprimé
- `user_online` / `user_offline` : Statut des utilisateurs

## 🔒 Sécurité

- Authentification JWT obligatoire
- Vérification des permissions côté serveur
- Connexion chiffrée en production

## 🐛 Dépannage

### Problème : Connexion perdue

**Solution :** Le système se reconnecte automatiquement

### Problème : Messages non reçus

**Solution :** Vérifier la connexion réseau et les permissions

### Problème : Token expiré

**Solution :** Le système gère automatiquement le renouvellement des tokens

## 📈 Performance

- Cache des conversations (5 minutes)
- Connexion persistante Socket.IO
- Mise à jour optimisée des listes
- Gestion mémoire des événements

---

**✅ Intégration terminée avec succès !**
