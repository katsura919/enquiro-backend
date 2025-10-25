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
  INTENT_TYPES,
  CONVERSATION_STATES,
  recognizeIntent,
  getConversationState
} = require("./chat-utils");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Enhanced fallback strategies
const generateFallbackResponse = async (query, businessName, model, intent, confidence) => {
  let fallbackStrategy = '';
  
  // Choose strategy based on intent, confidence, and available data capabilities
  // Available data: Services (with pricing), Products (with pricing), Policies, FAQs
  
  if (intent === INTENT_TYPES.PRICING_INQUIRY) {
    // We have pricing data in Services and Products models
    fallbackStrategy = 'pricing_available';
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

IMPORTANT: Before responding, check if the business information below actually answers the customer's specific question. If it doesn't, be honest and say you don't have that information.

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
`- Be CONCISE and DIRECT - get straight to the point
- Answer in 2-3 sentences maximum unless more detail is specifically requested
- CRITICAL: ONLY use the business information provided if it DIRECTLY answers the customer's specific question
- If the provided information doesn't address their question, be honest and say you don't have that information
- Do NOT claim to have knowledge about general topics (services, products, FAQs) unless you have specific relevant information
- When you don't have relevant information, respond honestly:
  * "I don't have information about that specific topic."
  * "I don't have details about that."
  * "I'm not able to help with that particular question."
- Be conversational but brief and honest
- Avoid unnecessary phrases like "That's a great question!" or "I'd love to help!"
- Skip filler words and get to the answer immediately
- Never claim to have access to information categories unless you're providing specific relevant details
- Only suggest speaking with someone if the customer seems frustrated or explicitly asks`}
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
      // For continue links, we just trigger the dialog - no params needed
      const link = `[click here to continue your case](escalate://continue)`;
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
      // For form continue, also no params - user will enter case number in form
      const link = `[click here to submit an update to your case](escalate://form)`;
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
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.5, // Lower temperature for more focused, concise responses
        topP: 0.8, // Reduced for less verbose output
        maxOutputTokens: 500, // Reduced from 2000 to encourage brevity
      }
    });

    // Enhanced escalation check with intelligent scoring
    const escalationAnalysis = await checkEscalationNeeded(query, recentHistory, model, sessionData);

    let responseText;
    let escalationGenerated = false;

    if (escalationAnalysis.shouldEscalate) {
      // Check if user is mentioning an existing case or follow-up
      const hasCaseFollowupIntent = /\b(existing case|my case|case number|follow up|followup|following up|check.*status|update.*case|case.*update|previous case|submitted case|ongoing case)\b/i.test(query);
      
      let linkType = 'new';
      let escalationPrompt = '';
      
      if (hasCaseFollowupIntent) {
        // User has an existing case - provide continue link
        linkType = 'continue';
        escalationPrompt = `
User is asking about an existing case or wants to follow up: "${query}"
Business name: ${business.name}
Live Chat Status: ${liveChatEnabled ? 'Enabled' : 'Disabled'}

Generate a CONCISE response (2-3 sentences max) that:
1. Acknowledges they're following up on an existing case
2. Includes this link: ${getEscalationLink(liveChatEnabled, 'continue', {})}
${liveChatEnabled ?
`3. Explains they can enter their case number to continue` :
`3. Explains they can enter their case number to submit an update`}

Keep it brief and direct. Don't ask for personal details.`;
      } else {
        // New escalation - regular flow
        escalationPrompt = `
User explicitly requested: "${query}"
Business name: ${business.name}
Live Chat Status: ${liveChatEnabled ? 'Enabled' : 'Disabled'}

Generate a CONCISE response (2-3 sentences max) that:
1. Acknowledges their request
${liveChatEnabled ? 
`2. Asks for their name, email, and contact number
3. Includes this link: ${getEscalationLink(liveChatEnabled, 'new')}
4. Mentions they'll be connected with an agent shortly` :
`2. Explains live chat is currently unavailable
3. Asks for their name, email, and contact number
4. Includes this link: ${getEscalationLink(liveChatEnabled, 'new')}
5. Mentions the team will respond soon`}

Keep it brief and professional.`;
      }

      const escalationResponse = await model.generateContent(escalationPrompt);
      responseText = escalationResponse.response.text().trim();
      escalationGenerated = true;
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
        
        // Proactive escalation for various scenarios
        if (escalationAnalysis.escalationTier === 'TIER_3') {
          responseText += `\n\nIf you'd like to discuss this further, ${getEscalationLink(liveChatEnabled, 'new')}.`;
          escalationGenerated = true;
        } else if (escalationAnalysis.escalationTier === 'TIER_2' && 
                   customerIntent === INTENT_TYPES.PRICING_INQUIRY) {
          responseText += `\n\nFor specific details, ${getEscalationLink(liveChatEnabled, 'new')}.`;
          escalationGenerated = true;
        }
      }
      
      // Proactive escalation: Offer help if confidence is very low or repeated failures detected
      if (!escalationGenerated) {
        // Check for low confidence response (below 30%)
        if (responseConfidence < 30 && escalationAnalysis.escalationScore >= ESCALATION_TIERS.TIER_2.threshold) {
          console.log(`🔔 Proactive escalation triggered: Low confidence (${responseConfidence}%) + Escalation score ${escalationAnalysis.escalationScore}`);
          responseText += `\n\nWould you like to ${getEscalationLink(liveChatEnabled, 'new')}?`;
          escalationGenerated = true;
        }
        
        // Check for repeated unhelpful AI responses (detected in history)
        const aiMessages = recentHistory.filter(msg => msg.role === 'assistant');
        const unhelpfulCount = aiMessages.filter(msg => {
          const content = msg.content.toLowerCase();
          return content.includes("don't have") || 
                 content.includes("don't know") ||
                 content.includes("not available") ||
                 content.includes("wish i had more") ||
                 content.includes("i'd love to help with that, but");
        }).length;
        
        if (!escalationGenerated && unhelpfulCount >= 2) {
          console.log(`🔔 Proactive escalation triggered: ${unhelpfulCount} unhelpful responses detected`);
          responseText += `\n\n${getEscalationLink(liveChatEnabled, 'new')} for more detailed help.`;
          escalationGenerated = true;
        }
        
        // Check for complex topics that need human intervention
        const lowerQuery = query.toLowerCase();
        const complexTopics = [
          'return', 'refund', 'money back', 'cancel order', 'change order',
          'dispute', 'complaint', 'billing issue', 'payment problem',
          'account locked', 'technical issue', 'warranty', 'guarantee',
          'defective', 'lost package', 'damaged', 'not working', 'broken'
        ];
        const hasComplexTopic = complexTopics.some(topic => lowerQuery.includes(topic));
        
        if (!escalationGenerated && hasComplexTopic && escalationAnalysis.escalationScore >= ESCALATION_TIERS.TIER_2.threshold) {
          console.log(`🔔 Proactive escalation triggered: Complex topic detected in query`);
          responseText += `\n\n${getEscalationLink(liveChatEnabled, 'new')} to help resolve this.`;
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

    // Save AI response as a separate chat message
    const aiChat = await Chat.create({
      businessId: business._id,
      sessionId: session._id,
      message: responseText,
      senderType: "ai",
      agentId: null,
      isGoodResponse: null // Let customers rate manually
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

    console.log("Response:", {
      answer: responseText,
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
