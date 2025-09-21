const express = require('express');
const { createChatbotSettings, getChatbotSettings, updateChatbotSettings } = require('./chatbot-settings-controller');

const router = express.Router();

// POST /api/chatbot-settings - Create chatbot settings for a business
router.post('/', createChatbotSettings);

// GET /api/chatbot-settings/:businessId - Get chatbot settings for a business
router.get('/:businessId', getChatbotSettings);

// PUT /api/chatbot-settings/:businessId - Update chatbot settings for a business
router.put('/:businessId', updateChatbotSettings);

module.exports = router;
