const express = require("express");
const chatController = require("./chat-controller");
const sendMessageController = require('./live-chat-controller');
const queueController = require('./queue-controller');
const { upload } = require('../../services/fileUploadService');
const { getFileUsageStats, cleanupOrphanedFiles } = require('../../utils/fileManagement');

const router = express.Router();

// Route to delete a chat by its ID
router.delete("/delete/:chatId", chatController.deleteChat);
router.get("/chats", chatController.getChats); 
router.put("/update-chat-status/:chatId", chatController.updateChatStatus);

// Get rated chat messages (where isGoodResponse is not null)
router.get("/rated", chatController.getRatedChats);

// Get chat messages by session ID with optional filtering
router.get("/messages/:sessionId", chatController.getMessagesBySession);

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

// Send a message with file upload (single file)
router.post('/send-message-with-file', upload.single('file'), sendMessageController.sendMessageWithFile);

// Send a message with multiple files
router.post('/send-message-with-files', upload.array('files', 5), sendMessageController.sendMessage);

// Get all messages for a session
router.get('/session/:sessionId/messages', sendMessageController.getSessionMessages);

// Get all messages for an escalation (live chat)
router.get('/escalation/:escalationId/messages', sendMessageController.getEscalationMessages);

// Queue management routes
router.get('/queue/:businessId', queueController.getQueue);
router.delete('/queue/:queueId', queueController.removeFromQueue);
router.post('/queue/cleanup', queueController.cleanupQueue);

// File management routes
router.get('/files/stats/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const stats = await getFileUsageStats(businessId);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/files/cleanup/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    const result = await cleanupOrphanedFiles(businessId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
