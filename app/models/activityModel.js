const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    escalationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Escalation', required: true },
    action: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    details: { type: String }
  }
);

const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;