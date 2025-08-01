const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema(
  {
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  answer: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
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

faqSchema.index({ businessId: 1, isActive: 1 });
faqSchema.index({ question: 'text', answer: 'text', tags: 'text' });
faqSchema.index({ category: 1 });

module.exports = mongoose.model('FAQ', faqSchema);
