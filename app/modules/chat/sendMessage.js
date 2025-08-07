const Chat = require('../../models/chatModel');
const Agent = require('../../models/agentModel');
const Escalation = require('../../models/escalationModel');
const { getChatRoomBySession } = require('../../utils/chatRoomUtil');
const mongoose = require('mongoose');

// Unified controller for sending a message
const sendMessage = async (req, res) => {
  try {
    const { businessId, sessionId, message, senderType, agentId, escalationId } = req.body;

    // Validation
    if (!businessId || !sessionId || !message || !senderType) {
      return res.status(400).json({ error: 'businessId, sessionId, message, and senderType are required' });
    }

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
      escalationId: escalationId || null,
      isGoodResponse: null
    });
    await chat.save();

    // Determine the correct room for this chat
    let room = null;
    if (escalationId) {
      room = `chat_${escalationId}`;
    } else {
      // Try to find escalation by sessionId
      const escalation = await Escalation.findOne({ sessionId });
      if (escalation) {
        room = `chat_${escalation._id}`;
      }
    }

    // Emit the message to the chat room for real-time updates
    const io = req.app.get('io');
    if (io && room) {
      const messageData = {
        _id: chat._id,
        message: chat.message,
        senderType: chat.senderType,
        agentId: chat.agentId,
        sessionId: chat.sessionId,
        businessId: chat.businessId,
        escalationId: escalationId,
        createdAt: chat.createdAt
      };

      io.to(room).emit('new_message', messageData);
      console.log(`[sendMessage] Message sent to room ${room}:`, messageData);
    } else {
      console.warn(`[sendMessage] No room found for message - escalationId: ${escalationId}, sessionId: ${sessionId}`);
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        ...chat.toObject(),
        room,
        escalationId
      }
    });
    
  } catch (err) {
    console.error('[sendMessage] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get all messages for a session (including system messages)
const getSessionMessages = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { includeSystem = true } = req.query;
    
    let query = { sessionId };
    if (includeSystem === 'false') {
      query.senderType = { $ne: 'system' };
    }
    
    const chats = await Chat.find(query)
      .populate('agentId', 'name email')
      .sort({ createdAt: 1 });
    
    res.json(chats);
  } catch (err) {
    console.error('[getSessionMessages] Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get all messages for an escalation (live chat)
const getEscalationMessages = async (req, res) => {
  try {
    const { escalationId } = req.params;
    const { includeSystem = true } = req.query;
    
    let query = { escalationId };
    if (includeSystem === 'false') {
      query.senderType = { $ne: 'system' };
    }
    
    const chats = await Chat.find(query)
      .populate('agentId', 'name email')
      .sort({ createdAt: 1 });
    
    res.json(chats);
  } catch (err) {
    console.error('[getEscalationMessages] Error:', err);
    res.status(500).json({ error: err.message });
  }
};


module.exports = {
  sendMessage,
  getSessionMessages,
  getEscalationMessages
};