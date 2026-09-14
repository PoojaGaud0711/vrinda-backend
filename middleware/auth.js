const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── Gate 1: any logged-in user ──
exports.isLoggedIn = async (req, res, next) => {
    try {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;

        if (!token) {
            return res.status(401).json({ success: false, message: 'Please log in first' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ success: false, message: 'User no longer exists' });
        }
        if (user.isBlocked) {
            return res.status(403).json({ success: false, message: 'Your account has been blocked' });
        }

        req.user = user;   // every route after this gate can use req.user
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
};

// ── Gate 2: admin OR superadmin ──
exports.adminOnly = (req, res, next) => {
    if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Admins only' });
    }
    next();
};

// ── Gate 3: superadmin only ──
exports.superAdminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'superadmin') {
        return res.status(403).json({ success: false, message: 'Super Admin only' });
    }
    next();
};
