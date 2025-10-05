const mongoose = require('mongoose');

const tempRegistrationSchema = new mongoose.Schema(
  {
    firstName: { 
      type: String, 
      required: true 
    },
    lastName: { 
      type: String, 
      required: true 
    },
    email: { 
      type: String, 
      required: true,
      unique: true  // Prevents duplicate temp registrations with same email
    },
    password: { 
      type: String, 
      required: true 
    },
    phoneNumber: { 
      type: String 
    },
    businessName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    logo: {
      type: String, 
    },
    category: {
      type: String, 
    },
    address: {
      type: String,
    },
    verificationCode: {
      type: String,
      required: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    expiresAt: {
      type: Date,
      default: Date.now,
      expires: 1800  // Expires in 30 minutes (1800 seconds)
    }
  },
  {
    timestamps: true, 
  }
);

// Index to help with cleanup and querying
tempRegistrationSchema.index({ email: 1, isVerified: 1 });

module.exports = mongoose.model('TempRegistration', tempRegistrationSchema);