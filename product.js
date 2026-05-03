const express = require('express');
const router = express.Router();
const Product = require('../models/Product'); // We bring in our blueprint

// Route 1: Create a new product (POST)
router.post('/product/new', async (req, res) => {
    try {
        const product = await Product.create(req.body);
        res.status(201).json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Route 2: Get all products (GET)
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;