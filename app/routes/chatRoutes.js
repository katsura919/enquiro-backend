const express = require("express");
const { deleteChat, getChats, updateChatStatus, createChat, getChatsByBusiness, getChatsBySession, getChatById, updateChat } = require("../controllers/chatController"); // Import the controller function

const router = express.Router();

// Route to delete a chat by its ID
router.delete("/delete/:chatId", deleteChat); // Changed /delete/:chatId to /chats/:chatId for consistency
router.get("/chats", getChats); 
router.put("/update-chat-status/:chatId", updateChatStatus);

// Create a chat
router.post('/', createChat);

// Get all chats for a business
router.get('/business/:businessId', getChatsByBusiness);

// Get all chats for a session
router.get('/session/:sessionId', getChatsBySession);

// Get a chat by ID
router.get('/:id', getChatById);

// Update a chat by ID
router.put('/:id', updateChat);

module.exports = router;
