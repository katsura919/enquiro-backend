const { GoogleGenerativeAI } = require("@google/generative-ai");
const Chat = require("../../models/chat-model");
const Session = require("../../models/session-model");
const Business = require("../../models/business-model");
const Escalation = require("../../models/escalation-model");

// Import the business data service
const { 
  fetchBusinessDataBySlug
} = require("../../services/businessDataService");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
  BOOKING_REQUEST: 'booking_request',
  PRICING_INQUIRY: 'pricing_inquiry',
  TECHNICAL_SUPPORT: 'technical_support',
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
  
  // Booking patterns
  if (/book|schedule|appointment|reserve|availability|available/.test(lowerQuery)) {
    return INTENT_TYPES.BOOKING_REQUEST;
  }
  
  // Pricing patterns
  if (/price|cost|how much|fee|charge|payment/.test(lowerQuery)) {
    return INTENT_TYPES.PRICING_INQUIRY;
  }
  
  // Technical support patterns
  if (/how to|help with|support|technical|setup|install|configure/.test(lowerQuery)) {
    return INTENT_TYPES.TECHNICAL_SUPPORT;
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

// Get recent conversation history
const getRecentHistory = async (sessionId, limit = 6) => {
  if (!sessionId) return [];
  
  const recentChats = await Chat.find({ sessionId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('message senderType createdAt')
    .lean();

  // Map senderType to role for prompt context and add metadata
  return recentChats.reverse().map(chat => {
    let role;
    if (chat.senderType === "customer") role = "user";
    else if (chat.senderType === "ai") role = "assistant";
    else role = chat.senderType; // fallback for agent, etc.
    
    return { 
      role, 
      content: chat.message,
      timestamp: chat.createdAt,
      senderType: chat.senderType
    };
  });
};

// Calculate response confidence score
const calculateResponseConfidence = (query, foundData, historyContext = []) => {
  let confidence = 0;
  
  // Factor 1: Data relevance (0-40 points)
  if (foundData && foundData.length > 0) {
    const queryWords = query.toLowerCase().split(/\s+/);
    let relevanceScore = 0;
    
    foundData.forEach(item => {
      const itemText = `${item.question || item.name || item.title || ''} ${item.answer || item.description || item.content || ''}`.toLowerCase();
      const matchingWords = queryWords.filter(word => word.length > 2 && itemText.includes(word));
      relevanceScore += (matchingWords.length / queryWords.length) * 10;
    });
    
    confidence += Math.min(relevanceScore, 40);
  }
  
  // Factor 2: Query complexity (0-20 points)
  const queryLength = query.split(/\s+/).length;
  if (queryLength <= 5) {
    confidence += 20; // Simple queries are easier to handle
  } else if (queryLength <= 10) {
    confidence += 15;
  } else {
    confidence += 10; // Complex queries are harder
  }
  
  // Factor 3: Context availability (0-25 points)
  if (historyContext.length > 0) {
    confidence += Math.min(historyContext.length * 5, 25);
  }
  
  // Factor 4: Data quality (0-15 points)
  if (foundData && foundData.length > 0) {
    const hasCompleteData = foundData.some(item => 
      (item.answer && item.answer.length > 50) ||
      (item.description && item.description.length > 50) ||
      (item.content && item.content.length > 50)
    );
    
    if (hasCompleteData) {
      confidence += 15;
    } else {
      confidence += 8;
    }
  }
  
  return Math.min(confidence, 100);
};

// Extract case number from query
const extractCaseNumber = (query) => {
  // Look for various case number patterns
  const patterns = [
    /case\s*#?\s*([A-Z0-9]{6,})/i,
    /ticket\s*#?\s*([A-Z0-9]{6,})/i,
    /reference\s*#?\s*([A-Z0-9]{6,})/i,
    /escalation\s*#?\s*([A-Z0-9]{6,})/i,
    /#([A-Z0-9]{6,})/i,
    /([A-Z0-9]{8,})/i // Generic alphanumeric pattern for case numbers
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      return match[1].toUpperCase();
    }
  }
  
  return null;
};

// Fetch escalation case status
const getEscalationCaseStatus = async (caseNumber, businessId) => {
  try {
    // Look for escalation by case number and business - only fetch case number and status
    const escalation = await Escalation.findOne({ 
      caseNumber: caseNumber,
      businessId: businessId 
    })
    .select('caseNumber status')
    .lean();
    
    if (!escalation) {
      return null;
    }
    
    // Return only case number and status
    return {
      caseNumber: escalation.caseNumber,
      status: escalation.status
    };
  } catch (error) {
    console.error('Error fetching escalation case:', error);
    return null;
  }
};

// Fetch full escalation details for live chat continuation
const getEscalationForLiveChat = async (caseNumber, businessId) => {
  try {
    // Look for escalation by case number and business - get full details for live chat
    const escalation = await Escalation.findOne({ 
      caseNumber: caseNumber,
      businessId: businessId 
    })
    .select('_id caseNumber sessionId status customerName customerEmail')
    .lean();
    
    if (!escalation) {
      return null;
    }
    
    // Return escalation details needed for live chat continuation
    return {
      escalationId: escalation._id,
      caseNumber: escalation.caseNumber,
      sessionId: escalation.sessionId,
      status: escalation.status,
      customerName: escalation.customerName,
      customerEmail: escalation.customerEmail
    };
  } catch (error) {
    console.error('Error fetching escalation for live chat:', error);
    return null;
  }
};

// Generate case status response
const generateCaseStatusResponse = async (caseInfo, businessName, model) => {
  if (!caseInfo) {
    const notFoundPrompt = `
Customer is asking about a case that was not found.
Business: ${businessName}

Generate a helpful, casual chat response that:
1. Politely explains that the case number wasn't found in our system
2. Asks them to double-check the case number
3. Offers to help them with the format (case numbers are usually 6+ characters)
4. Provides alternative ways to get help
5. Keep it friendly and conversational like a chat message

Response should be in casual chat format, NOT email format. No subject lines, signatures, or formal email structure.`;
    
    const result = await model.generateContent(notFoundPrompt);
    return result.response.text();
  }
  
  const statusPrompt = `
Customer is following up on their escalation case in a chat conversation.
Business: ${businessName}

Case Details:
- Case Number: ${caseInfo.caseNumber}
- Status: ${caseInfo.status}

Generate a friendly, conversational chat response that:
1. Confirms their case number and current status
2. Explains what the status means in simple terms
3. Reassures them that we're working on it
4. Maintains a helpful but casual tone

For status meanings:
- "escalated": Case has been escalated and is being reviewed by our team
- "pending": Case is waiting for review or action
- "resolved": Case has been completed and resolved

IMPORTANT: 
- Write like you're chatting with them, not sending an email
- No subject lines, signatures, formal greetings, or email formatting
- Keep it brief and conversational
- Don't use "Dear [Customer Name]" or formal closings
- Write as if you're a helpful chat agent`;
  
  const result = await model.generateContent(statusPrompt);
  return result.response.text();
};

// Enhanced fallback strategies
const generateFallbackResponse = async (query, businessName, model, intent, confidence) => {
  let fallbackStrategy = '';
  
  // Choose strategy based on intent and confidence
  if (intent === INTENT_TYPES.PRICING_INQUIRY) {
    fallbackStrategy = 'pricing_fallback';
  } else if (intent === INTENT_TYPES.BOOKING_REQUEST) {
    fallbackStrategy = 'booking_fallback';
  } else if (intent === INTENT_TYPES.TECHNICAL_SUPPORT) {
    fallbackStrategy = 'technical_fallback';
  } else if (intent === INTENT_TYPES.CASE_FOLLOWUP) {
    fallbackStrategy = 'case_followup_fallback';
  } else if (confidence < 30) {
    fallbackStrategy = 'general_fallback';
  } else {
    fallbackStrategy = 'related_topics';
  }
  
  const fallbackPrompts = {
    pricing_fallback: `
Customer asked about pricing: "${query}"
Business: ${businessName}

Generate a helpful response that:
1. Acknowledges their pricing inquiry
2. Explains that specific pricing may vary
3. Suggests they contact the business for accurate quotes
4. Offers to help with other general information
5. Keep it friendly and helpful

Don't mention missing data or limitations.`,

    booking_fallback: `
Customer asked about booking/appointments: "${query}"
Business: ${businessName}

Generate a helpful response that:
1. Acknowledges their booking interest
2. Suggests contacting the business directly for availability
3. Offers to help with other information about services
4. Keep it warm and encouraging

Don't mention missing data or limitations.`,

    technical_fallback: `
Customer asked for technical help: "${query}"
Business: ${businessName}

Generate a helpful response that:
1. Acknowledges their technical question
2. Provides general guidance if possible
3. Suggests contacting technical support for specific issues
4. Offers to help with other questions
5. Keep it supportive and solution-oriented

Don't mention missing data or limitations.`,

    case_followup_fallback: `
Customer is asking about case status: "${query}"
Business: ${businessName}

Generate a helpful response that:
1. Acknowledges their request to check case status
2. Asks for their case number if they haven't provided one
3. Explains case number format (usually 6+ characters)
4. Assures them you'll help once you have the case number
5. Keep it professional and supportive

Don't mention database limitations.`,

    general_fallback: `
Customer asked: "${query}"
Business: ${businessName}

Generate a natural, helpful response that:
1. Acknowledges their question warmly
2. Explains you'd love to help but need more specific information
3. Ask a clarifying question or suggest how they can get the exact info
4. Offer to help with other topics
5. Keep it conversational and helpful

Don't mention missing data, databases, or technical limitations.`,

    related_topics: `
Customer asked: "${query}"
Business: ${businessName}

Generate a helpful response that:
1. Acknowledges their question
2. Suggests related topics or areas you might be able to help with
3. Offers alternative ways to get their specific information
4. Keep it positive and solution-focused

Don't mention missing data or limitations.`
  };
  
  const prompt = fallbackPrompts[fallbackStrategy] || fallbackPrompts.general_fallback;
  const result = await model.generateContent(prompt);
  return result.response.text();
};

// Enhanced prompt construction with better structure and natural responses
const constructPrompt = ({ query, knowledge, history, isEscalation, businessName }) => `
You are working for ${businessName} company. Be a friendly and helpful AI assistant. Act like a real, knowledgeable person.
${!isEscalation && knowledge?.length > 0 ? 
`**Available Business Information:**
${knowledge.map((k, i) => {
  // Handle different data types with appropriate fields
  let title, content, category = '';
  
  if (k.type === 'faq') {
    title = k.question || 'FAQ';
    content = k.answer || '';
    category = k.category ? ` (FAQ - ${k.category})` : ' (FAQ)';
  } else if (k.type === 'product') {
    title = k.name || 'Product';
    content = k.description || '';
    category = k.category ? ` (Product - ${k.category})` : ' (Product)';
    if (k.price) content += ` - Price: ${k.price}`;
  } else if (k.type === 'service') {
    title = k.name || 'Service';
    content = k.description || '';
    category = ' (Service)';
    if (k.price) content += ` - Price: ${k.price}`;
    if (k.duration) content += ` - Duration: ${k.duration}`;
  } else if (k.type === 'policy') {
    title = k.title || 'Policy';
    content = k.content || '';
    category = k.type ? ` (Policy - ${k.type})` : ' (Policy)';
  } else {
    // Fallback for other types
    title = k.title || k.name || 'Information';
    content = k.content || k.description || '';
    if (k.categoryId?.name) {
      category = ` (${k.categoryId.name})`;
    }
  }
  
  return `${i + 1}. **${title}**${category}: ${content}`;
}).join('\n')}

` : ''}

${history?.length > 0 ? 
`**Recent Conversation Context:**
${history.slice(-6).map(msg => `${msg.role === "user" ? "Customer" : "Assistant"}: ${msg.content}`).join('\n')}

` : ''}

**Current Customer Question:**
${query}

**Response Guidelines:**
${isEscalation ? 
`- The customer explicitly wants to speak with a human
- Acknowledge their request professionally and connect them` :
`- Act like a helpful, knowledgeable person - not a robotic AI
- Use the business information provided to give helpful answers
- When information isn't available, respond naturally like a real person would:
  * "That's a great question! I wish I had more details about that..."
  * "Hmm, I don't have the specific details on that at the moment..."
  * "I'd love to help with that, but I don't have those particulars right now..."
- Be conversational and empathetic
- Offer alternatives when possible
- Only suggest speaking with someone if the customer seems frustrated or explicitly asks
- Keep responses warm, helpful, and naturally human-like
- Use "I" statements to sound more personal`}
`;

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

const askAI = async (req, res) => {
  try {
    const { query, sessionId, customerDetails } = req.body;
    const { slug } = req.params;

    // Input validation
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: "Query must be a non-empty string" });
    }

    if (query.length > 1000) {
      return res.status(400).json({ error: "Query too long. Please keep it under 1000 characters." });
    }

    // Get additional business data from other tables
    const { allData: businessData, business } = await fetchBusinessDataBySlug(slug, query);
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Use business data for AI responses
    const combinedData = businessData || [];

    // Handle or create session
    let session;
    if (sessionId) {
      session = await Session.findById(sessionId);
    }
    if (!session) {
      session = await Session.create({
        businessId: business._id,
        ...(customerDetails && { customerInfo: customerDetails })
      });
    }

    // Get conversation history for context
    const recentHistory = await getRecentHistory(session._id);

    // Analyze customer intent and conversation state
    const customerIntent = recognizeIntent(query, recentHistory);
    
    // Get session data for escalation tracking (you might want to store this in session model)
    const sessionData = {
      escalationAttempts: 0 // This should be tracked in session model
    };

    // Calculate response confidence
    const responseConfidence = calculateResponseConfidence(query, combinedData, recentHistory);

    const model = genAI.getGenerativeModel({ 
      //model: "gemini-2.5-pro",
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 1000, // Limit response length
      }
    });

    // Enhanced escalation check with intelligent scoring
    const escalationAnalysis = await checkEscalationNeeded(query, recentHistory, model, sessionData);

    let responseText;
    let escalationGenerated = false;

    // Check if this is a case followup request
    if (customerIntent === INTENT_TYPES.CASE_FOLLOWUP) {
      const caseNumber = extractCaseNumber(query);
      
      if (caseNumber) {
        // Fetch case information
        const caseInfo = await getEscalationCaseStatus(caseNumber, business._id);
        responseText = await generateCaseStatusResponse(caseInfo, business.name, model);
      } else {
        // No case number found, ask for it
        const noCaseNumberPrompt = `
Customer is asking about case status but didn't provide a case number.
Business: ${business.name}
Customer query: "${query}"

Generate a helpful response that:
1. Acknowledges their request to check case status
2. Politely asks for their case number
3. Explains that case numbers are usually 6+ characters long
4. Provides examples like "Case #ABC12345" or "Ticket #123456789"
5. Assures them you'll be happy to help once you have the case number
6. Keep it friendly and helpful

Don't mention technical limitations.`;
        
        const result = await model.generateContent(noCaseNumberPrompt);
        responseText = result.response.text();
      }
    } else if (escalationAnalysis.shouldEscalate) {
      // Check if this is a returning customer with a case number
      const caseNumber = extractCaseNumber(query);
      
      if (caseNumber) {
        // Returning customer - check if case exists
        const existingCase = await getEscalationForLiveChat(caseNumber, business._id);
        
        if (existingCase) {
          // Case found - continue existing session
          const returningCustomerPrompt = `
Customer with existing case wants to speak with a human.
Business: ${business.name}
Case Number: ${existingCase.caseNumber}
Customer: ${existingCase.customerName}
Query: "${query}"

Generate a helpful response that:
1. Acknowledges their case number and that they're a returning customer
2. Confirms we found their case
3. Explains they'll be connected to continue their conversation
4. Includes this link: [click here to continue your case](escalate://continue?caseId=${existingCase.escalationId}&sessionId=${existingCase.sessionId})
5. Keep it professional and welcoming

Don't ask for their details again since we have them on file.`;

          const escalationResponse = await model.generateContent(returningCustomerPrompt);
          responseText = escalationResponse.response.text().trim();
          escalationGenerated = true;
        } else {
          // Case not found
          responseText = `I couldn't find case #${caseNumber} in our system. Please double-check the case number, or if you'd like to start a new case, [click here to speak with a representative](escalate://new).`;
          escalationGenerated = true;
        }
      } else {
        // New customer - regular escalation flow
        const escalationPrompt = `
User explicitly requested: "${query}"
Business name: ${business.name}
Escalation Score: ${escalationAnalysis.escalationScore}/100
Customer Intent: ${escalationAnalysis.intent}

The customer wants to speak with a human. Generate a warm, helpful response that:
1. Acknowledges their request professionally
2. Asks for their name, email, and contact number if not already provided
3. Includes this link at the end: [click here to speak with a representative](escalate://new)
4. Reassures them that someone will help them soon

Keep the tone professional and empathetic.`;

        const escalationResponse = await model.generateContent(escalationPrompt);
        responseText = escalationResponse.response.text().trim();
        escalationGenerated = true;
      }
    } else {
      // Check if we have relevant data from any source
      const hasRelevantData = combinedData && combinedData.length > 0;
      
      if (hasRelevantData && responseConfidence > 40) {
        // Generate normal AI response with all available data
        const chatPrompt = constructPrompt({ 
          query: query.trim(), 
          knowledge: combinedData,
          history: recentHistory, 
          isEscalation: false,
          businessName: business.name
        });
        
        console.log(`Response Confidence: ${responseConfidence}%`);
        console.log(chatPrompt); // For debugging

        const result = await model.generateContent(chatPrompt);
        responseText = result.response.text();
        
        // Store the prompt for debugging
        req.debugPrompt = chatPrompt;
      } else {
        // Use enhanced fallback strategies instead of immediate escalation
        responseText = await generateFallbackResponse(
          query, 
          business.name, 
          model, 
          customerIntent, 
          responseConfidence
        );
        
        // Only suggest escalation for critical information or after multiple attempts
        if (escalationAnalysis.escalationTier === 'TIER_3') {
          responseText += "\n\nIf you'd like to discuss this further with someone from our team, [click here to connect with a representative](escalate://new).";
          escalationGenerated = true;
        } else if (escalationAnalysis.escalationTier === 'TIER_2' && 
                   (customerIntent === INTENT_TYPES.PRICING_INQUIRY || 
                    customerIntent === INTENT_TYPES.BOOKING_REQUEST)) {
          responseText += " For specific details, feel free to [contact us directly](escalate://new).";
          escalationGenerated = true;
        }
      }
    }

    // Quality check for response
    const qualityChecks = {
      hasContent: responseText && responseText.trim().length > 0,
      appropriateLength: responseText && responseText.length > 20 && responseText.length < 1500,
      noErrors: !responseText.toLowerCase().includes('error') && !responseText.toLowerCase().includes('failed'),
      helpful: responseText && (
        responseText.toLowerCase().includes('help') || 
        responseText.toLowerCase().includes('assist') ||
        responseText.includes('?') || // Questions are engaging
        combinedData.length > 0 // Has relevant data
      )
    };

    const qualityScore = Object.values(qualityChecks).filter(Boolean).length / Object.keys(qualityChecks).length * 100;

    // Save chat to DB with enhanced metadata
    const chat = await Chat.create({
      businessId: business._id,
      sessionId: session._id,
      message: query.trim(),
      senderType: "customer",
      agentId: null,
      isGoodResponse: null
    });

    // Save AI response as a separate chat message with quality metadata
    const aiChat = await Chat.create({
      businessId: business._id,
      sessionId: session._id,
      message: responseText,
      senderType: "ai",
      agentId: null,
      isGoodResponse: qualityScore > 70 // Auto-rate based on quality checks
    });

    // Enhanced response with comprehensive analytics
    res.json({
      answer: responseText,
      customerChatId: chat._id,
      aiChatId: aiChat._id,
      sessionId: session._id,
      escalationSuggested: escalationGenerated,
      context: {
        businessName: business.name,
        dataItemsAvailable: combinedData?.length || 0,
        conversationLength: recentHistory.length,
        customerIntent: customerIntent,
        conversationState: escalationAnalysis.conversationState,
        responseConfidence: responseConfidence,
        escalationScore: escalationAnalysis.escalationScore,
        escalationTier: escalationAnalysis.escalationTier,
        qualityScore: qualityScore
      },
      // Testing data - remove in production
      testingData: {
        dataGivenToAI: combinedData || [],
        dataCount: combinedData?.length || 0,
        dataTypes: combinedData?.map(item => item.type) || [],
        hasRelevantData: combinedData && combinedData.length > 0,
        escalationAnalysis: escalationAnalysis,
        qualityChecks: qualityChecks
      }
    });

  } catch (error) {
    console.error("Error in askAI:", error);
    
    // Better error handling
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: "Invalid input data" });
    }
    
    if (error.message?.includes('quota')) {
      return res.status(503).json({ 
        error: "Service temporarily unavailable. Please try again later or [contact support](escalate://new)." 
      });
    }

    res.status(500).json({ 
      error: "I'm having trouble processing your request right now. Please try again or [contact support](escalate://new)." 
    });
  }
};

module.exports = {
  askAI,
};
