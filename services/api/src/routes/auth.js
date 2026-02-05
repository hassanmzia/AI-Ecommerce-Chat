const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { cacheSet, cacheDel, cacheGet } = require('../config/redis');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  JWT_SECRET,
} = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const jwt = require('jsonwebtoken');

const router = express.Router();

// -------------------------------------------------------
// POST /api/auth/register
// -------------------------------------------------------
router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[a-zA-Z]/)
      .withMessage('Password must contain at least one letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number'),
    body('full_name')
      .trim()
      .isLength({ min: 2, max: 255 })
      .withMessage('Full name must be between 2 and 255 characters'),
    body('phone').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { email, password, full_name, phone } = req.body;

      // Check if user already exists
      const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email already exists.',
        });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      // Insert user
      const result = await db.query(
        `INSERT INTO users (email, password_hash, full_name, phone)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, full_name, phone, role, avatar_url, loyalty_tier, loyalty_points, is_active, created_at`,
        [email, password_hash, full_name, phone || null]
      );

      const user = result.rows[0];

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Store refresh token in Redis
      await cacheSet(`refresh:${user.id}`, refreshToken, 7 * 24 * 60 * 60);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            role: user.role,
            avatar_url: user.avatar_url,
            loyalty_tier: user.loyalty_tier,
            loyalty_points: user.loyalty_points,
            created_at: user.created_at,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// POST /api/auth/login
// -------------------------------------------------------
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Look up user
      const result = await db.query(
        `SELECT id, email, password_hash, full_name, phone, role, avatar_url,
                loyalty_tier, loyalty_points, is_active, created_at
         FROM users WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password.',
        });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          error: 'Account has been deactivated. Please contact support.',
        });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password.',
        });
      }

      // Generate tokens
      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      // Store refresh token
      await cacheSet(`refresh:${user.id}`, refreshToken, 7 * 24 * 60 * 60);

      // Cache user data
      const userData = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        avatar_url: user.avatar_url,
        loyalty_tier: user.loyalty_tier,
        loyalty_points: user.loyalty_points,
        is_active: user.is_active,
      };
      await cacheSet(`user:${user.id}`, userData, 300);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            phone: user.phone,
            role: user.role,
            avatar_url: user.avatar_url,
            loyalty_tier: user.loyalty_tier,
            loyalty_points: user.loyalty_points,
            created_at: user.created_at,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// POST /api/auth/refresh
// -------------------------------------------------------
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required.',
      });
    }

    // Verify the refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token.',
      });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token type.',
      });
    }

    // Check that the stored refresh token matches
    const stored = await cacheGet(`refresh:${decoded.id}`);
    if (!stored || stored !== refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token has been revoked.',
      });
    }

    // Fetch user
    const result = await db.query(
      `SELECT id, email, full_name, phone, role, avatar_url,
              loyalty_tier, loyalty_points, is_active
       FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      return res.status(401).json({
        success: false,
        error: 'User not found or deactivated.',
      });
    }

    const user = result.rows[0];

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    await cacheSet(`refresh:${user.id}`, newRefreshToken, 7 * 24 * 60 * 60);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------
// POST /api/auth/logout
// -------------------------------------------------------
router.post('/logout', verifyToken, async (req, res, next) => {
  try {
    // Blacklist the current access token (TTL = remaining token lifetime)
    const decoded = jwt.decode(req.token);
    const ttl = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 86400;
    if (ttl > 0) {
      await cacheSet(`blacklist:${req.token}`, true, ttl);
    }

    // Remove refresh token
    await cacheDel(`refresh:${req.user.id}`);

    // Remove cached user data
    await cacheDel(`user:${req.user.id}`);

    res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------
// GET /api/auth/me
// -------------------------------------------------------
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, email, full_name, phone, role, avatar_url,
              loyalty_tier, loyalty_points, is_active, created_at, updated_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found.',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------
// PUT /api/auth/me
// -------------------------------------------------------
router.put(
  '/me',
  verifyToken,
  [
    body('full_name').optional().trim().isLength({ min: 2, max: 255 }),
    body('phone').optional().trim(),
    body('avatar_url').optional().trim().isURL().withMessage('Must be a valid URL'),
    body('password')
      .optional()
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { full_name, phone, avatar_url, password } = req.body;

      // Build dynamic update
      const updates = [];
      const values = [];
      let paramIdx = 1;

      if (full_name !== undefined) {
        updates.push(`full_name = $${paramIdx++}`);
        values.push(full_name);
      }
      if (phone !== undefined) {
        updates.push(`phone = $${paramIdx++}`);
        values.push(phone);
      }
      if (avatar_url !== undefined) {
        updates.push(`avatar_url = $${paramIdx++}`);
        values.push(avatar_url);
      }
      if (password) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        updates.push(`password_hash = $${paramIdx++}`);
        values.push(hash);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update.',
        });
      }

      values.push(req.user.id);
      const result = await db.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIdx}
         RETURNING id, email, full_name, phone, role, avatar_url, loyalty_tier, loyalty_points, is_active, created_at, updated_at`,
        values
      );

      // Invalidate cached user
      await cacheDel(`user:${req.user.id}`);

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
