const express = require('express');
const { body, param, query: check, validationResult } = require('express-validator');
const db = require('../config/database');
const { verifyToken, optionalAuth } = require('../middleware/auth');
const { chatLimiter } = require('../middleware/rateLimiter');
const chatController = require('../controllers/chatController');

const router = express.Router();

// -------------------------------------------------------
// POST /api/chat/message
// Send a message (proxied to AI service)
// -------------------------------------------------------
router.post(
  '/message',
  optionalAuth,
  chatLimiter,
  [
    body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 5000 }),
    body('conversation_id').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const { message, conversation_id } = req.body;
      const userId = req.user ? req.user.id : null;

      const result = await chatController.handleMessage({
        message,
        conversationId: conversation_id,
        userId,
        user: req.user,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// GET /api/chat/conversations
// List user's conversations
// -------------------------------------------------------
router.get(
  '/conversations',
  verifyToken,
  [
    check('page').optional().isInt({ min: 1 }).toInt(),
    check('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ],
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const offset = (page - 1) * limit;

      const countResult = await db.query(
        'SELECT COUNT(*) FROM conversations WHERE user_id = $1',
        [req.user.id]
      );
      const total = parseInt(countResult.rows[0].count, 10);

      const result = await db.query(
        `SELECT c.id, c.title, c.is_active, c.metadata, c.created_at, c.updated_at,
                (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count,
                (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message
         FROM conversations c
         WHERE c.user_id = $1
         ORDER BY c.updated_at DESC
         LIMIT $2 OFFSET $3`,
        [req.user.id, limit, offset]
      );

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// GET /api/chat/conversations/:id
// Get conversation messages
// -------------------------------------------------------
router.get(
  '/conversations/:id',
  verifyToken,
  [
    param('id').isUUID().withMessage('Valid conversation ID is required'),
    check('page').optional().isInt({ min: 1 }).toInt(),
    check('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;
      const offset = (page - 1) * limit;

      // Verify conversation ownership
      const convResult = await db.query(
        'SELECT * FROM conversations WHERE id = $1 AND user_id = $2',
        [id, req.user.id]
      );

      if (convResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Conversation not found.' });
      }

      const countResult = await db.query(
        'SELECT COUNT(*) FROM messages WHERE conversation_id = $1',
        [id]
      );
      const total = parseInt(countResult.rows[0].count, 10);

      const messagesResult = await db.query(
        `SELECT id, role, content, tool_calls, validation_status, metadata, created_at
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at ASC
         LIMIT $2 OFFSET $3`,
        [id, limit, offset]
      );

      res.json({
        success: true,
        data: {
          conversation: convResult.rows[0],
          messages: messagesResult.rows,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// DELETE /api/chat/conversations/:id
// Delete a conversation
// -------------------------------------------------------
router.delete(
  '/conversations/:id',
  verifyToken,
  [param('id').isUUID().withMessage('Valid conversation ID is required')],
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const result = await db.query(
        'DELETE FROM conversations WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Conversation not found.' });
      }

      res.json({
        success: true,
        message: 'Conversation deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// POST /api/chat/conversations
// Start a new conversation
// -------------------------------------------------------
router.post(
  '/conversations',
  verifyToken,
  [
    body('title').optional().trim().isLength({ max: 255 }),
    body('metadata').optional().isObject(),
  ],
  async (req, res, next) => {
    try {
      const { title, metadata } = req.body;

      const result = await db.query(
        `INSERT INTO conversations (user_id, title, metadata)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, title, is_active, metadata, created_at, updated_at`,
        [req.user.id, title || 'New Conversation', JSON.stringify(metadata || {})]
      );

      res.status(201).json({
        success: true,
        data: result.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
