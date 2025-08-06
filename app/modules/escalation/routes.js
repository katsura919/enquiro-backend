const express = require('express');
const router = express.Router();
const escalationController = require('./escalation');
const authMiddleware = require('../../middleware/authMiddleware');
const {
  createEscalationValidation,
  updateEscalationValidation,
} = require('../../utils/validation/escalationValidation');
const handleValidationErrors = require('../../utils/validation/validationErrorHandler');
const { body, param } = require('express-validator');


// Create an escalation
router.post('/', 
    createEscalationValidation, 
    handleValidationErrors, 
    escalationController.createEscalation
);

// Get all escalations for a business
router.get('/business/:businessId', 
    authMiddleware,
    escalationController.getEscalationsByBusiness
);

// Count escalations for a business
router.get('/business/:businessId/count', 
    authMiddleware,
    escalationController.countEscalationsByBusiness
);

// Get all escalations for a session
router.get('/session/:sessionId', 
    authMiddleware,
    escalationController.getEscalationsBySession
);

// Get an escalation by ID
router.get('/:id', 
    authMiddleware,
    escalationController.getEscalationById
);

// Update an escalation by ID
router.patch('/:id', 
    authMiddleware,
    updateEscalationValidation, 
    handleValidationErrors, 
    escalationController.updateEscalation
);

// Update escalation status by ID

router.patch('/:id/status', 
    authMiddleware,
    escalationController.updateEscalationStatus
);

// Update case owner by escalation ID
router.patch(
  '/:id/case-owner',
  authMiddleware,
  [
    body('caseOwner').isMongoId().withMessage('Valid agent id is required')
  ],
  handleValidationErrors,
  escalationController.updateCaseOwner
);

// Delete an escalation by ID
router.delete('/:id', 
    authMiddleware,
    escalationController.deleteEscalation
);

module.exports = router;
