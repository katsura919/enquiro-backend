const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  profilePic: { type: String },
  role: { type: String, default: 'agent' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Agent', agentSchema);
