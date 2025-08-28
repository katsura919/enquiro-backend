
const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middleware/authMiddleware');
const { createProductValidation, updateProductValidation } = require('../../utils/validation/productValidation');
const handleValidationErrors = require('../../utils/validation/validationErrorHandler');
const { 
  createProduct, 
  getProducts, 
  getProductById, 
  getProductBySku,
  updateProduct, 
  deleteProduct, 
  searchProducts, 
  getProductCategories,
  getProductsByCategory,
  updateProductQuantity 
} = require('./product-controller');


// Create new Product
router.post('/', 
  authMiddleware,
  createProductValidation, 
  handleValidationErrors, 
  createProduct
);

// Get all Products for a business (with optional filters)
router.get('/business/:businessId', 
  authMiddleware,
  getProducts
);

// Search Products
router.get('/business/:businessId/search', 
  authMiddleware,
  searchProducts
);

// Get Product categories for a business
router.get('/business/:businessId/categories', 
  authMiddleware,
  getProductCategories
);

// Get Products by category
router.get('/business/:businessId/category/:category', 
  authMiddleware,
  getProductsByCategory
);

// Get Product by SKU
router.get('/business/:businessId/sku/:sku', 
  authMiddleware,
  getProductBySku
);

// Get single Product by ID
router.get('/:id', 
  authMiddleware,
  getProductById
);

// Update Product
router.put('/:id', 
  authMiddleware,
  updateProductValidation, 
  handleValidationErrors, 
  updateProduct
  );

// Update Product quantity only
router.patch('/:id/quantity', 
  authMiddleware,
  updateProductQuantity
);

// Delete Product
router.delete('/:id', 
  authMiddleware,
  deleteProduct
);

module.exports = router;
