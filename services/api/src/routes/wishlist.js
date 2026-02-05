const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// -------------------------------------------------------
// GET /api/wishlist
// Get user's wishlist
// -------------------------------------------------------
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT w.id, w.created_at,
              p.id as product_uuid, p.product_id, p.name, p.category, p.subcategory,
              p.price, p.sale_price, p.stock_quantity, p.image_url, p.average_rating,
              p.review_count, p.is_active
       FROM wishlist w
       JOIN products p ON w.product_id = p.id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );

    const items = result.rows.map((row) => ({
      id: row.id,
      product: {
        id: row.product_uuid,
        product_id: row.product_id,
        name: row.name,
        category: row.category,
        subcategory: row.subcategory,
        price: parseFloat(row.price),
        sale_price: row.sale_price ? parseFloat(row.sale_price) : null,
        stock_quantity: row.stock_quantity,
        image_url: row.image_url,
        average_rating: row.average_rating ? parseFloat(row.average_rating) : null,
        review_count: row.review_count,
        in_stock: row.stock_quantity > 0,
        is_active: row.is_active,
      },
      added_at: row.created_at,
    }));

    res.json({
      success: true,
      data: items,
      count: items.length,
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------
// POST /api/wishlist
// Add product to wishlist
// -------------------------------------------------------
router.post(
  '/',
  verifyToken,
  [body('product_id').notEmpty().withMessage('Product ID is required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const { product_id } = req.body;

      // Resolve product
      const productResult = await db.query(
        `SELECT id, product_id, name, price, sale_price, image_url
         FROM products
         WHERE (id::text = $1 OR product_id = $1) AND is_active = true`,
        [product_id]
      );

      if (productResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Product not found.' });
      }

      const product = productResult.rows[0];

      // Check if already in wishlist
      const existing = await db.query(
        'SELECT id FROM wishlist WHERE user_id = $1 AND product_id = $2',
        [req.user.id, product.id]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Product is already in your wishlist.',
        });
      }

      const result = await db.query(
        `INSERT INTO wishlist (user_id, product_id)
         VALUES ($1, $2)
         RETURNING id, created_at`,
        [req.user.id, product.id]
      );

      res.status(201).json({
        success: true,
        data: {
          id: result.rows[0].id,
          product: {
            id: product.id,
            product_id: product.product_id,
            name: product.name,
            price: parseFloat(product.price),
            sale_price: product.sale_price ? parseFloat(product.sale_price) : null,
            image_url: product.image_url,
          },
          added_at: result.rows[0].created_at,
        },
        message: 'Product added to wishlist.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// DELETE /api/wishlist/:productId
// Remove product from wishlist
// -------------------------------------------------------
router.delete(
  '/:productId',
  verifyToken,
  [param('productId').trim()],
  async (req, res, next) => {
    try {
      const { productId } = req.params;

      // Support both UUID and product_id
      const result = await db.query(
        `DELETE FROM wishlist
         WHERE user_id = $1 AND product_id IN (
           SELECT id FROM products WHERE id::text = $2 OR product_id = $2
         )
         RETURNING id`,
        [req.user.id, productId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Product not found in wishlist.',
        });
      }

      res.json({
        success: true,
        message: 'Product removed from wishlist.',
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
