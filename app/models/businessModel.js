const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
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
  },
  {
    timestamps: true, 
  }
);

module.exports = mongoose.model('Business', businessSchema);
