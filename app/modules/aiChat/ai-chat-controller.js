const { GoogleGenerativeAI } = require("@google/generative-ai");
const Chat = require("../../models/chat-model");
const Session = require("../../models/session-model");
const Business = require("../../models/business-model");
const Escalation = require("../../models/escalation-model");
const ChatbotSettings = require("../../models/chatbot-settings-model");

// Import the business data service
const { 
  fetchBusinessDataBySlug
} = require("../../services/businessDataService");

// Import fallback prompts
const fallbackPrompts = require("./prompt");

// Import chat utilities
const {
  calculateEscalationScore,
  ESCALATION_TIERS,
  calculateResponseConfidence,
  getRecentHistory,
  extractCaseNumber,
  getEscalationCaseStatus,
  getEscalationForLiveChat,
  INTENT_TYPES,
  CONVERSATION_STATES,
  recognizeIntent,
  getConversationState
} = require("./chat-utils");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
  
  // Choose strategy based on intent, confidence, and available data capabilities
  // Available data: Services (with pricing), Products (with pricing), Policies, FAQs
  
  if (intent === INTENT_TYPES.PRICING_INQUIRY) {
    // We have pricing data in Services and Products models
    fallbackStrategy = 'pricing_available';
  } else if (intent === INTENT_TYPES.CASE_FOLLOWUP) {
    fallbackStrategy = 'case_followup_fallback';
  } else if (intent === INTENT_TYPES.INFORMATION_REQUEST) {
    // We can handle general info about services, products, policies, FAQs
    fallbackStrategy = 'general_info_available';
  } else if (confidence < 30) {
    fallbackStrategy = 'general_fallback';
  } else {
    fallbackStrategy = 'general_info_available';
  }
  
  
  // Get the appropriate prompt function and generate the prompt text
  const promptFunction = fallbackPrompts[fallbackStrategy] || fallbackPrompts.general_fallback;
  const prompt = promptFunction(query, businessName);
  
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
    
    // Handle price object structure
    if (k.price?.amount) {
      const currency = k.price.currency || 'USD';
      content += ` | Price: ${currency} ${k.price.amount}`;
    }
    // Add SKU if available
    if (k.sku) {
      content += ` | SKU: ${k.sku}`;
    }
    // Add quantity/availability
    if (k.quantity !== undefined) {
      content += ` | ${k.quantity > 0 ? `In Stock (${k.quantity})` : 'Out of Stock'}`;
    }
  } else if (k.type === 'service') {
    title = k.name || 'Service';
    content = k.description || '';
    category = k.category ? ` (Service - ${k.category})` : ' (Service)';
    
    // Handle pricing object structure
    if (k.pricing) {
      if (k.pricing.type === 'quote') {
        content += ` | Pricing: Contact for Quote`;
      } else if (k.pricing.amount) {
        const currency = k.pricing.currency || 'USD';
        const pricingType = k.pricing.type || 'fixed';
        const typeLabel = pricingType === 'hourly' ? '/hour' : pricingType === 'package' ? ' (package)' : '';
        content += ` | Price: ${currency} ${k.pricing.amount}${typeLabel}`;
      }
    }
    // Add duration if available
    if (k.duration) {
      content += ` | Duration: ${k.duration}`;
    }
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

// Helper function to generate escalation link based on live chat settings
const getEscalationLink = (liveChatEnabled, linkType = 'new', params = {}) => {
  console.log(`🔗 getEscalationLink called: liveChatEnabled=${liveChatEnabled}, linkType=${linkType}`, params);
  
  if (liveChatEnabled) {
    // Live chat enabled - use existing escalate:// links
    if (linkType === 'continue') {
      const link = `[click here to continue your case](escalate://continue?caseId=${params.caseId}&sessionId=${params.sessionId})`;
      console.log('🔗 Generated live chat continue link:', link);
      return link;
    } else {
      const link = `[click here to speak with a representative](escalate://new)`;
      console.log('🔗 Generated live chat new link:', link);
      return link;
    }
  } else {
    // Live chat disabled - use form-only links
    if (linkType === 'continue') {
      const link = `[click here to submit an update to your case](escalate://form?caseId=${params.caseId})`;
      console.log('🔗 Generated form continue link:', link);
      return link;
    } else {
      const link = `[click here to submit your concern](escalate://form)`;
      console.log('🔗 Generated form new link:', link);
      return link;
    }
  }
};

// Helper function to generate escalation message based on live chat settings
const getEscalationMessage = (liveChatEnabled) => {
  if (liveChatEnabled) {
    return "You'll be connected with an available agent shortly.";
  } else {
    return "Our live chat is currently not available. Please fill out the form to submit your case, and our team will get back to you as soon as possible.";
  }
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

    console.log('📊 KNOWLEDGE BASE DEBUG:');
    console.log('Business:', business.name);
    console.log('Query:', query);
    console.log('Raw businessData received:', businessData);
    console.log('businessData length:', businessData?.length || 0);
    console.log('businessData types:', businessData?.map(item => item.type) || []);

    // Get chatbot settings to check if live chat is enabled
    const chatbotSettings = await ChatbotSettings.findOne({ businessId: business._id });
    const liveChatEnabled = chatbotSettings?.enableLiveChat !== false;
    

    console.log('🔧 Raw enableLiveChat value:', chatbotSettings?.enableLiveChat);

    // Use business data for AI responses
    const combinedData = businessData || [];
    
    console.log('📚 Combined data for AI:', {
      dataCount: combinedData.length,
      dataTypes: combinedData.map(item => item.type),
      sampleData: combinedData.slice(0, 2).map(item => ({
        type: item.type,
        title: item.question || item.name || item.title,
        hasContent: !!(item.answer || item.description || item.content)
      }))
    });

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
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 2000, 
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
Live Chat Status: ${liveChatEnabled ? 'Enabled' : 'Disabled'}

Generate a helpful response that:
1. Acknowledges their case number and that they're a returning customer
2. Confirms we found their case
${liveChatEnabled ?
`3. Explains they'll be connected to continue their conversation with an agent
4. Includes this link: ${getEscalationLink(liveChatEnabled, 'continue', { caseId: existingCase.escalationId, sessionId: existingCase.sessionId })}` :
`3. Explains that our live chat is currently not available
4. Includes this link to submit an update to their case: ${getEscalationLink(liveChatEnabled, 'continue', { caseId: existingCase.escalationId, sessionId: existingCase.sessionId })}
5. Reassures them that our team will review their update and respond as soon as possible`}
6. Keep it professional and welcoming

Don't ask for their details again since we have them on file.`;

          const escalationResponse = await model.generateContent(returningCustomerPrompt);
          responseText = escalationResponse.response.text().trim();
          escalationGenerated = true;
        } else {
          // Case not found - add console logging for debugging
          console.log(`🔍 Case lookup failed: Case #${caseNumber} not found for business ${business._id}`);
          responseText = `I couldn't find case #${caseNumber} in our system. Please double-check the case number, or if you'd like to start a new case, ${getEscalationLink(liveChatEnabled, 'new')}.`;
          escalationGenerated = true;
        }
      } else {
        // New customer - regular escalation flow
        const escalationPrompt = `
User explicitly requested: "${query}"
Business name: ${business.name}
Escalation Score: ${escalationAnalysis.escalationScore}/100
Customer Intent: ${escalationAnalysis.intent}
Live Chat Status: ${liveChatEnabled ? 'Enabled' : 'Disabled'}

The customer wants to speak with a human. Generate a warm, helpful response that:
1. Acknowledges their request professionally
${liveChatEnabled ? 
`2. Asks for their name, email, and contact number if not already provided
3. Includes this link at the end: ${getEscalationLink(liveChatEnabled, 'new')}
4. Reassures them that they'll be connected with an available agent shortly` :
`2. Explains that our live chat is currently not available
3. Asks for their name, email, and contact number so we can assist them
4. Includes this link at the end: ${getEscalationLink(liveChatEnabled, 'new')}
5. Reassures them that once they submit the form, our team will review their case and get back to them as soon as possible`}

