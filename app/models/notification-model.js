const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  businessId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Business', 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['case_created', 'rating_received'], 
    required: true 
  },
  
  // For case_created notifications
  caseId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Escalation',
    default: null
  },
  caseTitle: { 
    type: String,
    default: null
  },
  casePriority: { 
    type: String,
    default: null
  },
  customerId: { 
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  customerName: { 
    type: String,
    default: null
  },
  agentId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    default: null
  },
  agentName: { 
    type: String,
    default: null
  },
  
  // For rating_received notifications
  ratingId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'AgentRating',
    default: null
  },
  rating: { 
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  ratedAgentId: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    default: null
  },
  ratedAgentName: { 
    type: String,
    default: null
  },
  feedback: { 
    type: String,
    default: null
  },
  
  read: { 
    type: Boolean, 
    default: false 
  },
  link: { 
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ businessId: 1, createdAt: -1 });
notificationSchema.index({ businessId: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
