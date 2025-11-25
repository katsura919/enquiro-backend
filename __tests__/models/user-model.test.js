const mongoose = require("mongoose");
const { connect, closeDatabase, clearDatabase } = require("../helpers/db");
const User = require("../../app/models/user-model");

describe("User Model Test", () => {
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("User Schema Validation", () => {
    test("should create a user successfully with valid data", async () => {
      const validUser = {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        password: "hashedPassword123",
        phoneNumber: "+1234567890",
      };

      const user = new User(validUser);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.firstName).toBe(validUser.firstName);
      expect(savedUser.lastName).toBe(validUser.lastName);
      expect(savedUser.email).toBe(validUser.email);
      expect(savedUser.isVerified).toBe(false); // default value
    });

    test("should fail to create user without required fields", async () => {
      const userWithoutRequiredFields = new User({
        firstName: "John",
      });

      let err;
      try {
        await userWithoutRequiredFields.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.lastName).toBeDefined();
      expect(err.errors.email).toBeDefined();
      expect(err.errors.password).toBeDefined();
    });

    test("should fail to create user with duplicate email", async () => {
      const userData = {
        firstName: "John",
        lastName: "Doe",
        email: "duplicate@example.com",
        password: "password123",
      };

      await User.create(userData);

      let err;
      try {
        await User.create(userData);
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.code).toBe(11000); // Duplicate key error code
    });

    test("should set default values correctly", async () => {
      const user = new User({
        firstName: "Jane",
        lastName: "Smith",
        email: "jane.smith@example.com",
        password: "password123",
      });

      const savedUser = await user.save();

      expect(savedUser.isVerified).toBe(false);
      expect(savedUser.otpEnabled).toBe(false);
    });

    test("should accept optional fields", async () => {
      const userWithOptionalFields = {
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@example.com",
        password: "password123",
        phoneNumber: "+9876543210",
        profilePicture: "https://example.com/avatar.jpg",
        otpEnabled: true,
      };

      const user = new User(userWithOptionalFields);
      const savedUser = await user.save();

      expect(savedUser.phoneNumber).toBe(userWithOptionalFields.phoneNumber);
      expect(savedUser.profilePicture).toBe(
        userWithOptionalFields.profilePicture
      );
      expect(savedUser.otpEnabled).toBe(true);
    });
  });

  describe("User Query Operations", () => {
    test("should find user by email", async () => {
      const userData = {
        firstName: "Bob",
        lastName: "Williams",
        email: "bob@example.com",
        password: "password123",
      };

      await User.create(userData);
      const foundUser = await User.findOne({ email: "bob@example.com" });

      expect(foundUser).toBeDefined();
      expect(foundUser.firstName).toBe(userData.firstName);
      expect(foundUser.email).toBe(userData.email);
    });

    test("should update user data", async () => {
      const user = await User.create({
        firstName: "Charlie",
        lastName: "Brown",
        email: "charlie@example.com",
        password: "password123",
      });

      user.isVerified = true;
      user.phoneNumber = "+1122334455";
      const updatedUser = await user.save();

      expect(updatedUser.isVerified).toBe(true);
      expect(updatedUser.phoneNumber).toBe("+1122334455");
    });

    test("should delete user", async () => {
      const user = await User.create({
        firstName: "David",
        lastName: "Miller",
        email: "david@example.com",
        password: "password123",
      });

      await User.deleteOne({ _id: user._id });
      const deletedUser = await User.findById(user._id);

      expect(deletedUser).toBeNull();
    });
  });
});
