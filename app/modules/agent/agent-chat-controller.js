const Chat = require('../../models/chatModel');
const Agent = require('../../models/agentModel');

// Agent sends a chat response
exports.agentSendMessage = async (req, res) => {
  try {
    const { businessId, sessionId, query, response, agentId } = req.body;
    // Validate agent exists
    const agent = await Agent.findById(agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const chat = new Chat({
      businessId,
      sessionId,
      query,
      response,
      responderType: 'agent',
      agentId,
    });
    await chat.save();
    res.status(201).json(chat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all chats for an agent
exports.getAgentChats = async (req, res) => {
  try {
    const { agentId } = req.params;
    const chats = await Chat.find({ agentId });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
