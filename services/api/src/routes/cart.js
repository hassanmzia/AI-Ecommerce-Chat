const express = require('express');
const { body, param, validationResult } = require('express-validator');
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { cacheDel } = require('../config/redis');

const router = express.Router();

// -------------------------------------------------------
// GET /api/cart
// Get cart items
// -------------------------------------------------------
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT ci.id, ci.quantity, ci.created_at, ci.updated_at,
              p.id as product_uuid, p.product_id, p.name, p.price, p.sale_price,
              p.stock_quantity, p.image_url, p.category
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1
       ORDER BY ci.created_at DESC`,
      [req.user.id]
    );

    // Calculate totals
    let subtotal = 0;
    const items = result.rows.map((item) => {
      const unitPrice = item.sale_price
        ? parseFloat(item.sale_price)
        : parseFloat(item.price);
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;

      return {
        id: item.id,
        product_id: item.product_id,
        product_uuid: item.product_uuid,
        name: item.name,
        price: parseFloat(item.price),
        sale_price: item.sale_price ? parseFloat(item.sale_price) : null,
        effective_price: unitPrice,
        quantity: item.quantity,
        line_total: Math.round(lineTotal * 100) / 100,
        stock_quantity: item.stock_quantity,
        image_url: item.image_url,
        category: item.category,
        created_at: item.created_at,
        updated_at: item.updated_at,
      };
    });

    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const shippingCost = subtotal >= 100 ? 0 : 9.99;
    const total = Math.round((subtotal + tax + shippingCost) * 100) / 100;

    res.json({
      success: true,
      data: {
        items,
        summary: {
          itemCount: items.length,
          totalQuantity: items.reduce((sum, i) => sum + i.quantity, 0),
          subtotal: Math.round(subtotal * 100) / 100,
          tax,
          shipping: shippingCost,
          total,
          freeShippingThreshold: 100,
          amountToFreeShipping: subtotal >= 100 ? 0 : Math.round((100 - subtotal) * 100) / 100,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------
// POST /api/cart
// Add item to cart
// -------------------------------------------------------
router.post(
  '/',
  verifyToken,
  [
    body('product_id').notEmpty().withMessage('Product ID is required'),
    body('quantity').optional().isInt({ min: 1, max: 99 }).withMessage('Quantity must be between 1 and 99'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const { product_id, quantity = 1 } = req.body;

      // Resolve product
      const productResult = await db.query(
        `SELECT id, product_id, name, price, sale_price, stock_quantity, image_url
         FROM products
         WHERE (id::text = $1 OR product_id = $1) AND is_active = true`,
        [product_id]
      );

      if (productResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Product not found.' });
      }

      const product = productResult.rows[0];

      if (product.stock_quantity < quantity) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock. Only ${product.stock_quantity} available.`,
        });
      }

      // Check if item already exists in cart
      const existingItem = await db.query(
        'SELECT id, quantity FROM cart_items WHERE user_id = $1 AND product_id = $2',
        [req.user.id, product.id]
      );

      let cartItem;
      if (existingItem.rows.length > 0) {
        const newQuantity = existingItem.rows[0].quantity + quantity;
        if (newQuantity > product.stock_quantity) {
          return res.status(400).json({
            success: false,
            error: `Cannot add more. Total quantity (${newQuantity}) exceeds available stock (${product.stock_quantity}).`,
          });
        }

        const updateResult = await db.query(
          `UPDATE cart_items SET quantity = $1 WHERE id = $2
           RETURNING id, quantity, created_at, updated_at`,
          [newQuantity, existingItem.rows[0].id]
        );
        cartItem = updateResult.rows[0];
      } else {
        const insertResult = await db.query(
          `INSERT INTO cart_items (user_id, product_id, quantity)
           VALUES ($1, $2, $3)
           RETURNING id, quantity, created_at, updated_at`,
          [req.user.id, product.id, quantity]
        );
        cartItem = insertResult.rows[0];
      }

      res.status(201).json({
        success: true,
        data: {
          id: cartItem.id,
          product_id: product.product_id,
          name: product.name,
          price: parseFloat(product.price),
          sale_price: product.sale_price ? parseFloat(product.sale_price) : null,
          quantity: cartItem.quantity,
          image_url: product.image_url,
          created_at: cartItem.created_at,
          updated_at: cartItem.updated_at,
        },
        message: existingItem.rows.length > 0
          ? 'Cart item quantity updated.'
          : 'Item added to cart.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// PUT /api/cart/:id
// Update cart item quantity
// -------------------------------------------------------
router.put(
  '/:id',
  verifyToken,
  [
    param('id').isUUID().withMessage('Valid cart item ID is required'),
    body('quantity').isInt({ min: 1, max: 99 }).withMessage('Quantity must be between 1 and 99'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const { id } = req.params;
      const { quantity } = req.body;

      // Fetch cart item with product info
      const cartResult = await db.query(
        `SELECT ci.id, ci.product_id, p.stock_quantity, p.name
         FROM cart_items ci
         JOIN products p ON ci.product_id = p.id
         WHERE ci.id = $1 AND ci.user_id = $2`,
        [id, req.user.id]
      );

      if (cartResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Cart item not found.' });
      }

      const cartItem = cartResult.rows[0];

      if (quantity > cartItem.stock_quantity) {
        return res.status(400).json({
          success: false,
          error: `Cannot set quantity to ${quantity}. Only ${cartItem.stock_quantity} in stock.`,
        });
      }

      const result = await db.query(
        `UPDATE cart_items SET quantity = $1 WHERE id = $2
         RETURNING id, quantity, updated_at`,
        [quantity, id]
      );

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Cart item updated.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// DELETE /api/cart/:id
// Remove item from cart
// -------------------------------------------------------
router.delete(
  '/:id',
  verifyToken,
  [param('id').isUUID().withMessage('Valid cart item ID is required')],
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const result = await db.query(
        'DELETE FROM cart_items WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Cart item not found.' });
      }

      res.json({
        success: true,
        message: 'Item removed from cart.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// DELETE /api/cart
// Clear entire cart
// -------------------------------------------------------
router.delete('/', verifyToken, async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM cart_items WHERE user_id = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      message: `Cart cleared. ${result.rowCount} item(s) removed.`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
