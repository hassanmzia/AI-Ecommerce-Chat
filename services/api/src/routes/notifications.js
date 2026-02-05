const express = require('express');
const { param, query: check, validationResult } = require('express-validator');
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// All notification routes require authentication
router.use(verifyToken);

// -------------------------------------------------------
// GET /api/notifications
// List user's notifications
// -------------------------------------------------------
router.get(
  '/',
  [
    check('page').optional().isInt({ min: 1 }).toInt(),
    check('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    check('unread_only').optional().isBoolean().toBoolean(),
  ],
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const offset = (page - 1) * limit;
      const unreadOnly = req.query.unread_only === 'true' || req.query.unread_only === true;

      const conditions = ['n.user_id = $1'];
      const values = [req.user.id];
      let paramIdx = 2;

      if (unreadOnly) {
        conditions.push('n.is_read = false');
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const countResult = await db.query(
        `SELECT COUNT(*) FROM notifications n ${whereClause}`,
        values
      );
      const total = parseInt(countResult.rows[0].count, 10);

      // Unread count (always return this)
      const unreadResult = await db.query(
        'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
        [req.user.id]
      );
      const unreadCount = parseInt(unreadResult.rows[0].count, 10);

      values.push(limit, offset);
      const result = await db.query(
        `SELECT n.id, n.type, n.title, n.message, n.is_read, n.metadata, n.created_at
         FROM notifications n
         ${whereClause}
         ORDER BY n.created_at DESC
         LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        values
      );

      res.json({
        success: true,
        data: result.rows,
        unreadCount,
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
// PUT /api/notifications/:id/read
// Mark a single notification as read
// -------------------------------------------------------
router.put(
  '/:id/read',
  [param('id').isUUID().withMessage('Valid notification ID is required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const { id } = req.params;

      const result = await db.query(
        `UPDATE notifications SET is_read = true
         WHERE id = $1 AND user_id = $2
         RETURNING id, type, title, message, is_read, metadata, created_at`,
        [id, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Notification not found.' });
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// PUT /api/notifications/read-all
// Mark all notifications as read
// -------------------------------------------------------
router.put('/read-all', async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE notifications SET is_read = true
       WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );

    res.json({
      success: true,
      message: `${result.rowCount} notification(s) marked as read.`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
