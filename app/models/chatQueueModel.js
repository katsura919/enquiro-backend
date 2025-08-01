const mongoose = require('mongoose');

const chatQueueSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  escalationId: { type: mongoose.Schema.Types.ObjectId, required: true },
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
  requestedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['waiting', 'assigned', 'completed'], default: 'waiting' }
}, {
  timestamps: true
});

module.exports = mongoose.model('ChatQueue', chatQueueSchema); 
