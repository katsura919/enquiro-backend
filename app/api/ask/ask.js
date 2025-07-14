const { GoogleGenerativeAI } = require("@google/generative-ai");
const Chat = require("../../models/chatModel");
const Session = require("../../models/sessionModel");
const Knowledge = require("../../models/knowledgeModel");
const Business = require("../../models/businessModel");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Fetch business and its knowledge base by slug with optimization
const fetchKnowledgeBySlug = async (slug, query = null) => {
  const business = await Business.findOne({ slug });
  if (!business) return { knowledge: null, business: null };

  let knowledge = await Knowledge.find({ businessId: business._id })
    .populate('categoryId', 'name')
    .sort({ createdAt: -1 })
    .select('title content categoryId')
    .lean(); // Use lean() for better performance

  // Filter knowledge by relevance if query provided
  if (query && knowledge.length > 0) {
    knowledge = filterKnowledgeByRelevance(query, knowledge);
  }

  // Limit to top 8 most relevant items to prevent prompt bloat
  knowledge = knowledge.slice(0, 8);

  return { knowledge, business };
};

// Simple keyword-based relevance filtering
const filterKnowledgeByRelevance = (query, knowledge) => {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(' ').filter(word => word.length > 2);
  
  return knowledge
    .map(k => {
      const titleWords = k.title.toLowerCase();
      const contentWords = k.content.toLowerCase();
      
      let relevanceScore = 0;
      queryWords.forEach(word => {
        if (titleWords.includes(word)) relevanceScore += 3; // Title matches worth more
        if (contentWords.includes(word)) relevanceScore += 1;
      });
      
      return { ...k, relevanceScore };
    })
    .filter(k => k.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
};

// Get recent conversation history
const getRecentHistory = async (sessionId, limit = 4) => {
  if (!sessionId) return [];
  
  const recentChats = await Chat.find({ sessionId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('query response')
    .lean();
    
  return recentChats.reverse().map(chat => [
    { role: "user", content: chat.query },
    { role: "assistant", content: chat.response }
  ]).flat();
};

// Enhanced prompt construction with better structure and natural responses
const constructPrompt = ({ query, knowledge, history, isEscalation, businessName }) => `
You are ${businessName}'s friendly and helpful AI assistant. Act like a real, knowledgeable person who works for the company.

${!isEscalation && knowledge?.length > 0 ? 
`**Available Business Information:**
${knowledge.map((k, i) => 
  `${i + 1}. **${k.title}** ${k.categoryId?.name ? `(${k.categoryId.name})` : ''}: ${k.content}`
).join('\n')}

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

// Handle cases where information isn't available naturally
const generateNaturalResponse = async (query, businessName, model, hasRelevantKnowledge) => {
  if (hasRelevantKnowledge) {
    return null; // Let normal flow handle this
  }
  
  // Generate a natural "I don't know" response
  const naturalResponsePrompt = `
Customer asked: "${query}"
Business: ${businessName}

The business knowledge doesn't cover this topic. Generate a natural, helpful response like a real person would give. Include:
1. Acknowledgment of their question
2. Natural explanation that you don't have those specific details
3. Offer to help in other ways or suggest they could contact the business directly
4. Keep it warm and conversational

Examples of natural responses:
- "That's a really good question! I don't have those specific details available right now..."
- "I wish I could give you the exact information on that..."
- "Hmm, I don't have those particulars at the moment..."

Don't mention "business knowledge" or "database" - just respond naturally.
`;

  const result = await model.generateContent(naturalResponsePrompt);
  return result.response.text();
};

// Enhanced escalation detection with proper de-escalation
const checkEscalationNeeded = async (query, recentHistory, model) => {
  // Only escalate for explicit human requests, not for missing information
  const directEscalationKeywords = [
    'speak to human', 'talk to person', 'escalate', 'supervisor', 
    'manager', 'representative', 'agent', 'support team',
    'talk to someone', 'human help', 'real person'
  ];
  
  const hasDirectEscalationRequest = directEscalationKeywords.some(keyword => 
    query.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (hasDirectEscalationRequest) return true;
  
  // Check for severe frustration patterns that need human intervention
  const severeEscalationPrompt = `
User query: "${query}"

Recent conversation:
${recentHistory.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n')}

Only escalate if this shows SEVERE frustration or EXPLICIT demand for human help:
- Direct requests to speak with humans/managers
- Extreme anger or threats
- Multiple failed attempts at the same issue
- Explicit complaints about poor service

Do NOT escalate for:
- Missing information requests
- General questions
- Mild disappointment
- First-time inquiries

Respond only "yes" or "no".
`;

  const result = await model.generateContent(severeEscalationPrompt);
  return result.response.text().trim().toLowerCase() === "yes";
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

    // Get business knowledge with relevance filtering
    const { knowledge, business } = await fetchKnowledgeBySlug(slug, query);
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

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

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 500, // Limit response length
      }
    });

    // Enhanced escalation check - only for explicit requests
    const needsEscalation = await checkEscalationNeeded(query, recentHistory, model);

    let responseText;
    let escalationGenerated = false;

    if (needsEscalation) {
      // Generate escalation response for explicit human requests
      const escalationPrompt = `
User explicitly requested: "${query}"
Business name: ${business.name}

The customer wants to speak with a human. Generate a warm, helpful response that:
1. Acknowledges their request positively
2. Lets them know you're connecting them
3. Includes this link: [click here to speak with a representative](escalate://now)

Keep it natural and friendly, like a real person would respond.
`;

      const escalationResponse = await model.generateContent(escalationPrompt);
      responseText = escalationResponse.response.text().trim();
      escalationGenerated = true;
    } else {
      // Check if we have relevant knowledge first
      const hasRelevantKnowledge = knowledge && knowledge.length > 0;
      
      if (hasRelevantKnowledge) {
        // Generate normal AI response with knowledge
        const chatPrompt = constructPrompt({ 
          query: query.trim(), 
          knowledge, 
          history: recentHistory, 
          isEscalation: false,
          businessName: business.name
        });
        
        const result = await model.generateContent(chatPrompt);
        responseText = result.response.text();
      } else {
        // Generate natural response when no relevant knowledge
        responseText = await generateNaturalResponse(query, business.name, model, false);
        
        // Only suggest contact if it seems like important information they need
        const importantInfoKeywords = ['price', 'cost', 'appointment', 'booking', 'schedule', 'availability', 'order', 'delivery'];
        const seemsImportant = importantInfoKeywords.some(keyword => 
          query.toLowerCase().includes(keyword)
        );
        
        if (seemsImportant) {
          responseText += " If you need those specific details, feel free to [reach out directly](escalate://now) and someone can help you with that!";
          escalationGenerated = true;
        }
      }

      // Remove the aggressive quality check - let natural responses flow
      // Only suggest escalation if customer shows frustration in follow-up
    }

    // Save chat to DB with additional metadata
    const chat = await Chat.create({
      businessId: business._id,
      sessionId: session._id,
      query: query.trim(),
      response: responseText,
      escalationGenerated,
      knowledgeItemsUsed: knowledge?.length || 0,
      responseTime: Date.now() - req.startTime // If you add timing middleware
    });

    // Enhanced response
    res.json({
      answer: responseText,
      chatId: chat._id,
      sessionId: session._id,
      escalationSuggested: escalationGenerated,
      context: {
        businessName: business.name,
        knowledgeItemsAvailable: knowledge?.length || 0,
        conversationLength: recentHistory.length
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
        error: "Service temporarily unavailable. Please try again later or [contact support](escalate://now)." 
      });
    }

    res.status(500).json({ 
      error: "I'm having trouble processing your request right now. Please try again or [contact support](escalate://now)." 
    });
  }
};

module.exports = {
  askAI,
};
