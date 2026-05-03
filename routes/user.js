const express = require('express');
const router = express.Router();
const User = require('../models/User');

// --- REGISTER ROUTE ---
router.post('/register', async (req, res) => {
    try {
       const { name, email, password, phone, gender, dob } = req.body;
        let existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Email already exists!" });
        }
       const user = await User.create({ name, email, password, phone, gender, dob });
        res.status(201).json({ success: true, message: "User saved to database!" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- LOGIN ROUTE ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user (select('+password') forces it to give us the password so we can check it)
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid Email or Password" });
        }

        // Check if password matches
        const isPasswordMatch = await user.comparePassword(password);

        if (!isPasswordMatch) {
            return res.status(401).json({ success: false, message: "Invalid Email or Password" });
        }

        res.status(200).json({ success: true, message: "Login Successful! Welcome back." });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;