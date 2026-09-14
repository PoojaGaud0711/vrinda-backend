const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  brand:      { type: String, default: '' },
  pack:       { type: String, default: '' },
  price:      { type: Number, required: true, min: 0 },
  mrp:        { type: Number, min: 0 },
  image:      { type: String, default: '' },
  category:   { type: String, required: true, enum: ['medicines','beauty','snacks','needfuls'], index: true },
  subcategory:{ type: String, required: true },
  tag:        { type: String },
  requiresPrescription: { type: Boolean, default: false },
  stock:      { type: Number, default: 0, min: 0, index: true },   // ← NEW
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);