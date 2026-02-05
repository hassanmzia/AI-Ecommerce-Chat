'use strict';

const { z } = require('zod');

const inputSchema = z.object({
  order_id: z.string().min(1, 'order_id is required')
});

const toolDefinition = {
  name: 'order_tracking',
  description: 'Track order status and details',
  inputSchema: {
    type: 'object',
    properties: {
      order_id: {
        type: 'string',
        description: 'The unique identifier of the order'
      }
    },
    required: ['order_id']
  },
  outputSchema: {
    type: 'object',
    properties: {
      order_id: { type: 'string' },
      status: { type: 'string' },
      items: { type: 'array' },
      total_amount: { type: 'number' },
      shipping_address: { type: 'string' },
      tracking_number: { type: 'string' },
      estimated_delivery: { type: 'string' },
      created_at: { type: 'string' },
      updated_at: { type: 'string' }
    }
  }
};

function generateTrackingNumber(orderId) {
  const hash = orderId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `TRK-${hash}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

function estimateDelivery(status, createdAt) {
  const created = new Date(createdAt);
  const daysToAdd = {
    pending: 7,
    confirmed: 6,
    processing: 5,
    shipped: 3,
    in_transit: 2,
    out_for_delivery: 1,
    delivered: 0,
    cancelled: 0
  };
  const days = daysToAdd[status] || 7;
  const estimated = new Date(created);
  estimated.setDate(estimated.getDate() + days);
  return estimated.toISOString().split('T')[0];
}

async function handler(params, { db, redis }) {
  const parsed = inputSchema.parse(params);
  const { order_id } = parsed;

  // Check Redis cache
  const cacheKey = `mcp:order:${order_id}`;
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

  // Query order
  const orderQuery = `
    SELECT
      o.id, o.user_id, o.status, o.total_amount,
      o.shipping_address, o.tracking_number,
      o.created_at, o.updated_at
    FROM orders o
    WHERE o.id = $1
    LIMIT 1
  `;

  const orderResult = await db.query(orderQuery, [order_id]);

  if (orderResult.rows.length === 0) {
    return {
      success: false,
      error: 'Order not found',
      data: null
    };
  }

  const order = orderResult.rows[0];

  // Get order items
  const itemsQuery = `
    SELECT
      oi.id, oi.product_id, oi.quantity, oi.price_at_purchase,
      p.name as product_name, p.image_url
    FROM order_items oi
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = $1
    ORDER BY oi.id
  `;

  const itemsResult = await db.query(itemsQuery, [order_id]);

  const items = itemsResult.rows.map(item => ({
    item_id: item.id,
    product_id: item.product_id,
    product_name: item.product_name || 'Unknown Product',
    quantity: item.quantity,
    price: parseFloat(item.price_at_purchase),
    image_url: item.image_url || null
  }));

  // Build status timeline
  const statusTimeline = [];
  const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered'];
  const currentIndex = statusOrder.indexOf(order.status);

  statusOrder.forEach((s, i) => {
    statusTimeline.push({
      status: s,
      completed: i <= currentIndex && order.status !== 'cancelled',
      current: s === order.status
    });
  });

  const data = {
    order_id: order.id,
    user_id: order.user_id,
    status: order.status,
    items,
    item_count: items.length,
    total_amount: parseFloat(order.total_amount),
    shipping_address: order.shipping_address || 'Not provided',
    tracking_number: order.tracking_number || generateTrackingNumber(order.id),
    estimated_delivery: estimateDelivery(order.status, order.created_at),
    status_timeline: statusTimeline,
    created_at: order.created_at,
    updated_at: order.updated_at
  };

  // Cache for 2 minutes (orders change frequently)
  if (redis) {
    try {
      await redis.setEx(cacheKey, 120, JSON.stringify(data));
    } catch (err) {
      console.warn('Redis cache write failed:', err.message);
    }
  }

  return { success: true, data, source: 'database' };
}

module.exports = { toolDefinition, handler, inputSchema };
