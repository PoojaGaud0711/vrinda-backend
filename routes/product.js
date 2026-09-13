const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// POST /api/v1/product/new  (unchanged)
router.post('/product/new', async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/products — now supports ?category=&sub=&q=&sort=
router.get('/products', async (req, res) => {
  try {
    const { category, sub, q, sort } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (sub) filter.subcategory = sub;
    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // escape regex chars
      filter.$or = [{ name: new RegExp(safe, 'i') }, { brand: new RegExp(safe, 'i') }];
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
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Invalid product id' });
  }
});

module.exports = router;
