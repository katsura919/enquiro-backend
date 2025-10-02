const express = require('express');
const router = express.Router();
const {
  getQRSettings,
  updateQRSettings,
  resetQRSettings
} = require('./qr-settings-controller');
const authMiddleware = require('../../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get QR settings for a business
router.get('/:businessId', getQRSettings);

// Update QR settings for a business
router.put('/:businessId', updateQRSettings);

// Reset QR settings to default
router.post('/:businessId/reset', resetQRSettings);

module.exports = router;