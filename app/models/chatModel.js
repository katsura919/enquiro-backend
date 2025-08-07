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
      required: function() {
        return this.messageType === 'text';
      },
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file'],
      required: true,
      default: 'text',
    },
    attachments: [{
      fileName: {
        type: String,
        required: function() {
          return this.messageType === 'image' || this.messageType === 'file';
        },
      },
      fileUrl: {
        type: String,
        required: function() {
          return this.messageType === 'image' || this.messageType === 'file';
        },
      },
      fileSize: {
        type: Number,
        default: null,
      },
      mimeType: {
        type: String,
        required: function() {
          return this.messageType === 'image' || this.messageType === 'file';
        },
      },
      publicId: {
        type: String,
        default: null, // Cloudinary public ID for file deletion
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      }
    }],
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
