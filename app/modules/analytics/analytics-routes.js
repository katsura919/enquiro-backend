const express = require('express');
const router = express.Router();
const analyticsController = require('./analytics-controller');

// Get average rating for a specific business
router.get('/business-ratings/:businessId/average', analyticsController.getBusinessAverageRating);

// Get count of escalated cases for a specific business
router.get('/escalations/:businessId/count', analyticsController.getEscalatedCount);

// Get escalations count per day for chart visualization
router.get('/escalations/:businessId/per-day', analyticsController.getEscalationsPerDay);

// Get total sessions count for a specific business
router.get('/sessions/:businessId/count', analyticsController.getSessionsCount);

// Get total agents count for a specific business
router.get('/agents/:businessId/count', analyticsController.getAgentsCount);

module.exports = router;
