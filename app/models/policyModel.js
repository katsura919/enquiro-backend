const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['privacy', 'terms', 'refund', 'shipping', 'warranty', 'general'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }]
}, {
  timestamps: true
});

policySchema.index({ businessId: 1, isActive: 1 });
policySchema.index({ title: 'text', content: 'text', tags: 'text' });
policySchema.index({ type: 1 });

module.exports = mongoose.model('Policy', policySchema);
