const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { cacheGet, cacheSet } = require('../config/redis');

const JWT_SECRET = process.env.JWT_SECRET || 'ecommerce-chat-jwt-secret-key-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate an access token for a user.
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Generate a refresh token for a user.
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      type: 'refresh',
    },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
};

/**
 * Middleware: Verify JWT from the Authorization header.
 * Attaches the decoded user payload to req.user on success.
 */
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide a valid token.',
      });
    }

    const token = authHeader.split(' ')[1];

    // Check if token has been blacklisted (logged out)
    const blacklisted = await cacheGet(`blacklist:${token}`);
    if (blacklisted) {
      return res.status(401).json({
        success: false,
        error: 'Token has been invalidated. Please log in again.',
      });
    }

    // Verify and decode the token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Optionally fetch fresh user data from the database (with caching)
    let user = await cacheGet(`user:${decoded.id}`);
    if (!user) {
      const result = await db.query(
        'SELECT id, email, full_name, phone, role, avatar_url, loyalty_tier, loyalty_points, is_active FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'User not found.',
        });
      }

      user = result.rows[0];

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          error: 'Account has been deactivated.',
        });
      }

      // Cache the user data for 5 minutes
      await cacheSet(`user:${decoded.id}`, user, 300);
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token has expired. Please refresh your token or log in again.',
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token.',
      });
    }
    console.error('Auth middleware error:', err);
    return res.status(500).json({
      success: false,
      error: 'Authentication error.',
    });
  }
};

/**
 * Middleware: Allow unauthenticated access.
 * If a valid token is present it will be decoded and attached to req.user,
 * but requests without tokens are still allowed through.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];

    const blacklisted = await cacheGet(`blacklist:${token}`);
    if (blacklisted) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    let user = await cacheGet(`user:${decoded.id}`);
    if (!user) {
      const result = await db.query(
        'SELECT id, email, full_name, phone, role, avatar_url, loyalty_tier, loyalty_points, is_active FROM users WHERE id = $1',
        [decoded.id]
      );

      if (result.rows.length > 0 && result.rows[0].is_active) {
        user = result.rows[0];
        await cacheSet(`user:${decoded.id}`, user, 300);
      }
    }

    req.user = user || null;
    req.token = token;
    next();
  } catch {
    req.user = null;
    next();
  }
};

/**
 * Middleware factory: Restrict access to specific roles.
 * @param  {...string} roles  Allowed roles (e.g. 'admin', 'user')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions. Required role(s): ' + roles.join(', '),
      });
    }

    next();
  };
};

module.exports = {
  JWT_SECRET,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  optionalAuth,
  requireRole,
};
