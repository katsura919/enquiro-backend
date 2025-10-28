const rateLimit = require("express-rate-limit");

/**
 * Creates a rate limit middleware with configurable attempts
 * @param {number} maxAttempts - Maximum number of requests allowed per window
 * @param {number} windowMs - Time window in milliseconds (default: 15 minutes)
 * @param {string} message - Custom error message (optional)
 * @returns {Function} Express middleware function
 */
const createRateLimit = (
  maxAttempts,
  windowMs = 15 * 60 * 1000,
  message = null
) => {
  if (!maxAttempts || typeof maxAttempts !== "number" || maxAttempts <= 0) {
    throw new Error("maxAttempts must be a positive number");
  }

  return rateLimit({
    windowMs: windowMs,
    max: maxAttempts,
    message: message || {
      error: "Too many requests",
      message: `Too many requests from this IP, please try again after ${
        windowMs / 60000
      } minutes.`,
      retryAfter: Math.ceil(windowMs / 1000),
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
      res.status(429).json({
        error: "Too many requests",
        message:
          message ||
          `Too many requests from this IP, please try again after ${
            windowMs / 60000
          } minutes.`,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
    skip: (req) => {
      // Skip rate limiting for certain conditions if needed
      // You can customize this based on your requirements
      return false;
    },
    keyGenerator: (req) => {
      // Generate key based on IP address
      return req.ip;
    },
  });
};

/**
 * Predefined rate limiters for common use cases
 */
const rateLimiters = {
  // Strict rate limiter - 5 attempts per 15 minutes
  strict: createRateLimit(5),

  // Moderate rate limiter - 10 attempts per 15 minutes
  moderate: createRateLimit(10),

  // Lenient rate limiter - 20 attempts per 15 minutes
  lenient: createRateLimit(20),

  // Auth rate limiter - 5 attempts per 15 minutes for login/register
  auth: createRateLimit(
    5,
    15 * 60 * 1000,
    "Too many authentication attempts, please try again later."
  ),

  // API rate limiter - 100 requests per 15 minutes
  api: createRateLimit(100),

  // Password reset rate limiter - 3 attempts per hour
  passwordReset: createRateLimit(
    3,
    60 * 60 * 1000,
    "Too many password reset attempts, please try again in an hour."
  ),
};

module.exports = {
  createRateLimit,
  rateLimiters,
};
