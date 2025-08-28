const Escalation = require('../models/escalation-model');

/**
 * Get the chat room name for real-time messaging based on sessionId.
 * If an escalation exists for the session, use its id; otherwise, fallback to sessionId.
 * @param {string} sessionId
 * @returns {Promise<string>} room name
 */
async function getChatRoomBySession(sessionId) {
  let escalationId = null;
  if (sessionId) {
    const escalation = await Escalation.findOne({ sessionId });
    if (escalation) escalationId = escalation._id.toString();
  }
  return escalationId ? `chat_${escalationId}` : `chat_${sessionId}`;
}

module.exports = { getChatRoomBySession };
