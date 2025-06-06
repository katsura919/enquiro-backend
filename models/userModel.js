const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phoneNumber: { type: String },
    profilePicture: { type: String }, 
    // Reference to the Business model
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
  },
  {
    timestamps: true, 
  }
);

module.exports = mongoose.model('User', userSchema);
