const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  phone:   { type: String, required: true, trim: true },
  notes:   { type: String, default: '' },
  fileUrl: { type: String, required: true },   // /uploads/prescriptions/rx-xxx.jpg
  fileName:{ type: String, required: true },
  fileSize:{ type: Number, required: true },
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },  // set if logged in
  status:  { type: String, enum: ['new', 'contacted', 'fulfilled', 'rejected'], default: 'new' },
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);