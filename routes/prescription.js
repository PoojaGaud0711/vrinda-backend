const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Prescription = require('../models/Prescription');
const { isLoggedIn, adminOnly } = require('../middleware/auth');

// uploads folder — created automatically
const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads', 'prescriptions');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'rx-' + Date.now() + '-' + Math.round(Math.random() * 1e6) + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const ok = ['.jpg', '.jpeg', '.png', '.pdf'].includes(path.extname(file.originalname).toLowerCase());
    cb(null, ok); // invalid files arrive as "no file" → clear error below
  },
});

// quietly attach the logged-in user if a token is present (guests allowed)
async function currentUser(req) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(decoded.id);
  } catch { return null; }
}

// POST /api/v1/prescriptions — upload (works logged in OR as guest)
router.post('/', upload.single('prescription'), async (req, res) => {
  try {
    const { name, phone, notes } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Please enter your name' });
    if (!phone || !/^\d{10}$/.test(phone.trim())) return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Please attach your prescription (JPG, PNG or PDF, max 5MB)' });

    const user = await currentUser(req);

    const rx = await Prescription.create({
      name: name.trim(),
      phone: phone.trim(),
      notes: (notes || '').trim(),
      fileUrl: '/uploads/prescriptions/' + req.file.filename,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      userId: user ? user._id : undefined,
    });

    res.status(201).json({
      success: true,
      message: 'Prescription received! Our pharmacist will call you shortly.',
      reference: rx._id,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// GET /api/v1/prescriptions — admin: the queue
router.get('/', isLoggedIn, adminOnly, async (req, res) => {
  try {
    const prescriptions = await Prescription.find().sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ success: true, prescriptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/prescriptions/:id/status — admin
router.put('/:id/status', isLoggedIn, adminOnly, async (req, res) => {
  try {
    const allowed = ['new', 'contacted', 'fulfilled', 'rejected'];
    if (!allowed.includes(req.body.status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const rx = await Prescription.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!rx) return res.status(404).json({ success: false, message: 'Prescription not found' });
    res.status(200).json({ success: true, prescription: rx });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;