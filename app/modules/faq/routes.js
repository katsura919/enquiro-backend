const express = require('express');
const router = express.Router();
const { 
  createFAQ, 
  getFAQs, 
  getFAQById, 
  updateFAQ, 
  deleteFAQ, 
  searchFAQs, 
  getFAQCategories 
} = require('./faq');

// Create new FAQ
router.post('/', createFAQ);

// Get all FAQs for a business (with optional filters)
router.get('/business/:businessId', getFAQs);

// Search FAQs
router.get('/business/:businessId/search', searchFAQs);

// Get FAQ categories for a business
router.get('/business/:businessId/categories', getFAQCategories);

// Get single FAQ by ID
router.get('/:id', getFAQById);

// Update FAQ
router.put('/:id', updateFAQ);

// Delete FAQ
router.delete('/:id', deleteFAQ);

module.exports = router;
