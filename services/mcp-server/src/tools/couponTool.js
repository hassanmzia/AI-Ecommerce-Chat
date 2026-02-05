'use strict';

const { z } = require('zod');

const inputSchema = z.object({
  coupon_code: z.string().min(1, 'coupon_code is required'),
  order_total: z.number().min(0, 'order_total must be non-negative')
});

const toolDefinition = {
  name: 'validate_coupon',
  description: 'Validate and apply a coupon code',
  inputSchema: {
    type: 'object',
    properties: {
      coupon_code: {
        type: 'string',
        description: 'The coupon code to validate'
      },
      order_total: {
        type: 'number',
        description: 'The current order total to calculate discount against'
      }
    },
    required: ['coupon_code', 'order_total']
  },
  outputSchema: {
    type: 'object',
    properties: {
      valid: { type: 'boolean' },
      coupon_code: { type: 'string' },
      discount_type: { type: 'string' },
      discount_value: { type: 'number' },
      discount_amount: { type: 'number' },
      new_total: { type: 'number' },
      message: { type: 'string' }
    }
  }
};

async function handler(params, { db, redis }) {
  const parsed = inputSchema.parse(params);
  const { coupon_code, order_total } = parsed;

  // Check Redis cache for coupon validation
  const cacheKey = `mcp:coupon:${coupon_code.toUpperCase()}`;
  let couponData = null;

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        couponData = JSON.parse(cached);
      }
    } catch (err) {
      console.warn('Redis cache read failed:', err.message);
    }
  }

  // Query coupon from database if not cached
  if (!couponData) {
    const couponQuery = `
      SELECT
        c.id, c.code, c.discount_type, c.discount_value,
        c.min_order_amount, c.max_discount_amount,
        c.usage_limit, c.usage_count,
        c.starts_at, c.expires_at,
        c.is_active, c.description
      FROM coupons c
      WHERE UPPER(c.code) = UPPER($1)
      LIMIT 1
    `;

    const couponResult = await db.query(couponQuery, [coupon_code]);

    if (couponResult.rows.length === 0) {
      return {
        success: true,
        data: {
          valid: false,
          coupon_code: coupon_code.toUpperCase(),
          discount_type: null,
          discount_value: 0,
          discount_amount: 0,
          new_total: order_total,
          message: 'Invalid coupon code. This coupon does not exist.'
        }
      };
    }

    couponData = couponResult.rows[0];

    // Cache coupon data for 2 minutes
    if (redis) {
      try {
        await redis.setEx(cacheKey, 120, JSON.stringify(couponData));
      } catch (err) {
        console.warn('Redis cache write failed:', err.message);
      }
    }
  }

  // Validate coupon status
  const now = new Date();

  if (!couponData.is_active) {
    return {
      success: true,
      data: {
        valid: false,
        coupon_code: couponData.code,
        discount_type: couponData.discount_type,
        discount_value: parseFloat(couponData.discount_value),
        discount_amount: 0,
        new_total: order_total,
        message: 'This coupon is no longer active.'
      }
    };
  }

  if (couponData.starts_at && new Date(couponData.starts_at) > now) {
    return {
      success: true,
      data: {
        valid: false,
        coupon_code: couponData.code,
        discount_type: couponData.discount_type,
        discount_value: parseFloat(couponData.discount_value),
        discount_amount: 0,
        new_total: order_total,
        message: `This coupon is not yet active. It starts on ${new Date(couponData.starts_at).toLocaleDateString()}.`
      }
    };
  }

  if (couponData.expires_at && new Date(couponData.expires_at) < now) {
    return {
      success: true,
      data: {
        valid: false,
        coupon_code: couponData.code,
        discount_type: couponData.discount_type,
        discount_value: parseFloat(couponData.discount_value),
        discount_amount: 0,
        new_total: order_total,
        message: 'This coupon has expired.'
      }
    };
  }

  if (couponData.usage_limit && couponData.usage_count >= couponData.usage_limit) {
    return {
      success: true,
      data: {
        valid: false,
        coupon_code: couponData.code,
        discount_type: couponData.discount_type,
        discount_value: parseFloat(couponData.discount_value),
        discount_amount: 0,
        new_total: order_total,
        message: 'This coupon has reached its usage limit.'
      }
    };
  }

  const minOrder = parseFloat(couponData.min_order_amount || 0);
  if (order_total < minOrder) {
    return {
      success: true,
      data: {
        valid: false,
        coupon_code: couponData.code,
        discount_type: couponData.discount_type,
        discount_value: parseFloat(couponData.discount_value),
        discount_amount: 0,
        new_total: order_total,
        message: `Minimum order amount of $${minOrder.toFixed(2)} required. Your order total is $${order_total.toFixed(2)}.`
      }
    };
  }

  // Calculate discount
  let discountAmount = 0;
  const discountValue = parseFloat(couponData.discount_value);

  if (couponData.discount_type === 'percentage') {
    discountAmount = (order_total * discountValue) / 100;
  } else if (couponData.discount_type === 'fixed') {
    discountAmount = discountValue;
  } else if (couponData.discount_type === 'free_shipping') {
    discountAmount = 0; // Shipping discount handled separately
  }

  // Apply max discount cap
  const maxDiscount = parseFloat(couponData.max_discount_amount || Infinity);
  if (discountAmount > maxDiscount) {
    discountAmount = maxDiscount;
  }

  // Ensure discount does not exceed order total
  if (discountAmount > order_total) {
    discountAmount = order_total;
  }

  const newTotal = Math.max(0, order_total - discountAmount);

  const data = {
    valid: true,
    coupon_code: couponData.code,
    description: couponData.description || null,
    discount_type: couponData.discount_type,
    discount_value: discountValue,
    discount_amount: Math.round(discountAmount * 100) / 100,
    new_total: Math.round(newTotal * 100) / 100,
    original_total: order_total,
    savings_percentage: Math.round((discountAmount / order_total) * 100 * 100) / 100,
    message: `Coupon applied! You save $${discountAmount.toFixed(2)}.`
  };

  return { success: true, data };
}

module.exports = { toolDefinition, handler, inputSchema };
