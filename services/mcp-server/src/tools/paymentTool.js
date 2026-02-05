'use strict';

const { z } = require('zod');

const inputSchema = z.object({
  order_id: z.string().min(1, 'order_id is required')
});

const toolDefinition = {
  name: 'payment_info',
  description: 'Get payment information for an order (restricted)',
  inputSchema: {
    type: 'object',
    properties: {
      order_id: {
        type: 'string',
        description: 'The order ID to look up payment information for'
      }
    },
    required: ['order_id']
  },
  outputSchema: {
    type: 'object',
    properties: {
      order_id: { type: 'string' },
      payment_status: { type: 'string' },
      payment_method: { type: 'string' },
      masked_card: { type: 'string' },
      amount: { type: 'number' },
      currency: { type: 'string' },
      transaction_id: { type: 'string' },
      paid_at: { type: 'string' }
    }
  },
  restricted: true,
  requiredPermissions: ['payment:read']
};

function maskCardNumber(cardNumber) {
  if (!cardNumber) return '****-****-****-****';
  const cleaned = cardNumber.replace(/\D/g, '');
  if (cleaned.length < 4) return '****-****-****-****';
  const lastFour = cleaned.slice(-4);
  return `****-****-****-${lastFour}`;
}

function maskTransactionId(txId) {
  if (!txId) return 'txn_***';
  if (txId.length <= 8) return txId.slice(0, 3) + '***';
  return txId.slice(0, 4) + '***' + txId.slice(-4);
}

async function handler(params, { db, redis }) {
  const parsed = inputSchema.parse(params);
  const { order_id } = parsed;

  // Check Redis cache
  const cacheKey = `mcp:payment:${order_id}`;
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return { success: true, data: JSON.parse(cached), source: 'cache' };
      }
    } catch (err) {
      console.warn('Redis cache read failed:', err.message);
    }
  }

  // Query payment information
  const paymentQuery = `
    SELECT
      p.id, p.order_id, p.payment_method, p.payment_status,
      p.amount, p.currency, p.transaction_id,
      p.card_last_four, p.card_brand,
      p.created_at as paid_at,
      o.total_amount, o.status as order_status
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    WHERE p.order_id = $1
    ORDER BY p.created_at DESC
    LIMIT 1
  `;

  const paymentResult = await db.query(paymentQuery, [order_id]);

  if (paymentResult.rows.length === 0) {
    // No payment record found, check if order exists
    const orderCheck = await db.query(
      'SELECT id, status, total_amount FROM orders WHERE id = $1',
      [order_id]
    );

    if (orderCheck.rows.length === 0) {
      return {
        success: false,
        error: 'Order not found',
        data: null
      };
    }

    const order = orderCheck.rows[0];
    return {
      success: true,
      data: {
        order_id: order.id,
        payment_status: 'pending',
        payment_method: 'not_set',
        masked_card: null,
        card_brand: null,
        amount: parseFloat(order.total_amount),
        currency: 'USD',
        transaction_id: null,
        paid_at: null,
        order_status: order.status,
        note: 'No payment has been processed for this order yet'
      },
      source: 'database'
    };
  }

  const payment = paymentResult.rows[0];

  const data = {
    order_id: payment.order_id,
    payment_status: payment.payment_status,
    payment_method: payment.payment_method,
    masked_card: payment.card_last_four
      ? maskCardNumber(payment.card_last_four)
      : null,
    card_brand: payment.card_brand || null,
    amount: parseFloat(payment.amount || payment.total_amount),
    currency: payment.currency || 'USD',
    transaction_id: maskTransactionId(payment.transaction_id),
    paid_at: payment.paid_at,
    order_status: payment.order_status,
    refundable: ['completed', 'paid'].includes(payment.payment_status)
      && !['cancelled', 'refunded'].includes(payment.order_status)
  };

  // Cache for 5 minutes
  if (redis) {
    try {
      await redis.setEx(cacheKey, 300, JSON.stringify(data));
    } catch (err) {
      console.warn('Redis cache write failed:', err.message);
    }
  }

  return { success: true, data, source: 'database' };
}

module.exports = { toolDefinition, handler, inputSchema };
