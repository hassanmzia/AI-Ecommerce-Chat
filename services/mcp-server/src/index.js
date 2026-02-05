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

const { ToolRegistry, ToolNotFoundError, ValidationError, TimeoutError, ToolExecutionError } = require('./protocols/toolRegistry');

// Import tools
const customerTool = require('./tools/customerTool');
const orderTool = require('./tools/orderTool');
const productTool = require('./tools/productTool');
const paymentTool = require('./tools/paymentTool');
const recommendationTool = require('./tools/recommendationTool');
const inventoryTool = require('./tools/inventoryTool');
const couponTool = require('./tools/couponTool');
const analyticsTool = require('./tools/analyticsTool');

// ─── Configuration ───────────────────────────────────────────────
const PORT = parseInt(process.env.PORT, 10) || 3068;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://ecommerce_user:ecommerce_secure_pass_2024@localhost:5499/ecommerce_chat';
const REDIS_URL = process.env.REDIS_URL || 'redis://:redis_secure_pass_2024@localhost:6399/2';

// ─── PostgreSQL Connection Pool ──────────────────────────────────
const db = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

db.on('error', (err) => {
  console.error('[MCP] PostgreSQL pool error:', err.message);
});

// ─── Redis Client ────────────────────────────────────────────────
let redis = null;

async function connectRedis() {
  try {
    redis = createClient({ url: REDIS_URL });
    redis.on('error', (err) => {
      console.error('[MCP] Redis error:', err.message);
    });
    await redis.connect();
    console.log('[MCP] Connected to Redis');
  } catch (err) {
    console.warn('[MCP] Redis connection failed, running without cache:', err.message);
    redis = null;
  }
}

// ─── Tool Registry Setup ─────────────────────────────────────────
const registry = new ToolRegistry();

// Register logging middleware
registry.use(async (toolName, params, context) => {
  console.log(`[MCP] Tool invocation: ${toolName}`, JSON.stringify(params));
});

