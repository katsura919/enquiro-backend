const { GoogleGenerativeAI } = require("@google/generative-ai");
const Chat = require("../models/chatModel");
const Session = require("../models/sessionModel");
const Knowledge = require("../models/knowledgeModel");
const Business = require("../models/businessModel");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Fetch business and its knowledge base by slug
const fetchKnowledgeBySlug = async (slug) => {
  const business = await Business.findOne({ slug });
  if (!business) return { knowledge: null, business: null };

  const knowledge = await Knowledge.find({ businessId: business._id })
    .sort({ createdAt: -1 })
    .select('title content'); 

  return { knowledge, business };
};

// Construct the main prompt for Gemini
const constructPrompt = ({ query, knowledge, history, isEscalation }) => `
You are a friendly and professional virtual assistant helping users with business inquiries.

${!isEscalation && knowledge ? "**Business Information:**\n" +
  knowledge.map(k => `${k.title}: ${k.content}`).join("\n") + "\n" : ""}

${history ? "**Previous Messages:**\n" +
  history.map(msg => `**${msg.role === "user" ? "User" : "AI"}:** ${msg.content}`).join("\n") + "\n" : ""}

**User Query:**
${query}

**Important Notes:**
- Only answer based on the knowledge above.
- If unsure, say "I'm not sure about that" instead of guessing.
- Keep responses concise, relevant, and friendly.
${isEscalation ? `
- This user wants to escalate. Do NOT provide additional info or business details.
- Respond only with a polite escalation message and instructions.
` : ""}
`;

exports.askAI = async (req, res) => {
  try {
    const { query, history, sessionId, customerDetails } = req.body;
    const { slug } = req.params;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: "Query must be a non-empty string" });
    }

    // Get business knowledge and metadata
    const { knowledge, business } = await fetchKnowledgeBySlug(slug);
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
        businessId: business._id
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Step 1: Ask Gemini if escalation is required
    const escalationCheckPrompt = `
The user asked: "${query}"

Based on this query, does it sound like the user is asking for help that requires escalation to a human representative?
Respond with only "yes" or "no".
`;

    const escalationResult = await model.generateContent(escalationCheckPrompt);
    const escalationDecision = escalationResult.response.text().trim().toLowerCase();
    const needsEscalation = escalationDecision === "yes";

    let responseText;

    if (needsEscalation) {
      // Step 2: Let Gemini generate a polite escalation message with an acknowledgment
      const escalationResponsePrompt = `
The user asked: "${query}"

Write a short and polite acknowledgment about this query in one sentence.
Then follow it with: "To escalate this concern, [click here](escalate://now)."
Do NOT include business-specific information.
Format it like:
"[acknowledgement]. To escalate this concern, [click here](escalate://now)."
`;

      const escalationResponse = await model.generateContent(escalationResponsePrompt);
      responseText = escalationResponse.response.text().trim();
    } else {
      // Step 3: Generate the AI response normally
      const chatPrompt = constructPrompt({ query, knowledge, history, isEscalation: false });
      const result = await model.generateContent(chatPrompt);
      responseText = result.response.text();
    }

    // Save chat to DB
    const chat = await Chat.create({
      businessId: business._id,
      sessionId: session._id,
      query,
      response: responseText
    });

    // Respond to frontend
    res.json({
      answer: responseText,
      chatId: chat._id,
      sessionId: session._id,
      knowledge: knowledge || []
    });

  } catch (error) {
    console.error("Error in askAI:", error);
    res.status(500).json({ error: "Server error processing the chat" });
  }
};
