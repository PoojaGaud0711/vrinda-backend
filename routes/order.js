const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const { sendOrderConfirmation } = require('../services/emailService');

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

// POST /api/v1/orders — place order (login required, server-computed totals, inventory checked & deducted)
router.post('/', async (req, res) => {
  try {
    const user = await currentUser(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Please log in to place your order' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'Your account is blocked from placing orders' });
    }

    const { items, customer, address, paymentMethod, paymentDetails } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    for (const it of items) {
      if (!it.name || typeof it.price !== 'number' || !Number.isInteger(it.qty) || it.qty < 1) {
        return res.status(400).json({ success: false, message: 'Invalid item: ' + (it.name || 'unknown') });
      }
    }

    if (!customer?.name || !customer?.phone || !address?.line1 || !address?.pincode) {
      return res.status(400).json({ success: false, message: 'Missing delivery details' });
    }

    // ── Inventory / Stock Validation ──
    for (const it of items) {
      const prodId = it.productId || it.id;
      if (prodId) {
        const prod = await Product.findById(prodId);
        if (prod) {
          if (prod.stock < it.qty) {
            return res.status(400).json({
              success: false,
              message: `Insufficient stock for "${prod.name}". Available: ${prod.stock}, requested: ${it.qty}.`
            });
          }
          // Validate bundle items if combo
          if (prod.category === 'combos' && prod.bundleItems && prod.bundleItems.length) {
            for (const bundle of prod.bundleItems) {
              const bItem = await Product.findById(bundle.productId);
              const needed = bundle.qty * it.qty;
              if (bItem && bItem.stock < needed) {
                return res.status(400).json({
                  success: false,
                  message: `Insufficient stock for bundle component "${bItem.name}". Available: ${bItem.stock}, needed: ${needed}.`
                });
              }
            }
          }
        }
      }
    }

    // ── Server-Computed Totals ──
    const subtotal    = items.reduce((s, it) => s + it.price * it.qty, 0);
    const deliveryFee = subtotal >= FREE_DELIVERY_ABOVE ? 0 : DELIVERY_FEE;
    const total       = subtotal + deliveryFee;

    // Snapshot formatted items
    const snapshotItems = items.map(it => ({
      productId: it.productId || it.id,
      name: it.name,
      brand: it.brand || '',
      pack: it.pack || '',
      image: it.image || '',
      price: it.price,
      qty: it.qty,
    }));

    const validPayment = ['cod','upi','card'].includes(paymentMethod) ? paymentMethod : 'cod';

    const order = await Order.create({
      orderNumber: makeOrderNumber(),
      items: snapshotItems,
      subtotal,
      deliveryFee,
      total,
      customer,
      address,
      paymentMethod: validPayment,
      userId: user._id,
      status: 'placed',
    });

    // ── Deduct Stock ──
    for (const it of items) {
      const prodId = it.productId || it.id;
      if (prodId) {
        const prod = await Product.findByIdAndUpdate(prodId, { $inc: { stock: -it.qty } }, { new: true });
        if (prod && prod.category === 'combos' && prod.bundleItems && prod.bundleItems.length) {
          for (const bundle of prod.bundleItems) {
            await Product.findByIdAndUpdate(bundle.productId, { $inc: { stock: -(bundle.qty * it.qty) } });
          }
        }
      }
    }

    // Send confirmation email asynchronously
    sendOrderConfirmation(order).catch(e => console.error('Order confirmation email error:', e));

    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/orders/create-payment — initiate UPI / Card payment session
router.post('/create-payment', async (req, res) => {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Please log in' });

    const { amount, currency = 'INR' } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_vrinda_demo';
    const hasLiveKeys = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

    // Return payment order configuration
    const orderPayload = {
      key: keyId,
      amount: Math.round(amount * 100), // in paise
      currency,
      id: 'order_pay_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      isSandbox: !hasLiveKeys,
    };

    res.status(200).json({ success: true, payment: orderPayload });
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