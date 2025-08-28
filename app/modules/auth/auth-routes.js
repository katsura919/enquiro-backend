const express = require("express");
const userAuthController = require("./user-auth-controller");
const agentAuthController = require("./agent-auth-controller");
const router = express.Router();

// Register a new admin
router.post("/register", userAuthController.register);

// Admin login
router.post("/login", userAuthController.login);

// Confirm email
router.get("/confirm-email", userAuthController.confirmEmail);

// Agent login
router.post("/agent/login", agentAuthController.loginAgent);

module.exports = router;
