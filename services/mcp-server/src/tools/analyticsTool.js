'use strict';

const { z } = require('zod');

const inputSchema = z.object({
  metric: z.string().min(1, 'metric is required'),
  period: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional().default('month')
});

const toolDefinition = {
  name: 'get_analytics',
  description: 'Get sales and user analytics',
  inputSchema: {
    type: 'object',
    properties: {
      metric: {
        type: 'string',
        description: 'The metric to retrieve: sales_summary, top_products, user_growth, order_stats, revenue_by_category, conversion_rate'
      },
      period: {
        type: 'string',
        description: 'Time period for analytics: day, week, month, quarter, year (default: month)',
        enum: ['day', 'week', 'month', 'quarter', 'year']
      }
    },
    required: ['metric']
  },
  outputSchema: {
    type: 'object',
    properties: {
      metric: { type: 'string' },
      period: { type: 'string' },
      data: { type: 'object' }
    }
  }
};

function getPeriodInterval(period) {
  const intervals = {
    day: '1 day',
    week: '7 days',
    month: '30 days',
    quarter: '90 days',
    year: '365 days'
  };
  return intervals[period] || '30 days';
}

async function getSalesSummary(db, interval) {
  const query = `
    SELECT
      COUNT(*) as total_orders,
      COALESCE(SUM(total_amount), 0) as total_revenue,
      COALESCE(AVG(total_amount), 0) as avg_order_value,
      COUNT(DISTINCT user_id) as unique_customers
    FROM orders
    WHERE created_at >= NOW() - INTERVAL '${interval}'
      AND status NOT IN ('cancelled')
  `;
  const result = await db.query(query);
  const row = result.rows[0];

  // Get previous period for comparison
  const prevQuery = `
    SELECT
      COUNT(*) as total_orders,
      COALESCE(SUM(total_amount), 0) as total_revenue
    FROM orders
    WHERE created_at >= NOW() - INTERVAL '${interval}' * 2
      AND created_at < NOW() - INTERVAL '${interval}'
      AND status NOT IN ('cancelled')
  `;
  const prevResult = await db.query(prevQuery);
  const prevRow = prevResult.rows[0];

  const revenueGrowth = prevRow.total_revenue > 0
    ? ((row.total_revenue - prevRow.total_revenue) / prevRow.total_revenue * 100).toFixed(2)
    : 0;

  return {
    total_orders: parseInt(row.total_orders, 10),
    total_revenue: parseFloat(parseFloat(row.total_revenue).toFixed(2)),
    avg_order_value: parseFloat(parseFloat(row.avg_order_value).toFixed(2)),
    unique_customers: parseInt(row.unique_customers, 10),
    revenue_growth_pct: parseFloat(revenueGrowth),
    previous_period_revenue: parseFloat(parseFloat(prevRow.total_revenue).toFixed(2))
  };
}

async function getTopProducts(db, interval) {
  const query = `
    SELECT
      p.id, p.name, p.category, p.price,
      SUM(oi.quantity) as total_sold,
      SUM(oi.quantity * oi.price_at_purchase) as total_revenue
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at >= NOW() - INTERVAL '${interval}'
      AND o.status NOT IN ('cancelled')
    GROUP BY p.id, p.name, p.category, p.price
    ORDER BY total_sold DESC
    LIMIT 10
  `;
  const result = await db.query(query);

  return result.rows.map((row, index) => ({
    rank: index + 1,
    product_id: row.id,
    name: row.name,
    category: row.category,
    price: parseFloat(row.price),
    total_sold: parseInt(row.total_sold, 10),
    total_revenue: parseFloat(parseFloat(row.total_revenue).toFixed(2))
  }));
}

async function getUserGrowth(db, interval) {
  const query = `
    SELECT
      COUNT(*) as total_users,
      COUNT(CASE WHEN created_at >= NOW() - INTERVAL '${interval}' THEN 1 END) as new_users
    FROM users
  `;
  const result = await db.query(query);
  const row = result.rows[0];

  const prevQuery = `
    SELECT COUNT(*) as prev_new_users
    FROM users
    WHERE created_at >= NOW() - INTERVAL '${interval}' * 2
      AND created_at < NOW() - INTERVAL '${interval}'
  `;
  const prevResult = await db.query(prevQuery);
  const prevRow = prevResult.rows[0];

  const growthRate = prevRow.prev_new_users > 0
    ? ((row.new_users - prevRow.prev_new_users) / prevRow.prev_new_users * 100).toFixed(2)
    : 0;

  return {
    total_users: parseInt(row.total_users, 10),
    new_users: parseInt(row.new_users, 10),
    previous_period_new_users: parseInt(prevRow.prev_new_users, 10),
    growth_rate_pct: parseFloat(growthRate)
  };
}

