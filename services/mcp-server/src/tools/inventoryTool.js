'use strict';

const { z } = require('zod');

const inputSchema = z.object({
  product_id: z.string().min(1, 'product_id is required')
});

const toolDefinition = {
  name: 'check_inventory',
  description: 'Check real-time inventory for a product',
  inputSchema: {
    type: 'object',
    properties: {
      product_id: {
        type: 'string',
        description: 'The product ID to check inventory for'
      }
    },
    required: ['product_id']
  },
  outputSchema: {
    type: 'object',
    properties: {
      product_id: { type: 'string' },
      product_name: { type: 'string' },
      stock_quantity: { type: 'number' },
      availability: { type: 'string' },
      low_stock_threshold: { type: 'number' },
      restock_date: { type: 'string' }
    }
  }
};

function determineAvailability(quantity) {
  if (quantity <= 0) return 'out_of_stock';
  if (quantity <= 5) return 'low_stock';
  if (quantity <= 20) return 'limited';
  return 'in_stock';
}

function estimateRestockDate(availability) {
  if (availability === 'in_stock' || availability === 'limited') return null;
  const restock = new Date();
  restock.setDate(restock.getDate() + (availability === 'out_of_stock' ? 14 : 7));
  return restock.toISOString().split('T')[0];
}

async function handler(params, { db, redis }) {
  const parsed = inputSchema.parse(params);
  const { product_id } = parsed;

  // Check Redis for real-time inventory (shorter cache)
  const cacheKey = `mcp:inventory:${product_id}`;
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

  // Query inventory
  const inventoryQuery = `
    SELECT
      p.id, p.name, p.stock_quantity, p.price, p.category,
      p.is_active, p.updated_at
    FROM products p
    WHERE p.id = $1
    LIMIT 1
  `;

  const result = await db.query(inventoryQuery, [product_id]);

  if (result.rows.length === 0) {
    return {
      success: false,
      error: 'Product not found',
      data: null
    };
  }

  const product = result.rows[0];
  const stockQuantity = product.stock_quantity || 0;
  const availability = determineAvailability(stockQuantity);

  // Count pending orders for this product (reserved inventory)
  const reservedQuery = `
    SELECT COALESCE(SUM(oi.quantity), 0) as reserved
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE oi.product_id = $1
      AND o.status IN ('pending', 'confirmed', 'processing')
  `;
  const reservedResult = await db.query(reservedQuery, [product_id]);
  const reserved = parseInt(reservedResult.rows[0].reserved, 10);

  const availableQuantity = Math.max(0, stockQuantity - reserved);
  const effectiveAvailability = determineAvailability(availableQuantity);

  const data = {
    product_id: product.id,
    product_name: product.name,
    category: product.category,
    price: parseFloat(product.price),
    stock_quantity: stockQuantity,
    reserved_quantity: reserved,
    available_quantity: availableQuantity,
    availability: effectiveAvailability,
    is_active: product.is_active,
    low_stock_threshold: 5,
    restock_date: estimateRestockDate(effectiveAvailability),
    last_updated: product.updated_at
  };

  // Cache for 60 seconds (inventory changes rapidly)
  if (redis) {
    try {
      await redis.setEx(cacheKey, 60, JSON.stringify(data));
    } catch (err) {
      console.warn('Redis cache write failed:', err.message);
    }
  }

  return { success: true, data, source: 'database' };
}

module.exports = { toolDefinition, handler, inputSchema };
