const express = require('express');
const router = express.Router();
const escalationController = require('./escalation');

// Create an escalation
router.post('/', escalationController.createEscalation);

// Get all escalations for a business
router.get('/business/:businessId', escalationController.getEscalationsByBusiness);

// Get all escalations for a session
router.get('/session/:sessionId', escalationController.getEscalationsBySession);

// Get an escalation by ID
router.get('/:id', escalationController.getEscalationById);

// Update an escalation by ID
router.put('/:id', escalationController.updateEscalation);

// Update escalation status by ID
router.patch('/:id/status', escalationController.updateEscalationStatus);

// Delete an escalation by ID
router.delete('/:id', escalationController.deleteEscalation);

module.exports = router;
