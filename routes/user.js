const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Order = require('../models/Order');
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
        await User.create({ name, email, password, phone, gender, dob });
        res.status(201).json({ success: true, message: 'User saved to database!' });
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

// --- MY ORDERS (NEW — powers order history) ---
router.get('/myorders', isLoggedIn, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, count: orders.length, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- UPDATE PROFILE (NEW) ---
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
        // no role, no email, no password here — those can't be changed through this route

        const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true });
        res.status(200).json({
            success: true, message: 'Profile updated',
            user: { id: user._id, name: user.name, email: user.email, phone: user.phone, gender: user.gender, dob: user.dob, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;