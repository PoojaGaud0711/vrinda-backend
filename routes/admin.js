const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { isLoggedIn, adminOnly, superAdminOnly } = require('../middleware/auth');

// Every route in this file sits behind both gates
router.use(isLoggedIn, adminOnly);

/* ═══ DASHBOARD ═══ */
router.get('/stats', async (req, res) => {
  try {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const [totalOrders, todayOrders, productCount, customerCount, orders, lowStock, recent] =
      await Promise.all([
        Order.countDocuments(),
        Order.countDocuments({ createdAt: { $gte: startOfDay } }),
        Product.countDocuments(),
        User.countDocuments({ role: 'customer' }),
        Order.find({ status: { $ne: 'cancelled' } }),
        Product.find({ stock: { $lte: 5 } }).limit(10),
        Order.find().sort({ createdAt: -1 }).limit(5),
      ]);
    const revenue = orders.reduce((s, o) => s + o.total, 0);
    res.status(200).json({
      success: true,
      stats: { totalOrders, todayOrders, productCount, customerCount, revenue },
      lowStock, recent,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ═══ ORDERS ═══ */
router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(200);
    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Accept = confirmed, Reject = cancelled, then packed → shipped → delivered
router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ═══ PRODUCTS (full control) ═══ */
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/products', async (req, res) => {
  try {
    const p = await Product.create(whitelist(req.body));
    res.status(201).json({ success: true, product: p });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, whitelist(req.body), { new: true, runValidators: true });
    if (!p) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, product: p });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const p = await Product.findByIdAndDelete(req.params.id);
    if (!p) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

function whitelist(b) {
  return {
    name: b.name, brand: b.brand, pack: b.pack,
    price: Number(b.price), mrp: b.mrp ? Number(b.mrp) : undefined,
    image: b.image, category: b.category, subcategory: b.subcategory,
    tag: b.tag || '', requiresPrescription: !!b.requiresPrescription,
    stock: b.stock !== undefined ? Math.max(0, Number(b.stock) || 0) : undefined,
  };
}

/* ═══ STOCK ═══ */
router.put('/stock/:id', async (req, res) => {
  try {
    const stock = Math.max(0, Number(req.body.stock) || 0);
    const p = await Product.findByIdAndUpdate(req.params.id, { stock }, { new: true });
    if (!p) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, product: p });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ═══ USERS (customers) ═══ */
router.get('/users', async (req, res) => {
  try {
    const [users, orders] = await Promise.all([
      User.find({ role: 'customer' }).sort({ createdAt: -1 }),
      Order.find({}, 'customer.phone'),
    ]);
    const countByPhone = {};
    orders.forEach(o => {
      const ph = o.customer?.phone;
      if (ph) countByPhone[ph] = (countByPhone[ph] || 0) + 1;
    });
    const list = users.map(u => ({
      id: u._id, name: u.name, email: u.email, phone: u.phone,
      gender: u.gender, isBlocked: u.isBlocked,
      joined: u.createdAt, orderCount: countByPhone[u.phone] || 0,
    }));
    res.status(200).json({ success: true, users: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/users/:id/block', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Staff accounts cannot be blocked' });
    }
    user.isBlocked = !!req.body.blocked;
    await user.save();
    res.status(200).json({ success: true, isBlocked: user.isBlocked });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ═══ ADMINS (superadmin only) ═══ */
router.get('/admins', superAdminOnly, async (req, res) => {
  try {
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      admins: admins.map(a => ({ id: a._id, name: a.name, email: a.email, phone: a.phone, role: a.role, joined: a.createdAt })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/admins', superAdminOnly, async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    if (await User.findOne({ email })) return res.status(400).json({ success: false, message: 'Email already exists' });
    if (await User.findOne({ phone })) return res.status(400).json({ success: false, message: 'Phone already exists' });

    const newRole = role === 'superadmin' ? 'superadmin' : 'admin';
    await User.create({ name, email, password, phone, role: newRole });
    res.status(201).json({ success: true, message: newRole + ' account created' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/admins/:id/role', superAdminOnly, async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });
    if (target._id.equals(req.user._id)) return res.status(400).json({ success: false, message: 'You cannot change your own role' });
    if (target.role === 'superadmin') return res.status(403).json({ success: false, message: 'Super Admins cannot be changed' });

    const role = req.body.role === 'admin' ? 'admin' : 'customer';
    target.role = role;
    await target.save();
    res.status(200).json({ success: true, role });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/admins/:id', superAdminOnly, async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ success: false, message: 'User not found' });
    if (target._id.equals(req.user._id)) return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    if (target.role === 'superadmin') return res.status(403).json({ success: false, message: 'Super Admins cannot be deleted' });

    await target.deleteOne();
    res.status(200).json({ success: true, message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;