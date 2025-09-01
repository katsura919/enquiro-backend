const mongoose = require('mongoose');

const escalationSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    caseNumber: {
      type: String,
      required: true,
      unique: true, 
    },
    caseOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
    },
    customerName: {
      type: String,
      required: true,
    },
    customerEmail: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
    },
    concern: {
      type: String,
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ['escalated', 'resolved', 'pending'],
      default: 'escalated',
    },
    emailThreadId: {
      type: String,
      index: true, 
    },
  },
  {
    timestamps: true, 
  }
);

module.exports = mongoose.model('Escalation', escalationSchema);
