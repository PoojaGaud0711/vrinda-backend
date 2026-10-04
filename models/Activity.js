const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  actorId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: { type: String, required: true },
  actorRole: { type: String, enum: ['admin', 'superadmin'], required: true },
  action:    { type: String, required: true },
  detail:    { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);