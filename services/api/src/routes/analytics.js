const express = require('express');
const { body, query: check, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { optionalAuth, verifyToken, requireRole } = require('../middleware/auth');
const { analyticsLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// -------------------------------------------------------
// POST /api/analytics/event
// Track an analytics event
// -------------------------------------------------------
router.post(
  '/event',
  optionalAuth,
  analyticsLimiter,
  [
    body('event_type')
      .notEmpty()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Event type is required'),
    body('event_data').optional().isObject(),
    body('page_url').optional().trim().isLength({ max: 2000 }),
    body('session_id').optional().trim().isLength({ max: 100 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const { event_type, event_data, page_url, session_id } = req.body;
      const userId = req.user ? req.user.id : null;

      const result = await db.query(
        `INSERT INTO analytics_events (user_id, event_type, event_data, page_url, session_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, event_type, created_at`,
        [
          userId,
          event_type,
          JSON.stringify(event_data || {}),
          page_url || null,
          session_id || null,
        ]
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

// -------------------------------------------------------
// GET /api/analytics/dashboard
// Analytics dashboard (admin only)
// -------------------------------------------------------
router.get(
  '/dashboard',
  verifyToken,
  requireRole('admin'),
  [
    check('start_date').optional().isISO8601(),
    check('end_date').optional().isISO8601(),
    check('range').optional().isIn(['7', '14', '30', '60', '90']),
  ],
  async (req, res, next) => {
    try {
      let startDate, endDate;
      const range = parseInt(req.query.range, 10) || 30;

      if (req.query.start_date && req.query.end_date) {
        startDate = req.query.start_date;
        endDate = req.query.end_date;
      } else {
        endDate = new Date().toISOString();
        const start = new Date();
        start.setDate(start.getDate() - range);
        startDate = start.toISOString();
      }

      const [
        totalEvents,
        uniqueUsers,
        uniqueSessions,
        eventBreakdown,
        dailyTrend,
        topPages,
        recentEvents,
        userEngagement,
        chatAnalytics,
      ] = await Promise.all([
        db.query(
          'SELECT COUNT(*) FROM analytics_events WHERE created_at BETWEEN $1 AND $2',
          [startDate, endDate]
        ),
        db.query(
          'SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE user_id IS NOT NULL AND created_at BETWEEN $1 AND $2',
          [startDate, endDate]
        ),
        db.query(
          'SELECT COUNT(DISTINCT session_id) FROM analytics_events WHERE session_id IS NOT NULL AND created_at BETWEEN $1 AND $2',
          [startDate, endDate]
        ),
        db.query(
          `SELECT event_type, COUNT(*) as count
           FROM analytics_events
           WHERE created_at BETWEEN $1 AND $2
           GROUP BY event_type
           ORDER BY count DESC`,
          [startDate, endDate]
        ),
        db.query(
          `SELECT DATE(created_at) as date,
                  COUNT(*) as events,
                  COUNT(DISTINCT user_id) as unique_users,
                  COUNT(DISTINCT session_id) as sessions
           FROM analytics_events
           WHERE created_at BETWEEN $1 AND $2
           GROUP BY DATE(created_at)
           ORDER BY date ASC`,
          [startDate, endDate]
        ),
        db.query(
          `SELECT page_url, COUNT(*) as views,
                  COUNT(DISTINCT user_id) as unique_viewers
           FROM analytics_events
           WHERE event_type IN ('page_view', 'product_view')
           AND created_at BETWEEN $1 AND $2
           AND page_url IS NOT NULL
           GROUP BY page_url
           ORDER BY views DESC
           LIMIT 15`,
          [startDate, endDate]
        ),
        db.query(
          `SELECT id, user_id, event_type, event_data, page_url, session_id, created_at
           FROM analytics_events
           WHERE created_at BETWEEN $1 AND $2
           ORDER BY created_at DESC
           LIMIT 20`,
          [startDate, endDate]
        ),
        db.query(
          `SELECT
             u.id, u.full_name, u.email,
             COUNT(ae.id) as event_count,
             COUNT(DISTINCT ae.session_id) as session_count
           FROM users u
           JOIN analytics_events ae ON u.id = ae.user_id
           WHERE ae.created_at BETWEEN $1 AND $2
           GROUP BY u.id, u.full_name, u.email
           ORDER BY event_count DESC
           LIMIT 10`,
          [startDate, endDate]
        ),
        db.query(
          `SELECT
             COUNT(*) as total_messages,
             COUNT(DISTINCT conversation_id) as active_conversations,
             COUNT(*) FILTER (WHERE role = 'user') as user_messages,
             COUNT(*) FILTER (WHERE role = 'assistant') as assistant_messages
           FROM messages
           WHERE created_at BETWEEN $1 AND $2`,
          [startDate, endDate]
        ),
      ]);

      res.json({
        success: true,
        data: {
          period: { start: startDate, end: endDate },
          overview: {
            totalEvents: parseInt(totalEvents.rows[0].count, 10),
            uniqueUsers: parseInt(uniqueUsers.rows[0].count, 10),
            uniqueSessions: parseInt(uniqueSessions.rows[0].count, 10),
          },
          eventBreakdown: eventBreakdown.rows.map((r) => ({
            type: r.event_type,
            count: parseInt(r.count, 10),
          })),
          dailyTrend: dailyTrend.rows.map((r) => ({
            date: r.date,
            events: parseInt(r.events, 10),
            uniqueUsers: parseInt(r.unique_users, 10),
            sessions: parseInt(r.sessions, 10),
          })),
          topPages: topPages.rows.map((r) => ({
            page: r.page_url,
            views: parseInt(r.views, 10),
            uniqueViewers: parseInt(r.unique_viewers, 10),
          })),
          recentEvents: recentEvents.rows,
          topUsers: userEngagement.rows,
          chatAnalytics: chatAnalytics.rows[0],
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
