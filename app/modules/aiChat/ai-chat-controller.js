const { GoogleGenAI, Chat } = require("@google/genai");
const Chats = require("../../models/chat-model");
const Session = require("../../models/session-model");
const Business = require("../../models/business-model");
const Escalation = require("../../models/escalation-model");
const ChatbotSettings = require("../../models/chatbot-settings-model");

// Import the business data service
const {
  fetchBusinessDataBySlug,
} = require("../../services/businessDataService");

// Import chat utilities
const {
  calculateEscalationScore,
  ESCALATION_TIERS,
  calculateResponseConfidence,
  INTENT_TYPES,
  recognizeIntent,
} = require("./chat-utils");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// In-memory store for Google Chat sessions (for conversation continuity)
// This works alongside our database sessions for persistence
const chatSessions = new Map();

// Enhanced escalation detection with intelligent scoring
const checkEscalationNeeded = async (query, model, sessionData = {}) => {
  // Calculate escalation score (without history dependency)
  const escalationScore = calculateEscalationScore(query, [], sessionData);
  const currentIntent = recognizeIntent(query, []);

  console.log(`Escalation Analysis:
    Score: ${escalationScore}/100
    Intent: ${currentIntent}
    Threshold: ${
      escalationScore >= ESCALATION_TIERS.TIER_4.threshold
        ? "IMMEDIATE"
        : escalationScore >= ESCALATION_TIERS.TIER_3.threshold
        ? "OFFER"
        : "HANDLE"
    }`);

  // Return escalation decision with context
  return {
    shouldEscalate: escalationScore >= ESCALATION_TIERS.TIER_4.threshold,
    escalationScore,
    intent: currentIntent,
    escalationTier:
      escalationScore >= ESCALATION_TIERS.TIER_4.threshold
        ? "TIER_4"
        : escalationScore >= ESCALATION_TIERS.TIER_3.threshold
        ? "TIER_3"
        : escalationScore >= ESCALATION_TIERS.TIER_2.threshold
        ? "TIER_2"
        : "TIER_1",
  };
};

// Helper function to generate escalation link based on live chat settings
const getEscalationLink = (liveChatEnabled, linkType = "new", params = {}) => {
  console.log(
    `🔗 getEscalationLink called: liveChatEnabled=${liveChatEnabled}, linkType=${linkType}`,
    params
  );

  if (liveChatEnabled) {
    // Live chat enabled - use existing escalate:// links
    if (linkType === "continue") {
      // For continue links, we just trigger the dialog - no params needed
      const link = `[click here to continue your case](escalate://continue)`;
      console.log("🔗 Generated live chat continue link:", link);
      return link;
    } else {
      const link = `[click here to speak with a representative](escalate://new)`;
      console.log("🔗 Generated live chat new link:", link);
      return link;
    }
  } else {
    // Live chat disabled - use form-only links
    if (linkType === "continue") {
      // For form continue, also no params - user will enter case number in form
      const link = `[click here to submit an update to your case](escalate://form)`;
      console.log("🔗 Generated form continue link:", link);
      return link;
    } else {
      const link = `[click here to submit your concern](escalate://form)`;
      console.log("🔗 Generated form new link:", link);
      return link;
    }
  }
};

