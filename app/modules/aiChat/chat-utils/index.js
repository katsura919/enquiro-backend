// Import all chat utility functions
const {
  calculateEscalationScore,
  ESCALATION_TIERS,
} = require("./escalation-score-calculation");
const {
  extractCaseNumber,
  getEscalationCaseStatus,
  getEscalationForLiveChat,
} = require("./case-utils");
const {
  INTENT_TYPES,
  CONVERSATION_STATES,
  recognizeIntent,
  getConversationState,
} = require("./intent-utils");

// Export all utilities
module.exports = {
  calculateEscalationScore,
  ESCALATION_TIERS,
  extractCaseNumber,
  getEscalationCaseStatus,
  getEscalationForLiveChat,
  INTENT_TYPES,
  CONVERSATION_STATES,
  recognizeIntent,
  getConversationState,
};
