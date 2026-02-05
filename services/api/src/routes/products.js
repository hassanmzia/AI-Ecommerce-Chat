const express = require('express');
const { query: check, param, body, validationResult } = require('express-validator');
const db = require('../config/database');
const { cacheGet, cacheSet, cacheDel } = require('../config/redis');
const { verifyToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// -------------------------------------------------------
// GET /api/products
// List products with filtering, pagination, sorting
// -------------------------------------------------------
router.get(
  '/',
  optionalAuth,
  [
    check('page').optional().isInt({ min: 1 }).toInt(),
    check('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    check('category').optional().trim(),
    check('subcategory').optional().trim(),
    check('min_price').optional().isFloat({ min: 0 }).toFloat(),
    check('max_price').optional().isFloat({ min: 0 }).toFloat(),
    check('search').optional().trim(),
    check('sort').optional().isIn(['price_asc', 'price_desc', 'rating', 'newest', 'name', 'popular']),
    check('in_stock').optional().isBoolean().toBoolean(),
    check('on_sale').optional().isBoolean().toBoolean(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const offset = (page - 1) * limit;
      const {
        category,
        subcategory,
        min_price,
        max_price,
        search,
        sort,
        in_stock,
        on_sale,
      } = req.query;

      // Build cache key
      const cacheKey = `products:list:${JSON.stringify(req.query)}`;
      const cached = await cacheGet(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      // Build WHERE clauses
      const conditions = ['p.is_active = true'];
      const values = [];
      let paramIdx = 1;

      if (category) {
        conditions.push(`p.category ILIKE $${paramIdx++}`);
        values.push(`%${category}%`);
      }
      if (subcategory) {
        conditions.push(`p.subcategory ILIKE $${paramIdx++}`);
        values.push(`%${subcategory}%`);
      }
      if (min_price !== undefined) {
        conditions.push(`COALESCE(p.sale_price, p.price) >= $${paramIdx++}`);
        values.push(min_price);
      }
      if (max_price !== undefined) {
        conditions.push(`COALESCE(p.sale_price, p.price) <= $${paramIdx++}`);
        values.push(max_price);
      }
      if (search) {
        conditions.push(`(p.name ILIKE $${paramIdx} OR p.description ILIKE $${paramIdx} OR p.category ILIKE $${paramIdx})`);
        values.push(`%${search}%`);
        paramIdx++;
      }
      if (in_stock === true || in_stock === 'true') {
        conditions.push('p.stock_quantity > 0');
      }
      if (on_sale === true || on_sale === 'true') {
        conditions.push('p.sale_price IS NOT NULL AND p.sale_price < p.price');
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Sorting
      let orderClause = 'ORDER BY p.created_at DESC';
      switch (sort) {
        case 'price_asc':
          orderClause = 'ORDER BY COALESCE(p.sale_price, p.price) ASC';
          break;
        case 'price_desc':
          orderClause = 'ORDER BY COALESCE(p.sale_price, p.price) DESC';
          break;
        case 'rating':
          orderClause = 'ORDER BY p.average_rating DESC';
          break;
        case 'newest':
          orderClause = 'ORDER BY p.created_at DESC';
          break;
        case 'name':
          orderClause = 'ORDER BY p.name ASC';
          break;
        case 'popular':
          orderClause = 'ORDER BY p.review_count DESC';
          break;
      }

      // Count total
      const countResult = await db.query(
        `SELECT COUNT(*) FROM products p ${whereClause}`,
        values
      );
      const total = parseInt(countResult.rows[0].count, 10);

      // Fetch products
      values.push(limit, offset);
      const result = await db.query(
        `SELECT p.id, p.product_id, p.name, p.category, p.subcategory, p.price,
                p.sale_price, p.stock_quantity, p.description, p.specifications,
                p.image_url, p.images, p.average_rating, p.review_count,
                p.is_featured, p.created_at
         FROM products p
         ${whereClause}
         ${orderClause}
         LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
        values
      );

      const response = {
        success: true,
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      };

      await cacheSet(cacheKey, response, 120);

      res.json(response);
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// GET /api/products/featured
// -------------------------------------------------------
router.get('/featured', async (req, res, next) => {
  try {
    const cacheKey = 'products:featured';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const result = await db.query(
      `SELECT id, product_id, name, category, subcategory, price, sale_price,
              stock_quantity, description, image_url, images, average_rating,
              review_count, is_featured
       FROM products
       WHERE is_featured = true AND is_active = true
       ORDER BY average_rating DESC
       LIMIT 10`
    );

    const response = { success: true, data: result.rows };
    await cacheSet(cacheKey, response, 300);

    res.json(response);
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------
// GET /api/products/categories
// -------------------------------------------------------
router.get('/categories', async (req, res, next) => {
  try {
    const cacheKey = 'products:categories';
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const result = await db.query(
      `SELECT category, subcategory, COUNT(*) as product_count,
              MIN(COALESCE(sale_price, price)) as min_price,
              MAX(COALESCE(sale_price, price)) as max_price
       FROM products
       WHERE is_active = true
       GROUP BY category, subcategory
       ORDER BY category, subcategory`
    );

    // Group by category
    const categories = {};
    for (const row of result.rows) {
      if (!categories[row.category]) {
        categories[row.category] = {
          name: row.category,
          subcategories: [],
          totalProducts: 0,
        };
      }
      categories[row.category].subcategories.push({
        name: row.subcategory,
        productCount: parseInt(row.product_count, 10),
        minPrice: parseFloat(row.min_price),
        maxPrice: parseFloat(row.max_price),
      });
      categories[row.category].totalProducts += parseInt(row.product_count, 10);
    }

    const response = { success: true, data: Object.values(categories) };
    await cacheSet(cacheKey, response, 600);

    res.json(response);
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------
// GET /api/products/:id
// -------------------------------------------------------
router.get(
  '/:id',
  optionalAuth,
  [param('id').trim()],
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const cacheKey = `product:${id}`;
      const cached = await cacheGet(cacheKey);
      if (cached) return res.json(cached);

      // Support both UUID and product_id
      const result = await db.query(
        `SELECT id, product_id, name, category, subcategory, price, sale_price,
                stock_quantity, description, specifications, image_url, images,
                average_rating, review_count, is_featured, is_active, created_at, updated_at
         FROM products
         WHERE (id::text = $1 OR product_id = $1) AND is_active = true`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Product not found.' });
      }

      const response = { success: true, data: result.rows[0] };
      await cacheSet(cacheKey, response, 300);

      res.json(response);
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// GET /api/products/:id/reviews
// -------------------------------------------------------
router.get(
  '/:id/reviews',
  [
    param('id').trim(),
    check('page').optional().isInt({ min: 1 }).toInt(),
    check('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    check('sort').optional().isIn(['newest', 'highest', 'lowest', 'helpful']),
  ],
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const offset = (page - 1) * limit;
      const sort = req.query.sort || 'newest';

      // Resolve product UUID
      const productResult = await db.query(
        `SELECT id FROM products WHERE (id::text = $1 OR product_id = $1) AND is_active = true`,
        [id]
      );
      if (productResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Product not found.' });
      }
      const productUuid = productResult.rows[0].id;

      let orderClause = 'ORDER BY r.created_at DESC';
      switch (sort) {
        case 'highest':
          orderClause = 'ORDER BY r.rating DESC, r.created_at DESC';
          break;
        case 'lowest':
          orderClause = 'ORDER BY r.rating ASC, r.created_at DESC';
          break;
        case 'helpful':
          orderClause = 'ORDER BY r.helpful_count DESC, r.created_at DESC';
          break;
      }

      const countResult = await db.query(
        'SELECT COUNT(*) FROM reviews WHERE product_id = $1',
        [productUuid]
      );
      const total = parseInt(countResult.rows[0].count, 10);

      const result = await db.query(
        `SELECT r.id, r.rating, r.title, r.content, r.is_verified_purchase,
                r.helpful_count, r.created_at, r.updated_at,
                u.full_name as reviewer_name, u.avatar_url as reviewer_avatar
         FROM reviews r
         JOIN users u ON r.user_id = u.id
         WHERE r.product_id = $1
         ${orderClause}
         LIMIT $2 OFFSET $3`,
        [productUuid, limit, offset]
      );

      // Rating distribution
      const distResult = await db.query(
        `SELECT rating, COUNT(*) as count
         FROM reviews WHERE product_id = $1
         GROUP BY rating ORDER BY rating DESC`,
        [productUuid]
      );

      const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      for (const row of distResult.rows) {
        ratingDistribution[row.rating] = parseInt(row.count, 10);
      }

      res.json({
        success: true,
        data: result.rows,
        ratingDistribution,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// -------------------------------------------------------
// POST /api/products/:id/reviews
// -------------------------------------------------------
router.post(
  '/:id/reviews',
  verifyToken,
  [
    param('id').trim(),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('title').optional().trim().isLength({ max: 255 }),
    body('content').optional().trim().isLength({ max: 5000 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(422).json({ success: false, error: 'Validation failed', details: errors.array() });
      }

      const { id } = req.params;
      const { rating, title, content } = req.body;

      // Resolve product
      const productResult = await db.query(
        `SELECT id FROM products WHERE (id::text = $1 OR product_id = $1) AND is_active = true`,
        [id]
      );
      if (productResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Product not found.' });
      }
      const productUuid = productResult.rows[0].id;

      // Check for existing review
      const existingReview = await db.query(
        'SELECT id FROM reviews WHERE product_id = $1 AND user_id = $2',
        [productUuid, req.user.id]
      );
      if (existingReview.rows.length > 0) {
        return res.status(409).json({ success: false, error: 'You have already reviewed this product.' });
      }

      // Check if it's a verified purchase
      const purchaseCheck = await db.query(
        `SELECT id FROM orders
         WHERE user_id = $1 AND status = 'delivered'
         AND items::text LIKE $2`,
        [req.user.id, `%${id}%`]
      );
      const isVerified = purchaseCheck.rows.length > 0;

      // Insert review
      const result = await db.query(
        `INSERT INTO reviews (product_id, user_id, rating, title, content, is_verified_purchase)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, rating, title, content, is_verified_purchase, helpful_count, created_at`,
        [productUuid, req.user.id, rating, title || null, content || null, isVerified]
      );

      // Update product average rating and review count
      await db.query(
        `UPDATE products SET
           average_rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE product_id = $1),
           review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = $1)
         WHERE id = $1`,
        [productUuid]
      );

      // Invalidate product cache
      await cacheDel(`product:${id}`);

      res.status(201).json({
        success: true,
        data: {
          ...result.rows[0],
          reviewer_name: req.user.full_name,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
