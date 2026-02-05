import { useCallback, useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import useChatStore from '@/store/chatStore';
import chatService from '@/services/chatService';
import { generateId } from '@/utils/formatters';
import type { ChatMessage, Message } from '@/types';
import toast from 'react-hot-toast';

export function useChat() {
  const {
    conversations,
    currentConversation,
    messages,
    isTyping,
    isSending,
    setConversations,
    addConversation,
    removeConversation,
    setCurrentConversation,
    setMessages,
    addMessage,
    updateMessage,
    setTyping,
    setSending,
    setLoading,
    clearMessages,
    updateConversationLastMessage,
  } = useChatStore();

  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleIncomingMessage = useCallback(
    (message: Message) => {
      if (
        currentConversation &&
        message.conversationId === currentConversation.id
      ) {
        const chatMsg: ChatMessage = {
          id: message.id,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
          status: 'sent',
          toolCalls: message.toolCalls,
        };
        addMessage(chatMsg);
        updateConversationLastMessage(
          currentConversation.id,
          message.content
        );
      }
      setTyping(false);
    },
    [currentConversation, addMessage, setTyping, updateConversationLastMessage]
  );

  const handleTyping = useCallback(
    (data: { conversationId: string; isTyping: boolean }) => {
      if (
        currentConversation &&
        data.conversationId === currentConversation.id
      ) {
        setTyping(data.isTyping);
      }
    },
    [currentConversation, setTyping]
  );

  const { sendMessage: wsSendMessage, sendTyping } = useWebSocket({
    onMessage: handleIncomingMessage,
    onTyping: handleTyping,
  });

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const convos = await chatService.getConversations();
      setConversations(convos);
    } catch {
      // Silently fail - user might not be authenticated
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conversationId: string) => {
    try {
      setLoading(true);
      const { conversation, messages: msgs } =
        await chatService.getConversation(conversationId);

      setCurrentConversation(conversation);
      setMessages(
        msgs.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          status: 'sent' as const,
          toolCalls: m.toolCalls,
        }))
      );
    } catch (error) {
      toast.error('Failed to load conversation');
      console.error('Failed to load conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewConversation = async (title?: string) => {
    try {
      const conversation = await chatService.createConversation(title);
      addConversation(conversation);
      setCurrentConversation(conversation);
      setMessages([]);
      return conversation;
    } catch (error) {
      toast.error('Failed to create conversation');
      console.error('Failed to create conversation:', error);
      return null;
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      await chatService.deleteConversation(conversationId);
      removeConversation(conversationId);
      toast.success('Conversation deleted');
    } catch (error) {
      toast.error('Failed to delete conversation');
      console.error('Failed to delete conversation:', error);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isSending) return;

    let conversationId = currentConversation?.id;

    // Create conversation if none exists
    if (!conversationId) {
      const newConvo = await createNewConversation(
        content.slice(0, 50) + (content.length > 50 ? '...' : '')
      );
      if (!newConvo) return;
      conversationId = newConvo.id;
    }

    // Add user message optimistically
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      status: 'sending',
    };

    addMessage(userMessage);
    updateConversationLastMessage(conversationId, content);
    setSending(true);
    setTyping(true);

    try {
      // Send via WebSocket for real-time
      wsSendMessage(conversationId, content);

      // Also send via API to get AI response
      const response = await chatService.sendMessage(conversationId, content);

      // Update user message status
      updateMessage(userMessage.id, { status: 'sent' });

      // If the API returns the assistant response directly
      if (response && response.role === 'assistant') {
        const assistantMessage: ChatMessage = {
          id: response.id,
          role: 'assistant',
          content: response.content,
          timestamp: response.timestamp,
          status: 'sent',
          toolCalls: response.toolCalls,
        };
        addMessage(assistantMessage);
        updateConversationLastMessage(conversationId, response.content);
      }
    } catch (error) {
      updateMessage(userMessage.id, { status: 'error' });
      toast.error('Failed to send message');
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
      setTyping(false);
    }
  };

  const handleInputChange = useCallback(
    (hasContent: boolean) => {
      if (!currentConversation) return;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (hasContent) {
        sendTyping(currentConversation.id, true);
        typingTimeoutRef.current = setTimeout(() => {
          sendTyping(currentConversation.id, false);
        }, 3000);
      } else {
        sendTyping(currentConversation.id, false);
      }
    },
    [currentConversation, sendTyping]
  );

  return {
    conversations,
    currentConversation,
    messages,
    isTyping,
    isSending,
    sendMessage,
    selectConversation,
    createNewConversation,
    deleteConversation,
    clearMessages,
    handleInputChange,
    loadConversations,
  };
}

export default useChat;