const askAI = async (req, res) => {
  let business = null; // Declare business variable outside try block for error handling

  try {
    const { query, sessionId, customerDetails } = req.body;
    const { slug } = req.params;

    // Input validation
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res
        .status(400)
        .json({ error: "Query must be a non-empty string" });
    }

    if (query.length > 1000) {
      return res.status(400).json({
        error: "Query too long. Please keep it under 1000 characters.",
      });
    }

    // Get additional business data from other tables
    const { allData: businessData, business: foundBusiness } =
      await fetchBusinessDataBySlug(slug, query);
    business = foundBusiness; // Assign to outer scope variable
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    console.log("📊 KNOWLEDGE BASE DEBUG:");
    console.log("Business:", business.name);
    console.log("Query:", query);
    console.log("Raw businessData received:", businessData);
    console.log("businessData length:", businessData?.length || 0);
    console.log(
      "businessData types:",
      businessData?.map((item) => item.type) || []
    );

    // Get chatbot settings to check if live chat is enabled
    const chatbotSettings = await ChatbotSettings.findOne({
      businessId: business._id,
    });
    const liveChatEnabled = chatbotSettings?.enableLiveChat !== false;

    console.log(
      "🔧 Raw enableLiveChat value:",
      chatbotSettings?.enableLiveChat
    );

    // Use business data for AI responses
    const combinedData = businessData || [];

    console.log("📚 Combined data for AI:", {
      dataCount: combinedData.length,
      dataTypes: combinedData.map((item) => item.type),
      sampleData: combinedData.slice(0, 2).map((item) => ({
        type: item.type,
        title: item.question || item.name || item.title,
        hasContent: !!(item.answer || item.description || item.content),
      })),
    });

    // Handle or create session
    let session;
    if (sessionId) {
      session = await Session.findById(sessionId);
    }
    if (!session) {
      session = await Session.create({
        businessId: business._id,
        ...(customerDetails && { customerInfo: customerDetails }),
      });
    }

    // Analyze customer intent and conversation state (without history dependency)
    const customerIntent = recognizeIntent(query, []);

    // Get session data for escalation tracking (you might want to store this in session model)
    const sessionData = {
      escalationAttempts: 0, // This should be tracked in session model
    };

    // Calculate response confidence (without manual history)
    const responseConfidence = calculateResponseConfidence(
      query,
      combinedData,
      []
    );

    // Create system instruction with business context
    const systemInstruction = `You are a friendly, helpful, and professional customer service chatbot for ${
      business.name
    }. Your goal is to assist users with their inquiries clearly and concisely. Keep your responses brief and to the point unless the user asks for more detail.

${
  combinedData?.length > 0
    ? `Available Information:\n${combinedData
        .map((k, i) => {
          let title,
            content,
            category = "";

          if (k.type === "faq") {
            title = k.question || "FAQ";
            content = k.answer || "";
            category = k.category ? ` (FAQ - ${k.category})` : " (FAQ)";
          } else if (k.type === "product") {
            title = k.name || "Product";
            content = k.description || "";
            category = k.category ? ` (Product - ${k.category})` : " (Product)";

            if (k.price?.amount) {
              const currency = k.price.currency || "USD";
              content += ` | Price: ${currency} ${k.price.amount}`;
            }
            if (k.sku) {
              content += ` | SKU: ${k.sku}`;
            }
            if (k.quantity !== undefined) {
              content += ` | ${
                k.quantity > 0 ? `In Stock (${k.quantity})` : "Out of Stock"
              }`;
            }
          } else if (k.type === "service") {
            title = k.name || "Service";
            content = k.description || "";
            category = k.category ? ` (Service - ${k.category})` : " (Service)";

            if (k.pricing) {
              if (k.pricing.type === "quote") {
                content += ` | Pricing: Contact for Quote`;
              } else if (k.pricing.amount) {
                const currency = k.pricing.currency || "USD";
                const pricingType = k.pricing.type || "fixed";
                const typeLabel =
                  pricingType === "hourly"
                    ? "/hour"
                    : pricingType === "package"
                    ? " (package)"
                    : "";
                content += ` | Price: ${currency} ${k.pricing.amount}${typeLabel}`;
              }
            }
            if (k.duration) {
              content += ` | Duration: ${k.duration}`;
            }
          } else if (k.type === "policy") {
            title = k.title || "Policy";
            content = k.content || "";
            category = k.type ? ` (Policy - ${k.type})` : " (Policy)";
          } else {
            title = k.title || k.name || "Information";
            content = k.content || k.description || "";
            if (k.categoryId?.name) {
              category = ` (${k.categoryId.name})`;
            }
          }

          return `${i + 1}. **${title}**${category}: ${content}`;
        })
        .join("\n")}`
    : "No specific business information available."
}

Only use the information provided above to answer questions. If you don't have the information, politely say so.`;

    // Enhanced escalation check with intelligent scoring
    const escalationAnalysis = await checkEscalationNeeded(
      query,
      null, // No model needed for escalation analysis
      sessionData
    );

    let responseText;
    let escalationGenerated = false;

    if (escalationAnalysis.shouldEscalate) {
      // Check if user is mentioning an existing case or follow-up
      const hasCaseFollowupIntent =
        /\b(existing case|my case|case number|follow up|followup|following up|check.*status|update.*case|case.*update|previous case|submitted case|ongoing case)\b/i.test(
          query
        );

      let linkType = "new";
      let escalationPrompt = "";

      if (hasCaseFollowupIntent) {
        // User has an existing case - provide continue link
        linkType = "continue";
        escalationPrompt = `
User is asking about an existing case or wants to follow up: "${query}"
Business name: ${business.name}
Live Chat Status: ${liveChatEnabled ? "Enabled" : "Disabled"}

Generate a CONCISE response (2-3 sentences max) that:
1. Acknowledges they're following up on an existing case
2. Includes this link: ${getEscalationLink(liveChatEnabled, "continue", {})}
${
  liveChatEnabled
    ? `3. Explains they can enter their case number to continue`
    : `3. Explains they can enter their case number to submit an update`
}

Keep it brief and direct. Don't ask for personal details.`;
      } else {
        // New escalation - regular flow
        escalationPrompt = `
User explicitly requested: "${query}"
Business name: ${business.name}
Live Chat Status: ${liveChatEnabled ? "Enabled" : "Disabled"}

Generate a CONCISE response (2-3 sentences max) that:
1. Acknowledges their request
${
  liveChatEnabled
    ? `2. Asks for their name, email, and contact number
3. Includes this link: ${getEscalationLink(liveChatEnabled, "new")}
4. Mentions they'll be connected with an agent shortly`
    : `2. Explains live chat is currently unavailable
3. Asks for their name, email, and contact number
4. Includes this link: ${getEscalationLink(liveChatEnabled, "new")}
5. Mentions the team will respond soon`
}

Keep it brief and professional.`;
      }

      // Use simple chat for escalation messages (no need for chat continuity)
      const escalationChat = ai.chats.create({
        model: "gemini-2.0-flash",
        config: {
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 200,
          },
        },
      });
      const escalationResponse = await escalationChat.sendMessage({
        message: escalationPrompt,
      });
      responseText = escalationResponse.text.trim();
      escalationGenerated = true;
    } else {
      // Always use chat session regardless of data availability
      console.log("🎯 Response Decision:");
      console.log("Data available:", combinedData?.length || 0, "items");
      console.log("Response confidence:", responseConfidence);

      let chat;
      let currentSessionId = session._id.toString();

      if (chatSessions.has(currentSessionId)) {
        // Continue existing session
        chat = chatSessions.get(currentSessionId);
        console.log("🔄 Resuming existing chat session");
      } else {
        // Start a new chat session
        chat = ai.chats.create({
          model: "gemini-2.0-flash",
          config: {
            systemInstruction: systemInstruction,
            generationConfig: {
              temperature: 0.5, // Lower temperature for more focused, concise responses
              topP: 0.8, // Reduced for less verbose output
              maxOutputTokens: 500, // Reduced from 2000 to encourage brevity
            },
          },
        });
        chatSessions.set(currentSessionId, chat);
        console.log("🆕 Starting new chat session");
      }

      console.log(
        `✅ Using chat session - Response Confidence: ${responseConfidence}%`
      );
      console.log("📝 QUERY SENT TO CHAT:", query.trim());

      // Send message and get response using Google's new chat API
      const result = await chat.sendMessage({ message: query.trim() });
      responseText = result.text;

      console.log("🤖 AI RESPONSE:", responseText);

      // Basic proactive escalation for higher tiers
      if (!escalationGenerated) {
        if (escalationAnalysis.escalationTier === "TIER_3") {
          responseText += `\n\nIf you'd like to discuss this further, ${getEscalationLink(
            liveChatEnabled,
            "new"
          )}.`;
          escalationGenerated = true;
        } else if (
          escalationAnalysis.escalationTier === "TIER_2" &&
          customerIntent === INTENT_TYPES.PRICING_INQUIRY
        ) {
          responseText += `\n\nFor specific details, ${getEscalationLink(
            liveChatEnabled,
            "new"
          )}.`;
          escalationGenerated = true;
        }
      }

      // Proactive escalation: Offer help if confidence is very low or repeated failures detected
      if (!escalationGenerated) {
        // Check for low confidence response (below 30%)
        if (
          responseConfidence < 30 &&
          escalationAnalysis.escalationScore >=
            ESCALATION_TIERS.TIER_2.threshold
        ) {
          console.log(
            `🔔 Proactive escalation triggered: Low confidence (${responseConfidence}%) + Escalation score ${escalationAnalysis.escalationScore}`
          );
          responseText += `\n\nWould you like to ${getEscalationLink(
            liveChatEnabled,
            "new"
          )}?`;
          escalationGenerated = true;
        }

        // Note: Since we no longer have explicit history, we can't check for repeated unhelpful responses
        // The Gemini chat session will handle this naturally through conversation context

        // Check for complex topics that need human intervention
        const lowerQuery = query.toLowerCase();
        const complexTopics = [
          "return",
          "refund",
          "money back",
          "cancel order",
          "change order",
          "dispute",
          "complaint",
          "billing issue",
          "payment problem",
          "account locked",
          "technical issue",
          "warranty",
          "guarantee",
          "defective",
          "lost package",
          "damaged",
          "not working",
          "broken",
        ];
        const hasComplexTopic = complexTopics.some((topic) =>
          lowerQuery.includes(topic)
        );

        if (
          !escalationGenerated &&
          hasComplexTopic &&
          escalationAnalysis.escalationScore >=
            ESCALATION_TIERS.TIER_2.threshold
        ) {
          console.log(
            `🔔 Proactive escalation triggered: Complex topic detected in query`
          );
          responseText += `\n\n${getEscalationLink(
            liveChatEnabled,
            "new"
          )} to help resolve this.`;
          escalationGenerated = true;
        }
      }
    }

    // Quality check for response
    const qualityChecks = {
      hasContent: responseText && responseText.trim().length > 0,
      appropriateLength:
        responseText && responseText.length > 20 && responseText.length < 1500,
      noErrors:
        !responseText.toLowerCase().includes("error") &&
        !responseText.toLowerCase().includes("failed"),
      helpful:
        responseText &&
        (responseText.toLowerCase().includes("help") ||
          responseText.toLowerCase().includes("assist") ||
          responseText.includes("?") || // Questions are engaging
          combinedData.length > 0), // Has relevant data
    };

    const qualityScore =
      (Object.values(qualityChecks).filter(Boolean).length /
        Object.keys(qualityChecks).length) *
      100;

    // Save chat to DB with enhanced metadata
    const chatRecord = await Chats.create({
      businessId: business._id,
      sessionId: session._id,
      message: query.trim(),
      senderType: "customer",
      agentId: null,
      isGoodResponse: null,
    });

    // Save AI response as a separate chat message
    const aiChatRecord = await Chats.create({
      businessId: business._id,
      sessionId: session._id,
      message: responseText,
      senderType: "ai",
      agentId: null,
      isGoodResponse: null, // Let customers rate manually
    });

    // Enhanced response with comprehensive analytics
    res.json({
      answer: responseText,
      customerChatId: chatRecord._id,
      aiChatId: aiChatRecord._id,
      sessionId: session._id,
      escalationSuggested: escalationGenerated,
      context: {
        businessName: business.name,
        dataItemsAvailable: combinedData?.length || 0,
        conversationLength: await Chats.countDocuments({
          sessionId: session._id,
        }), // Count from database
        customerIntent: customerIntent,
        responseConfidence: responseConfidence,
        escalationScore: escalationAnalysis.escalationScore,
        escalationTier: escalationAnalysis.escalationTier,
        qualityScore: qualityScore,
        usingHybridSessions: true, // Updated flag
      },
      // Testing data - remove in production
      testingData: {
        dataGivenToAI: combinedData || [],
        dataCount: combinedData?.length || 0,
        dataTypes: combinedData?.map((item) => item.type) || [],
        hasRelevantData: combinedData && combinedData.length > 0,
        escalationAnalysis: escalationAnalysis,
        qualityChecks: qualityChecks,
        chatHistoryLength: await Chats.countDocuments({
          sessionId: session._id,
        }), // Count from database
      },
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
        const chatbotSettings = await ChatbotSettings.findOne({
          businessId: business._id,
        });
        liveChatEnabled = chatbotSettings?.enableLiveChat !== false;
      }
    } catch (settingsError) {
      console.error(
        "Error fetching chatbot settings for error message:",
        settingsError
      );
    }

    // Better error handling
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: "Invalid input data" });
    }

    if (error.message?.includes("quota")) {
      return res.status(503).json({
        error: liveChatEnabled
          ? `Service temporarily unavailable. Please try again later or ${getEscalationLink(
              liveChatEnabled,
              "new"
            )}.`
          : `Service temporarily unavailable. Our live chat is currently not available, but you can ${getEscalationLink(
              liveChatEnabled,
              "new"
            )} and our team will assist you.`,
      });
    }

    res.status(500).json({
      error: liveChatEnabled
        ? `I'm having trouble processing your request right now. Please try again or ${getEscalationLink(
            liveChatEnabled,
            "new"
          )}.`
        : `I'm having trouble processing your request right now. Our live chat is currently not available, but you can ${getEscalationLink(
            liveChatEnabled,
            "new"
          )} and our team will assist you.`,
    });
  }
};

module.exports = {
  askAI,
};
