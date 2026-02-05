require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');

// Config
const db = require('./config/database');
const { connectRedis, disconnectRedis } = require('./config/redis');

// Middleware
const { generalLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const chatRoutes = require('./routes/chat');
const cartRoutes = require('./routes/cart');
const wishlistRoutes = require('./routes/wishlist');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');

// WebSocket
const wsHandler = require('./websocket/handler');

// AI Service (for health check)
const aiService = require('./services/aiService');

// -------------------------------------------------------
// Application setup
// -------------------------------------------------------
const PORT = parseInt(process.env.PORT, 10) || 3066;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://172.168.1.95:3065';
const NODE_ENV = process.env.NODE_ENV || 'development';

const app = express();
const server = http.createServer(app);

// -------------------------------------------------------
// Trust proxy (for rate limiting behind reverse proxies)
// -------------------------------------------------------
app.set('trust proxy', 1);

// -------------------------------------------------------
// Security headers
// -------------------------------------------------------
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  })
);

// -------------------------------------------------------
// CORS configuration
// -------------------------------------------------------
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      FRONTEND_URL,
      'http://localhost:3065',
      'http://localhost:3066',
    ];

    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (NODE_ENV === 'development') {
      // In development, allow all origins
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // Pre-flight cache for 24 hours
};

app.use(cors(corsOptions));

// -------------------------------------------------------
// Body parsing
// -------------------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// -------------------------------------------------------
// Compression
// -------------------------------------------------------
app.use(compression());

// -------------------------------------------------------
// Logging
// -------------------------------------------------------
if (NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// -------------------------------------------------------
// Rate limiting (global)
// -------------------------------------------------------
app.use('/api/', generalLimiter);

// -------------------------------------------------------
// Health check endpoint (no auth, no rate limit)
// -------------------------------------------------------
app.get('/health', async (req, res) => {
  const dbHealthy = await db.testConnection().catch(() => false);
  const aiHealth = await aiService.getAgentHealth();
  const wsStatus = wsHandler.getStatus();

  const isHealthy = dbHealthy;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    services: {
      database: dbHealthy ? 'connected' : 'disconnected',
      ai_service: aiHealth.status,
      websocket: {
        connections: wsStatus.totalConnections,
        uniqueClients: wsStatus.uniqueClients,
      },
    },
  });
});

// -------------------------------------------------------
// API routes
// -------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);

// -------------------------------------------------------
// WebSocket status endpoint (admin)
// -------------------------------------------------------
app.get('/api/ws/status', (req, res) => {
  res.json({
    success: true,
    data: wsHandler.getStatus(),
  });
});

// -------------------------------------------------------
// Root endpoint
// -------------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    name: 'AI E-Commerce Chat API',
    version: '1.0.0',
    documentation: '/api',
    health: '/health',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      orders: '/api/orders',
      chat: '/api/chat',
      cart: '/api/cart',
      wishlist: '/api/wishlist',
      admin: '/api/admin',
      notifications: '/api/notifications',
      analytics: '/api/analytics',
    },
  });
});

// -------------------------------------------------------
// 404 & Error handling
// -------------------------------------------------------
app.use(notFound);
app.use(errorHandler);

// -------------------------------------------------------
// Initialize WebSocket server
// -------------------------------------------------------
wsHandler.initialize(server);

// -------------------------------------------------------
// Startup: connect to services, then listen
// -------------------------------------------------------
const start = async () => {
  console.log('========================================');
  console.log('  AI E-Commerce Chat API');
  console.log(`  Environment: ${NODE_ENV}`);
  console.log('========================================');

  // Connect to PostgreSQL
  console.log('\nConnecting to PostgreSQL...');
  const dbConnected = await db.testConnection();
  if (!dbConnected) {
    console.error('WARNING: Database connection failed. Some features may not work.');
  }

  // Connect to Redis
  console.log('\nConnecting to Redis...');
  const redisConnected = await connectRedis();
  if (!redisConnected) {
    console.error('WARNING: Redis connection failed. Caching and rate limiting may fall back to in-memory.');
  }

  // Check AI service
  console.log('\nChecking AI service...');
  const aiHealth = await aiService.getAgentHealth();
  if (aiHealth.status === 'healthy') {
    console.log(`AI service is healthy (latency: ${aiHealth.latency_ms}ms)`);
  } else {
    console.warn('WARNING: AI service is not available:', aiHealth.error);
  }

  // Start HTTP server
  server.listen(PORT, '0.0.0.0', () => {
    console.log('\n========================================');
    console.log(`  Server listening on port ${PORT}`);
    console.log(`  Frontend CORS: ${FRONTEND_URL}`);
    console.log(`  WebSocket: ws://0.0.0.0:${PORT}/ws`);
    console.log('========================================\n');
  });
};

// -------------------------------------------------------
// Graceful shutdown
// -------------------------------------------------------
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed');
  });

  // Close database pool
  try {
    await db.close();
    console.log('Database connection closed');
  } catch (err) {
    console.error('Error closing database:', err.message);
  }

  // Disconnect Redis
  try {
    await disconnectRedis();
    console.log('Redis connection closed');
  } catch (err) {
    console.error('Error closing Redis:', err.message);
  }

  console.log('Graceful shutdown complete');
  process.exit(0);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

// Start the application
start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = { app, server };
