const Chat = require('../../models/chatModel');
const Agent = require('../../models/agentModel');

const { getChatRoomBySession } = require('../../utils/chatRoomUtil');

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

    // Emit the message to the chat room for real-time updates
    const io = req.app.get('io');
    const room = await getChatRoomBySession(sessionId);
    if (io) {
      io.to(room).emit('new_message', {
        chatId: chat._id,
        message: chat.message,
        senderType: chat.senderType,
        agentId: chat.agentId,
        sessionId: chat.sessionId,
        businessId: chat.businessId,
        createdAt: chat.createdAt
      });
    }

    res.status(201).json(chat);

    console.log(`Message sent to room ${room}:`, {
      chatId: chat._id,
      message: chat.message,
      senderType: chat.senderType,
      agentId: chat.agentId,
      sessionId: chat.sessionId,
      businessId: chat.businessId
    });
    
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