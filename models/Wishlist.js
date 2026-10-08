const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  // Snapshot of product details for instant UI rendering without extra round-trips
  product: {
    name: { type: String, required: true },
    brand: { type: String, default: '' },
    pack: { type: String, default: '' },
    price: { type: Number, required: true },
    mrp: { type: Number },
    image: { type: String, default: '' },
    category: { type: String, default: '' },
    subcategory: { type: String, default: '' },
    tag: { type: String, default: '' },
    requiresPrescription: { type: Boolean, default: false },
    stock: { type: Number, default: 0 },
  },
}, { timestamps: true });

wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('Wishlist', wishlistSchema);
