const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
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
    message: {
      type: String,
      required: true,
    },
    senderType: {
      type: String,
      enum: ['agent', 'ai', 'customer'],
      required: true,
      default: 'ai',
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      default: null,
    },
    isGoodResponse: {
      type: Boolean,
      default: null,
    },
  },
  {
    timestamps: true, 
  }
);

module.exports = mongoose.model('Chat', chatSchema);
