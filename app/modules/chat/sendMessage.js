const Chat = require('../../models/chatModel');
const Agent = require('../../models/agentModel');
const Escalation = require('../../models/escalationModel');
const { getChatRoomBySession } = require('../../utils/chatRoomUtil');
const { uploadToCloudinary } = require('../../services/fileUploadService');
const mongoose = require('mongoose');

// Unified controller for sending a message
const sendMessage = async (req, res) => {
  try {
    const { businessId, sessionId, message, senderType, agentId, escalationId, messageType } = req.body;
    const files = req.files; // Files uploaded via multer

    // Validation
    if (!businessId || !sessionId || !senderType) {
      return res.status(400).json({ error: 'businessId, sessionId, and senderType are required' });
    }

    // Validate message based on messageType
    const msgType = messageType || 'text';
    if (msgType === 'text' && !message) {
      return res.status(400).json({ error: 'message is required for text messages' });
    }
    if ((msgType === 'image' || msgType === 'file') && (!files || files.length === 0)) {
      return res.status(400).json({ error: 'files are required for image/file messages' });
    }

    if (senderType === 'agent') {
      if (!agentId) return res.status(400).json({ error: 'agentId required for agent messages' });
      const agent = await Agent.findById(agentId);
      if (!agent) return res.status(404).json({ error: 'Agent not found' });
    }

    // Handle file uploads if present
    let attachments = [];
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          const uploadResult = await uploadToCloudinary(file, {
            folder: `chat-uploads/${businessId}`,
          });
          
          attachments.push({
            fileName: uploadResult.originalName,
            fileUrl: uploadResult.url,
            fileSize: uploadResult.size,
            mimeType: uploadResult.mimeType,
            publicId: uploadResult.publicId,
          });
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
          return res.status(500).json({ error: 'Failed to upload file: ' + uploadError.message });
        }
      }
    }

    const chat = new Chat({
      businessId,
      sessionId,
      message: msgType === 'text' ? message : null,
      messageType: msgType,
      attachments: attachments,
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
        messageType: chat.messageType,
        attachments: chat.attachments,
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

// Send message with file upload
const sendMessageWithFile = async (req, res) => {
  try {
    const { businessId, sessionId, message, senderType, agentId, escalationId } = req.body;
    const file = req.file; // Single file uploaded via multer

    // Validation
    if (!businessId || !sessionId || !senderType) {
      return res.status(400).json({ error: 'businessId, sessionId, and senderType are required' });
    }

    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

    if (senderType === 'agent') {
      if (!agentId) return res.status(400).json({ error: 'agentId required for agent messages' });
      const agent = await Agent.findById(agentId);
      if (!agent) return res.status(404).json({ error: 'Agent not found' });
    }

    // Determine message type based on file
    let messageType = 'file';
    if (file.mimetype.startsWith('image/')) {
      messageType = 'image';
    }

    // Upload file to Cloudinary
    let uploadResult;
    try {
      uploadResult = await uploadToCloudinary(file, {
        folder: `chat-uploads/${businessId}`,
      });
    } catch (uploadError) {
      console.error('File upload error:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file: ' + uploadError.message });
    }

    const chat = new Chat({
      businessId,
      sessionId,
      message: message || null, // Optional caption for images
      messageType,
      attachments: [{
        fileName: uploadResult.originalName,
        fileUrl: uploadResult.url,
        fileSize: uploadResult.size,
        mimeType: uploadResult.mimeType,
        publicId: uploadResult.publicId,
      }],
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
        messageType: chat.messageType,
        attachments: chat.attachments,
        senderType: chat.senderType,
        agentId: chat.agentId,
        sessionId: chat.sessionId,
        businessId: chat.businessId,
        escalationId: escalationId,
        createdAt: chat.createdAt
      };

      io.to(room).emit('new_message', messageData);
      console.log(`[sendMessageWithFile] Message sent to room ${room}:`, messageData);
    } else {
      console.warn(`[sendMessageWithFile] No room found for message - escalationId: ${escalationId}, sessionId: ${sessionId}`);
    }

    res.status(201).json({
      success: true,
      message: 'Message with file sent successfully',
      data: {
        ...chat.toObject(),
        room,
        escalationId
      }
    });
    
  } catch (err) {
    console.error('[sendMessageWithFile] Error:', err);
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
  sendMessageWithFile,
  getSessionMessages,
  getEscalationMessages
};