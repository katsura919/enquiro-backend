const express = require('express');
const router = express.Router();
const { getQueue, getAgentStats } = require('./queue-controller');

// Get queue for a business
router.get('/:businessId', getQueue);

module.exports = router;
