const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'ecommerce-chat-jwt-secret-key-2024';

/**
 * Connected clients registry.
 * Map of userId -> Set of WebSocket connections.
 * Anonymous clients are stored under a generated session key.
 */
const clients = new Map();

/**
 * Map of ws instance -> client metadata.
 */
const clientMeta = new Map();

/**
 * Initialize the WebSocket server on the given HTTP server.
 *
 * @param {import('http').Server} server  The HTTP server instance
 * @returns {WebSocketServer}
 */
const initialize = (server) => {
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    maxPayload: 64 * 1024, // 64 KB
  });

  wss.on('connection', (ws, req) => {
    handleConnection(ws, req);
  });

  // Heartbeat: ping every 30 seconds, terminate stale connections
  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const meta = clientMeta.get(ws);
      if (meta && !meta.isAlive) {
        console.log(`WebSocket heartbeat: terminating stale connection for ${meta.userId || meta.sessionId}`);
        return ws.terminate();
      }
      if (meta) {
        meta.isAlive = false;
      }
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  console.log('WebSocket server initialized on /ws');
  return wss;
};

/**
 * Handle a new WebSocket connection.
 */
const handleConnection = (ws, req) => {
  let userId = null;
  let sessionId = uuidv4();

  // Attempt to authenticate via query parameter or protocol header
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
    }
  } catch (err) {
    // Token verification failed; continue as anonymous
    console.log('WebSocket auth failed (continuing as anonymous):', err.message);
  }

  // Store metadata
  const meta = {
    userId,
    sessionId,
    isAlive: true,
    connectedAt: new Date(),
  };
  clientMeta.set(ws, meta);

  // Register in clients map
  const clientKey = userId || `anon:${sessionId}`;
  if (!clients.has(clientKey)) {
    clients.set(clientKey, new Set());
  }
  clients.get(clientKey).add(ws);

  console.log(`WebSocket connected: ${clientKey} (total connections: ${countConnections()})`);

  // Send welcome message
  sendToSocket(ws, {
    type: 'connection_established',
    data: {
      session_id: sessionId,
      authenticated: !!userId,
      user_id: userId,
      timestamp: new Date().toISOString(),
    },
  });

  // Handle pong (heartbeat response)
  ws.on('pong', () => {
    const m = clientMeta.get(ws);
    if (m) m.isAlive = true;
  });

  // Handle incoming messages
  ws.on('message', (data) => {
    handleIncomingMessage(ws, data, meta);
  });

  // Handle close
  ws.on('close', (code, reason) => {
    console.log(`WebSocket disconnected: ${clientKey} (code: ${code})`);
    removeClient(ws, clientKey);
  });

  // Handle errors
  ws.on('error', (err) => {
    console.error(`WebSocket error for ${clientKey}:`, err.message);
    removeClient(ws, clientKey);
  });
};

/**
 * Handle an incoming WebSocket message from a client.
 */
const handleIncomingMessage = (ws, rawData, meta) => {
  try {
    const data = JSON.parse(rawData.toString());

    switch (data.type) {
      case 'ping':
        sendToSocket(ws, { type: 'pong', data: { timestamp: new Date().toISOString() } });
        break;

      case 'typing_indicator':
        // Broadcast typing status to conversation participants
        if (data.data && data.data.conversation_id) {
          broadcastToConversation(data.data.conversation_id, {
            type: 'typing_indicator',
            data: {
              user_id: meta.userId,
              conversation_id: data.data.conversation_id,
              is_typing: data.data.is_typing || false,
            },
          }, meta.userId);
        }
        break;

      case 'subscribe':
        // Subscribe to specific channels/events
        if (data.channel) {
          if (!meta.subscriptions) meta.subscriptions = new Set();
          meta.subscriptions.add(data.channel);
          sendToSocket(ws, {
            type: 'subscribed',
            data: { channel: data.channel },
          });
        }
        break;

      case 'unsubscribe':
        if (data.channel && meta.subscriptions) {
          meta.subscriptions.delete(data.channel);
          sendToSocket(ws, {
            type: 'unsubscribed',
            data: { channel: data.channel },
          });
        }
        break;

      case 'authenticate':
        // Allow late authentication
        if (data.token) {
          try {
            const decoded = jwt.verify(data.token, JWT_SECRET);
            const oldKey = meta.userId || `anon:${meta.sessionId}`;

            // Remove from old client key
            removeClient(ws, oldKey);

            // Update meta
            meta.userId = decoded.id;

            // Register under new key
            const newKey = decoded.id;
            if (!clients.has(newKey)) {
              clients.set(newKey, new Set());
            }
            clients.get(newKey).add(ws);

            sendToSocket(ws, {
              type: 'authenticated',
              data: {
                user_id: decoded.id,
                timestamp: new Date().toISOString(),
              },
            });
          } catch (err) {
            sendToSocket(ws, {
              type: 'auth_error',
              data: { error: 'Invalid token' },
            });
          }
        }
        break;

      default:
        sendToSocket(ws, {
          type: 'error',
          data: { error: `Unknown message type: ${data.type}` },
        });
    }
  } catch (err) {
    sendToSocket(ws, {
      type: 'error',
      data: { error: 'Invalid message format. Expected JSON.' },
    });
  }
};

