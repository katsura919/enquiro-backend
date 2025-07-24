const express = require('express');
const router = express.Router();
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
} = require('./product');

// Create new Product
router.post('/', createProduct);

// Get all Products for a business (with optional filters)
router.get('/business/:businessId', getProducts);

// Search Products
router.get('/business/:businessId/search', searchProducts);

// Get Product categories for a business
router.get('/business/:businessId/categories', getProductCategories);

// Get Products by category
router.get('/business/:businessId/category/:category', getProductsByCategory);

// Get Product by SKU
router.get('/business/:businessId/sku/:sku', getProductBySku);

// Get single Product by ID
router.get('/:id', getProductById);

// Update Product
router.put('/:id', updateProduct);

// Update Product quantity only
router.patch('/:id/quantity', updateProductQuantity);

// Delete Product
router.delete('/:id', deleteProduct);

module.exports = router;
