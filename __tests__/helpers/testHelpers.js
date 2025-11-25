const jwt = require("jsonwebtoken");

/**
 * Generate a test JWT token
 * @param {Object} payload - The payload to encode in the token
 * @returns {string} The JWT token
 */
const generateTestToken = (
  payload = { id: "test-user-id", email: "test@example.com" }
) => {
  return jwt.sign(payload, process.env.JWT_SECRET || "test-jwt-secret-key", {
    expiresIn: process.env.JWT_EXPIRE || "1h",
  });
};

/**
 * Create a mock user object for testing
 * @param {Object} overrides - Properties to override in the default user
 * @returns {Object} Mock user object
 */
const createMockUser = (overrides = {}) => {
  return {
    _id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
    role: "user",
    ...overrides,
  };
};

/**
 * Create a mock agent object for testing
 * @param {Object} overrides - Properties to override in the default agent
 * @returns {Object} Mock agent object
 */
const createMockAgent = (overrides = {}) => {
  return {
    _id: "test-agent-id",
    email: "agent@example.com",
    name: "Test Agent",
    role: "agent",
    status: "active",
    ...overrides,
  };
};

module.exports = {
  generateTestToken,
  createMockUser,
  createMockAgent,
};
