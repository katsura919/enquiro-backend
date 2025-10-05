const express = require("express");
const userAuthController = require("./user-auth-controller");
const agentAuthController = require("./agent-auth-controller");
const router = express.Router();

// Register a new admin (sends verification code)
router.post("/register", userAuthController.register);

// Verify code only (don't complete registration)
router.post("/verify-code", userAuthController.verifyCodeOnly);

// Complete registration (after terms acceptance)
router.post("/complete-registration", userAuthController.completeRegistration);

// Resend verification code
router.post("/resend-code", userAuthController.resendVerificationCode);

// Admin login
router.post("/login", userAuthController.login);

// Confirm email (legacy - for existing token-based confirmations)
router.get("/confirm-email", userAuthController.confirmEmail);

// Agent login
router.post("/agent/login", agentAuthController.loginAgent);

module.exports = router;
