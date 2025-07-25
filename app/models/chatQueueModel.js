const mongoose = require('mongoose');

const chatQueueSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['waiting', 'assigned', 'cancelled'], default: 'waiting' }
}, {
  timestamps: true
});

module.exports = mongoose.model('ChatQueue', chatQueueSchema);
