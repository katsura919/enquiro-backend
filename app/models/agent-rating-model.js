const mongoose = require('mongoose');

const agentRatingSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
    },
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agent',
      required: true,
    },
    caseNumber: {
      type: String,
      default: null, 
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5, 
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer between 1 and 5',
      },
    },

    feedback: {
      type: String,
      maxLength: 1000,
      default: null,
    },

    ratedAt: {
      type: Date,
      default: Date.now,
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Add indexes for performance
agentRatingSchema.index({ businessId: 1, agentId: 1 });
agentRatingSchema.index({ sessionId: 1 });
agentRatingSchema.index({ createdAt: -1 });
agentRatingSchema.index({ rating: 1 });

// Virtual for calculating rating percentage
agentRatingSchema.virtual('ratingPercentage').get(function() {
  return (this.rating / 5) * 100;
});

// Static methods for analytics
agentRatingSchema.statics.getAgentAverageRating = function(agentId, businessId) {
  return this.aggregate([
    {
      $match: {
        agentId: mongoose.Types.ObjectId(agentId),
        businessId: mongoose.Types.ObjectId(businessId)
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 }
      }
    }
  ]);
};

agentRatingSchema.statics.getBusinessRatingStats = function(businessId, startDate = null, endDate = null) {
  const matchQuery = {
    businessId: mongoose.Types.ObjectId(businessId)
  };

  if (startDate && endDate) {
    matchQuery.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$agentId',
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'agents',
        localField: '_id',
        foreignField: '_id',
        as: 'agent'
      }
    },
    {
      $unwind: '$agent'
    },
    {
      $project: {
        agentId: '$_id',
        agentName: '$agent.name',
        agentEmail: '$agent.email',
        averageRating: { $round: ['$averageRating', 2] },
        totalRatings: 1
      }
    },
    { $sort: { averageRating: -1 } }
  ]);
};

module.exports = mongoose.model('AgentRating', agentRatingSchema);