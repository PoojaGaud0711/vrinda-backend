const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  phone:   { type: String, required: true, trim: true },
  notes:   { type: String, default: '' },
  fileUrl: { type: String, required: true },
  fileName:{ type: String, required: true },
  fileSize:{ type: Number, required: true },
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // ── Auto-Read & Medicine Matching ──
  extractedText: { type: String, default: '' },
  matchedItems: [{
    productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name:        { type: String, required: true },
    prescribedAs:{ type: String, default: '' },
    matchType:   { type: String, default: 'Exact Match' },
    brand:       { type: String, default: '' },
    pack:        { type: String, default: '' },
    price:       { type: Number, default: 0 },
    image:       { type: String, default: '' },
    stock:       { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
    dosage:      { type: String, default: 'As advised by doctor' },
    qty:         { type: Number, default: 1 }
  }],
  unavailableItems: [{
    name:          { type: String, required: true },
    prescribedName:{ type: String, default: '' },
    dosage:        { type: String, default: '' },
    status:        { type: String, enum: ['out_of_stock', 'unavailable'], default: 'unavailable' },
    reason:        { type: String, default: 'Special sourcing required by pharmacist' },
    suggestedAlternative: {
      productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name:        { type: String, default: '' },
      brand:       { type: String, default: '' },
      pack:        { type: String, default: '' },
      price:       { type: Number, default: 0 },
      image:       { type: String, default: '' },
      stock:       { type: Number, default: 0 },
      clinicalNote:{ type: String, default: '' }
    },
    suggestedAlternatives: [{
      productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      name:        { type: String, default: '' },
      brand:       { type: String, default: '' },
      pack:        { type: String, default: '' },
      price:       { type: Number, default: 0 },
      image:       { type: String, default: '' },
      stock:       { type: Number, default: 0 },
      clinicalNote:{ type: String, default: '' }
    }],
    canSource:     { type: Boolean, default: true }
  }],
  unclearItems: [{
    rawText: { type: String, default: '' },
    reason:  { type: String, default: 'Cursive handwriting requires licensed pharmacist verification' }
  }],

  // ── Pharmacist Verification & Status ──
  pharmacistNotes: { type: String, default: '' },
  verifiedBy:      { type: String, default: '' },
  verifiedAt:      { type: Date },

  // ── Linked Order ──
  orderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  orderNumber: { type: String, default: '' },

  status: {
    type: String,
    enum: ['new', 'analyzed', 'contacted', 'verified', 'order_placed', 'fulfilled', 'rejected'],
    default: 'analyzed'
  },
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);