// Escalation scoring system
const ESCALATION_TIERS = {
  TIER_1: { threshold: 25, action: 'handle_gracefully' },        // Missing information
  TIER_2: { threshold: 50, action: 'suggest_alternatives' },    // Complex request
  TIER_3: { threshold: 75, action: 'offer_escalation' },        // Frustrated customer
  TIER_4: { threshold: 100, action: 'immediate_escalation' }    // Explicit human request
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

module.exports = {
  calculateEscalationScore,
  ESCALATION_TIERS
};