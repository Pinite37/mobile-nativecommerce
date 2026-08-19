import ApiService from './ApiService';

export interface Conversation {
  _id: string;
  participants: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    profileImage?: string;
  }[];
  type: 'CLIENT_ENTERPRISE' | 'ENTERPRISE_ENTERPRISE';
  product?: {
    _id: string;
    name: string;
    price: number;
    images: string[];
    enterprise: any;
  };
  statusOrigin?: string;
  subject: string;
  lastMessage?: Message;
  lastActivity: string;
  isActive: boolean;
  unreadCount?: number;
  otherParticipant?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    profileImage?: string;
  };
}

export interface Message {
  _id: string;
  conversation: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
    role: string;
  };
  text: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  replyTo?: Message;
  sentAt?: string; // Optionnel car parfois c'est createdAt
  createdAt?: string; // Ajouté pour correspondre à l'API
  deliveryStatus?: 'SENT' | 'DELIVERED' | 'READ'; // Statut de livraison du message
  readBy: {
    user: string;
    readAt: string;
  }[];
  metadata: {
    deleted: boolean;
    deletedAt?: string;
    deletedBy?: string[];
  };
  statusReply?: {
    statusId: string;
    preview?: string;
  };
  // Champs locaux pour gestion optimiste de l'envoi
  _localId?: string;
  _sendingStatus?: 'pending' | 'sent' | 'failed';
  _sendError?: string;
}

export interface ConversationCreationResponse {
  success: boolean;
  message: string;
  data: Conversation;
}

export interface MessageSendResponse {
  success: boolean;
  message: string;
  data: {
    message: Message;
    conversation: Conversation;
    recipientId: string;
  };
}

