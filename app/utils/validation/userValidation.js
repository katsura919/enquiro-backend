const { body } = require('express-validator');

// Validation rules for creating a user
const createUserValidation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .bail()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .bail()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .bail()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .bail()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('phoneNumber')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  body('profilePicture')
    .optional()
    .trim()
    .isURL()
    .withMessage('Profile picture must be a valid URL'),
  
  body('businessId')
    .optional()
    .isMongoId()
    .withMessage('Business ID must be a valid MongoDB ObjectId')
];

// Validation rules for updating a user
const updateUserValidation = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .bail()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .bail()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('email')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .bail()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .optional()
    .notEmpty()
    .withMessage('Password is required')
    .bail()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  body('phoneNumber')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  body('profilePicture')
    .optional()
    .trim()
    .isURL()
    .withMessage('Profile picture must be a valid URL'),
  
  body('businessId')
    .optional()
    .isMongoId()
    .withMessage('Business ID must be a valid MongoDB ObjectId')
];

module.exports = {
  createUserValidation,
  updateUserValidation
};
