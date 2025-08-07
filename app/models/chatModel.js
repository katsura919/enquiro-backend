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
      enum: ['agent', 'ai', 'customer', 'system'],
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
    systemMessageType: {
      type: String,
      enum: [
        'agent_joined', 
        'agent_left', 
        'customer_joined', 
        'customer_left',
        'chat_started',
        'chat_ended',
        'agent_assigned',
        'agent_reassigned',
        'queue_joined',
        'queue_left'
      ],
      default: null, // Only set for system messages
    },
    escalationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Escalation',
      default: null, // Link to escalation for live chat messages
    },
  },
  {
    timestamps: true, 
  }
);

module.exports = mongoose.model('Chat', chatSchema);
