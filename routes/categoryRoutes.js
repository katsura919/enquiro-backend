const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// Create a category
router.post('/', categoryController.createCategory);

// Get all categories for a business
router.get('/business/:businessId', categoryController.getCategoriesByBusiness);

// Get a category by ID
router.get('/:id', categoryController.getCategoryById);

// Update a category by ID
router.put('/:id', categoryController.updateCategory);

// Delete a category by ID
router.delete('/:id', categoryController.deleteCategory);

module.exports = router; 