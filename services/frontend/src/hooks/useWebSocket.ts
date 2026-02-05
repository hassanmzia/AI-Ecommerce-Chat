import { useEffect, useRef, useCallback, useState } from 'react';
import WebSocketService from '@/services/websocket';
import useAuthStore from '@/store/authStore';
import type { Message, Notification, OrderStatus } from '@/types';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onMessage?: (message: Message) => void;
  onOrderUpdate?: (data: {
    orderId: string;
    status: OrderStatus;
    message: string;
  }) => void;
  onNotification?: (notification: Notification) => void;
  onTyping?: (data: { conversationId: string; isTyping: boolean }) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    autoConnect = true,
    onMessage,
    onOrderUpdate,
    onNotification,
    onTyping,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const wsService = useRef(WebSocketService.getInstance());
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!autoConnect) return;

    const ws = wsService.current;

    const unsubConnection = ws.onConnection((connected) => {
      setIsConnected(connected);
    });

    ws.connect(token || undefined);

    return () => {
      unsubConnection();
    };
  }, [autoConnect, token]);

  useEffect(() => {
    const ws = wsService.current;
    const unsubs: Array<() => void> = [];

    if (onMessage) {
      unsubs.push(ws.onMessage(onMessage));
    }
    if (onOrderUpdate) {
      unsubs.push(ws.onOrderUpdate(onOrderUpdate));
    }
    if (onNotification) {
      unsubs.push(ws.onNotification(onNotification));
    }
    if (onTyping) {
      unsubs.push(ws.onTyping(onTyping));
    }

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [onMessage, onOrderUpdate, onNotification, onTyping]);

  const sendMessage = useCallback(
    (conversationId: string, content: string) => {
      wsService.current.sendChatMessage(conversationId, content);
    },
    []
  );

  const sendTyping = useCallback(
    (conversationId: string, isTyping: boolean) => {
      wsService.current.sendTyping(conversationId, isTyping);
    },
    []
  );

  const connect = useCallback(() => {
    wsService.current.connect(token || undefined);
  }, [token]);

  const disconnect = useCallback(() => {
    wsService.current.disconnect();
  }, []);

  return {
    isConnected,
    sendMessage,
    sendTyping,
    connect,
    disconnect,
  };
}

export default useWebSocket;
