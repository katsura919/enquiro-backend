const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    customerDetails: {
      name: { type: String },
      email: { type: String },
      phoneNumber: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Session", sessionSchema);
