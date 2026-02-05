import api from './api';
import type {
  ApiResponse,
  PaginatedResponse,
  Conversation,
  Message,
} from '@/types';

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://172.168.1.95:3067';

const chatService = {
  async getConversations(): Promise<Conversation[]> {
    const response = await api.get<ApiResponse<Conversation[]>>(
      '/chat/conversations'
    );
    return response.data.data;
  },

  async getConversation(
    conversationId: string
  ): Promise<{ conversation: Conversation; messages: Message[] }> {
    const response = await api.get<
      ApiResponse<{ conversation: Conversation; messages: Message[] }>
    >(`/chat/conversations/${conversationId}`);
    return response.data.data;
  },

  async createConversation(title?: string): Promise<Conversation> {
    const response = await api.post<ApiResponse<Conversation>>(
      '/chat/conversations',
      { title: title || 'New Conversation' }
    );
    return response.data.data;
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await api.delete(`/chat/conversations/${conversationId}`);
  },

  async sendMessage(
    conversationId: string,
    content: string
  ): Promise<Message> {
    const response = await api.post<ApiResponse<Message>>(
      `/chat/conversations/${conversationId}/messages`,
      { content, role: 'user' }
    );
    return response.data.data;
  },

  async getMessages(
    conversationId: string,
    page = 1,
    limit = 50
  ): Promise<PaginatedResponse<Message>> {
    const response = await api.get<PaginatedResponse<Message>>(
      `/chat/conversations/${conversationId}/messages`,
      { params: { page, limit } }
    );
    return response.data;
  },

  async sendToAI(
    conversationId: string,
    message: string,
    context?: Record<string, unknown>
  ): Promise<Message> {
    const response = await api.post<ApiResponse<Message>>(
      `${AI_SERVICE_URL}/api/chat`,
      {
        conversationId,
        message,
        context,
      }
    );
    return response.data.data;
  },
};

export default chatService;
