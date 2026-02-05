'use strict';

const { z } = require('zod');

const inputSchema = z.object({
  customer_id: z.string().min(1, 'customer_id is required')
});

const toolDefinition = {
  name: 'customer_lookup',
  description: 'Look up customer information by customer ID',
  inputSchema: {
    type: 'object',
    properties: {
      customer_id: {
        type: 'string',
        description: 'The unique identifier of the customer'
      }
    },
    required: ['customer_id']
  },
  outputSchema: {
    type: 'object',
    properties: {
      customer_id: { type: 'string' },
      name: { type: 'string' },
      email: { type: 'string' },
      phone: { type: 'string' },
      created_at: { type: 'string' },
      order_count: { type: 'number' },
      total_spent: { type: 'number' },
      loyalty_tier: { type: 'string' }
    }
  }
};

function maskEmail(email) {
  if (!email) return '';
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const maskedUser = user.length > 2
    ? user[0] + '*'.repeat(user.length - 2) + user[user.length - 1]
    : user[0] + '*';
  return `${maskedUser}@${domain}`;
}

function maskPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  return '***-***-' + digits.slice(-4);
}

async function handler(params, { db, redis }) {
  const parsed = inputSchema.parse(params);
  const { customer_id } = parsed;

  // Check Redis cache first
  const cacheKey = `mcp:customer:${customer_id}`;
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

  // Query PostgreSQL
  const customerQuery = `
    SELECT
      u.id, u.username, u.email, u.phone, u.created_at,
      COALESCE(u.first_name, '') as first_name,
      COALESCE(u.last_name, '') as last_name
    FROM users u
    WHERE u.id = $1
    LIMIT 1
  `;

  const customerResult = await db.query(customerQuery, [customer_id]);

  if (customerResult.rows.length === 0) {
    return {
      success: false,
      error: 'Customer not found',
      data: null
    };
  }

  const customer = customerResult.rows[0];

  // Get order stats
  const orderStatsQuery = `
    SELECT
      COUNT(*) as order_count,
      COALESCE(SUM(total_amount), 0) as total_spent
    FROM orders
    WHERE user_id = $1
  `;
  const orderStats = await db.query(orderStatsQuery, [customer_id]);
  const stats = orderStats.rows[0] || { order_count: 0, total_spent: 0 };

  // Determine loyalty tier
  const totalSpent = parseFloat(stats.total_spent);
  let loyaltyTier = 'Bronze';
  if (totalSpent >= 5000) loyaltyTier = 'Platinum';
  else if (totalSpent >= 2000) loyaltyTier = 'Gold';
  else if (totalSpent >= 500) loyaltyTier = 'Silver';

  const data = {
    customer_id: customer.id,
    name: `${customer.first_name} ${customer.last_name}`.trim() || customer.username,
    email: maskEmail(customer.email),
    phone: maskPhone(customer.phone),
    username: customer.username,
    created_at: customer.created_at,
    order_count: parseInt(stats.order_count, 10),
    total_spent: totalSpent,
    loyalty_tier: loyaltyTier
  };

  // Cache result for 5 minutes
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
