const Chat = require("../models/chatModel"); // Import the Chat model
const Business = require('../models/businessModel');
const Session = require('../models/sessionModel');

// Controller to delete a chat by its ID
const deleteChat = async (req, res) => {
  const { chatId } = req.params; // Get the chatId from the URL parameters

  try {
    // Find and delete the chat
    const deletedChat = await Chat.findByIdAndDelete(chatId);

    if (!deletedChat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    res.status(200).json({ message: "Chat deleted successfully", chat: deletedChat });
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).json({ error: "An error occurred while deleting the chat", details: error.message });
  }
};

// 📌 Fetch all chats (latest first)
const getChats = async (req, res) => {
  try {
    const chats = await Chat.find().sort({ createdAt: -1 }); // Ensure `createdAt` exists in your schema
    res.status(200).json(chats); // Return status 200 for successful fetch
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ error: "An error occurred while fetching chats", details: error.message });
  }
};

// Controller function to update the chat status
const updateChatStatus = async (req, res) => {
    const { chatId } = req.params;
    const { action } = req.body;
  
    // Validate the action input
    if (!action || !["like", "dislike", "none"].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Valid actions are 'like', 'dislike', or 'none'." });
    }
  
    try {
      // Determine the value for isGoodResponse based on the action
      let isGoodResponse = null;
      if (action === "like") {
        isGoodResponse = true;
      } else if (action === "dislike") {
        isGoodResponse = false;
      } else if (action === "none") {
        isGoodResponse = null;
      }
  
      // Find the chat by ID and update the isGoodResponse field
      const chat = await Chat.findByIdAndUpdate(
        chatId,
        { isGoodResponse: isGoodResponse },
        { new: true } // Return the updated chat document
      );
  
      // If chat not found, return an error
      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }
  
      // Return the updated chat data
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
    const chats = await Chat.find({ sessionId }).sort({ createdAt: 1 });
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

module.exports = { deleteChat, getChats, updateChatStatus, createChat, getChatsByBusiness, getChatsBySession, getChatById, updateChat };
