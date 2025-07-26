const express = require('express');
const router = express.Router();
const agentController = require('./agent');


// Get Agent info using token
router.get('/info', agentController.getAgentInfo);
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

module.exports = router;
