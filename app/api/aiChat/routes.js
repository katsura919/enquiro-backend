const express = require('express');
const router = express.Router();
const askController = require('./aiChat');

// Route definition
router.post('/chat/:slug', askController.askAI);

module.exports = router;
