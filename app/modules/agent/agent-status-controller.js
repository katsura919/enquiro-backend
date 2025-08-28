const express = require('express');
const AgentStatus = require('../../models/agent-status-model');
const Agent = require('../../models/agent-model');

const router = express.Router();

// Get all agent statuses for a business
router.get('/status/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const agentStatuses = await AgentStatus.find({ businessId })
      .populate('agentId', 'name email role')
      .sort({ lastActive: -1 });
    
    res.json(agentStatuses);
  } catch (error) {
    console.error('Error getting agent statuses:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update agent status
router.put('/status/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { businessId, status } = req.body;
    
    if (!businessId || !status) {
      return res.status(400).json({ error: 'businessId and status are required' });
    }
    
    const agentStatus = await AgentStatus.findOneAndUpdate(
      { agentId, businessId },
      { status, lastActive: new Date() },
      { upsert: true, new: true }
    ).populate('agentId', 'name email role');
    
    // Emit status update via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`status_${businessId}`).emit('agent_status_update', { agentId, status });
    }
    
    res.json(agentStatus);
  } catch (error) {
    console.error('Error updating agent status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get available agents count for a business
router.get('/available/:businessId', async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const availableCount = await AgentStatus.countDocuments({ 
      businessId, 
      status: 'available' 
    });
    
    res.json({ availableAgents: availableCount });
  } catch (error) {
    console.error('Error getting available agents count:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
