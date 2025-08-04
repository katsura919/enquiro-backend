const { body } = require('express-validator');

// Validation rules for creating a policy
const createPolicyValidation = [
  body('businessId')
    .notEmpty()
    .withMessage('Business ID is required')
    .bail()
    .isMongoId()
    .withMessage('Business ID must be a valid MongoDB ObjectId'),

  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .bail()
    .isLength({ min: 2, max: 200 })
    .withMessage('Title must be between 2 and 200 characters'),

  body('content')
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .bail()
    .isLength({ min: 2 })
    .withMessage('Content must be at least 2 characters'),

  body('type')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Type must be at most 100 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array of strings'),
  body('tags.*')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Each tag must be a string up to 50 characters'),
];

// Validation rules for updating a policy (all fields optional)
const updatePolicyValidation = [
  body('businessId')
    .optional()
    .isMongoId()
    .withMessage('Business ID must be a valid MongoDB ObjectId'),

  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .bail()
    .isLength({ min: 2, max: 200 })
    .withMessage('Title must be between 2 and 200 characters'),

  body('content')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Content is required')
    .bail()
    .isLength({ min: 2 })
    .withMessage('Content must be at least 2 characters'),

  body('type')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Type must be at most 100 characters'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array of strings'),
  body('tags.*')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Each tag must be a string up to 50 characters'),
];

module.exports = {
  createPolicyValidation,
  updatePolicyValidation
};
