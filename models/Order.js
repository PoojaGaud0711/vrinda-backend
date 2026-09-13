const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name:  { type: String, required: true },
  brand: { type: String, default: '' },
  pack:  { type: String, default: '' },
  image: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  qty:   { type: Number, required: true, min: 1, max: 99 },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber:   { type: String, required: true, unique: true },
  items:         { type: [orderItemSchema], required: true },
  subtotal:      { type: Number, required: true },
  deliveryFee:   { type: Number, required: true, default: 0 },
  total:         { type: Number, required: true },
  customer: {
    name:    { type: String, required: true, trim: true },
    phone:   { type: String, required: true, trim: true },
    email:   { type: String, trim: true, lowercase: true, default: '' },
  },
  address: {
    line1:   { type: String, required: true, trim: true },
    city:    { type: String, default: 'Mumbai', trim: true },
    state:   { type: String, default: 'Maharashtra', trim: true },
    pincode: { type: String, required: true, trim: true },
  },
  paymentMethod: { type: String, enum: ['cod','upi','card'], default: 'cod' },
  status:        { type: String, enum: ['placed','confirmed','packed','shipped','delivered','cancelled'], default: 'placed' },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
