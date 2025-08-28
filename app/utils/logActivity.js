const Activity = require('../models/activity-model');

/**
 * Logs an activity for an escalation
 * @param {Object} params
 * @param {String|mongoose.Types.ObjectId} params.escalationId
 * @param {String} params.action
 * @param {String} [params.details]
 */
async function logActivity({ escalationId, action, details }) {
  try {
    await Activity.create({ escalationId, action, details });
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}

module.exports = logActivity;
