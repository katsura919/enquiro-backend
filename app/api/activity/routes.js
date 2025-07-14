const express = require('express');
const router = express.Router();
const activityController = require('./activity');

// Get all activities for a specific escalation
router.get('/escalation/:escalationId', activityController.getActivitiesByEscalation);

// Get all activities for a specific escalation with pagination
router.get('/escalation/:escalationId/paginated', activityController.getActivitiesByEscalationPaginated);

// Get a specific activity by ID
router.get('/:id', activityController.getActivityById);

// Create a manual activity log
router.post('/', activityController.createActivity);

// Delete an activity by ID
router.delete('/:id', activityController.deleteActivity);

module.exports = router;
