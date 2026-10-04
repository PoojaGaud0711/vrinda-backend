const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  brand:      { type: String, default: '' },
  pack:       { type: String, default: '' },
  price:      { type: Number, required: true, min: 0 },
  mrp:        { type: Number, min: 0 },
  image:      { type: String, default: '' },
  category:   { type: String, required: true, enum: ['medicines','beauty','snacks','needfuls','combos'], index: true },
  subcategory:{ type: String, required: true },
  tag:        { type: String },

  // ── Rich detail page fields ──
  description: { type: String, default: '' },        // main paragraph on the detail page
  highlights:  { type: [String], default: [] },      // bullet points ("Fast relief", "Gentle on stomach"...)
  unit:        { type: String, default: '' },        // "per strip", "per bottle", etc.

  requiresPrescription: { type: Boolean, default: false },
  stock:      { type: Number, default: 0, min: 0, index: true },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);