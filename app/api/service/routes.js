const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authMiddleware');
const {
  createServiceValidation,
  updateServiceValidation
} = require('../../utils/validation/serviceValidation');
const handleValidationErrors = require('../../utils/validation/validationErrorHandler');
const { 
  createService, 
  getServices, 
  getServiceById, 
  updateService, 
  deleteService, 
  searchServices, 
  getServiceCategories,
  getServicesByCategory 
} = require('./service');

// Create new Service
router.post('/', 
  authMiddleware,
  createServiceValidation,
  handleValidationErrors,
  createService
);

// Get all Services for a business
router.get('/business/:businessId', 
  authMiddleware,
  getServices
);

// Search Services
router.get('/business/:businessId/search', 
  authMiddleware,
  searchServices
);

// Get Service categories for a business
router.get('/business/:businessId/categories', 
  authMiddleware,
  getServiceCategories
);

// Get Services by category
router.get('/business/:businessId/category/:category', 
  authMiddleware,
  getServicesByCategory
);

// Get single Service by ID
router.get('/:id', 
  authMiddleware,
  getServiceById
);

// Update Service
router.put('/:id', 
  authMiddleware,
  updateServiceValidation,
  handleValidationErrors,
  updateService
);

// Delete Service
router.delete('/:id', 
  authMiddleware,
  deleteService
);

module.exports = router;
