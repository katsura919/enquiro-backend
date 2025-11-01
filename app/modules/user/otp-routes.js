const express = require("express");
const router = express.Router();
const otpController = require("./otp-controller");
const authMiddleware = require("../../middleware/authMiddleware");
const { createRateLimit } = require("../../middleware/rateLimit");

// Get OTP status
router.get("/status", authMiddleware, otpController.getOtpStatus);

// Send OTP for settings changes
router.post(
  "/send-settings-otp",
  authMiddleware,
  createRateLimit(
    3,
    60 * 1000,
    "Too many attempts, please try again in a minute."
  ),
  otpController.sendSettingsOtp
);

// Toggle OTP (enable/disable combined)
router.post(
  "/toggle",
  authMiddleware,
  createRateLimit(
    3,
    60 * 1000,
    "Too many attempts, please try again in a minute."
  ),
  otpController.toggleOtp
);

// Generate new backup codes
router.post(
  "/backup-codes",
  authMiddleware,
  createRateLimit(
      3,
      60 * 1000,
      "Too many attempts, please try again in a minute."
    ),
  otpController.generateNewBackupCodes
);

module.exports = router;
