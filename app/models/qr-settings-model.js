const mongoose = require('mongoose');

const qrSettingsSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      unique: true, // Ensures one QR settings document per business
    },
    bgColor: {
      type: String,
      default: "#ffffff",
      validate: {
        validator: function(v) {
          return /^#[0-9A-Fa-f]{6}$/.test(v);
        },
        message: 'Background color must be a valid hex color'
      }
    },
    fgColor: {
      type: String,
      default: "#000000",
      validate: {
        validator: function(v) {
          return /^#[0-9A-Fa-f]{6}$/.test(v);
        },
        message: 'Foreground color must be a valid hex color'
      }
    },
    includeLogo: {
      type: Boolean,
      default: true,
    },
    errorCorrectionLevel: {
      type: String,
      enum: ['L', 'M', 'Q', 'H'],
      default: 'M',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('QRSettings', qrSettingsSchema);