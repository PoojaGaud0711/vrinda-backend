const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Wishlist = require('../models/Wishlist');
const { isLoggedIn } = require('../middleware/auth');

// --- REGISTER ---
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, gender, dob } = req.body;
        if (!name || !email || !password || !phone) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        if (await User.findOne({ email })) {
            return res.status(400).json({ success: false, message: 'Email already exists!' });
        }
        if (await User.findOne({ phone })) {
            return res.status(400).json({ success: false, message: 'This mobile number is already registered!' });
        }
        await User.create({ name, email, password, phone, gender, dob, role: 'customer' });
        res.status(201).json({ success: true, message: 'User registered successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- LOGIN ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid Email or Password' });
        }
        if (user.isBlocked) {
            return res.status(403).json({ success: false, message: 'Your account has been blocked. Please contact support.' });
        }
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({ success: false, message: 'Invalid Email or Password' });
        }
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
        res.status(200).json({
            success: true,
            message: 'Login Successful! Welcome back.',
            token,
            user: {
                id: user._id, name: user.name, email: user.email,
                phone: user.phone, gender: user.gender, role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- PROFILE ---
router.get('/profile', isLoggedIn, async (req, res) => {
    res.status(200).json({
        success: true,
        user: {
            id: req.user._id, name: req.user.name, email: req.user.email,
            phone: req.user.phone, gender: req.user.gender,
            dob: req.user.dob, role: req.user.role, createdAt: req.user.createdAt
        }
    });
});

// --- MY ORDERS ---
router.get('/myorders', isLoggedIn, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: orders.length, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- UPDATE PROFILE ---
router.put('/update', isLoggedIn, async (req, res) => {
    try {
        const { name, phone, gender, dob } = req.body;

        if (phone && !/^\d{10}$/.test(phone)) {
            return res.status(400).json({ success: false, message: 'Phone must be exactly 10 digits' });
        }
        if (phone && phone !== req.user.phone) {
            const taken = await User.findOne({ phone });
            if (taken) {
                return res.status(400).json({ success: false, message: 'This mobile number is already registered' });
            }
        }

        const update = {};
        if (name && name.trim()) update.name = name.trim();
        if (phone) update.phone = phone;
        if (['Male', 'Female', 'Other'].includes(gender)) update.gender = gender;
        if (dob) { const d = new Date(dob); if (!isNaN(d.getTime())) update.dob = d; }

        const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true });
        res.status(200).json({
            success: true, message: 'Profile updated',
            user: { id: user._id, name: user.name, email: user.email, phone: user.phone, gender: user.gender, dob: user.dob, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- CHANGE PASSWORD ---
router.put('/change-password', isLoggedIn, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Current and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
        }

        const user = await User.findById(req.user._id).select('+password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password does not match' });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ success: true, message: 'Password updated successfully!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ═════ WISHLIST CRUD ═════

// GET /api/v1/user/wishlist — retrieve user's wishlist
router.get('/wishlist', isLoggedIn, async (req, res) => {
    try {
        const items = await Wishlist.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: items.length, items });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/v1/user/wishlist — add a product to wishlist
router.post('/wishlist', isLoggedIn, async (req, res) => {
    try {
        const { productId } = req.body;
        if (!productId) {
            return res.status(400).json({ success: false, message: 'productId is required' });
        }

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const existing = await Wishlist.findOne({ userId: req.user._id, productId });
        if (existing) {
            return res.status(200).json({ success: true, message: 'Product already in wishlist', item: existing });
        }

        const item = await Wishlist.create({
            userId: req.user._id,
            productId: product._id,
            product: {
                name: product.name,
                brand: product.brand,
                pack: product.pack,
                price: product.price,
                mrp: product.mrp,
                image: product.image,
                category: product.category,
                subcategory: product.subcategory,
                tag: product.tag,
                requiresPrescription: product.requiresPrescription,
                stock: product.stock,
            }
        });

        res.status(201).json({ success: true, message: 'Added to wishlist', item });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// DELETE /api/v1/user/wishlist/:productId — remove product from wishlist
router.delete('/wishlist/:productId', isLoggedIn, async (req, res) => {
    try {
        const result = await Wishlist.findOneAndDelete({
            userId: req.user._id,
            productId: req.params.productId
        });
        if (!result) {
            return res.status(404).json({ success: false, message: 'Item not found in wishlist' });
        }
        res.status(200).json({ success: true, message: 'Removed from wishlist' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/v1/user/wishlist/check/:productId — check if in wishlist
router.get('/wishlist/check/:productId', isLoggedIn, async (req, res) => {
    try {
        const item = await Wishlist.findOne({ userId: req.user._id, productId: req.params.productId });
        res.status(200).json({ success: true, inWishlist: !!item });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;