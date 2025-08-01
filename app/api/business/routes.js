const express = require('express');
const router = express.Router();
const businessController = require('./business');

// Create a business
router.post('/', businessController.createBusiness);

// Get all businesses
router.get('/', businessController.getBusinesses);

// Get business by slug
router.get('/slug/:slug', businessController.getBusinessBySlug);

// Get a business by ID
router.get('/:id', businessController.getBusinessById);

// Update a business by ID
router.put('/:id', businessController.updateBusiness);

// Delete a business by ID
router.delete('/:id', businessController.deleteBusiness);

module.exports = router;
