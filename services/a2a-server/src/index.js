'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const { createClient } = require('redis');
const { WebSocketServer } = require('ws');
const http = require('http');

const { AgentRegistry } = require('./protocols/agentRegistry');
const { TaskManager, TaskError } = require('./protocols/taskManager');

// Import agents
const customerSupportAgent = require('./agents/customerSupportAgent');
const productAgent = require('./agents/productAgent');
const orderAgent = require('./agents/orderAgent');
const paymentAgent = require('./agents/paymentAgent');
const recommendationAgent = require('./agents/recommendationAgent');
const sentimentAgent = require('./agents/sentimentAgent');

// ─── Configuration ───────────────────────────────────────────────
const PORT = parseInt(process.env.PORT, 10) || 3069;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ecommerce_user:ecommerce_secure_pass_2024@localhost:5499/ecommerce_chat';
const REDIS_URL = process.env.REDIS_URL || 'redis://:redis_secure_pass_2024@localhost:6380/3';

// ─── PostgreSQL Connection Pool ──────────────────────────────────
const db = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

db.on('error', (err) => {
  console.error('[A2A] PostgreSQL pool error:', err.message);
});

// ─── Redis Client ────────────────────────────────────────────────
let redis = null;

async function connectRedis() {
  try {
    redis = createClient({ url: REDIS_URL });
    redis.on('error', (err) => {
      console.error('[A2A] Redis error:', err.message);
    });
    await redis.connect();
    console.log('[A2A] Connected to Redis');
  } catch (err) {
    console.warn('[A2A] Redis connection failed, running without cache:', err.message);
    redis = null;
  }
}

// ─── Express App ─────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Request ID middleware
app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[A2A] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// ─── WebSocket Server ────────────────────────────────────────────
const wss = new WebSocketServer({ noServer: true });
const wsClients = new Set();

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  ws.clientId = clientId;
  wsClients.add(ws);
  console.log(`[A2A-WS] Client connected: ${clientId}`);

  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    timestamp: new Date().toISOString(),
    availableAgents: agentRegistry.listAgents().map(a => ({ id: a.id, name: a.name }))
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'create_task') {
        try {
          const task = await taskManager.createTask({
            agentId: data.agentId,
            query: data.query,
            params: data.params || {},
            priority: data.priority,
            metadata: { ...data.metadata, wsClientId: clientId }
          });
          ws.send(JSON.stringify({
            type: 'task_created',
            task,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'task_error',
            error: error.message,
            timestamp: new Date().toISOString()
          }));
        }
      } else if (data.type === 'get_task') {
        const task = await taskManager.getTask(data.taskId);
        ws.send(JSON.stringify({
          type: 'task_status',
          task: task || { error: 'Task not found' },
          timestamp: new Date().toISOString()
        }));
      } else if (data.type === 'list_agents') {
        ws.send(JSON.stringify({
          type: 'agents_list',
          agents: agentRegistry.listAgents(),
          timestamp: new Date().toISOString()
        }));
      } else if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      }
    } catch (err) {
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  });

  ws.on('close', () => {
    wsClients.delete(ws);
    console.log(`[A2A-WS] Client disconnected: ${clientId}`);
  });

  ws.on('error', (err) => {
    console.error(`[A2A-WS] Client error (${clientId}):`, err.message);
    wsClients.delete(ws);
  });
});

// Broadcast function for task updates
function broadcastEvent(event) {
  const message = JSON.stringify(event);
  for (const client of wsClients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  }
}

