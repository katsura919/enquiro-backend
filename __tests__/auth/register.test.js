const request = require("supertest");
const express = require("express");
const bcrypt = require("bcryptjs");
const { connect, closeDatabase, clearDatabase } = require("../helpers/db");
const User = require("../../app/models/user-model");
const Business = require("../../app/models/business-model");
const TempRegistration = require("../../app/models/temp-registration-model");

// Mock email services to avoid sending actual emails during tests
const mockSendVerificationCode = jest.fn();
const mockGenerateVerificationCode = jest.fn(() => "123456");

jest.mock("../../app/services/verificationCodeService", () => ({
  sendVerificationCode: mockSendVerificationCode,
  generateVerificationCode: mockGenerateVerificationCode,
}));

// Mock rate limiter
jest.mock("../../app/middleware/rateLimit", () => ({
  createRateLimit: jest.fn(() => (req, res, next) => next()),
}));

// Import after mocking
const authRoutes = require("../../app/modules/auth/auth-routes");

describe("Auth API - Register Integration Tests", () => {
  let app;

  beforeAll(async () => {
    await connect();

    // Setup Express app for testing
    app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
  });

  afterEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("POST /api/auth/register", () => {
    const validRegistrationData = {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      password: "Password123!",
      phoneNumber: "+1234567890",
      businessName: "Test Business",
      description: "A test business description",
      category: "Technology",
      address: "123 Test Street, Test City",
    };

    test("should register a new user successfully", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send(validRegistrationData)
        .expect(200);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("Verification code sent");
      expect(response.body).toHaveProperty(
        "email",
        validRegistrationData.email
      );
      expect(response.body).toHaveProperty("expiresIn", "30 minutes");

      // Verify temp registration was created
      const tempReg = await TempRegistration.findOne({
        email: validRegistrationData.email,
      });
      expect(tempReg).toBeDefined();
      expect(tempReg.firstName).toBe(validRegistrationData.firstName);
      expect(tempReg.lastName).toBe(validRegistrationData.lastName);
      expect(tempReg.businessName).toBe(validRegistrationData.businessName);
      expect(tempReg.verificationCode).toBe("123456");

      // Verify password was hashed
      const isPasswordHashed = await bcrypt.compare(
        validRegistrationData.password,
        tempReg.password
      );
      expect(isPasswordHashed).toBe(true);

      // Verify email service was called
      expect(mockSendVerificationCode).toHaveBeenCalledWith(
        validRegistrationData.email,
        validRegistrationData.firstName,
        "123456"
      );
    });

    test("should return 400 if email is already registered", async () => {
      // Create an existing user
      const business = await Business.create({
        name: "Existing Business",
        slug: "existing-business",
        category: "Technology",
      });

      await User.create({
        firstName: "Existing",
        lastName: "User",
        email: validRegistrationData.email,
        password: await bcrypt.hash("password", 10),
        businessId: business._id,
        isVerified: true,
      });

      const response = await request(app)
        .post("/api/auth/register")
        .send(validRegistrationData)
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toBe("Email already registered");

      // Verify no temp registration was created
      const tempReg = await TempRegistration.findOne({
        email: validRegistrationData.email,
      });
      expect(tempReg).toBeNull();
    });

    test("should replace existing temp registration if user re-registers", async () => {
      // Create an initial temp registration
      await TempRegistration.create({
        firstName: "Old",
        lastName: "Name",
        email: validRegistrationData.email,
        password: "oldhashedpassword",
        businessName: "Old Business",
        verificationCode: "999999",
      });

      const response = await request(app)
        .post("/api/auth/register")
        .send(validRegistrationData)
        .expect(200);

      // Verify only one temp registration exists with new data
      const tempRegs = await TempRegistration.find({
        email: validRegistrationData.email,
      });
      expect(tempRegs).toHaveLength(1);
      expect(tempRegs[0].firstName).toBe(validRegistrationData.firstName);
      expect(tempRegs[0].businessName).toBe(validRegistrationData.businessName);
      expect(tempRegs[0].verificationCode).toBe("123456");
    });

    test("should handle registration with optional fields", async () => {
      const minimalData = {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
        password: "Password123!",
        businessName: "Minimal Business",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(minimalData)
        .expect(200);

      expect(response.body.message).toContain("Verification code sent");

      const tempReg = await TempRegistration.findOne({
        email: minimalData.email,
      });
      expect(tempReg).toBeDefined();
      expect(tempReg.firstName).toBe(minimalData.firstName);
      expect(tempReg.businessName).toBe(minimalData.businessName);
    });

    test("should include all business information in temp registration", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send(validRegistrationData)
        .expect(200);

      const tempReg = await TempRegistration.findOne({
        email: validRegistrationData.email,
      });

      expect(tempReg.description).toBe(validRegistrationData.description);
      expect(tempReg.category).toBe(validRegistrationData.category);
      expect(tempReg.address).toBe(validRegistrationData.address);
    });

    test("should generate new verification code for each registration", async () => {
      mockGenerateVerificationCode
        .mockReturnValueOnce("111111")
        .mockReturnValueOnce("222222");

      // First registration
      await request(app)
        .post("/api/auth/register")
        .send(validRegistrationData)
        .expect(200);

      await clearDatabase();

      // Second registration
      await request(app)
        .post("/api/auth/register")
        .send({
          ...validRegistrationData,
          email: "different@example.com",
        })
        .expect(200);

      expect(mockGenerateVerificationCode).toHaveBeenCalledTimes(2);
    });
  });
});
