const { body } = require('express-validator');

// Validation rules for creating a service
const createServiceValidation = [
  body('businessId')
    .notEmpty()
    .withMessage('Business ID is required')
    .isMongoId()
    .withMessage('Business ID must be a valid MongoDB ObjectId'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Service name is required')
    .bail()
    .isLength({ min: 2, max: 100 })
    .withMessage('Service name must be between 2 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),

  body('category')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category must be between 2 and 100 characters'),

  body('pricing.type')
    .notEmpty()
    .withMessage('Pricing type is required')
    .isIn(['fixed', 'hourly', 'package', 'quote'])
    .withMessage('Pricing type must be one of: fixed, hourly, package, quote'),

  body('pricing.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Pricing amount must be a positive number'),

  body('pricing.currency')
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),

  body('duration')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Duration must be at most 100 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

// Validation rules for updating a service (all fields optional)
const updateServiceValidation = [
  body('businessId')
    .optional()
    .isMongoId()
    .withMessage('Business ID must be a valid MongoDB ObjectId'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Service name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Service name must be between 2 and 100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),

  body('category')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Category must be between 2 and 100 characters'),

  body('pricing.type')
    .optional()
    .isIn(['fixed', 'hourly', 'package', 'quote'])
    .withMessage('Pricing type must be one of: fixed, hourly, package, quote'),

  body('pricing.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Pricing amount must be a positive number'),

  body('pricing.currency')
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),

  body('duration')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Duration must be at most 100 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

module.exports = {
  createServiceValidation,
  updateServiceValidation
};