// Handle HTTP -> WebSocket upgrade
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

  if (pathname === '/a2a/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// ─── Agent Registry Setup ────────────────────────────────────────
const agentRegistry = new AgentRegistry();

// Register all agents
agentRegistry.register(customerSupportAgent);
agentRegistry.register(productAgent);
agentRegistry.register(orderAgent);
agentRegistry.register(paymentAgent);
agentRegistry.register(recommendationAgent);
agentRegistry.register(sentimentAgent);

// ─── Task Manager Setup ──────────────────────────────────────────
let taskManager;

// ─── A2A Routes ──────────────────────────────────────────────────

/**
 * GET /a2a/agents - Discover available agents (Agent Cards)
 */
app.get('/a2a/agents', (req, res) => {
  const agents = agentRegistry.listAgents();
  res.json({
    protocol: 'A2A',
    version: '1.0.0',
    server: 'ai-ecommerce-a2a-server',
    agents,
    total: agents.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /a2a/agents/:id - Get specific agent card
 */
app.get('/a2a/agents/:id', (req, res) => {
  const agent = agentRegistry.getAgent(req.params.id);
  if (!agent) {
    return res.status(404).json({
      error: 'Agent not found',
      message: `Agent "${req.params.id}" is not registered`,
      available_agents: agentRegistry.listAgents().map(a => a.id)
    });
  }

  res.json({
    protocol: 'A2A',
    version: '1.0.0',
    ...agent.card,
    status: agent.status,
    health: agentRegistry.getHealth(req.params.id),
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /a2a/tasks - Create a new task for an agent
 */
app.post('/a2a/tasks', async (req, res) => {
  const { agentId, query, params, priority, metadata, callbackUrl } = req.body;

  if (!query) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'query is required'
    });
  }

  try {
    const task = await taskManager.createTask({
      agentId,
      query,
      params: params || {},
      priority,
      metadata: metadata || {},
      callbackUrl
    });

    res.status(201).json({
      protocol: 'A2A',
      version: '1.0.0',
      task,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: error.name || 'Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /a2a/tasks/:id - Get task status
 */
app.get('/a2a/tasks/:id', async (req, res) => {
  const task = await taskManager.getTask(req.params.id);

  if (!task) {
    return res.status(404).json({
      error: 'Task not found',
      message: `Task "${req.params.id}" does not exist`
    });
  }

  res.json({
    protocol: 'A2A',
    version: '1.0.0',
    task,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /a2a/tasks/:id/cancel - Cancel a task
 */
app.post('/a2a/tasks/:id/cancel', async (req, res) => {
  try {
    const task = await taskManager.cancelTask(req.params.id);
    res.json({
      protocol: 'A2A',
      version: '1.0.0',
      task: {
        id: task.id,
        status: task.status,
        agentId: task.agentId,
        cancelledAt: task.completedAt
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: error.name || 'Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /a2a/tasks - List all tasks (with optional filters)
 */
app.get('/a2a/tasks', async (req, res) => {
  const { status, agentId, limit } = req.query;
  const tasks = await taskManager.listTasks({
    status,
    agentId,
    limit: limit ? parseInt(limit, 10) : 50
  });

  res.json({
    protocol: 'A2A',
    version: '1.0.0',
    tasks,
    total: tasks.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /a2a/health - Health check
 */
app.get('/a2a/health', async (req, res) => {
  const health = {
    status: 'healthy',
    service: 'a2a-server',
    protocol: 'A2A',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {}
  };

  // Check PostgreSQL
  try {
    const dbStart = Date.now();
    await db.query('SELECT 1');
    health.checks.database = {
      status: 'healthy',
      latency: Date.now() - dbStart
    };
  } catch (err) {
    health.status = 'degraded';
    health.checks.database = {
      status: 'unhealthy',
      error: err.message
    };
  }

  // Check Redis
  if (redis) {
    try {
      const redisStart = Date.now();
      await redis.ping();
      health.checks.redis = {
        status: 'healthy',
        latency: Date.now() - redisStart
      };
    } catch (err) {
      health.checks.redis = {
        status: 'unhealthy',
        error: err.message
      };
    }
  } else {
    health.checks.redis = {
      status: 'disconnected',
      message: 'Running without Redis cache'
    };
  }

  // Check MCP Server connectivity
  try {
    const axios = require('axios');
    const mcpUrl = process.env.MCP_SERVER_URL || 'http://mcp-server:3068';
    const mcpStart = Date.now();
    const mcpResponse = await axios.get(`${mcpUrl}/mcp/health`, { timeout: 5000 });
    health.checks.mcp_server = {
      status: mcpResponse.data.status || 'healthy',
      latency: Date.now() - mcpStart
    };
  } catch (err) {
    health.checks.mcp_server = {
      status: 'unreachable',
      error: err.message
    };
  }

  // Agent health
  health.checks.agents = {
    status: 'healthy',
    total: agentRegistry.listAgents().length,
    health: agentRegistry.getHealth()
  };

  // WebSocket status
  health.checks.websocket = {
    status: 'healthy',
    connectedClients: wsClients.size
  };

  // Task manager stats
  health.checks.task_manager = taskManager.getStats();

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * GET /a2a/status - Server status with full metrics
 */
app.get('/a2a/status', (req, res) => {
  const agentStats = agentRegistry.getStats();
  const taskStats = taskManager.getStats();

  res.json({
    protocol: 'A2A',
    version: '1.0.0',
    server: 'ai-ecommerce-a2a-server',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    websocket_clients: wsClients.size,
    agents: agentStats,
    tasks: taskStats,
    timestamp: new Date().toISOString()
  });
});

// ─── Error Handling ──────────────────────────────────────────────

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    available_routes: [
      'GET /a2a/agents',
      'GET /a2a/agents/:id',
      'POST /a2a/tasks',
      'GET /a2a/tasks',
      'GET /a2a/tasks/:id',
      'POST /a2a/tasks/:id/cancel',
      'GET /a2a/health',
      'GET /a2a/status',
      'WS /a2a/ws'
    ]
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('[A2A] Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    requestId: req.requestId
  });
});

// ─── Server Startup ──────────────────────────────────────────────

async function startServer() {
  try {
    // Test database connection
    await db.query('SELECT NOW()');
    console.log('[A2A] Connected to PostgreSQL');

    // Connect to Redis
    await connectRedis();

    // Initialize Task Manager with dependencies
    taskManager = new TaskManager({
      agentRegistry,
      broadcastFn: broadcastEvent,
      db,
      redis
    });

    // Start HTTP + WebSocket server
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[A2A] Agent-to-Agent Protocol Server running on port ${PORT}`);
      console.log(`[A2A] Agents registered: ${agentRegistry.listAgents().map(a => a.id).join(', ')}`);
      console.log(`[A2A] Endpoints:`);
      console.log(`  GET  http://0.0.0.0:${PORT}/a2a/agents`);
      console.log(`  GET  http://0.0.0.0:${PORT}/a2a/agents/:id`);
      console.log(`  POST http://0.0.0.0:${PORT}/a2a/tasks`);
      console.log(`  GET  http://0.0.0.0:${PORT}/a2a/tasks`);
      console.log(`  GET  http://0.0.0.0:${PORT}/a2a/tasks/:id`);
      console.log(`  POST http://0.0.0.0:${PORT}/a2a/tasks/:id/cancel`);
      console.log(`  GET  http://0.0.0.0:${PORT}/a2a/health`);
      console.log(`  GET  http://0.0.0.0:${PORT}/a2a/status`);
      console.log(`  WS   ws://0.0.0.0:${PORT}/a2a/ws`);
    });
  } catch (err) {
    console.error('[A2A] Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal) {
  console.log(`[A2A] Received ${signal}, shutting down gracefully...`);

  // Close WebSocket connections
  for (const client of wsClients) {
    client.close(1001, 'Server shutting down');
  }

  // Close HTTP server
  server.close(() => {
    console.log('[A2A] HTTP server closed');
  });

  // Close database pool
  try {
    await db.end();
    console.log('[A2A] Database pool closed');
  } catch (err) {
    console.error('[A2A] Error closing database pool:', err.message);
  }

  // Close Redis
  if (redis) {
    try {
      await redis.quit();
      console.log('[A2A] Redis connection closed');
    } catch (err) {
      console.error('[A2A] Error closing Redis:', err.message);
    }
  }

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();

module.exports = { app, server, agentRegistry, taskManager };
