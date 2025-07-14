const express = require('express');
const router = express.Router();
const askController = require('../controllers/askController');

// Route definition
router.post('/chat/:slug', (req, res) => {
  askController.askAI(req, res);
});


module.exports = router;