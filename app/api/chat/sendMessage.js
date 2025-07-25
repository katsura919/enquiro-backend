const Chat = require('../../models/chatModel');
const Agent = require('../../models/agentModel');

// Unified controller for sending a message
const sendMessage = async (req, res) => {
  try {
    const { businessId, sessionId, message, senderType, agentId } = req.body;

    if (senderType === 'agent') {
      if (!agentId) return res.status(400).json({ error: 'agentId required for agent messages' });
      const agent = await Agent.findById(agentId);
      if (!agent) return res.status(404).json({ error: 'Agent not found' });
    }

    const chat = new Chat({
      businessId,
      sessionId,
      message,
      senderType,
      agentId: senderType === 'agent' ? agentId : null,
      isGoodResponse: null
    });
    await chat.save();
    res.status(201).json(chat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all messages for a session
const getSessionMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const chats = await Chat.find({ sessionId });
    res.json(chats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


module.exports = {
  sendMessage,
  getSessionMessages
};