/**
 * Send a JSON message to a specific WebSocket.
 */
const sendToSocket = (ws, payload) => {
  if (ws.readyState === ws.OPEN) {
    try {
      ws.send(JSON.stringify(payload));
    } catch (err) {
      console.error('WebSocket send error:', err.message);
    }
  }
};

/**
 * Send a message to all connections for a specific user.
 *
 * @param {string} userId  The user's UUID
 * @param {object} payload The message payload
 */
const sendToUser = (userId, payload) => {
  const userClients = clients.get(userId);
  if (userClients) {
    for (const ws of userClients) {
      sendToSocket(ws, payload);
    }
  }
};

/**
 * Broadcast a message to all connected clients.
 *
 * @param {object} payload        The message payload
 * @param {string} excludeUserId  User to exclude (optional)
 */
const broadcast = (payload, excludeUserId = null) => {
  for (const [key, sockets] of clients) {
    if (excludeUserId && key === excludeUserId) continue;
    for (const ws of sockets) {
      sendToSocket(ws, payload);
    }
  }
};

/**
 * Broadcast to all connections subscribed to a specific channel.
 *
 * @param {string} channel        The channel name
 * @param {object} payload        The message payload
 * @param {string} excludeUserId  User to exclude (optional)
 */
const broadcastToChannel = (channel, payload, excludeUserId = null) => {
  for (const [key, sockets] of clients) {
    if (excludeUserId && key === excludeUserId) continue;
    for (const ws of sockets) {
      const meta = clientMeta.get(ws);
      if (meta && meta.subscriptions && meta.subscriptions.has(channel)) {
        sendToSocket(ws, payload);
      }
    }
  }
};

/**
 * Broadcast to participants of a conversation.
 * (For now, conversation participants = the conversation owner.)
 */
const broadcastToConversation = (conversationId, payload, excludeUserId = null) => {
  // Broadcast to all who have subscribed to this conversation channel
  broadcastToChannel(`conversation:${conversationId}`, payload, excludeUserId);
};

/**
 * Send an order status update to a user.
 *
 * @param {string} userId  User UUID
 * @param {object} order   Order data
 */
const sendOrderUpdate = (userId, order) => {
  sendToUser(userId, {
    type: 'order_update',
    data: {
      order_id: order.order_id,
      status: order.status,
      tracking_number: order.tracking_number,
      estimated_delivery_date: order.estimated_delivery_date,
      updated_at: new Date().toISOString(),
    },
  });
};

/**
 * Send a notification to a user via WebSocket.
 *
 * @param {string} userId        User UUID
 * @param {object} notification  Notification data
 */
const sendNotification = (userId, notification) => {
  sendToUser(userId, {
    type: 'notification',
    data: {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata,
      created_at: notification.created_at || new Date().toISOString(),
    },
  });
};

/**
 * Remove a client from the registry.
 */
const removeClient = (ws, clientKey) => {
  const socketSet = clients.get(clientKey);
  if (socketSet) {
    socketSet.delete(ws);
    if (socketSet.size === 0) {
      clients.delete(clientKey);
    }
  }
  clientMeta.delete(ws);
};

/**
 * Count total active connections.
 */
const countConnections = () => {
  let count = 0;
  for (const sockets of clients.values()) {
    count += sockets.size;
  }
  return count;
};

/**
 * Get a snapshot of connected clients for monitoring.
 */
const getStatus = () => {
  const connectedUsers = [];
  for (const [key, sockets] of clients) {
    connectedUsers.push({
      clientKey: key,
      connections: sockets.size,
      isAuthenticated: !key.startsWith('anon:'),
    });
  }

  return {
    totalConnections: countConnections(),
    uniqueClients: clients.size,
    clients: connectedUsers,
  };
};

module.exports = {
  initialize,
  sendToUser,
  sendToSocket,
  broadcast,
  broadcastToChannel,
  broadcastToConversation,
  sendOrderUpdate,
  sendNotification,
  getStatus,
  countConnections,
};
