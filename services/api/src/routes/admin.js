const express = require('express');
const { body, param, query: check, validationResult } = require('express-validator');
const db = require('../config/database');
const { cacheGet, cacheSet, cacheDel, cacheDelPattern } = require('../config/redis');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(verifyToken, requireRole('admin'));

// -------------------------------------------------------
// GET /api/admin/dashboard
// Dashboard statistics
// -------------------------------------------------------
router.get('/dashboard', async (req, res, next) => {
  try {
    const cacheKey = 'admin:dashboard';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const [
      usersCount,
      productsCount,
      ordersCount,
      revenueResult,
      recentOrders,
      ordersByStatus,
      topProducts,
      activeConversations,
    ] = await Promise.all([
      db.query('SELECT COUNT(*) FROM users WHERE is_active = true'),
      db.query('SELECT COUNT(*) FROM products WHERE is_active = true'),
      db.query('SELECT COUNT(*) FROM orders'),
      db.query("SELECT COALESCE(SUM(total_amount), 0) as total_revenue FROM orders WHERE status != 'cancelled' AND status != 'refunded'"),
      db.query(`SELECT order_id, status, total_amount, order_date,
                       u.full_name as customer_name
                FROM orders o JOIN users u ON o.user_id = u.id
                ORDER BY o.order_date DESC LIMIT 5`),
      db.query('SELECT status, COUNT(*) as count FROM orders GROUP BY status ORDER BY count DESC'),
      db.query(`SELECT p.product_id, p.name, p.price, p.sale_price,
                       p.average_rating, p.review_count, p.image_url
                FROM products p WHERE p.is_active = true
                ORDER BY p.review_count DESC LIMIT 5`),
      db.query('SELECT COUNT(*) FROM conversations WHERE is_active = true'),
    ]);

    // Revenue for last 30 days
    const monthlyRevenue = await db.query(
      `SELECT DATE(order_date) as date, SUM(total_amount) as revenue, COUNT(*) as order_count
       FROM orders
       WHERE order_date >= NOW() - INTERVAL '30 days'
       AND status != 'cancelled' AND status != 'refunded'
       GROUP BY DATE(order_date)
       ORDER BY date ASC`
    );

    const response = {
      success: true,
      data: {
        overview: {
          totalUsers: parseInt(usersCount.rows[0].count, 10),
          totalProducts: parseInt(productsCount.rows[0].count, 10),
          totalOrders: parseInt(ordersCount.rows[0].count, 10),
          totalRevenue: parseFloat(revenueResult.rows[0].total_revenue),
          activeConversations: parseInt(activeConversations.rows[0].count, 10),
        },
        recentOrders: recentOrders.rows,
        ordersByStatus: ordersByStatus.rows.map((r) => ({
          status: r.status,
          count: parseInt(r.count, 10),
        })),
        topProducts: topProducts.rows,
        monthlyRevenue: monthlyRevenue.rows.map((r) => ({
          date: r.date,
          revenue: parseFloat(r.revenue),
          orderCount: parseInt(r.order_count, 10),
        })),
      },
    };

    await cacheSet(cacheKey, response, 60);
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------
// GET /api/admin/users
// List all users
// -------------------------------------------------------
router.get(
  '/users',
  [
    check('page').optional().isInt({ min: 1 }).toInt(),
    check('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    check('search').optional().trim(),
    check('role').optional().isIn(['user', 'admin']),
  ],
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const offset = (page - 1) * limit;
      const { search, role } = req.query;

      const conditions = [];
      const values = [];
      let paramIdx = 1;

      if (search) {
        conditions.push(`(u.full_name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`);
        values.push(`%${search}%`);
        paramIdx++;
      }
      if (role) {
        conditions.push(`u.role = $${paramIdx++}`);
        values.push(role);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countResult = await db.query(`SELECT COUNT(*) FROM users u ${whereClause}`, values);
      const total = parseInt(countResult.rows[0].count, 10);

      values.push(limit, offset);
      const result = await db.query(
        `SELECT u.id, u.email, u.full_name, u.phone, u.role, u.avatar_url,
                u.loyalty_tier, u.loyalty_points, u.is_active, u.created_at, u.updated_at,
                (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as order_count,
                (SELECT COALESCE(SUM(total_amount), 0) FROM orders o WHERE o.user_id = u.id AND o.status != 'cancelled') as total_spent
         FROM users u
         ${whereClause}
         ORDER BY u.created_at DESC
         LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        values
      );

      res.json({
        success: true,
        data: result.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// PUT /api/admin/users/:id
// Update a user
// -------------------------------------------------------
router.put(
  '/users/:id',
  [
    param('id').isUUID(),
    body('role').optional().isIn(['user', 'admin']),
    body('is_active').optional().isBoolean(),
    body('loyalty_tier').optional().isIn(['bronze', 'silver', 'gold', 'platinum']),
    body('loyalty_points').optional().isInt({ min: 0 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const { id } = req.params;
      const { role, is_active, loyalty_tier, loyalty_points } = req.body;

      const updates = [];
      const values = [];
      let paramIdx = 1;

      if (role !== undefined) { updates.push(`role = $${paramIdx++}`); values.push(role); }
      if (is_active !== undefined) { updates.push(`is_active = $${paramIdx++}`); values.push(is_active); }
      if (loyalty_tier !== undefined) { updates.push(`loyalty_tier = $${paramIdx++}`); values.push(loyalty_tier); }
      if (loyalty_points !== undefined) { updates.push(`loyalty_points = $${paramIdx++}`); values.push(loyalty_points); }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update.' });
      }

      values.push(id);
      const result = await db.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIdx}
         RETURNING id, email, full_name, phone, role, avatar_url, loyalty_tier, loyalty_points, is_active, updated_at`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found.' });
      }

      await cacheDel(`user:${id}`);

      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// GET /api/admin/orders
// List all orders
// -------------------------------------------------------
router.get(
  '/orders',
  [
    check('page').optional().isInt({ min: 1 }).toInt(),
    check('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    check('status').optional(),
    check('search').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const offset = (page - 1) * limit;
      const { status, search } = req.query;

      const conditions = [];
      const values = [];
      let paramIdx = 1;

      if (status) {
        conditions.push(`o.status = $${paramIdx++}`);
        values.push(status);
      }
      if (search) {
        conditions.push(`(o.order_id ILIKE $${paramIdx} OR u.full_name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`);
        values.push(`%${search}%`);
        paramIdx++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countResult = await db.query(
        `SELECT COUNT(*) FROM orders o JOIN users u ON o.user_id = u.id ${whereClause}`,
        values
      );
      const total = parseInt(countResult.rows[0].count, 10);

      values.push(limit, offset);
      const result = await db.query(
        `SELECT o.*, u.full_name as customer_name, u.email as customer_email
         FROM orders o
         JOIN users u ON o.user_id = u.id
         ${whereClause}
         ORDER BY o.order_date DESC
         LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        values
      );

      res.json({
        success: true,
        data: result.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// PUT /api/admin/orders/:id
// Update order status
// -------------------------------------------------------
router.put(
  '/orders/:id',
  [
    param('id').trim(),
    body('status').isIn([
      'pending', 'confirmed', 'processing', 'shipped', 'in_transit',
      'out_for_delivery', 'delivered', 'cancelled', 'refunded', 'returned',
    ]),
    body('tracking_number').optional().trim(),
    body('estimated_delivery_date').optional().isISO8601(),
    body('notes').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const { id } = req.params;
      const { status, tracking_number, estimated_delivery_date, notes } = req.body;

      const updates = [`status = $1`];
      const values = [status];
      let paramIdx = 2;

      if (tracking_number !== undefined) {
        updates.push(`tracking_number = $${paramIdx++}`);
        values.push(tracking_number);
      }
      if (estimated_delivery_date !== undefined) {
        updates.push(`estimated_delivery_date = $${paramIdx++}`);
        values.push(estimated_delivery_date);
      }
      if (notes !== undefined) {
        updates.push(`notes = $${paramIdx++}`);
        values.push(notes);
      }

      values.push(id);
      const result = await db.query(
        `UPDATE orders SET ${updates.join(', ')}
         WHERE id::text = $${paramIdx} OR order_id = $${paramIdx}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Order not found.' });
      }

      const order = result.rows[0];

      // Create notification for the user
      const statusLabels = {
        confirmed: 'Order Confirmed',
        processing: 'Order Processing',
        shipped: 'Order Shipped',
        in_transit: 'Order In Transit',
        out_for_delivery: 'Out for Delivery',
        delivered: 'Order Delivered',
        cancelled: 'Order Cancelled',
        refunded: 'Order Refunded',
        returned: 'Order Returned',
      };

      if (statusLabels[status]) {
        await db.query(
          `INSERT INTO notifications (user_id, type, title, message, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            order.user_id,
            `order_${status}`,
            statusLabels[status],
            `Your order ${order.order_id} status has been updated to: ${status.replace(/_/g, ' ')}.`,
            JSON.stringify({ order_id: order.order_id, status }),
          ]
        );
      }

      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// GET /api/admin/products
// List all products (including inactive)
// -------------------------------------------------------
router.get(
  '/products',
  [
    check('page').optional().isInt({ min: 1 }).toInt(),
    check('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    check('search').optional().trim(),
    check('category').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const offset = (page - 1) * limit;
      const { search, category } = req.query;

      const conditions = [];
      const values = [];
      let paramIdx = 1;

      if (search) {
        conditions.push(`(p.name ILIKE $${paramIdx} OR p.product_id ILIKE $${paramIdx})`);
        values.push(`%${search}%`);
        paramIdx++;
      }
      if (category) {
        conditions.push(`p.category ILIKE $${paramIdx++}`);
        values.push(`%${category}%`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countResult = await db.query(`SELECT COUNT(*) FROM products p ${whereClause}`, values);
      const total = parseInt(countResult.rows[0].count, 10);

      values.push(limit, offset);
      const result = await db.query(
        `SELECT * FROM products p ${whereClause}
         ORDER BY p.created_at DESC
         LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        values
      );

      res.json({
        success: true,
        data: result.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// POST /api/admin/products
// Create a product
// -------------------------------------------------------
router.post(
  '/products',
  [
    body('product_id').notEmpty().trim(),
    body('name').notEmpty().trim().isLength({ max: 255 }),
    body('category').notEmpty().trim(),
    body('subcategory').optional().trim(),
    body('price').isFloat({ min: 0 }),
    body('sale_price').optional().isFloat({ min: 0 }),
    body('stock_quantity').optional().isInt({ min: 0 }),
    body('description').optional().trim(),
    body('specifications').optional().isObject(),
    body('image_url').optional().trim(),
    body('images').optional().isArray(),
    body('is_featured').optional().isBoolean(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const {
        product_id, name, category, subcategory, price, sale_price,
        stock_quantity, description, specifications, image_url, images, is_featured,
      } = req.body;

      const result = await db.query(
        `INSERT INTO products (product_id, name, category, subcategory, price, sale_price,
          stock_quantity, description, specifications, image_url, images, is_featured)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          product_id, name, category, subcategory || null, price,
          sale_price || null, stock_quantity || 0, description || null,
          JSON.stringify(specifications || {}), image_url || null,
          JSON.stringify(images || []), is_featured || false,
        ]
      );

      await cacheDelPattern('products:*');

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// PUT /api/admin/products/:id
// Update a product
// -------------------------------------------------------
router.put(
  '/products/:id',
  [param('id').trim()],
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const allowedFields = [
        'name', 'category', 'subcategory', 'price', 'sale_price',
        'stock_quantity', 'description', 'specifications', 'image_url',
        'images', 'is_featured', 'is_active',
      ];

      const updates = [];
      const values = [];
      let paramIdx = 1;

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          const val = ['specifications', 'images'].includes(field)
            ? JSON.stringify(req.body[field])
            : req.body[field];
          updates.push(`${field} = $${paramIdx++}`);
          values.push(val);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update.' });
      }

      values.push(id);
      const result = await db.query(
        `UPDATE products SET ${updates.join(', ')}
         WHERE id::text = $${paramIdx} OR product_id = $${paramIdx}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Product not found.' });
      }

      await cacheDelPattern('products:*');
      await cacheDel(`product:${id}`);

      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// DELETE /api/admin/products/:id
// Soft-delete a product
// -------------------------------------------------------
router.delete(
  '/products/:id',
  [param('id').trim()],
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const result = await db.query(
        `UPDATE products SET is_active = false
         WHERE (id::text = $1 OR product_id = $1) AND is_active = true
         RETURNING id, product_id, name`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Product not found.' });
      }

      await cacheDelPattern('products:*');
      await cacheDel(`product:${id}`);

      res.json({
        success: true,
        message: `Product ${result.rows[0].name} has been deactivated.`,
      });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// GET /api/admin/analytics
// Analytics data
// -------------------------------------------------------
router.get('/analytics', async (req, res, next) => {
  try {
    const range = req.query.range || '30'; // days
    const days = parseInt(range, 10) || 30;

    const [
      eventsByType,
      eventsByDay,
      topPages,
      userActivity,
      conversionFunnel,
    ] = await Promise.all([
      db.query(
        `SELECT event_type, COUNT(*) as count
         FROM analytics_events
         WHERE created_at >= NOW() - INTERVAL '1 day' * $1
         GROUP BY event_type
         ORDER BY count DESC`,
        [days]
      ),
      db.query(
        `SELECT DATE(created_at) as date, COUNT(*) as count
         FROM analytics_events
         WHERE created_at >= NOW() - INTERVAL '1 day' * $1
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [days]
      ),
      db.query(
        `SELECT page_url, COUNT(*) as views
         FROM analytics_events
         WHERE event_type = 'page_view' AND created_at >= NOW() - INTERVAL '1 day' * $1
         GROUP BY page_url
         ORDER BY views DESC
         LIMIT 10`,
        [days]
      ),
      db.query(
        `SELECT DATE(created_at) as date,
                COUNT(DISTINCT user_id) as unique_users,
                COUNT(DISTINCT session_id) as unique_sessions
         FROM analytics_events
         WHERE created_at >= NOW() - INTERVAL '1 day' * $1
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [days]
      ),
      db.query(
        `SELECT
           (SELECT COUNT(DISTINCT session_id) FROM analytics_events WHERE event_type = 'page_view' AND created_at >= NOW() - INTERVAL '1 day' * $1) as visitors,
           (SELECT COUNT(DISTINCT session_id) FROM analytics_events WHERE event_type = 'product_view' AND created_at >= NOW() - INTERVAL '1 day' * $1) as product_viewers,
           (SELECT COUNT(DISTINCT session_id) FROM analytics_events WHERE event_type = 'add_to_cart' AND created_at >= NOW() - INTERVAL '1 day' * $1) as cart_adders,
           (SELECT COUNT(DISTINCT session_id) FROM analytics_events WHERE event_type = 'purchase' AND created_at >= NOW() - INTERVAL '1 day' * $1) as purchasers`,
        [days]
      ),
    ]);

    res.json({
      success: true,
      data: {
        range: `${days} days`,
        eventsByType: eventsByType.rows.map((r) => ({ type: r.event_type, count: parseInt(r.count, 10) })),
        eventsByDay: eventsByDay.rows.map((r) => ({ date: r.date, count: parseInt(r.count, 10) })),
        topPages: topPages.rows.map((r) => ({ page: r.page_url, views: parseInt(r.views, 10) })),
        userActivity: userActivity.rows,
        conversionFunnel: conversionFunnel.rows[0],
      },
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------
// GET /api/admin/agents
// Agent execution logs
// -------------------------------------------------------
router.get(
  '/agents',
  [
    check('page').optional().isInt({ min: 1 }).toInt(),
    check('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    check('agent_type').optional().trim(),
    check('status').optional().isIn(['pending', 'running', 'completed', 'failed', 'timeout']),
  ],
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const offset = (page - 1) * limit;
      const { agent_type, status } = req.query;

      const conditions = [];
      const values = [];
      let paramIdx = 1;

      if (agent_type) {
        conditions.push(`ae.agent_type = $${paramIdx++}`);
        values.push(agent_type);
      }
      if (status) {
        conditions.push(`ae.status = $${paramIdx++}`);
        values.push(status);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countResult = await db.query(`SELECT COUNT(*) FROM agent_executions ae ${whereClause}`, values);
      const total = parseInt(countResult.rows[0].count, 10);

      values.push(limit, offset);
      const result = await db.query(
        `SELECT ae.*, c.title as conversation_title
         FROM agent_executions ae
         LEFT JOIN conversations c ON ae.conversation_id = c.id
         ${whereClause}
         ORDER BY ae.created_at DESC
         LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        values
      );

      // Aggregate stats
      const statsResult = await db.query(
        `SELECT agent_type,
                COUNT(*) as total_executions,
                COUNT(*) FILTER (WHERE status = 'completed') as completed,
                COUNT(*) FILTER (WHERE status = 'failed') as failed,
                ROUND(AVG(execution_time_ms)) as avg_time_ms
         FROM agent_executions
         GROUP BY agent_type
         ORDER BY total_executions DESC`
      );

      res.json({
        success: true,
        data: result.rows,
        stats: statsResult.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// GET /api/admin/coupons
// List coupons
// -------------------------------------------------------
router.get('/coupons', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT * FROM coupons ORDER BY created_at DESC`
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------
// POST /api/admin/coupons
// Create coupon
// -------------------------------------------------------
router.post(
  '/coupons',
  [
    body('code').notEmpty().trim().toUpperCase(),
    body('discount_type').isIn(['percentage', 'fixed']),
    body('discount_value').isFloat({ min: 0.01 }),
    body('min_order_amount').optional().isFloat({ min: 0 }),
    body('max_uses').optional().isInt({ min: 1 }),
    body('valid_from').optional().isISO8601(),
    body('valid_until').optional().isISO8601(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const { code, discount_type, discount_value, min_order_amount, max_uses, valid_from, valid_until } = req.body;

      const result = await db.query(
        `INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, valid_from, valid_until)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          code, discount_type, discount_value,
          min_order_amount || 0, max_uses || null,
          valid_from || new Date().toISOString(),
          valid_until || null,
        ]
      );

      res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
