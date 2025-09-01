const { body, param } = require('express-validator');

// Validation for creating an escalation
const createEscalationValidation = 
[
  body('businessId')
  .notEmpty()
  .withMessage('businessId is required'),
  body('sessionId')
  .notEmpty()
  .withMessage('sessionId is required'),
  body('customerName')
  .notEmpty()
  .withMessage('customerName is required'),
  body('customerEmail')
  .isEmail()
  .withMessage('Valid customerEmail is required'),
  body('concern')
  .optional()
  .isString(),
  body('customerPhone')
  .optional()
  .isString(),
  body('description')
  .optional()
  .isString(),
];

// Validation for updating an escalation
const updateEscalationValidation = 
[
  param('id')
  .isMongoId()
  .withMessage('Valid escalation id is required'),
  body('caseNumber')
  .optional()
  .isString(),
  body('customerName')
  .optional()
  .isString(),
  body('customerEmail')
  .optional()
  .isEmail(),
  body('customerPhone')
  .optional()
  .isString(),
  body('concern')
  .optional()
  .isString(),
  body('description')
  .optional()
  .isString(),
  body('caseOwner')
  .optional()
  .isString(),
];


module.exports = {
  createEscalationValidation,
  updateEscalationValidation
};
