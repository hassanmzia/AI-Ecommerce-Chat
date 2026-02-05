const express = require('express');
const { body, param, query: check, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Generate a unique order ID like ORD-20240123
 */
const generateOrderId = () => {
  const now = new Date();
  const year = now.getFullYear();
  const random = Math.floor(1000 + Math.random() * 9000);
  const seq = Date.now().toString().slice(-4);
  return `ORD-${year}${seq}${random}`;
};

// -------------------------------------------------------
// GET /api/orders
// List user's orders
// -------------------------------------------------------
router.get(
  '/',
  verifyToken,
  [
    check('page').optional().isInt({ min: 1 }).toInt(),
    check('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    check('status').optional().isIn([
      'pending', 'confirmed', 'processing', 'shipped', 'in_transit',
      'out_for_delivery', 'delivered', 'cancelled', 'refunded', 'returned',
    ]),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const offset = (page - 1) * limit;
      const { status } = req.query;

      const conditions = ['o.user_id = $1'];
      const values = [req.user.id];
      let paramIdx = 2;

      if (status) {
        conditions.push(`o.status = $${paramIdx++}`);
        values.push(status);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const countResult = await db.query(
        `SELECT COUNT(*) FROM orders o ${whereClause}`,
        values
      );
      const total = parseInt(countResult.rows[0].count, 10);

      values.push(limit, offset);
      const result = await db.query(
        `SELECT o.id, o.order_id, o.status, o.order_date, o.total_amount,
                o.subtotal, o.tax, o.shipping_cost, o.tracking_number,
                o.estimated_delivery_date, o.shipping_address, o.items,
                o.coupon_code, o.discount_amount, o.created_at, o.updated_at
         FROM orders o
         ${whereClause}
         ORDER BY o.order_date DESC
         LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        values
      );

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// POST /api/orders
// Create a new order
// -------------------------------------------------------
router.post(
  '/',
  verifyToken,
  [
    body('items')
      .isArray({ min: 1 })
      .withMessage('At least one item is required'),
    body('items.*.product_id').notEmpty().withMessage('Product ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('shipping_address').isObject().withMessage('Shipping address is required'),
    body('shipping_address.street').notEmpty(),
    body('shipping_address.city').notEmpty(),
    body('shipping_address.state').notEmpty(),
    body('shipping_address.zip').notEmpty(),
    body('shipping_address.country').notEmpty(),
    body('billing_address').optional().isObject(),
    body('payment_method')
      .isIn(['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay'])
      .withMessage('Invalid payment method'),
    body('card_last_four').optional().isLength({ min: 4, max: 4 }),
    body('coupon_code').optional().trim(),
    body('notes').optional().trim().isLength({ max: 500 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const {
        items,
        shipping_address,
        billing_address,
        payment_method,
        card_last_four,
        coupon_code,
        notes,
      } = req.body;

      const result = await db.transaction(async (client) => {
        // Validate products and calculate totals
        let subtotal = 0;
        const orderItems = [];

        for (const item of items) {
          const productResult = await client.query(
            `SELECT id, product_id, name, price, sale_price, stock_quantity, image_url
             FROM products
             WHERE (id::text = $1 OR product_id = $1) AND is_active = true`,
            [item.product_id]
          );

          if (productResult.rows.length === 0) {
            throw Object.assign(new Error(`Product ${item.product_id} not found`), { statusCode: 404 });
          }

          const product = productResult.rows[0];

          if (product.stock_quantity < item.quantity) {
            throw Object.assign(
              new Error(`Insufficient stock for ${product.name}. Available: ${product.stock_quantity}`),
              { statusCode: 400 }
            );
          }

          const unitPrice = product.sale_price
            ? parseFloat(product.sale_price)
            : parseFloat(product.price);
          const lineTotal = unitPrice * item.quantity;
          subtotal += lineTotal;

          orderItems.push({
            product_id: product.product_id,
            product_uuid: product.id,
            name: product.name,
            quantity: item.quantity,
            price: unitPrice,
            line_total: lineTotal,
            image_url: product.image_url,
          });

          // Decrement stock
          await client.query(
            'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
            [item.quantity, product.id]
          );
        }

        // Apply coupon if provided
        let discountAmount = 0;
        if (coupon_code) {
          const couponResult = await client.query(
            `SELECT * FROM coupons
             WHERE code = $1 AND is_active = true
             AND valid_from <= NOW()
             AND (valid_until IS NULL OR valid_until >= NOW())
             AND (max_uses IS NULL OR used_count < max_uses)`,
            [coupon_code]
          );

          if (couponResult.rows.length > 0) {
            const coupon = couponResult.rows[0];
            if (subtotal >= parseFloat(coupon.min_order_amount)) {
              if (coupon.discount_type === 'percentage') {
                discountAmount = subtotal * (parseFloat(coupon.discount_value) / 100);
              } else {
                discountAmount = parseFloat(coupon.discount_value);
              }
              discountAmount = Math.min(discountAmount, subtotal);

              // Increment usage
              await client.query(
                'UPDATE coupons SET used_count = used_count + 1 WHERE id = $1',
                [coupon.id]
              );
            }
          }
        }

        // Calculate tax and shipping
        const taxRate = 0.08;
        const taxableAmount = subtotal - discountAmount;
        const tax = Math.round(taxableAmount * taxRate * 100) / 100;
        const shippingCost = subtotal >= 100 ? 0 : 9.99;
        const totalAmount = Math.round((taxableAmount + tax + shippingCost) * 100) / 100;

        const orderId = generateOrderId();
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 7);

        // Insert order
        const orderResult = await client.query(
          `INSERT INTO orders (
            order_id, user_id, status, total_amount, subtotal, tax,
            shipping_cost, estimated_delivery_date, shipping_address,
            billing_address, items, notes, coupon_code, discount_amount
          ) VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *`,
          [
            orderId,
            req.user.id,
            totalAmount,
            subtotal,
            tax,
            shippingCost,
            estimatedDelivery,
            JSON.stringify(shipping_address),
            JSON.stringify(billing_address || shipping_address),
            JSON.stringify(orderItems),
            notes || null,
            coupon_code || null,
            discountAmount,
          ]
        );

        const order = orderResult.rows[0];

        // Create payment record
        const paymentId = `PAY-${Date.now()}`;
        await client.query(
          `INSERT INTO payments (payment_id, order_id, user_id, status, amount, payment_method, card_last_four)
           VALUES ($1, $2, $3, 'pending', $4, $5, $6)`,
          [paymentId, order.id, req.user.id, totalAmount, payment_method, card_last_four || null]
        );

        // Award loyalty points (1 point per dollar)
        const pointsEarned = Math.floor(totalAmount);
        await client.query(
          'UPDATE users SET loyalty_points = loyalty_points + $1 WHERE id = $2',
          [pointsEarned, req.user.id]
        );

        // Create notification
        await client.query(
          `INSERT INTO notifications (user_id, type, title, message, metadata)
           VALUES ($1, 'order_created', 'Order Placed', $2, $3)`,
          [
            req.user.id,
            `Your order ${orderId} has been placed successfully!`,
            JSON.stringify({ order_id: orderId, total: totalAmount }),
          ]
        );

        // Clear user's cart
        await client.query('DELETE FROM cart_items WHERE user_id = $1', [req.user.id]);

        return {
          order,
          pointsEarned,
        };
      });

      // Invalidate caches
      await cacheDel(`user:${req.user.id}`);

      res.status(201).json({
        success: true,
        data: {
          order: result.order,
          loyaltyPointsEarned: result.pointsEarned,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// GET /api/orders/:id
// Get order detail
// -------------------------------------------------------
router.get(
  '/:id',
  verifyToken,
  [param('id').trim()],
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const result = await db.query(
        `SELECT o.*, p.payment_id, p.status as payment_status,
                p.payment_method, p.transaction_id, p.payment_date, p.card_last_four
         FROM orders o
         LEFT JOIN payments p ON p.order_id = o.id
         WHERE (o.id::text = $1 OR o.order_id = $1) AND o.user_id = $2`,
        [id, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Order not found.' });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// PUT /api/orders/:id/cancel
// Cancel an order
// -------------------------------------------------------
router.put(
  '/:id/cancel',
  verifyToken,
  [param('id').trim()],
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const result = await db.transaction(async (client) => {
        // Fetch order
        const orderResult = await client.query(
          `SELECT * FROM orders
           WHERE (id::text = $1 OR order_id = $1) AND user_id = $2`,
          [id, req.user.id]
        );

        if (orderResult.rows.length === 0) {
          throw Object.assign(new Error('Order not found'), { statusCode: 404 });
        }

        const order = orderResult.rows[0];

        // Only pending/confirmed/processing orders can be cancelled
        if (!['pending', 'confirmed', 'processing'].includes(order.status)) {
          throw Object.assign(
            new Error(`Cannot cancel order with status "${order.status}". Only pending, confirmed, or processing orders can be cancelled.`),
            { statusCode: 400 }
          );
        }

        // Update order status
        await client.query(
          `UPDATE orders SET status = 'cancelled' WHERE id = $1`,
          [order.id]
        );

        // Refund payment
        await client.query(
          `UPDATE payments SET status = 'refunded' WHERE order_id = $1`,
          [order.id]
        );

        // Restore stock
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        for (const item of items) {
          await client.query(
            `UPDATE products SET stock_quantity = stock_quantity + $1
             WHERE product_id = $2`,
            [item.quantity, item.product_id]
          );
        }

        // Deduct loyalty points
        const pointsToDeduct = Math.floor(parseFloat(order.total_amount));
        await client.query(
          'UPDATE users SET loyalty_points = GREATEST(0, loyalty_points - $1) WHERE id = $2',
          [pointsToDeduct, req.user.id]
        );

        // Notification
        await client.query(
          `INSERT INTO notifications (user_id, type, title, message, metadata)
           VALUES ($1, 'order_cancelled', 'Order Cancelled', $2, $3)`,
          [
            req.user.id,
            `Your order ${order.order_id} has been cancelled. A refund will be processed.`,
            JSON.stringify({ order_id: order.order_id }),
          ]
        );

        return { order_id: order.order_id };
      });

      res.json({
        success: true,
        message: `Order ${result.order_id} has been cancelled successfully.`,
      });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// GET /api/orders/:id/track
// Track an order
// -------------------------------------------------------
router.get(
  '/:id/track',
  verifyToken,
  [param('id').trim()],
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const result = await db.query(
        `SELECT order_id, status, tracking_number, estimated_delivery_date,
                shipping_address, order_date, updated_at
         FROM orders
         WHERE (id::text = $1 OR order_id = $1) AND user_id = $2`,
        [id, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Order not found.' });
      }

      const order = result.rows[0];

      // Build tracking timeline
      const statusFlow = [
        'pending', 'confirmed', 'processing', 'shipped',
        'in_transit', 'out_for_delivery', 'delivered',
      ];
      const currentIdx = statusFlow.indexOf(order.status);
      const timeline = statusFlow.map((status, idx) => ({
        status,
        label: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        completed: idx <= currentIdx && currentIdx >= 0,
        current: status === order.status,
      }));

      res.json({
        success: true,
        data: {
          order_id: order.order_id,
          status: order.status,
          tracking_number: order.tracking_number,
          estimated_delivery_date: order.estimated_delivery_date,
          shipping_address: order.shipping_address,
          order_date: order.order_date,
          last_updated: order.updated_at,
          timeline,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
