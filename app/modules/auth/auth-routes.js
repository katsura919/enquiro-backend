const express = require("express");
const userAuthController = require("./user-auth-controller");
const agentAuthController = require("./agent-auth-controller");
const { createRateLimit } = require("../../middleware/rateLimit");
const router = express.Router();

// Rate limiter for admin login - 3 attempts per minute
const adminLoginRateLimit = createRateLimit(
  3,
  60 * 1000,
  "Too many login attempts, please try again in a minute."
);

// Register a new admin (sends verification code)
router.post("/register", userAuthController.register);

// Verify code only (don't complete registration)
router.post("/verify-code", userAuthController.verifyCodeOnly);

// Complete registration (after terms acceptance)
router.post("/complete-registration", userAuthController.completeRegistration);

// Resend verification code
router.post("/resend-code", userAuthController.resendVerificationCode);

// Admin login
router.post(
  "/login",
  createRateLimit(
    3,
    60 * 1000,
    "Too many login attempts, please try again in a minute."
  ),
  userAuthController.login
);

// OTP verification for login
router.post("/verify-login-otp", userAuthController.verifyLoginOtp);

// Resend OTP for login
router.post("/resend-login-otp", userAuthController.resendLoginOtp);

// Confirm email (legacy - for existing token-based confirmations)
router.get("/confirm-email", userAuthController.confirmEmail);

// Agent login
router.post("/agent/login", agentAuthController.loginAgent);

module.exports = router;
