'use strict';

const { z } = require('zod');

const inputSchema = z.object({
  user_id: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().int().min(1).max(20).optional().default(5)
});

const toolDefinition = {
  name: 'get_recommendations',
  description: 'Get product recommendations based on user behavior',
  inputSchema: {
    type: 'object',
    properties: {
      user_id: {
        type: 'string',
        description: 'User ID for personalized recommendations (optional)'
      },
      category: {
        type: 'string',
        description: 'Filter recommendations by category (optional)'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of recommendations (default: 5, max: 20)'
      }
    },
    required: []
  },
  outputSchema: {
    type: 'object',
    properties: {
      recommendations: { type: 'array' },
      strategy: { type: 'string' },
      personalized: { type: 'boolean' }
    }
  }
};

async function handler(params, { db, redis }) {
  const parsed = inputSchema.parse(params);
  const { user_id, category, limit } = parsed;

  // Cache key
  const cacheKey = `mcp:recommendations:${user_id || 'anon'}:${category || 'all'}:${limit}`;
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

  let recommendations = [];
  let strategy = 'top_rated';
  let personalized = false;

  // If user_id provided, try personalized recommendations based on purchase history
  if (user_id) {
    const userPurchasesQuery = `
      SELECT DISTINCT p.category
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE o.user_id = $1
      ORDER BY p.category
    `;
    const purchaseResult = await db.query(userPurchasesQuery, [user_id]);
    const purchasedCategories = purchaseResult.rows.map(r => r.category);

    if (purchasedCategories.length > 0) {
      // Recommend products from categories the user has purchased from
      // but exclude products they already own
      const placeholders = purchasedCategories.map((_, i) => `$${i + 1}`).join(', ');
      const recQuery = `
        SELECT
          p.id, p.name, p.description, p.price, p.category,
          p.image_url, p.rating, p.stock_quantity
        FROM products p
        WHERE p.category IN (${placeholders})
          AND p.is_active = true
          AND p.stock_quantity > 0
          AND p.id NOT IN (
            SELECT oi.product_id
            FROM orders o
            JOIN order_items oi ON oi.order_id = o.id
            WHERE o.user_id = $${purchasedCategories.length + 1}
          )
          ${category ? `AND LOWER(p.category) = LOWER($${purchasedCategories.length + 2})` : ''}
        ORDER BY COALESCE(p.rating, 0) DESC, p.created_at DESC
        LIMIT $${purchasedCategories.length + (category ? 3 : 2)}
      `;

      const recValues = [...purchasedCategories, user_id];
      if (category) recValues.push(category);
      recValues.push(limit);

      const recResult = await db.query(recQuery, recValues);
      recommendations = recResult.rows;
      strategy = 'personalized_by_purchase_history';
      personalized = true;
    }
  }

  // Fallback: top-rated products
  if (recommendations.length === 0) {
    const conditions = ['p.is_active = true', 'p.stock_quantity > 0'];
    const values = [];
    let paramIdx = 1;

    if (category) {
      conditions.push(`LOWER(p.category) = LOWER($${paramIdx})`);
      values.push(category);
      paramIdx++;
    }

    const topQuery = `
      SELECT
        p.id, p.name, p.description, p.price, p.category,
        p.image_url, p.rating, p.stock_quantity
      FROM products p
      WHERE ${conditions.join(' AND ')}
      ORDER BY COALESCE(p.rating, 0) DESC, p.created_at DESC
      LIMIT $${paramIdx}
    `;
    values.push(limit);

    const topResult = await db.query(topQuery, values);
    recommendations = topResult.rows;
    strategy = category ? 'top_rated_in_category' : 'top_rated_overall';
  }

  const formattedRecs = recommendations.map((p, index) => ({
    rank: index + 1,
    product_id: p.id,
    name: p.name,
    description: p.description,
    price: parseFloat(p.price),
    category: p.category,
    image_url: p.image_url,
    rating: p.rating ? parseFloat(p.rating) : null,
    in_stock: p.stock_quantity > 0
  }));

  const data = {
    recommendations: formattedRecs,
    total_count: formattedRecs.length,
    strategy,
    personalized,
    user_id: user_id || null
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
