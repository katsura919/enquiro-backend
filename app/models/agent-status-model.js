const mongoose = require('mongoose');

const agentStatusSchema = new mongoose.Schema({
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent', required: true },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  status: { 
    type: String, 
    enum: ['offline', 'online', 'available', 'away', 'in-chat'], 
    default: 'offline' 
  },
  lastActive: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Ensure one status record per agent per business
agentStatusSchema.index({ agentId: 1, businessId: 1 }, { unique: true });

module.exports = mongoose.model('AgentStatus', agentStatusSchema);