Keep the tone professional and empathetic.`;

        const escalationResponse = await model.generateContent(escalationPrompt);
        responseText = escalationResponse.response.text().trim();
        escalationGenerated = true;
      }
    } else {
      // Check if we have relevant data from any source
      const hasRelevantData = combinedData && combinedData.length > 0;
      
      console.log('🎯 Response Decision:');
      console.log('Has relevant data:', hasRelevantData);
      console.log('Response confidence:', responseConfidence);
      console.log('Will use knowledge:', hasRelevantData);
      
      if (hasRelevantData) {
        // Generate normal AI response with all available data
        const chatPrompt = constructPrompt({ 
          query: query.trim(), 
          knowledge: combinedData,
          history: recentHistory, 
          isEscalation: false,
          businessName: business.name
        });
        
        console.log(`✅ Using knowledge base - Response Confidence: ${responseConfidence}%`);
        console.log('📝 PROMPT SENT TO AI:');
        console.log(chatPrompt); // For debugging
        console.log('📝 END OF PROMPT');

        const result = await model.generateContent(chatPrompt);
        responseText = result.response.text();
        
        console.log('🤖 AI RESPONSE:', responseText);
        
        // Store the prompt for debugging
        req.debugPrompt = chatPrompt;
      } else {
        console.log(`⚠️ Using fallback - No relevant data available`);
        console.log('Customer Intent:', customerIntent);
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
          responseText += `\n\nIf you'd like to discuss this further with someone from our team, ${getEscalationLink(liveChatEnabled, 'new')}.`;
          escalationGenerated = true;
        } else if (escalationAnalysis.escalationTier === 'TIER_2' && 
                   customerIntent === INTENT_TYPES.PRICING_INQUIRY) {
          responseText += ` For specific details, feel free to ${getEscalationLink(liveChatEnabled, 'new')}.`;
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

    console.log("Testing Data:", {
      dataGivenToAI: combinedData || [],
      dataCount: combinedData?.length || 0,
      dataTypes: combinedData?.map(item => item.type) || [],
      hasRelevantData: combinedData && combinedData.length > 0,
      escalationAnalysis: escalationAnalysis,
      qualityChecks: qualityChecks
    });

  } catch (error) {
    console.error("Error in askAI:", error);
    
    // Get chatbot settings for error messages (fallback to true if business not available)
    let liveChatEnabled = true;
    try {
      if (business?._id) {
        const chatbotSettings = await ChatbotSettings.findOne({ businessId: business._id });
        liveChatEnabled = chatbotSettings?.enableLiveChat !== false;
      }
    } catch (settingsError) {
      console.error("Error fetching chatbot settings for error message:", settingsError);
    }
    
    // Better error handling
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: "Invalid input data" });
    }
    
    if (error.message?.includes('quota')) {
      return res.status(503).json({ 
        error: liveChatEnabled 
          ? `Service temporarily unavailable. Please try again later or ${getEscalationLink(liveChatEnabled, 'new')}.`
          : `Service temporarily unavailable. Our live chat is currently not available, but you can ${getEscalationLink(liveChatEnabled, 'new')} and our team will assist you.`
      });
    }

    res.status(500).json({ 
      error: liveChatEnabled
        ? `I'm having trouble processing your request right now. Please try again or ${getEscalationLink(liveChatEnabled, 'new')}.`
        : `I'm having trouble processing your request right now. Our live chat is currently not available, but you can ${getEscalationLink(liveChatEnabled, 'new')} and our team will assist you.`
    });
  }
};

module.exports = {
  askAI,
};
