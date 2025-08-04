const { body } = require('express-validator');

// Validation rules for creating a business
const createBusinessValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Business name is required')
    .bail()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),

  body('slug')
    .trim()
    .notEmpty()
    .withMessage('Slug is required')
    .bail()
    .isSlug()
    .withMessage('Slug must be a valid slug (letters, numbers, dashes)'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),

  body('logo')
    .optional()
    .trim()
    .isURL()
    .withMessage('Logo must be a valid URL'),

  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must be at most 100 characters'),

  body('address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address must be at most 200 characters'),
];

// Validation rules for updating a business (all fields optional)
const updateBusinessValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Business name is required')
    .bail()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),

  body('slug')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Slug is required')
    .bail()
    .isSlug()
    .withMessage('Slug must be a valid slug (letters, numbers, dashes)'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters'),

  body('logo')
    .optional()
    .trim()
    .isURL()
    .withMessage('Logo must be a valid URL'),

  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Category must be at most 100 characters'),

  body('address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address must be at most 200 characters'),
];

module.exports = {
  createBusinessValidation,
  updateBusinessValidation
};
