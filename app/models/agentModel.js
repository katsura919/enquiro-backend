const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  profilePic: { type: String },
  password: { type: String, required: true },
  role: { type: String, default: 'agent' },
  createdAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, default: null }
});

// Add index for soft delete queries
agentSchema.index({ deletedAt: 1 });

// Add a method to soft delete
agentSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

// Add a method to restore
agentSchema.methods.restore = function() {
  this.deletedAt = null;
  return this.save();
};

// Add query helpers to exclude deleted records by default
agentSchema.query.notDeleted = function() {
  return this.where({ deletedAt: null });
};

agentSchema.query.onlyDeleted = function() {
  return this.where({ deletedAt: { $ne: null } });
};

module.exports = mongoose.model('Agent', agentSchema);