async function getOrderStats(db, interval) {
  const query = `
    SELECT
      status,
      COUNT(*) as count
    FROM orders
    WHERE created_at >= NOW() - INTERVAL '${interval}'
    GROUP BY status
    ORDER BY count DESC
  `;
  const result = await db.query(query);

  const statusBreakdown = {};
  let totalOrders = 0;
  result.rows.forEach(row => {
    statusBreakdown[row.status] = parseInt(row.count, 10);
    totalOrders += parseInt(row.count, 10);
  });

  return {
    total_orders: totalOrders,
    status_breakdown: statusBreakdown,
    completion_rate: totalOrders > 0
      ? parseFloat(((statusBreakdown.delivered || 0) / totalOrders * 100).toFixed(2))
      : 0,
    cancellation_rate: totalOrders > 0
      ? parseFloat(((statusBreakdown.cancelled || 0) / totalOrders * 100).toFixed(2))
      : 0
  };
}

async function getRevenueByCategory(db, interval) {
  const query = `
    SELECT
      p.category,
      COUNT(DISTINCT o.id) as order_count,
      SUM(oi.quantity) as items_sold,
      SUM(oi.quantity * oi.price_at_purchase) as revenue
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN orders o ON o.id = oi.order_id
    WHERE o.created_at >= NOW() - INTERVAL '${interval}'
      AND o.status NOT IN ('cancelled')
    GROUP BY p.category
    ORDER BY revenue DESC
  `;
  const result = await db.query(query);

  const totalRevenue = result.rows.reduce((sum, r) => sum + parseFloat(r.revenue), 0);

  return result.rows.map(row => ({
    category: row.category,
    order_count: parseInt(row.order_count, 10),
    items_sold: parseInt(row.items_sold, 10),
    revenue: parseFloat(parseFloat(row.revenue).toFixed(2)),
    revenue_share_pct: totalRevenue > 0
      ? parseFloat((parseFloat(row.revenue) / totalRevenue * 100).toFixed(2))
      : 0
  }));
}

async function getConversionRate(db, interval) {
  // Estimate conversion based on users who have placed orders vs total users
  const query = `
    SELECT
      (SELECT COUNT(DISTINCT user_id) FROM orders WHERE created_at >= NOW() - INTERVAL '${interval}') as ordering_users,
      (SELECT COUNT(*) FROM users WHERE created_at <= NOW()) as total_users,
      (SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '${interval}') as total_orders,
      (SELECT COUNT(*) FROM orders WHERE created_at >= NOW() - INTERVAL '${interval}' AND status = 'delivered') as completed_orders
  `;
  const result = await db.query(query);
  const row = result.rows[0];

  return {
    total_users: parseInt(row.total_users, 10),
    ordering_users: parseInt(row.ordering_users, 10),
    total_orders: parseInt(row.total_orders, 10),
    completed_orders: parseInt(row.completed_orders, 10),
    user_conversion_rate_pct: row.total_users > 0
      ? parseFloat((row.ordering_users / row.total_users * 100).toFixed(2))
      : 0,
    order_completion_rate_pct: row.total_orders > 0
      ? parseFloat((row.completed_orders / row.total_orders * 100).toFixed(2))
      : 0
  };
}

const metricHandlers = {
  sales_summary: getSalesSummary,
  top_products: getTopProducts,
  user_growth: getUserGrowth,
  order_stats: getOrderStats,
  revenue_by_category: getRevenueByCategory,
  conversion_rate: getConversionRate
};

async function handler(params, { db, redis }) {
  const parsed = inputSchema.parse(params);
  const { metric, period } = parsed;

  // Validate metric
  const validMetrics = Object.keys(metricHandlers);
  if (!validMetrics.includes(metric)) {
    return {
      success: false,
      error: `Invalid metric. Valid metrics are: ${validMetrics.join(', ')}`,
      data: null
    };
  }

  // Check cache
  const cacheKey = `mcp:analytics:${metric}:${period}`;
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

  const interval = getPeriodInterval(period);
  const metricData = await metricHandlers[metric](db, interval);

  const data = {
    metric,
    period,
    interval,
    generated_at: new Date().toISOString(),
    data: metricData
  };

  // Cache analytics for 5 minutes
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
