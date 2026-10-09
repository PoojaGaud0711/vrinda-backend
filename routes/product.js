const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Review = require('../models/Review');
const Order = require('../models/Order');
const { isLoggedIn } = require('../middleware/auth');

// POST /api/v1/product/new
router.post('/product/new', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/products?category=&sub=&q=&sort=
router.get('/products', async (req, res) => {
  try {
    const { category, sub, q, sort } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (sub) filter.subcategory = sub;
    if (q) {
      const safe = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape regex chars
      const rx = new RegExp(safe, 'i');
      filter.$or = [
        { name: rx },
        { brand: rx },
        { description: rx },
        { highlights: rx },
        { category: rx },
        { subcategory: rx },
        { tag: rx },
        { pack: rx }
      ];
    }
    const sortOption =
      sort === 'price-asc'  ? { price: 1 }  :
      sort === 'price-desc' ? { price: -1 } :
      sort === 'name'       ? { name: 1 }   : { createdAt: -1 };

    const products = await Product.find(filter).sort(sortOption);
    res.status(200).json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/products/:id — for the detail page
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('bundleItems.productId', 'name brand pack price image stock');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Invalid product id' });
  }
});

// ═════ RATINGS & REVIEWS ═════

// GET /api/v1/products/:id/reviews — fetch all reviews for a product
router.get('/products/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ productId: req.params.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/products/:id/reviews — submit a rating and review
router.post('/products/:id/reviews', isLoggedIn, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const numRating = Number(rating);

    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5' });
    }
    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: 'Review comment cannot be empty' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Check if user already reviewed
    const existing = await Review.findOne({ productId: product._id, userId: req.user._id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this product' });
    }

    // Check if verified purchase
    const hasOrdered = await Order.findOne({
      userId: req.user._id,
      status: { $in: ['confirmed', 'packed', 'shipped', 'delivered'] },
      'items.productId': product._id,
    });

    const review = await Review.create({
      productId: product._id,
      userId: req.user._id,
      userName: req.user.name,
      rating: numRating,
      comment: comment.trim(),
      verifiedPurchase: !!hasOrdered,
    });

    // Recompute average rating and count
    const allReviews = await Review.find({ productId: product._id });
    const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;

    product.averageRating = Math.round(avg * 10) / 10;
    product.reviewCount = allReviews.length;
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Review posted successfully!',
      review,
      averageRating: product.averageRating,
      reviewCount: product.reviewCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
