const express = require('express');
const router = express.Router();
const {
  getActivitiesByEscalation,
  getActivitiesByEscalationPaginated,
  getActivityById,
  createActivity,
  deleteActivity
} = require('../controllers/activityController');

// Get all activities for a specific escalation
router.get('/escalation/:escalationId', getActivitiesByEscalation);

// Get all activities for a specific escalation with pagination
router.get('/escalation/:escalationId/paginated', getActivitiesByEscalationPaginated);

// Get a specific activity by ID
router.get('/:id', getActivityById);

// Create a manual activity log
router.post('/', createActivity);

// Delete an activity by ID
router.delete('/:id', deleteActivity);

module.exports = router;
