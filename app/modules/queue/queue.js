const ChatQueue = require('../../models/chatQueueModel');
const Escalation = require('../../models/escalationModel');

// Get queue for a business
const getQueue = async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const queueItems = await ChatQueue.find({ businessId })
      .populate({
        path: 'escalationId',
        select: 'customerName customerEmail customerPhone concern caseNumber description'
      })
      .sort({ requestedAt: 1 });

    // Transform the data to include escalation details directly
    const transformedItems = queueItems.map(item => ({
      _id: item._id,
      escalationId: item.escalationId._id,
      businessId: item.businessId,
      status: item.status,
      requestedAt: item.requestedAt,
      agentId: item.agentId,
      escalation: {
        customerName: item.escalationId.customerName,
        customerEmail: item.escalationId.customerEmail,
        customerPhone: item.escalationId.customerPhone,
        concern: item.escalationId.concern,
        caseNumber: item.escalationId.caseNumber,
        description: item.escalationId.description
      }
    }));

    res.json(transformedItems);
  } catch (error) {
    console.error('[getQueue] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get agent statistics
const getAgentStats = async (req, res) => {
  try {
    const { agentId } = req.params;
    
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Count completed chats today
    const chatsToday = await ChatQueue.countDocuments({
      agentId,
      status: 'completed',
      completedAt: { $gte: today, $lt: tomorrow }
    });

    // For now, return mock data for other stats
    // In a real implementation, you'd calculate these from actual data
    const stats = {
      chatsToday,
      avgResponseTime: Math.floor(Math.random() * 30) + 15, // Mock: 15-45 seconds
      customerSatisfaction: Math.floor(Math.random() * 20) + 80 // Mock: 80-100%
    };

    res.json(stats);
  } catch (error) {
    console.error('[getAgentStats] Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getQueue,
  getAgentStats
};
