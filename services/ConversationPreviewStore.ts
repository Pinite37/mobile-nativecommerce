// Store en mémoire peuplé par la liste de conversations.
// La conversation screen le lit de façon synchrone avant toute résolution async.
export interface ConversationPreview {
  participantName: string;
  participantAvatar?: string;
  productName?: string;
}

const store = new Map<string, ConversationPreview>();

export default {
  set(conversationId: string, preview: ConversationPreview) {
    store.set(conversationId, preview);
  },
  get(conversationId: string): ConversationPreview | null {
    return store.get(conversationId) ?? null;
  },
};
