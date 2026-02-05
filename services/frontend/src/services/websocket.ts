import type { WSMessage, Message, Notification, OrderStatus } from '@/types';

type MessageHandler = (message: Message) => void;
type OrderUpdateHandler = (data: {
  orderId: string;
  status: OrderStatus;
  message: string;
}) => void;
type NotificationHandler = (notification: Notification) => void;
type TypingHandler = (data: {
  conversationId: string;
  isTyping: boolean;
}) => void;
type ConnectionHandler = (connected: boolean) => void;

class WebSocketService {
  private static instance: WebSocketService;
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isIntentionalClose = false;

  private messageHandlers: Set<MessageHandler> = new Set();
  private orderUpdateHandlers: Set<OrderUpdateHandler> = new Set();
  private notificationHandlers: Set<NotificationHandler> = new Set();
  private typingHandlers: Set<TypingHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();

  private constructor() {
    this.url = import.meta.env.VITE_WS_URL || 'ws://172.168.1.95:3066';
  }

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  connect(token?: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isIntentionalClose = false;
    const wsUrl = token ? `${this.url}/ws?token=${token}` : `${this.url}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WS] Connected');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.startHeartbeat();
        this.connectionHandlers.forEach((handler) => handler(true));
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data: WSMessage = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      };

      this.ws.onclose = (event: CloseEvent) => {
        console.log('[WS] Disconnected:', event.code, event.reason);
        this.stopHeartbeat();
        this.connectionHandlers.forEach((handler) => handler(false));

        if (!this.isIntentionalClose) {
          this.attemptReconnect(token);
        }
      };

      this.ws.onerror = (error: Event) => {
        console.error('[WS] Error:', error);
      };
    } catch (error) {
      console.error('[WS] Connection failed:', error);
      this.attemptReconnect(token);
    }
  }

  disconnect(): void {
    this.isIntentionalClose = true;
    this.stopHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  send(type: string, payload: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: WSMessage = {
        type,
        payload,
        timestamp: new Date().toISOString(),
      };
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WS] Cannot send - not connected');
    }
  }

  sendChatMessage(conversationId: string, content: string): void {
    this.send('chat_message', { conversationId, content });
  }

  sendTyping(conversationId: string, isTyping: boolean): void {
    this.send('typing', { conversationId, isTyping });
  }

  // Event listeners
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onOrderUpdate(handler: OrderUpdateHandler): () => void {
    this.orderUpdateHandlers.add(handler);
    return () => this.orderUpdateHandlers.delete(handler);
  }

  onNotification(handler: NotificationHandler): () => void {
    this.notificationHandlers.add(handler);
    return () => this.notificationHandlers.delete(handler);
  }

  onTyping(handler: TypingHandler): () => void {
    this.typingHandlers.add(handler);
    return () => this.typingHandlers.delete(handler);
  }

  onConnection(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private handleMessage(data: WSMessage): void {
    switch (data.type) {
      case 'chat_message':
        this.messageHandlers.forEach((handler) =>
          handler(data.payload as Message)
        );
        break;
      case 'order_update':
        this.orderUpdateHandlers.forEach((handler) =>
          handler(
            data.payload as {
              orderId: string;
              status: OrderStatus;
              message: string;
            }
          )
        );
        break;
      case 'notification':
        this.notificationHandlers.forEach((handler) =>
          handler(data.payload as Notification)
        );
        break;
      case 'typing':
        this.typingHandlers.forEach((handler) =>
          handler(
            data.payload as { conversationId: string; isTyping: boolean }
          )
        );
        break;
      case 'pong':
        // Heartbeat response received
        break;
      default:
        console.log('[WS] Unknown message type:', data.type);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.send('ping', {});
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private attemptReconnect(token?: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WS] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    console.log(
      `[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.reconnectTimeout = setTimeout(() => {
      this.connect(token);
    }, delay);
  }
}

export default WebSocketService;
