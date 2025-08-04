
const express = require('express');
const router = express.Router();
const businessController = require('./business');
const authMiddleware = require('../../middleware/authMiddleware');
const { createBusinessValidation, updateBusinessValidation } = require('../../utils/validation/businessValidation');
const handleValidationErrors = require('../../utils/validation/validationErrorHandler');

// Create a business
router.post('/', 
    authMiddleware,
    createBusinessValidation, 
    handleValidationErrors, 
    businessController.createBusiness
);

// Get all businesses
router.get('/', 
    authMiddleware,
    businessController.getBusinesses);

// Get business by slug
router.get('/slug/:slug', 
    authMiddleware,
    businessController.getBusinessBySlug);

// Get a business by ID
router.get('/:id', 
    authMiddleware,
    businessController.getBusinessById);

// Update a business by ID
router.put('/:id', 
    authMiddleware,
    updateBusinessValidation,
    handleValidationErrors,
    businessController.updateBusiness
);

// Delete a business by ID
router.delete('/:id', 
    authMiddleware,
    businessController.deleteBusiness
);

module.exports = router;
