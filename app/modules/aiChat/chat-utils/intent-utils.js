// Intent categories
const INTENT_TYPES = {
  INFORMATION_REQUEST: 'information_request',
  COMPLAINT: 'complaint',
  PRICING_INQUIRY: 'pricing_inquiry',
  ESCALATION_REQUEST: 'escalation_request',
  CASE_FOLLOWUP: 'case_followup',
  GREETING: 'greeting',
  GENERAL_INQUIRY: 'general_inquiry'
};

// Conversation states
const CONVERSATION_STATES = {
  GREETING: 'initial_contact',
  INFORMATION_SEEKING: 'seeking_info',
  PROBLEM_SOLVING: 'solving_issue',
  ESCALATION_CONSIDERING: 'considering_escalation',
  ESCALATION_REQUESTED: 'escalation_active',
  SATISFIED: 'issue_resolved'
};

// Recognize customer intent
const recognizeIntent = (query, history = []) => {
  const lowerQuery = query.toLowerCase();
  
  // Check for live chat request with case number (high priority - returning customer)
  if (/speak to|talk to|human|agent|representative|manager|supervisor/.test(lowerQuery) && 
      /case|ticket|reference|escalation/.test(lowerQuery)) {
    return INTENT_TYPES.ESCALATION_REQUEST; // Treat as escalation but with existing case context
  }
  
  // Case followup patterns (check before general escalation)
  if (/case|ticket|reference|follow.*up|status.*case|case.*status|escalation.*number|case.*number/.test(lowerQuery) &&
      !/speak to|talk to|human|agent|representative|manager|supervisor/.test(lowerQuery)) {
    return INTENT_TYPES.CASE_FOLLOWUP;
  }
  
  // Greeting patterns
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)/.test(lowerQuery)) {
    return INTENT_TYPES.GREETING;
  }
  
  // Escalation request patterns (new customers)
  if (/speak to|talk to|human|agent|representative|manager|supervisor/.test(lowerQuery)) {
    return INTENT_TYPES.ESCALATION_REQUEST;
  }
  
  // Complaint patterns
  if (/complaint|problem|issue|wrong|error|broken|not working|disappointed/.test(lowerQuery)) {
    return INTENT_TYPES.COMPLAINT;
  }
  
  // Pricing patterns
  if (/price|cost|how much|fee|charge|payment/.test(lowerQuery)) {
    return INTENT_TYPES.PRICING_INQUIRY;
  }
  
  // Default to information request
  return INTENT_TYPES.INFORMATION_REQUEST;
};

// Determine conversation state
const getConversationState = (history, currentIntent, escalationScore) => {
  if (history.length === 0) {
    return CONVERSATION_STATES.GREETING;
  }
  
  if (currentIntent === INTENT_TYPES.CASE_FOLLOWUP) {
    return CONVERSATION_STATES.INFORMATION_SEEKING; // Use existing state for case followups
  }
  
  if (currentIntent === INTENT_TYPES.ESCALATION_REQUEST || escalationScore >= 100) {
    return CONVERSATION_STATES.ESCALATION_REQUESTED;
  }
  
  if (escalationScore >= 75) {
    return CONVERSATION_STATES.ESCALATION_CONSIDERING;
  }
  
  if (currentIntent === INTENT_TYPES.COMPLAINT) {
    return CONVERSATION_STATES.PROBLEM_SOLVING;
  }
  
  return CONVERSATION_STATES.INFORMATION_SEEKING;
};

module.exports = {
  INTENT_TYPES,
  CONVERSATION_STATES,
  recognizeIntent,
  getConversationState
};