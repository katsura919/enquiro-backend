
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authMiddleware');
const { createPolicyValidation, updatePolicyValidation } = require('../../utils/validation/policyValidation');
const handleValidationErrors = require('../../utils/validation/validationErrorHandler');
const { 
  createPolicy, 
  getPolicies, 
  getPolicyById, 
  updatePolicy, 
  deletePolicy, 
  searchPolicies, 
  getPolicyTypes,
  getPolicyByType 
} = require('./policy');


// Create new Policy
router.post('/', 
  authMiddleware,
  createPolicyValidation, 
  handleValidationErrors, 
  createPolicy
);

// Get all Policies for a business (with optional filters)
router.get('/business/:businessId', 
  authMiddleware,
  getPolicies
);

// Search Policies
router.get('/business/:businessId/search', 
  authMiddleware,
  searchPolicies
);

// Get Policy types for a business
router.get('/business/:businessId/types', 
  authMiddleware,
  getPolicyTypes
);

// Get Policy by type (e.g., privacy, terms, refund)
router.get('/business/:businessId/type/:type', 
  authMiddleware,
  getPolicyByType
);

// Get single Policy by ID
router.get('/:id', 
  authMiddleware,
  getPolicyById
);

// Update Policy
router.put('/:id', 
  authMiddleware,
  updatePolicyValidation, 
  handleValidationErrors, 
  updatePolicy
);

// Delete Policy
router.delete('/:id', 
  authMiddleware,
  deletePolicy
);

module.exports = router;
