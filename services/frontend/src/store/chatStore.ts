import { create } from 'zustand';
import type { Conversation, ChatMessage } from '@/types';

interface ChatState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: ChatMessage[];
  isTyping: boolean;
  isLoading: boolean;
  isSending: boolean;

  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  removeConversation: (conversationId: string) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  setTyping: (isTyping: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setSending: (isSending: boolean) => void;
  clearMessages: () => void;
  updateConversationLastMessage: (
    conversationId: string,
    lastMessage: string
  ) => void;
}

const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isTyping: false,
  isLoading: false,
  isSending: false,

  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),

  removeConversation: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== conversationId),
      currentConversation:
        state.currentConversation?.id === conversationId
          ? null
          : state.currentConversation,
      messages:
        state.currentConversation?.id === conversationId
          ? []
          : state.messages,
    })),

  setCurrentConversation: (conversation) =>
    set({ currentConversation: conversation }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateMessage: (messageId, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m
      ),
    })),

  setTyping: (isTyping) => set({ isTyping }),

  setLoading: (isLoading) => set({ isLoading }),

  setSending: (isSending) => set({ isSending }),

  clearMessages: () => set({ messages: [], currentConversation: null }),

  updateConversationLastMessage: (conversationId, lastMessage) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage,
              lastMessageAt: new Date().toISOString(),
            }
          : c
      ),
    })),
}));

export default useChatStore;
