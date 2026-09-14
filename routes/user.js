const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isLoggedIn } = require('../middleware/auth');

// --- REGISTER ---
router.post('/register', async (req, res) => {
    try {
        // Whitelist: ONLY these fields are trusted. No role from the client — ever.
        const { name, email, password, phone, gender, dob } = req.body;

        if (!name || !email || !password || !phone) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const existingEmail = await User.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({ success: false, message: 'Email already exists!' });
        }

        const existingPhone = await User.findOne({ phone });
        if (existingPhone) {
            return res.status(400).json({ success: false, message: 'This mobile number is already registered!' });
        }

        // role is NOT in this object → model default "customer" always applies
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

        // Sign the token — role travels INSIDE it, can't be forged client-side
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
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                gender: user.gender,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- PROFILE (any logged-in user) ---
router.get('/profile', isLoggedIn, async (req, res) => {
    res.status(200).json({
        success: true,
        user: {
            id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            phone: req.user.phone,
            gender: req.user.gender,
            role: req.user.role,
            createdAt: req.user.createdAt
        }
    });
});

module.exports = router;
