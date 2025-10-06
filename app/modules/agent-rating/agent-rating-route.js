const express = require('express');
const router = express.Router();
const agentRatingController = require('./agent-rating-controller');

// Create a new agent rating
router.post('/', agentRatingController.createAgentRating);

// Get all ratings with optional filters
router.get('/', agentRatingController.getRatings);

// Get agent average rating (specific agent in business)
router.get('/agent/:agentId/business/:businessId/average', agentRatingController.getAgentAverageRating);

// Get business rating statistics
router.get('/business/:businessId/stats', agentRatingController.getBusinessRatingStats);

// Get rating distribution for business
router.get('/business/:businessId/distribution', agentRatingController.getRatingDistribution);

// Get ratings by session
router.get('/session/:sessionId', agentRatingController.getRatingsBySession);

// Get ratings by agent
router.get('/agent/:agentId', agentRatingController.getRatingsByAgent);

// Get rating by ID
router.get('/:id', agentRatingController.getRatingById);

// Update agent rating
router.put('/:id', agentRatingController.updateRating);

// Delete agent rating
router.delete('/:id', agentRatingController.deleteRating);

module.exports = router;
