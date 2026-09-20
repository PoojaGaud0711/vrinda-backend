const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Order = require('../models/Order');
const User = require('../models/User');

const FREE_DELIVERY_ABOVE = 499;
const DELIVERY_FEE = 40;

function makeOrderNumber() {
  return 'VRN-' + Math.floor(100000 + Math.random() * 900000);
}

// Quietly identifies the logged-in user if a token is present.
async function currentUser(req) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(decoded.id);
  } catch { return null; }
}

// POST /api/v1/orders
router.post('/', async (req, res) => {
  try {
    const { items, customer, address, paymentMethod } = req.body;

    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ success: false, message: 'Cart is empty' });

    for (const it of items) {
      if (!it.name || typeof it.price !== 'number' || !Number.isInteger(it.qty) || it.qty < 1)
        return res.status(400).json({ success: false, message: 'Invalid item: ' + (it.name || 'unknown') });
    }

    if (!customer?.name || !customer?.phone || !address?.line1 || !address?.pincode)
      return res.status(400).json({ success: false, message: 'Missing delivery details' });

    const subtotal    = items.reduce((s, it) => s + it.price * it.qty, 0);
    const deliveryFee = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
    const total       = subtotal + deliveryFee;

    const user = await currentUser(req);

    const order = await Order.create({
      orderNumber: makeOrderNumber(),
      items, subtotal, deliveryFee, total,
      customer, address,
      paymentMethod: ['cod','upi','card'].includes(paymentMethod) ? paymentMethod : 'cod',
      userId: user ? user._id : undefined,
    });

    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/orders — recent 50 (admin-facing)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/orders/track/:number — PUBLIC, safe fields only.
// Must be defined BEFORE /:id, or "track" gets treated as an id.
router.get('/track/:number', async (req, res) => {
  try {
    const number = String(req.params.number || '').trim().toUpperCase();
    const order = await Order.findOne({ orderNumber: number });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found — check the number (looks like VRN-123456)' });
    }

    // SAFE FIELDS ONLY: no address line, no phone, no full name, no item names.
    res.status(200).json({
      success: true,
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        placedAt: order.createdAt,
        paymentMethod: order.paymentMethod,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        total: order.total,
        itemCount: order.items.reduce((s, i) => s + i.qty, 0),
        firstName: order.customer.name.split(' ')[0],
        city: order.address.city,
        pincode: order.address.pincode,
      }
    });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Order not found' });
  }
});

// GET /api/v1/orders/:id — full details by _id OR order number
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findOne({
      $or: [{ _id: req.params.id }, { orderNumber: req.params.id }]
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(404).json({ success: false, message: 'Order not found' });
  }
});

module.exports = router;