const express = require('express');
const router = express.Router();
const agentController = require('./agent');
const statusRoutes = require('./status');
const { getAgentStats } = require('../queue/queue');

// Get Agent info using token
router.get('/info', agentController.getAgentInfo);
// Get agent statistics
router.get('/:agentId/stats', getAgentStats);
// Create agent
router.post('/', agentController.createAgent);
// Get all agents (optionally by business)
router.get('/', agentController.getAgents);
// Get agent by ID
router.get('/:id', agentController.getAgentById);
// Update agent
router.put('/:id', agentController.updateAgent);
// Delete agent
router.delete('/:id', agentController.deleteAgent);

// Status routes
router.use('/', statusRoutes);

module.exports = router;
