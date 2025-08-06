const express = require('express');
const router = express.Router();
const sessionController = require('./session');

// Create a session
router.post('/', sessionController.createSession);

// Get all sessions for a business
router.get('/business/:businessId', sessionController.getSessionsByBusiness);

// Get a session by ID
router.get('/:id', sessionController.getSessionById);

// Update a session by ID
router.put('/:id', sessionController.updateSession);

// Delete a session by ID
router.delete('/:id', sessionController.deleteSession);

module.exports = router;
