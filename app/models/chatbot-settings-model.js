const mongoose = require('mongoose');

const chatbotSettingsSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      unique: true, // Ensures one settings document per business
    },
    chatbotName: {
      type: String,
      default: "AI Assistant",
      maxlength: 50,
    },
    chatbotIcon: {
      type: String,
      default: "/default-chatbot-icon.svg",
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient lookups
chatbotSettingsSchema.index({ businessId: 1 });

module.exports = mongoose.model('ChatbotSettings', chatbotSettingsSchema);
