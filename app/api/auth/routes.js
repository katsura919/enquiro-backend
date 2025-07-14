const express = require("express");
const authController = require("./auth");

const router = express.Router();

// Register a new admin
router.post("/register", authController.register);

// Admin login
router.post("/login", authController.login);

// Confirm email
router.get("/confirm-email", authController.confirmEmail);

module.exports = router;
