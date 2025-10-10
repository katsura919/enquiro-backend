// Escalation scoring system
const ESCALATION_TIERS = {
  TIER_1: { threshold: 25, action: 'handle_gracefully' },        // Missing information
  TIER_2: { threshold: 50, action: 'suggest_alternatives' },    // Complex request
  TIER_3: { threshold: 75, action: 'offer_escalation' },        // Frustrated customer
  TIER_4: { threshold: 100, action: 'immediate_escalation' }    // Explicit human request
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

// Calculate escalation score based on multiple factors
const calculateEscalationScore = (query, recentHistory, sessionData = {}) => {
  let score = 0;
  const lowerQuery = query.toLowerCase();
  
  // Factor 1: Explicit human requests (+100 - immediate escalation)
  const explicitKeywords = [
    'speak to human', 'talk to person', 'escalate', 'supervisor', 
    'manager', 'representative', 'agent', 'support team',
    'talk to someone', 'human help', 'real person', 'human representative'
  ];
  
  if (explicitKeywords.some(keyword => lowerQuery.includes(keyword))) {
    score += 100;
  }
  
  // Factor 2: Frustration indicators (+30-60)
  const frustrationKeywords = [
    { words: ['angry', 'furious', 'outraged'], weight: 60 },
    { words: ['frustrated', 'annoyed', 'upset'], weight: 45 },
    { words: ['disappointed', 'unsatisfied', 'unhappy'], weight: 30 },
    { words: ['terrible', 'awful', 'horrible', 'worst'], weight: 50 },
    { words: ['useless', 'pointless', 'waste of time'], weight: 55 }
  ];
  
  frustrationKeywords.forEach(({ words, weight }) => {
    if (words.some(word => lowerQuery.includes(word))) {
      score += weight;
    }
  });
  
  // Factor 3: Repeated failed attempts (+20 per attempt)
  const escalationAttempts = sessionData.escalationAttempts || 0;
  score += escalationAttempts * 20;
  
  // Factor 4: Complex/urgent requests (+15-40)
  const urgencyKeywords = [
    { words: ['urgent', 'emergency', 'asap', 'immediately'], weight: 40 },
    { words: ['important', 'critical', 'serious'], weight: 25 },
    { words: ['complex', 'complicated', 'difficult'], weight: 15 }
  ];
  
  urgencyKeywords.forEach(({ words, weight }) => {
    if (words.some(word => lowerQuery.includes(word))) {
      score += weight;
    }
  });
  
  // Factor 5: Conversation history context (+10-30)
  if (recentHistory && recentHistory.length > 0) {
    const customerMessages = recentHistory.filter(msg => msg.role === 'user');
    const aiMessages = recentHistory.filter(msg => msg.role === 'assistant');
    
    // If customer keeps asking similar questions
    if (customerMessages.length > 2) {
      score += 15;
    }
    
    // If AI has given "I don't know" responses multiple times
    const unknownResponses = aiMessages.filter(msg => 
      msg.content.toLowerCase().includes("don't have") || 
      msg.content.toLowerCase().includes("don't know") ||
      msg.content.toLowerCase().includes("not available")
    );
    
    if (unknownResponses.length > 1) {
      score += 25;
    }
  }
  
  // Factor 6: Missing critical information requests (+5-15)
  const criticalInfoKeywords = [
    'price', 'cost', 'appointment', 'booking', 'schedule', 
    'availability', 'order', 'delivery', 'contact', 'phone', 'email'
  ];
  
  if (criticalInfoKeywords.some(keyword => lowerQuery.includes(keyword))) {
    score += 10;
  }
  
  return Math.min(score, 100); // Cap at 100
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

// Enhanced escalation detection with intelligent scoring
const checkEscalationNeeded = async (query, recentHistory, model, sessionData = {}) => {
  // Calculate escalation score
  const escalationScore = calculateEscalationScore(query, recentHistory, sessionData);
  const currentIntent = recognizeIntent(query, recentHistory);
  const conversationState = getConversationState(recentHistory, currentIntent, escalationScore);
  
  console.log(`Escalation Analysis:
    Score: ${escalationScore}/100
    Intent: ${currentIntent}
    State: ${conversationState}
    Threshold: ${escalationScore >= ESCALATION_TIERS.TIER_4.threshold ? 'IMMEDIATE' : 
                escalationScore >= ESCALATION_TIERS.TIER_3.threshold ? 'OFFER' : 'HANDLE'}`);
  
  // Return escalation decision with context
  return {
    shouldEscalate: escalationScore >= ESCALATION_TIERS.TIER_4.threshold,
    escalationScore,
    intent: currentIntent,
    conversationState,
    escalationTier: escalationScore >= ESCALATION_TIERS.TIER_4.threshold ? 'TIER_4' :
                   escalationScore >= ESCALATION_TIERS.TIER_3.threshold ? 'TIER_3' :
                   escalationScore >= ESCALATION_TIERS.TIER_2.threshold ? 'TIER_2' : 'TIER_1'
  };
};

module.exports = {
  ESCALATION_TIERS,
  CONVERSATION_STATES,
  INTENT_TYPES,
  calculateEscalationScore,
  recognizeIntent,
  getConversationState,
  checkEscalationNeeded
};