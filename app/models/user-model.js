const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
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
      unique: true 
    },
    password: { 
      type: String, 
      required: true 
    },
    phoneNumber: { 
      type: String 
    },
    profilePicture: { 
      type: String 
    }, 
    businessId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Business' 
    },
    isVerified: { 
      type: Boolean, 
      default: false 
    },
    confirmationToken: { 
      type: String 
    },
    resetPasswordToken: {
      type: String
    },
    resetPasswordExpires: {
      type: Date
    },
  },
  {
    timestamps: true, 
  }
);

module.exports = mongoose.model('User', userSchema);
