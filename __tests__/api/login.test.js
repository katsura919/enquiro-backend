const request = require("supertest");
const express = require("express");
const bcrypt = require("bcryptjs");
const { connect, closeDatabase, clearDatabase } = require("../helpers/db");
const User = require("../../app/models/user-model");
const Business = require("../../app/models/business-model");

// Mock email services to avoid sending actual emails during tests
jest.mock("../../app/services/verificationCodeService", () => ({
  sendVerificationCode: jest.fn(),
  generateVerificationCode: jest.fn(() => "123456"),
}));

jest.mock("../../app/services/otpService", () => ({
  sendOtpEmail: jest.fn(),
  generateOtpCode: jest.fn(() => "123456"),
}));

// Mock rate limiter to avoid rate limiting in tests
jest.mock("../../app/middleware/rateLimit", () => ({
  createRateLimit: jest.fn(() => (req, res, next) => next()),
}));

// Import after mocking
const authRoutes = require("../../app/modules/auth/auth-routes");

describe("Auth API - Login Integration Tests", () => {
  let app;
  let testBusiness;
  let testUser;

  beforeAll(async () => {
    await connect();

    // Setup Express app for testing
    app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
  });

  beforeEach(async () => {
    // Create a test business
    testBusiness = await Business.create({
      name: "Test Business",
      slug: "test-business",
      description: "A test business",
      category: "Technology",
    });

    // Create a verified test user
    const hashedPassword = await bcrypt.hash("Password123!", 10);
    testUser = await User.create({
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      password: hashedPassword,
      phoneNumber: "+1234567890",
      businessId: testBusiness._id,
      isVerified: true,
      otpEnabled: false,
    });
  });

  afterEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("POST /api/auth/login", () => {
    test("should login successfully with valid credentials", async () => {
      const loginData = {
        email: "john.doe@example.com",
        password: "Password123!",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toMatchObject({
        email: "john.doe@example.com",
        firstName: "John",
        lastName: "Doe",
        isVerified: true,
      });
      expect(response.body.user.id).toBeDefined();
    });

    test("should return 400 for non-existent user", async () => {
      const loginData = {
        email: "nonexistent@example.com",
        password: "Password123!",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toBe("Invalid email or password");
    });

    test("should return 400 for incorrect password", async () => {
      const loginData = {
        email: "john.doe@example.com",
        password: "WrongPassword123!",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toBe("Invalid email or password");
    });

    test("should return 400 for unverified user", async () => {
      // Create an unverified user
      const hashedPassword = await bcrypt.hash("Password123!", 10);
      await User.create({
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
        password: hashedPassword,
        businessId: testBusiness._id,
        isVerified: false,
      });

      const loginData = {
        email: "jane.smith@example.com",
        password: "Password123!",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toBe(
        "Please verify your email before logging in"
      );
      expect(response.body.requiresVerification).toBe(true);
    });

    test("should require OTP when OTP is enabled for user", async () => {
      // Update user to enable OTP
      testUser.otpEnabled = true;
      await testUser.save();

      const loginData = {
        email: "john.doe@example.com",
        password: "Password123!",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty("requiresOtp", true);
      expect(response.body).toHaveProperty("message", "OTP sent to your email");
      expect(response.body).toHaveProperty("email", "john.doe@example.com");
      expect(response.body).not.toHaveProperty("token"); // Should not return token yet
    });

    test("should return 400 when email is missing", async () => {
      const loginData = {
        password: "Password123!",
      };

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    test("should return 500 when password is missing (controller error handling)", async () => {
      // Suppress console.error for this test since we're intentionally causing an error
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const loginData = {
        email: "john.doe@example.com",
      };

      // The controller doesn't validate missing password, so it returns 500
      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(500);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toBe("An error occurred during login");

      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
  });
});
