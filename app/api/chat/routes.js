const express = require("express");
const chatController = require("./chat");
const sendMessageController = require('./sendMessage');
const queueController = require('./queue');

const router = express.Router();

// Route to delete a chat by its ID
router.delete("/delete/:chatId", chatController.deleteChat);
router.get("/chats", chatController.getChats); 
router.put("/update-chat-status/:chatId", chatController.updateChatStatus);

// Create a chat
router.post('/', chatController.createChat);

// Get all chats for a business
router.get('/business/:businessId', chatController.getChatsByBusiness);

// Get all chats for a session
router.get('/session/:sessionId', chatController.getChatsBySession);

// Get a chat by ID
router.get('/:id', chatController.getChatById);

// Update a chat by ID
router.put('/:id', chatController.updateChat);

// Send a message (agent)
router.post('/send-message', sendMessageController.sendMessage);

// Get all messages for a session
router.get('/session/:sessionId/messages', sendMessageController.getSessionMessages);

// Queue management routes
router.get('/queue/:businessId', queueController.getQueue);
router.delete('/queue/:queueId', queueController.removeFromQueue);
router.post('/queue/cleanup', queueController.cleanupQueue);

module.exports = router;
