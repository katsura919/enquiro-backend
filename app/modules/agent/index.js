const express = require('express');
const router = express.Router();
const { getAgentStats } = require('../queue/queue');

// Get agent statistics
router.get('/:agentId/stats', getAgentStats);

module.exports = router;