// Register all tools
registry.register(customerTool);
registry.register(orderTool);
registry.register(productTool);
registry.register(paymentTool);
registry.register(recommendationTool);
registry.register(inventoryTool);
registry.register(couponTool);
registry.register(analyticsTool);

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
    console.log(`[MCP] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
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
  console.log(`[MCP-WS] Client connected: ${clientId}`);

  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    timestamp: new Date().toISOString(),
    availableTools: registry.listTools().map(t => t.name)
  }));

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === 'invoke') {
        const { tool, params, requestId } = data;
        try {
          const result = await registry.invoke(tool, params || {}, { db, redis });
          ws.send(JSON.stringify({
            type: 'tool_result',
            requestId: requestId || uuidv4(),
            tool,
            ...result,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'tool_error',
            requestId: requestId || uuidv4(),
            tool,
            error: error.message,
            errorType: error.name,
            timestamp: new Date().toISOString()
          }));
        }
      } else if (data.type === 'list_tools') {
        ws.send(JSON.stringify({
          type: 'tools_list',
          tools: registry.listTools(),
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
    console.log(`[MCP-WS] Client disconnected: ${clientId}`);
  });

  ws.on('error', (err) => {
    console.error(`[MCP-WS] Client error (${clientId}):`, err.message);
    wsClients.delete(ws);
  });
});

// Broadcast tool events to all connected WS clients
function broadcastToolEvent(event) {
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

  if (pathname === '/mcp/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// ─── MCP Routes ──────────────────────────────────────────────────

/**
 * GET /mcp/tools - List all available tools with schemas
 */
app.get('/mcp/tools', (req, res) => {
  const tools = registry.listTools();
  res.json({
    protocol: 'MCP',
    version: '1.0.0',
    server: 'ai-ecommerce-mcp-server',
    tools,
    total: tools.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /mcp/tools/:name/schema - Get tool schema
 */
app.get('/mcp/tools/:name/schema', (req, res) => {
  const { name } = req.params;
  const schema = registry.getToolSchema(name);

  if (!schema) {
    return res.status(404).json({
      error: 'Tool not found',
      message: `Tool "${name}" is not registered`,
      available_tools: registry.listTools().map(t => t.name)
    });
  }

  res.json({
    protocol: 'MCP',
    version: '1.0.0',
    ...schema,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /mcp/tools/:name/invoke - Invoke a specific tool
 */
app.post('/mcp/tools/:name/invoke', async (req, res) => {
  const { name } = req.params;
  const params = req.body.params || req.body;
  const timeout = req.body.timeout || 30000;

  const invocationId = uuidv4();

  // Broadcast invocation start
  broadcastToolEvent({
    type: 'tool_invocation_start',
    invocationId,
    tool: name,
    timestamp: new Date().toISOString()
  });

  try {
    const result = await registry.invoke(name, params, { db, redis }, { timeout });

    // Broadcast invocation complete
    broadcastToolEvent({
      type: 'tool_invocation_complete',
      invocationId,
      tool: name,
      status: 'success',
      duration: result.duration,
      timestamp: new Date().toISOString()
    });

    res.json({
      invocationId,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const statusCode = error.statusCode || 500;

    // Broadcast invocation failure
    broadcastToolEvent({
      type: 'tool_invocation_failed',
      invocationId,
      tool: name,
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString()
    });

    const errorResponse = {
      invocationId,
      tool: name,
      status: 'error',
      error: error.message,
      errorType: error.name,
      timestamp: new Date().toISOString()
    };

    if (error instanceof ValidationError && error.errors) {
      errorResponse.validationErrors = error.errors;
    }

    res.status(statusCode).json(errorResponse);
  }
});

/**
 * GET /mcp/health - Health check
 */
app.get('/mcp/health', async (req, res) => {
  const health = {
    status: 'healthy',
    service: 'mcp-server',
    protocol: 'MCP',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {}
  };

  // Check PostgreSQL
  try {
    const result = await db.query('SELECT 1 as ok');
    health.checks.database = {
      status: 'healthy',
      latency: null
    };
    const dbStart = Date.now();
    await db.query('SELECT 1');
    health.checks.database.latency = Date.now() - dbStart;
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

  // WebSocket status
  health.checks.websocket = {
    status: 'healthy',
    connectedClients: wsClients.size
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * GET /mcp/status - Server status with metrics
 */
app.get('/mcp/status', (req, res) => {
  const status = registry.getStatus();

  res.json({
    protocol: 'MCP',
    version: '1.0.0',
    server: 'ai-ecommerce-mcp-server',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    websocket_clients: wsClients.size,
    ...status,
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
      'GET /mcp/tools',
      'GET /mcp/tools/:name/schema',
      'POST /mcp/tools/:name/invoke',
      'GET /mcp/health',
      'GET /mcp/status',
      'WS /mcp/ws'
    ]
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('[MCP] Unhandled error:', err);
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
    console.log('[MCP] Connected to PostgreSQL');

    // Connect to Redis
    await connectRedis();

    // Start HTTP + WebSocket server
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[MCP] Model Context Protocol Server running on port ${PORT}`);
      console.log(`[MCP] Tools registered: ${registry.listTools().map(t => t.name).join(', ')}`);
      console.log(`[MCP] Endpoints:`);
      console.log(`  GET  http://0.0.0.0:${PORT}/mcp/tools`);
      console.log(`  GET  http://0.0.0.0:${PORT}/mcp/tools/:name/schema`);
      console.log(`  POST http://0.0.0.0:${PORT}/mcp/tools/:name/invoke`);
      console.log(`  GET  http://0.0.0.0:${PORT}/mcp/health`);
      console.log(`  GET  http://0.0.0.0:${PORT}/mcp/status`);
      console.log(`  WS   ws://0.0.0.0:${PORT}/mcp/ws`);
    });
  } catch (err) {
    console.error('[MCP] Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal) {
  console.log(`[MCP] Received ${signal}, shutting down gracefully...`);

  // Close WebSocket connections
  for (const client of wsClients) {
    client.close(1001, 'Server shutting down');
  }

  // Close HTTP server
  server.close(() => {
    console.log('[MCP] HTTP server closed');
  });

  // Close database pool
  try {
    await db.end();
    console.log('[MCP] Database pool closed');
  } catch (err) {
    console.error('[MCP] Error closing database pool:', err.message);
  }

  // Close Redis
  if (redis) {
    try {
      await redis.quit();
      console.log('[MCP] Redis connection closed');
    } catch (err) {
      console.error('[MCP] Error closing Redis:', err.message);
    }
  }

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();

module.exports = { app, server, registry };
