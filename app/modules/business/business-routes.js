
const express = require('express');
const router = express.Router();
const businessController = require('./business-controller');
const authMiddleware = require('../../middleware/authMiddleware');
const { createBusinessValidation, updateBusinessValidation } = require('../../utils/validation/businessValidation');
const handleValidationErrors = require('../../utils/validation/validationErrorHandler');
const { upload } = require('../../services/fileUploadService');

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
    businessController.getBusinessBySlug);

// Upload business logo
router.post('/:id/logo',
    authMiddleware,
    upload.single('logo'),
    businessController.uploadLogo
);

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
