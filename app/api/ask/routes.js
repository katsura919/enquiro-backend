const express = require('express');
const router = express.Router();
const askController = require('./ask');

// Route definition
router.post('/chat/:slug', askController.askAI);

module.exports = router;
