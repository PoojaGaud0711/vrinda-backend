require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const productRoutes = require('./routes/product');
const userRoutes = require('./routes/user');
const orderRoutes = require('./routes/order');
const adminRoutes = require('./routes/admin');      // ← the missing line

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static('public'));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Database!'))
  .catch((err) => console.log('❌ Database Error:', err));

app.use('/api/v1', productRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/admin', adminRoutes);             // ← the other missing line

app.get('/', (req, res) => {
  res.redirect('/home.html');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});