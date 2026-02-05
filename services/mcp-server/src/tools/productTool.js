'use strict';

const { z } = require('zod');

const inputSchema = z.object({
  query: z.string().min(1, 'query is required'),
  category: z.string().optional(),
  max_results: z.number().int().min(1).max(50).optional().default(10),
  min_price: z.number().min(0).optional(),
  max_price: z.number().min(0).optional(),
  min_rating: z.number().min(0).max(5).optional()
});

const toolDefinition = {
  name: 'product_search',
  description: 'Search products in catalog',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query for products'
      },
      category: {
        type: 'string',
        description: 'Filter by product category'
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of results to return (default: 10, max: 50)'
      },
      min_price: {
        type: 'number',
        description: 'Minimum price filter'
      },
      max_price: {
        type: 'number',
        description: 'Maximum price filter'
      },
      min_rating: {
        type: 'number',
        description: 'Minimum rating filter (0-5)'
      }
    },
    required: ['query']
  },
  outputSchema: {
    type: 'object',
    properties: {
      products: { type: 'array' },
      total_count: { type: 'number' },
      query: { type: 'string' },
      filters_applied: { type: 'object' }
    }
  }
};

async function handler(params, { db, redis }) {
  const parsed = inputSchema.parse(params);
  const { query, category, max_results, min_price, max_price, min_rating } = parsed;

  // Build cache key
  const cacheKey = `mcp:product_search:${JSON.stringify(parsed)}`;
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

  // Build dynamic query
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  // Full-text search on name and description
  conditions.push(`(
    LOWER(p.name) LIKE LOWER($${paramIndex})
    OR LOWER(p.description) LIKE LOWER($${paramIndex})
  )`);
  values.push(`%${query}%`);
  paramIndex++;

  // Category filter
  if (category) {
    conditions.push(`LOWER(p.category) = LOWER($${paramIndex})`);
    values.push(category);
    paramIndex++;
  }

  // Price filters
  if (min_price !== undefined) {
    conditions.push(`p.price >= $${paramIndex}`);
    values.push(min_price);
    paramIndex++;
  }

  if (max_price !== undefined) {
    conditions.push(`p.price <= $${paramIndex}`);
    values.push(max_price);
    paramIndex++;
  }

  // Rating filter
  if (min_rating !== undefined) {
    conditions.push(`COALESCE(p.rating, 0) >= $${paramIndex}`);
    values.push(min_rating);
    paramIndex++;
  }

  // Only show active/available products
  conditions.push(`p.is_active = true`);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total matches
  const countQuery = `SELECT COUNT(*) as total FROM products p ${whereClause}`;
  const countResult = await db.query(countQuery, values);
  const totalCount = parseInt(countResult.rows[0].total, 10);

  // Fetch products
  const productQuery = `
    SELECT
      p.id, p.name, p.description, p.price, p.category,
      p.image_url, p.stock_quantity, p.rating,
      p.created_at, p.updated_at
    FROM products p
    ${whereClause}
    ORDER BY
      CASE WHEN LOWER(p.name) LIKE LOWER($1) THEN 0 ELSE 1 END,
      COALESCE(p.rating, 0) DESC,
      p.created_at DESC
    LIMIT $${paramIndex}
  `;
  values.push(max_results);

  const productResult = await db.query(productQuery, values);

  const products = productResult.rows.map(p => ({
    product_id: p.id,
    name: p.name,
    description: p.description,
    price: parseFloat(p.price),
    category: p.category,
    image_url: p.image_url,
    stock_quantity: p.stock_quantity,
    in_stock: p.stock_quantity > 0,
    rating: p.rating ? parseFloat(p.rating) : null,
    created_at: p.created_at
  }));

  const filtersApplied = {};
  if (category) filtersApplied.category = category;
  if (min_price !== undefined) filtersApplied.min_price = min_price;
  if (max_price !== undefined) filtersApplied.max_price = max_price;
  if (min_rating !== undefined) filtersApplied.min_rating = min_rating;

  const data = {
    products,
    total_count: totalCount,
    returned_count: products.length,
    query,
    filters_applied: filtersApplied
  };

  // Cache for 3 minutes
  if (redis) {
    try {
      await redis.setEx(cacheKey, 180, JSON.stringify(data));
    } catch (err) {
      console.warn('Redis cache write failed:', err.message);
    }
  }

  return { success: true, data, source: 'database' };
}

module.exports = { toolDefinition, handler, inputSchema };
