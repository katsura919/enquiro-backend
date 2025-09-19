const Chat = require("../../../models/chat-model");

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

module.exports = getRecentHistory;