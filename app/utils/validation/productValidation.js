const { body } = require('express-validator');

// Validation rules for creating a product
const createProductValidation = [
  body('businessId')
    .notEmpty()
    .withMessage('Business ID is required')
    .isMongoId()
    .withMessage('Business ID must be a valid MongoDB ObjectId'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .bail()
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),

  body('sku')
    .optional()
    .trim(),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),

  body('category')
    .optional()
    .trim(),

  body('price.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price amount must be a positive number'),

  body('price.currency')
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),

  body('quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

// Validation rules for updating a product (all fields optional)
const updateProductValidation = [
  body('businessId')
    .optional()
    .isMongoId()
    .withMessage('Business ID must be a valid MongoDB ObjectId'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .bail()
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),

  body('sku')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('SKU must be between 2 and 50 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),

  body('category')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category must be between 2 and 100 characters'),

  body('price.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price amount must be a positive number'),

  body('price.currency')
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),

  body('quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

module.exports = {
  createProductValidation,
  updateProductValidation
};
