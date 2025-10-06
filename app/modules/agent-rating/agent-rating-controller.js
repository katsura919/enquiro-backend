const AgentRating = require('../../models/agent-rating-model');

// Create a new agent rating
const createAgentRating = async (req, res) => {
  try {
    const rating = new AgentRating(req.body);
    await rating.save();
    
    // Populate referenced fields for response
    await rating.populate('businessId sessionId agentId');
    
    res.status(201).json({
      success: true,
      data: rating,
      message: 'Agent rating created successfully'
    });
  } catch (err) {
    res.status(400).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get all ratings with optional filters
const getRatings = async (req, res) => {
  try {
    const { businessId, agentId, sessionId, minRating, maxRating, page = 1, limit = 20 } = req.query;
    
    const filter = {};
    if (businessId) filter.businessId = businessId;
    if (agentId) filter.agentId = agentId;
    if (sessionId) filter.sessionId = sessionId;
    if (minRating || maxRating) {
      filter.rating = {};
      if (minRating) filter.rating.$gte = parseInt(minRating);
      if (maxRating) filter.rating.$lte = parseInt(maxRating);
    }

    const skip = (page - 1) * limit;
    const ratings = await AgentRating.find(filter)
      .populate('businessId', 'name')
      .populate('sessionId', 'sessionId')
      .populate('agentId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AgentRating.countDocuments(filter);

    res.json({
      success: true,
      data: ratings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get rating by ID
const getRatingById = async (req, res) => {
  try {
    const rating = await AgentRating.findById(req.params.id)
      .populate('businessId', 'name')
      .populate('sessionId', 'sessionId')
      .populate('agentId', 'name email');
    
    if (!rating) {
      return res.status(404).json({ 
        success: false,
        error: 'Rating not found' 
      });
    }

    res.json({
      success: true,
      data: rating
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Update agent rating
const updateRating = async (req, res) => {
  try {
    const rating = await AgentRating.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    ).populate('businessId sessionId agentId');
    
    if (!rating) {
      return res.status(404).json({ 
        success: false,
        error: 'Rating not found' 
      });
    }

    res.json({
      success: true,
      data: rating,
      message: 'Rating updated successfully'
    });
  } catch (err) {
    res.status(400).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Delete agent rating
const deleteRating = async (req, res) => {
  try {
    const rating = await AgentRating.findByIdAndDelete(req.params.id);
    
    if (!rating) {
      return res.status(404).json({ 
        success: false,
        error: 'Rating not found' 
      });
    }

    res.json({
      success: true,
      message: 'Rating deleted successfully'
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get agent average rating (using static method from model)
const getAgentAverageRating = async (req, res) => {
  try {
    const { agentId, businessId } = req.params;
    
    if (!agentId || !businessId) {
      return res.status(400).json({
        success: false,
        error: 'Both agentId and businessId are required'
      });
    }

    const result = await AgentRating.getAgentAverageRating(agentId, businessId);
    
    if (!result || result.length === 0) {
      return res.json({
        success: true,
        data: {
          averageRating: 0,
          totalRatings: 0
        },
        message: 'No ratings found for this agent'
      });
    }

    res.json({
      success: true,
      data: result[0]
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get business rating statistics (using static method from model)
const getBusinessRatingStats = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!businessId) {
      return res.status(400).json({
        success: false,
        error: 'businessId is required'
      });
    }

    const result = await AgentRating.getBusinessRatingStats(businessId, startDate, endDate);

    res.json({
      success: true,
      data: result,
      filters: {
        businessId,
        startDate: startDate || null,
        endDate: endDate || null
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get ratings by session
const getRatingsBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const ratings = await AgentRating.find({ sessionId })
      .populate('businessId', 'name')
      .populate('agentId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: ratings
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get ratings by agent
const getRatingsByAgent = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (page - 1) * limit;
    
    const ratings = await AgentRating.find({ agentId })
      .populate('businessId', 'name')
      .populate('sessionId', 'sessionId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AgentRating.countDocuments({ agentId });

    // Calculate average rating for this agent
    const mongoose = require('mongoose');
    const avgResult = await AgentRating.aggregate([
      { $match: { agentId: new mongoose.Types.ObjectId(agentId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    const stats = avgResult.length > 0 
      ? { 
          averageRating: Math.round(avgResult[0].averageRating * 10) / 10, 
          totalRatings: avgResult[0].totalRatings 
        }
      : { averageRating: 0, totalRatings: 0 };

    res.json({
      success: true,
      data: ratings,
      stats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

// Get rating distribution for business
const getRatingDistribution = async (req, res) => {
  try {
    const { businessId } = req.params;
    const mongoose = require('mongoose');
    
    const distribution = await AgentRating.aggregate([
      { $match: { businessId: new mongoose.Types.ObjectId(businessId) } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Create a complete distribution (1-5 stars)
    const completeDistribution = [1, 2, 3, 4, 5].map(rating => {
      const found = distribution.find(item => item._id === rating);
      return {
        rating,
        count: found ? found.count : 0
      };
    });

    res.json({
      success: true,
      data: completeDistribution
    });
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
};

module.exports = {
  createAgentRating,
  getRatings,
  getRatingById,
  updateRating,
  deleteRating,
  getAgentAverageRating,
  getBusinessRatingStats,
  getRatingsBySession,
  getRatingsByAgent,
  getRatingDistribution
};
