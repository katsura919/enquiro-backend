const express = require('express');
const router = express.Router();
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
router.post('/', createService);

// Get all Services for a business (with optional filters)
router.get('/business/:businessId', getServices);

// Search Services
router.get('/business/:businessId/search', searchServices);

// Get Service categories for a business
router.get('/business/:businessId/categories', getServiceCategories);

// Get Services by category
router.get('/business/:businessId/category/:category', getServicesByCategory);

// Get single Service by ID
router.get('/:id', getServiceById);

// Update Service
router.put('/:id', updateService);

// Delete Service
router.delete('/:id', deleteService);

module.exports = router;
