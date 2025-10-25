const Chat = require("../../models/chat-model");
const Business = require('../../models/business-model');
const Session = require('../../models/session-model');
const { deleteChatWithFiles } = require('../../utils/fileManagement');
 
// Controller to delete a chat by its ID
const deleteChat = async (req, res) => {
  const { chatId } = req.params;

  try {
    // Use the file management utility to delete chat with associated files
    const result = await deleteChatWithFiles(chatId);
    
    res.status(200).json({ 
      message: "Chat and associated files deleted successfully", 
      success: result.success 
    });
  } catch (error) {
    console.error("Error deleting chat:", error);
    if (error.message === 'Chat not found') {
      return res.status(404).json({ error: "Chat not found" });
    }
    res.status(500).json({ 
      error: "An error occurred while deleting the chat", 
      details: error.message 
    });
  }
};

// Fetch all chats (latest first)
const getChats = async (req, res) => {
  try {
    const chats = await Chat.find().sort({ createdAt: -1 });
    res.status(200).json(chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ error: "An error occurred while fetching chats", details: error.message });
  }
};

// Controller function to update the chat status
const updateChatStatus = async (req, res) => {
    const { chatId } = req.params;
    const { action } = req.body;
  
    if (!action || !["like", "dislike", "none"].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Valid actions are 'like', 'dislike', or 'none'." });
    }

    // Validate MongoDB ObjectId format
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ error: "Invalid chat ID format" });
    }
  
    try {
      let isGoodResponse = null;
      if (action === "like") {
        isGoodResponse = true;
      } else if (action === "dislike") {
        isGoodResponse = false;
      } else if (action === "none") {
        isGoodResponse = null;
      }
  
      const chat = await Chat.findByIdAndUpdate(
        chatId,
        { isGoodResponse: isGoodResponse },
        { new: true }
      );
  
      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }
  
      res.json({ message: "Chat status updated successfully", chat });
    } catch (error) {
      console.error("Error updating chat status:", error);
      res.status(500).json({ error: "An error occurred while updating chat status" });
    }
  };

// Create a chat
const createChat = async (req, res) => {
  try {
    const { businessId, sessionId, query, response, isGoodResponse } = req.body;
    if (!businessId || !sessionId || !query || !response) {
      return res.status(400).json({ error: 'businessId, sessionId, query, and response are required.' });
    }
    const businessExists = await Business.findById(businessId);
    if (!businessExists) {
      return res.status(404).json({ error: 'Business not found.' });
    }
    const sessionExists = await Session.findById(sessionId);
    if (!sessionExists) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    const chat = new Chat({ businessId, sessionId, query, response, isGoodResponse });
    await chat.save();
    res.status(201).json(chat);
  } catch (err) {
    console.error('Error creating chat:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get all chats for a specific business
const getChatsByBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const chats = await Chat.find({ businessId }).sort({ createdAt: -1 });
    res.json(chats);
  } catch (err) {
    console.error('Error fetching chats by business:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get all chats for a specific session
const getChatsBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const chats = await Chat.find({ sessionId })
      .populate('agentId', 'name profilePic')
      .sort({ createdAt: 1 });
    res.json(chats);
  } catch (err) {
    console.error('Error fetching chats by session:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get one chat by ID
const getChatById = async (req, res) => {
  try {
    const { id } = req.params;
    const chat = await Chat.findById(id);
    if (!chat) return res.status(404).json({ error: 'Chat not found.' });
    res.json(chat);
  } catch (err) {
    console.error('Error fetching chat by ID:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Update a chat by ID
const updateChat = async (req, res) => {
  try {
    const { id } = req.params;
    const { query, response, isGoodResponse } = req.body;
    const chat = await Chat.findByIdAndUpdate(
      id,
      { query, response, isGoodResponse },
      { new: true, runValidators: true }
    );
    if (!chat) return res.status(404).json({ error: 'Chat not found.' });
    res.json(chat);
  } catch (err) {
    console.error('Error updating chat:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get all rated chat messages (where isGoodResponse is not null)
const getRatedChats = async (req, res) => {
  try {
    const { businessId } = req.query;
    
    // Build query filter
    const filter = {
      isGoodResponse: { $ne: null },
      senderType: 'ai' // Only get AI messages since they're the ones that get rated
    };
    
    // Add businessId filter if provided
    if (businessId) {
      filter.businessId = businessId;
    }
    
    const chats = await Chat.find(filter)
      .populate('businessId', 'name slug')
      .populate('sessionId', 'customerName customerEmail')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: chats.length,
      data: chats
    });
  } catch (err) {
    console.error('Error fetching rated chats:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get chat messages by session ID with optional filtering
const getMessagesBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { senderType, messageType, limit, skip } = req.query;

    // Validate sessionId
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ error: "Invalid session ID format" });
    }

    // Build query filter
    const filter = { sessionId };
    
    // Add optional filters
    if (senderType) {
      if (!['customer', 'ai', 'agent', 'system'].includes(senderType)) {
        return res.status(400).json({ error: "Invalid senderType. Must be: customer, ai, agent, or system" });
      }
      filter.senderType = senderType;
    }
    
    if (messageType) {
      if (!['text', 'image', 'file'].includes(messageType)) {
        return res.status(400).json({ error: "Invalid messageType. Must be: text, image, or file" });
      }
      filter.messageType = messageType;
    }

    // Build query with pagination
    let query = Chat.find(filter)
      .populate('agentId', 'name profilePic email')
      .populate('businessId', 'name slug')
      .sort({ createdAt: 1 }); // Chronological order for conversation flow

    // Apply pagination if provided
    if (skip) {
      const skipNum = parseInt(skip);
      if (isNaN(skipNum) || skipNum < 0) {
        return res.status(400).json({ error: "Invalid skip parameter. Must be a non-negative number" });
      }
      query = query.skip(skipNum);
    }

    if (limit) {
      const limitNum = parseInt(limit);
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
        return res.status(400).json({ error: "Invalid limit parameter. Must be between 1 and 1000" });
      }
      query = query.limit(limitNum);
    }

    const messages = await query;

    // Get total count for pagination info
    const totalCount = await Chat.countDocuments(filter);

    res.json({
      success: true,
      sessionId,
      totalCount,
      count: messages.length,
      pagination: {
        skip: parseInt(skip) || 0,
        limit: parseInt(limit) || totalCount,
        hasMore: (parseInt(skip) || 0) + messages.length < totalCount
      },
      filters: {
        senderType: senderType || 'all',
        messageType: messageType || 'all'
      },
      data: messages
    });

  } catch (err) {
    console.error('Error fetching messages by session:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = { 
  deleteChat, 
  getChats, 
  updateChatStatus, 
  createChat, 
  getChatsByBusiness, 
  getChatsBySession, 
  getChatById, 
  updateChat,
  getRatedChats,
  getMessagesBySession
};
