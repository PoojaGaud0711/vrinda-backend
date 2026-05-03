require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // <-- ADDED THIS BACK
const productRoutes = require('./routes/product');
const userRoutes = require('./routes/user');

const app = express();

// Middleware
app.use(express.json());
app.use(cors()); // <-- ADDED THIS BACK (The permission slip!)
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Database!'))
  .catch((err) => console.log('❌ Database Error:', err));

// Routes
app.use('/api/v1', productRoutes);
app.use('/api/v1/user', userRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('🚀 Vrinda E-Commerce Backend is Running!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});