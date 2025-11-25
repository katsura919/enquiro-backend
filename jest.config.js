module.exports = {
  testEnvironment: "node",
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "app/**/*.js",
    "!app/**/index.js",
    "!**/node_modules/**",
  ],
  testMatch: ["**/__tests__/**/*.test.js", "**/__tests__/**/*.spec.js"],
  coveragePathIgnorePatterns: ["/node_modules/", "/coverage/"],
  verbose: true,
  testTimeout: 10000,
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
};