export interface ConversationsResponse {
  success: boolean;
  message: string;
  data: Conversation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface MessagesResponse {
  success: boolean;
  message: string;
  data: {
    conversation: Conversation;
    messages: Message[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

class MessagingService {
  private baseUrl = '/messaging';

  /**
   * Répondre à un statut (crée/récupère conv + envoie message)
   */
  async replyToStatus(enterpriseUserId: string, statusId: string, text: string, preview: string): Promise<{ message: Message; conversation: Conversation }> {
    const response = await ApiService.post<any>(
      `${this.baseUrl}/conversations/status-reply`,
      { enterpriseUserId, statusId, text, preview }
    );
    return response.data!;
  }

  /**
   * Créer ou récupérer une conversation pour un produit
   */
  async createConversationForProduct(productId: string): Promise<Conversation> {
    console.log('🔄 MESSAGING SERVICE - Création conversation pour produit:', productId);
    
    try {
      const response = await ApiService.post<any>(
        `${this.baseUrl}/conversations/product`,
        { productId }
      );
      console.log('🔄 MESSAGING SERVICE - Réponse création conversation:', response);
      
      if (!response || !response.data) {
        throw new Error('Réponse invalide du serveur');
      }
      
      // La conversation est directement dans response.data selon la structure API
      const conversation = response.data;
      console.log('✅ MESSAGING SERVICE - Conversation créée/récupérée:', conversation._id);
      return conversation;
    } catch (error) {
      console.error('❌ MESSAGING SERVICE - Erreur création conversation:', error);
      throw error;
    }
  }

  /**
   * Envoyer un message texte
   */
  async sendMessage(productId: string, text: string, replyTo?: string, conversationId?: string): Promise<any> {
    console.log('🔄 MESSAGING SERVICE - Envoi message:', { productId, textLength: text.length, conversationId });
    
    try {
      const response = await ApiService.post<any>(
        `${this.baseUrl}/messages`,
        { 
          productId, 
          text: text.trim(),
          replyTo,
          conversationId 
        }
      );
      
      if (!response || !response.data) {
        throw new Error('Réponse invalide du serveur');
      }
      
      const result = response.data;
      console.log('✅ MESSAGING SERVICE - Message envoyé:', result.message?._id);
      return result;
    } catch (error) {
      console.error('❌ MESSAGING SERVICE - Erreur envoi message:', error);
      throw error;
    }
  }

  /**
   * Envoyer un message avec pièce jointe
   */
  async sendMessageWithAttachment(
    productId: string,
    text: string,
    attachment: {
      type: 'IMAGE' | 'FILE';
      data: string; // base64
      mimeType: string;
      fileName?: string;
    },
    replyTo?: string,
    conversationId?: string
  ): Promise<any> {
    console.log('🔄 MESSAGING SERVICE - Envoi message avec pièce jointe:', {
      productId,
      textLength: text.length,
      attachmentType: attachment.type,
      mimeType: attachment.mimeType,
      conversationId
    });

    try {
      const response = await ApiService.post<any>(
        `${this.baseUrl}/messages`,
        {
          productId,
          text: text.trim(),
          messageType: attachment.type,
          attachment: {
            data: attachment.data,
            mimeType: attachment.mimeType,
            fileName: attachment.fileName
          },
          replyTo,
          conversationId
        }
      );

      if (!response || !response.data) {
        throw new Error('Réponse invalide du serveur');
      }

      const result = response.data;
      console.log('✅ MESSAGING SERVICE - Message avec pièce jointe envoyé:', result.message?._id);
      return result;
    } catch (error) {
      console.error('❌ MESSAGING SERVICE - Erreur envoi message avec pièce jointe:', error);
      throw error;
    }
  }

  /**
   * Récupérer les conversations de l'utilisateur
   */
  async getUserConversations(page: number = 1, limit: number = 20): Promise<Conversation[]> {
    console.log('🔄 MESSAGING SERVICE - Récupération conversations utilisateur');
    
    try {
      const response = await ApiService.get<any>(
        `${this.baseUrl}/conversations?page=${page}&limit=${limit}`
      );
      
      console.log('🔄 MESSAGING SERVICE - Réponse conversations:', JSON.stringify(response, null, 2));
      
      if (!response || !response.data) {
        throw new Error('Réponse invalide du serveur');
      }
      
      // Testons les deux structures possibles
      let conversations;
      if (response.data.data) {
        // Structure: { success: true, data: [...] }
        conversations = response.data.data;
        console.log('🔄 MESSAGING SERVICE - Utilisation de response.data.data pour conversations');
      } else if (Array.isArray(response.data)) {
        // Structure: [...]
        conversations = response.data;
        console.log('🔄 MESSAGING SERVICE - Utilisation de response.data pour conversations');
      } else {
        console.warn('🔄 MESSAGING SERVICE - Structure de réponse inconnue, retour tableau vide');
        conversations = [];
      }
      
      console.log('✅ MESSAGING SERVICE - Conversations récupérées:', conversations?.length || 0);
      return conversations || [];
    } catch (error) {
      console.error('❌ MESSAGING SERVICE - Erreur récupération conversations:', error);
      return []; // Retourner un tableau vide en cas d'erreur
    }
  }

  /**
   * Récupérer les messages d'une conversation
   */
  async getConversationMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<any> {
    console.log('🔄 MESSAGING SERVICE - Récupération messages conversation:', conversationId);
    
    try {
      const response = await ApiService.get<any>(
        `${this.baseUrl}/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
      );
      
      console.log('🔄 MESSAGING SERVICE - Réponse brute:', JSON.stringify(response, null, 2));
      
      if (!response || !response.data) {
        throw new Error('Réponse invalide du serveur');
      }
      
      // Testons les deux structures possibles
      let result;
      if (response.data.data) {
        // Structure: { success: true, data: { conversation: ..., messages: [...] } }
        result = response.data.data;
        console.log('🔄 MESSAGING SERVICE - Utilisation de response.data.data');
      } else {
        // Structure: { conversation: ..., messages: [...] }
        result = response.data;
        console.log('🔄 MESSAGING SERVICE - Utilisation de response.data');
      }
      
      console.log('✅ MESSAGING SERVICE - Messages récupérés:', result?.messages?.length || 0);
      console.log('✅ MESSAGING SERVICE - Conversation:', result?.conversation?._id);
      return result;
    } catch (error) {
      console.error('❌ MESSAGING SERVICE - Erreur récupération messages:', error);
      throw error;
    }
  }

  /**
   * Marquer les messages d'une conversation comme lus
   */
  async markMessagesAsRead(conversationId: string): Promise<number> {
    console.log('🔄 MESSAGING SERVICE - Marquage messages comme lus:', conversationId);
    
    try {
      const response = await ApiService.put<any>(
        `${this.baseUrl}/conversations/${conversationId}/read`,
        {}
      );
      
      if (!response || !response.data) {
        throw new Error('Réponse invalide du serveur');
      }
      
      const readCount = response.data.readCount || 0;
      console.log('✅ MESSAGING SERVICE - Messages marqués comme lus:', readCount);
      return readCount;
    } catch (error) {
      console.error('❌ MESSAGING SERVICE - Erreur marquage lecture:', error);
      throw error;
    }
  }

  /**
   * Supprimer un message
   */
  async deleteMessage(messageId: string, deleteForEveryone: boolean = false): Promise<Message> {
    console.log('🔄 MESSAGING SERVICE - Suppression message:', messageId);
    
    try {
      const response = await ApiService.delete<any>(
        `${this.baseUrl}/messages/${messageId}`,
        { 
          data: { deleteForEveryone }
        }
      );
      
      if (!response || !response.data) {
        throw new Error('Réponse invalide du serveur');
      }
      
      const message = response.data;
      console.log('✅ MESSAGING SERVICE - Message supprimé');
      return message;
    } catch (error) {
      console.error('❌ MESSAGING SERVICE - Erreur suppression message:', error);
      throw error;
    }
  }

  /**
   * Supprimer une conversation (retirer l'utilisateur)
   */
  async deleteConversation(conversationId: string): Promise<any> {
    console.log('🔄 MESSAGING SERVICE - Suppression conversation:', conversationId);

    try {
      const response = await ApiService.delete<any>(
        `${this.baseUrl}/conversations/${conversationId}`
      );

      if (!response || !response.data) {
        throw new Error('Réponse invalide du serveur');
      }

      const result = response.data;
      console.log('✅ MESSAGING SERVICE - Conversation supprimée');
      return result;
    } catch (error) {
      console.error('❌ MESSAGING SERVICE - Erreur suppression conversation:', error);
      throw error;
    }
  }

  /**
   * Formater le nom d'affichage d'un participant
   */
  formatParticipantName(participant: Conversation['participants'][0]): string {
    return `${participant.firstName} ${participant.lastName}`.trim();
  }

  /**
   * Formater le temps d'un message
   */
  formatMessageTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInMs / (1000 * 60));
      return minutes < 1 ? 'À l\'instant' : `Il y a ${minutes}min`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `Il y a ${hours}h`;
    } else if (diffInDays < 7) {
      const days = Math.floor(diffInDays);
      return `Il y a ${days}j`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: diffInDays > 365 ? '2-digit' : undefined
      });
    }
  }

  /**
   * Obtenir l'aperçu d'un message
   */
  getMessagePreview(message: Message): string {
    if (message.metadata.deleted) {
      return '[Message supprimé]';
    }
    
    switch (message.messageType) {
      case 'TEXT':
        return message.text.length > 50 
          ? `${message.text.substring(0, 50)}...` 
          : message.text;
      case 'IMAGE':
        return '📷 Image';
      case 'FILE':
        return '📎 Fichier';
      case 'SYSTEM':
        return message.text; // Pour les messages système, afficher le texte complet
      default:
        return 'Message';
    }
  }
}

export default new MessagingService();
