const express = require('express');
const router = express.Router();
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
router.post('/', createPolicy);

// Get all Policies for a business (with optional filters)
router.get('/business/:businessId', getPolicies);

// Search Policies
router.get('/business/:businessId/search', searchPolicies);

// Get Policy types for a business
router.get('/business/:businessId/types', getPolicyTypes);

// Get Policy by type (e.g., privacy, terms, refund)
router.get('/business/:businessId/type/:type', getPolicyByType);

// Get single Policy by ID
router.get('/:id', getPolicyById);

// Update Policy
router.put('/:id', updatePolicy);

// Delete Policy
router.delete('/:id', deletePolicy);

module.exports = router;
