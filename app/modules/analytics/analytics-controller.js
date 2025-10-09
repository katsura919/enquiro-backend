const AgentRating = require('../../models/agent-rating-model');
const Escalation = require('../../models/escalation-model');
const Session = require('../../models/session-model');
const Agent = require('../../models/agent-model');
const mongoose = require('mongoose');

// Get average rating for a specific business
const getBusinessAverageRating = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { startDate, endDate } = req.query;

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid business ID'
      });
    }

    const matchQuery = {
      businessId: new mongoose.Types.ObjectId(businessId)
    };

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    const businessRating = await AgentRating.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' }
        }
      },
      {
        $project: {
          _id: 0,
          averageRating: { $round: ['$averageRating', 2] }
        }
      }
    ]);

    if (!businessRating.length) {
      return res.status(404).json({
        success: false,
        error: 'No ratings found for this business'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        averageRating: businessRating[0].averageRating
      },
      message: 'Business average rating retrieved successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Get count of escalated cases for a specific business
const getEscalatedCount = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { startDate, endDate } = req.query;

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid business ID'
      });
    }

    const matchQuery = {
      businessId: new mongoose.Types.ObjectId(businessId),
      status: 'escalated'
    };

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    const escalatedCount = await Escalation.countDocuments(matchQuery);

    res.status(200).json({
      success: true,
      data: {
        escalatedCount
      },
      message: 'Escalated count retrieved successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Get escalations count per day for chart visualization
const getEscalationsPerDay = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { period } = req.query;

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid business ID'
      });
    }

    // Validate period parameter
    const validPeriods = ['7days', '30days', '3months'];
    if (!period || !validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Must be one of: 7days, 30days, 3months'
      });
    }

    // Calculate start date based on period using UTC
    const now = new Date();
    const endDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
    
    const startDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
    
    switch (period) {
      case '7days':
        startDate.setUTCDate(startDate.getUTCDate() - 6); // Today + 6 days back = 7 days total
        break;
      case '30days':
        startDate.setUTCDate(startDate.getUTCDate() - 29); // Today + 29 days back = 30 days total
        break;
      case '3months':
        startDate.setUTCMonth(startDate.getUTCMonth() - 3);
        startDate.setUTCDate(startDate.getUTCDate() + 1); // Adjust to include today
        break;
    }

    const escalationsPerDay = await Escalation.aggregate([
      {
        $match: {
          businessId: new mongoose.Types.ObjectId(businessId),
          createdAt: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: { date: '$createdAt', timezone: 'UTC' } },
            month: { $month: { date: '$createdAt', timezone: 'UTC' } },
            day: { $dayOfMonth: { date: '$createdAt', timezone: 'UTC' } }
          },
          total: { $sum: 1 },
          escalated: {
            $sum: {
              $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0]
            }
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
            }
          },
          resolved: {
            $sum: {
              $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          date: {
            $dateFromParts: {
              year: '$_id.year',
              month: '$_id.month',
              day: '$_id.day'
            }
          },
          total: 1,
          escalated: 1,
          pending: 1,
          resolved: 1
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    // Fill in missing dates with zero counts
    const filledData = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      const existingData = escalationsPerDay.find(item => {
        const itemDateString = new Date(item.date).toISOString().split('T')[0];
        return itemDateString === dateString;
      });

      if (existingData) {
        filledData.push({
          date: dateString,
          total: existingData.total,
          escalated: existingData.escalated,
          pending: existingData.pending,
          resolved: existingData.resolved
        });
      } else {
        filledData.push({
          date: dateString,
          total: 0,
          escalated: 0,
          pending: 0,
          resolved: 0
        });
      }

      currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    // Calculate total counts
    const summary = filledData.reduce((acc, day) => {
      acc.totalOverall += day.total;
      acc.totalEscalated += day.escalated;
      acc.totalPending += day.pending;
      acc.totalResolved += day.resolved;
      return acc;
    }, {
      totalOverall: 0,
      totalEscalated: 0,
      totalPending: 0,
      totalResolved: 0
    });

    res.status(200).json({
      success: true,
      data: {
        period,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        dailyData: filledData,
        summary
      },
      message: 'Escalations per day retrieved successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Get total sessions count for a specific business
const getSessionsCount = async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid business ID'
      });
    }

    const sessionsCount = await Session.countDocuments({
      businessId: new mongoose.Types.ObjectId(businessId)
    });

    res.status(200).json({
      success: true,
      data: {
        sessionsCount
      },
      message: 'Sessions count retrieved successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// Get total agents count for a specific business (excluding soft deleted)
const getAgentsCount = async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(businessId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid business ID'
      });
    }

    const agentsCount = await Agent.countDocuments({
      businessId: new mongoose.Types.ObjectId(businessId),
      deletedAt: null // Exclude soft deleted agents
    });

    res.status(200).json({
      success: true,
      data: {
        agentsCount
      },
      message: 'Agents count retrieved successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

module.exports = {
  getBusinessAverageRating,
  getEscalatedCount,
  getEscalationsPerDay,
  getSessionsCount,
  getAgentsCount
};
