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
  
  // Factor 5: Conversation history context (+10-50)
  if (recentHistory && recentHistory.length > 0) {
    const customerMessages = recentHistory.filter(msg => msg.role === 'user');
    const aiMessages = recentHistory.filter(msg => msg.role === 'assistant');
    
    // If customer keeps asking similar questions
    if (customerMessages.length > 2) {
      score += 15;
    }
    
    // If AI has given "I don't know" or unhelpful responses multiple times
    const unhelpfulResponses = aiMessages.filter(msg => {
      const content = msg.content.toLowerCase();
      return content.includes("don't have") || 
             content.includes("don't know") ||
             content.includes("not available") ||
             content.includes("don't have the specific") ||
             content.includes("don't have those") ||
             content.includes("don't have more details") ||
             content.includes("wish i had more") ||
             content.includes("i'd love to help with that, but") ||
             content.includes("hmm, i don't") ||
             content.includes("unfortunately") ||
             (content.includes("can't") && content.includes("help"));
    });
    
    // Progressive scoring based on number of unhelpful responses
    if (unhelpfulResponses.length === 1) {
      score += 15; // First unhelpful response - minor increase
    } else if (unhelpfulResponses.length === 2) {
      score += 35; // Second unhelpful response - moderate increase
    } else if (unhelpfulResponses.length >= 3) {
      score += 50; // Third+ unhelpful response - significant increase
    }
    
    // If conversation is getting long without resolution (5+ exchanges)
    if (customerMessages.length >= 5 && unhelpfulResponses.length >= 2) {
      score += 20; // Long conversation + multiple failures = definitely needs help
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
  
  // Factor 7: Complex topics that require human intervention (+40-70)
  const complexTopics = [
    // Returns and refunds
    { words: ['return', 'refund', 'money back'], weight: 60 },
    // Order issues
    { words: ['cancel order', 'change order', 'modify order', 'order problem', 'wrong item', 'damaged'], weight: 55 },
    // Disputes and complaints
    { words: ['dispute', 'charge', 'charged incorrectly', 'billing issue', 'payment problem'], weight: 60 },
    { words: ['complaint', 'complain', 'not satisfied', 'poor service', 'bad experience'], weight: 50 },
    // Account issues
    { words: ['account locked', 'account suspended', 'can\'t login', 'reset password', 'access denied'], weight: 45 },
    // Technical issues
    { words: ['not working', 'broken', 'error message', 'technical issue', 'bug', 'glitch'], weight: 40 },
    // Legal/policy issues
    { words: ['legal', 'lawyer', 'sue', 'contract', 'terms violation', 'policy violation'], weight: 70 },
    // Warranty and guarantees
    { words: ['warranty', 'guarantee', 'defective', 'faulty'], weight: 55 },
    // Special requests
    { words: ['custom', 'customize', 'special request', 'special order', 'bulk order'], weight: 45 },
    // Shipping issues
    { words: ['lost package', 'tracking', 'shipment', 'delivery failed', 'not received'], weight: 50 }
  ];
  
  complexTopics.forEach(({ words, weight }) => {
    if (words.some(word => lowerQuery.includes(word))) {
      score += weight;
    }
  });
  
  return Math.min(score, 100); // Cap at 100
};

module.exports = {
  calculateEscalationScore,
  ESCALATION_TIERS
};