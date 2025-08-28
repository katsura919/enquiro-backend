const ChatQueue = require('../../models/chat-queue-model');
const AgentStatus = require('../../models/agent-status-model');

// Get current queue for a business
const getQueue = async (req, res) => {
  try {
    const { businessId } = req.params;
    const queue = await ChatQueue.find({ businessId, status: 'waiting' })
      .populate('agentId', 'name email')
      .sort({ requestedAt: 1 });
    
    res.json(queue);
  } catch (error) {
    console.error('Error getting queue:', error);
    res.status(500).json({ error: error.message });
  }
};

// Remove customer from queue
const removeFromQueue = async (req, res) => {
  try {
    const { queueId } = req.params;
    await ChatQueue.findByIdAndUpdate(queueId, { status: 'completed' });
    res.json({ message: 'Removed from queue successfully' });
  } catch (error) {
    console.error('Error removing from queue:', error);
    res.status(500).json({ error: error.message });
  }
};

// Cleanup old queue entries
const cleanupQueue = async (req, res) => {
  try {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    const result = await ChatQueue.deleteMany({
      status: 'completed',
      updatedAt: { $lt: cutoffTime }
    });

    res.json({ 
      message: 'Queue cleanup completed', 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error cleaning up queue:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getQueue,
  removeFromQueue,
  cleanupQueue
};
