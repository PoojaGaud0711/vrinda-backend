const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Prescription = require('../models/Prescription');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { isLoggedIn, adminOnly, superAdminOnly } = require('../middleware/auth');

// Every route in this file sits behind both gates
router.use(isLoggedIn, adminOnly);

/* ── Audit helper: records who did what. Never breaks the main action. ── */
async function logActivity(req, action, detail = '') {
  try {
    await Activity.create({
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.role,
      action, detail,
    });
  } catch (e) { /* logging must never fail a real action */ }
}

// ── Product image upload ──
const IMG_DIR = path.join(__dirname, '..', 'public', 'uploads', 'products');
fs.mkdirSync(IMG_DIR, { recursive: true });

const imgStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, IMG_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'pimg-' + Date.now() + '-' + Math.round(Math.random() * 1e6) + ext);
  },
});

const imgUpload = multer({
  storage: imgStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file.originalname).toLowerCase());
    cb(null, ok);
  },
});

// POST /api/v1/admin/upload-image — returns { url } to store on the product
router.post('/upload-image', imgUpload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please choose an image (JPG, PNG or WebP, max 5MB)' });
  }
  res.status(201).json({
    success: true,
    message: 'Image uploaded',
    url: '/uploads/products/' + req.file.filename,
  });
});

/* ═══ DASHBOARD ═══ */
router.get('/stats', async (req, res) => {
  try {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);

    const [totalOrders, todayOrders, productCount, customerCount,
           adminsCount, blockedCount, cancelledCount,
           lowStock, recent, orders, activities,
           todayRevenueAgg, todayUsers, todayPrescriptions] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: startOfDay } }),
      Product.countDocuments(),
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: { $in: ['admin', 'superadmin'] } }),
      User.countDocuments({ role: 'customer', isBlocked: true }),
      Order.countDocuments({ status: 'cancelled' }),
      Product.find({ stock: { $lte: 5 } }).limit(10),
      Order.find().sort({ createdAt: -1 }).limit(5),
      Order.find({ status: { $ne: 'cancelled' } }),
      Activity.find().sort({ createdAt: -1 }).limit(6),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfDay }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, revenue: { $sum: '$total' } } },
      ]),
      User.countDocuments({ createdAt: { $gte: startOfDay }, role: 'customer' }),
      Prescription.countDocuments({ createdAt: { $gte: startOfDay } }),
    ]);

    const revenue = orders.reduce((s, o) => s + o.total, 0);
    const avgOrderValue = orders.length ? Math.round(revenue / orders.length) : 0;

    // revenue per day, last 7 days
    const revByDay = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      revByDay[d.toDateString()] = 0;
    }
    orders.forEach(o => {
      const k = new Date(o.createdAt).toDateString();
      if (k in revByDay) revByDay[k] += o.total;
    });
    const revenue7d = Object.entries(revByDay).map(([day, total]) => ({ day, total }));

    const isSuper = req.user.role === 'superadmin';
    res.status(200).json({
      success: true,
      stats: { totalOrders, todayOrders, productCount, customerCount,
               adminsCount, blockedCount, cancelledCount, revenue, avgOrderValue,
               todayRevenue: todayRevenueAgg[0]?.revenue || 0,
               todayUsers, todayPrescriptions },
      revenue7d, lowStock, recent,
      activities: isSuper ? activities : [],   // the global eye is superadmin-only
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ═══ AUDIT LOG (superadmin only) ═══ */
router.get('/activity', superAdminOnly, async (req, res) => {
  try {
    const activities = await Activity.find().sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ success: true, activities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ═══ PRESCRIPTIONS ═══ */
router.get('/prescriptions', async (req, res) => {
  try {
    const prescriptions = await Prescription.find().sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ success: true, prescriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/prescriptions/:id/status', async (req, res) => {
  try {
    const allowed = ['new', 'contacted', 'fulfilled', 'rejected'];
    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const rx = await Prescription.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found' });
    await logActivity(req, 'prescription.' + req.body.status, rx.name + ' · ' + rx.phone);
    res.status(200).json({ success: true, prescription: rx });
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
    await logActivity(req, 'order.' + status, order.orderNumber + ' · ' + order.customer.name);
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
    await logActivity(req, 'product.created', p.name);
    res.status(201).json({ success: true, product: p });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/products/:id', async (req, res) => {
  try {
    const p = await Product.findByIdAndUpdate(req.params.id, whitelist(req.body), { new: true, runValidators: true });
    if (!p) return res.status(404).json({ success: false, message: 'Product not found' });
    await logActivity(req, 'product.updated', p.name);
    res.status(200).json({ success: true, product: p });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const p = await Product.findByIdAndDelete(req.params.id);
    if (!p) return res.status(404).json({ success: false, message: 'Product not found' });
    await logActivity(req, 'product.deleted', p.name);
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
    await logActivity(req, 'stock.updated', p.name + ' → ' + stock);
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
    await logActivity(req, user.isBlocked ? 'user.blocked' : 'user.unblocked', user.name + ' · ' + user.email);
    res.status(200).json({ success: true, isBlocked: user.isBlocked });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ═══ USER DETAIL (admin) — profile + full order history ═══ */
router.get('/users/:id/detail', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const orders = await Order.find({ userId: user._id }).sort({ createdAt: -1 });

    const totals = orders.reduce((acc, o) => {
      if (o.status !== 'cancelled') {
        acc.spend += o.total;
        acc.count += 1;
      }
      return acc;
    }, { spend: 0, count: 0 });

    res.status(200).json({
      success: true,
      user: {
        id: user._id, name: user.name, email: user.email, phone: user.phone,
        gender: user.gender, dob: user.dob, isBlocked: user.isBlocked,
        role: user.role, joined: user.createdAt,
      },
      stats: { totalOrders: orders.length, activeOrders: totals.count, totalSpend: totals.spend },
      orders: orders.map(o => ({
        id: o._id, orderNumber: o.orderNumber, status: o.status,
        total: o.total, items: o.items.length, createdAt: o.createdAt,
      })),
    });
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
    await logActivity(req, 'admin.created', newRole + ' · ' + name + ' (' + email + ')');
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
    await logActivity(req, 'admin.roleChanged', target.name + ' → ' + role);
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
    await logActivity(req, 'admin.deleted', target.name + ' (' + target.email + ')');
    res.status(200).json({ success: true, message: 'Account deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;