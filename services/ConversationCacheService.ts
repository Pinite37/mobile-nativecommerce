import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@conv_cache_';
const MAX_MESSAGES = 60;

interface CachedConversation {
  conversation: any;
  messages: any[];
  participants: any[];
  cachedAt: number;
}

const ConversationCacheService = {
  async get(conversationId: string): Promise<CachedConversation | null> {
    try {
      const raw = await AsyncStorage.getItem(PREFIX + conversationId);
      if (!raw) return null;
      return JSON.parse(raw) as CachedConversation;
    } catch {
      return null;
    }
  },

  async set(conversationId: string, data: Omit<CachedConversation, 'cachedAt'>): Promise<void> {
    try {
      const entry: CachedConversation = {
        ...data,
        messages: data.messages.slice(-MAX_MESSAGES),
        cachedAt: Date.now(),
      };
      await AsyncStorage.setItem(PREFIX + conversationId, JSON.stringify(entry));
    } catch {}
  },

  async appendMessage(conversationId: string, message: any): Promise<void> {
    try {
      const existing = await this.get(conversationId);
      if (!existing) return;
      const already = existing.messages.some((m: any) => m._id === message._id);
      if (already) return;
      const messages = [...existing.messages, message].slice(-MAX_MESSAGES);
      await this.set(conversationId, { ...existing, messages });
    } catch {}
  },

  async removeMessage(conversationId: string, messageId: string): Promise<void> {
    try {
      const existing = await this.get(conversationId);
      if (!existing) return;
      const messages = existing.messages.filter((m: any) => m._id !== messageId);
      await this.set(conversationId, { ...existing, messages });
    } catch {}
  },
};

export default ConversationCacheService;
