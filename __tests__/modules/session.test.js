const mongoose = require("mongoose");
const { connect, closeDatabase, clearDatabase } = require("../helpers/db");
const Session = require("../../app/models/session-model");
const Business = require("../../app/models/business-model");

describe("Session Model Test", () => {
  let testBusiness;

  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
    // Create test business
    testBusiness = await Business.create({
      name: "Test Business",
      slug: "test-business",
      category: "Technology",
    });
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("Session Schema Validation", () => {
    test("should create a session successfully with valid data", async () => {
      const validSession = {
        businessId: testBusiness._id,
        customerDetails: {
          name: "John Customer",
          email: "john@example.com",
          phoneNumber: "+1234567890",
        },
      };

      const session = new Session(validSession);
      const savedSession = await session.save();

      expect(savedSession._id).toBeDefined();
      expect(savedSession.businessId.toString()).toBe(
        testBusiness._id.toString()
      );
      expect(savedSession.customerDetails.name).toBe(
        validSession.customerDetails.name
      );
      expect(savedSession.customerDetails.email).toBe(
        validSession.customerDetails.email
      );
      expect(savedSession.customerDetails.phoneNumber).toBe(
        validSession.customerDetails.phoneNumber
      );
      expect(savedSession.createdAt).toBeDefined();
      expect(savedSession.updatedAt).toBeDefined();
    });

    test("should fail to create session without required businessId", async () => {
      const sessionWithoutBusinessId = new Session({
        customerDetails: {
          name: "John Customer",
          email: "john@example.com",
        },
      });

      let err;
      try {
        await sessionWithoutBusinessId.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.businessId).toBeDefined();
    });

    test("should create session with only required businessId field", async () => {
      const minimalSession = {
        businessId: testBusiness._id,
      };

      const session = new Session(minimalSession);
      const savedSession = await session.save();

      expect(savedSession._id).toBeDefined();
      expect(savedSession.businessId.toString()).toBe(
        testBusiness._id.toString()
      );
      expect(savedSession.customerDetails).toBeDefined();
      expect(savedSession.customerDetails.name).toBeUndefined();
      expect(savedSession.customerDetails.email).toBeUndefined();
      expect(savedSession.customerDetails.phoneNumber).toBeUndefined();
    });

    test("should create session with partial customer details", async () => {
      const sessionWithPartialDetails = {
        businessId: testBusiness._id,
        customerDetails: {
          name: "Jane Customer",
          email: "jane@example.com",
          // phoneNumber omitted
        },
      };

      const session = new Session(sessionWithPartialDetails);
      const savedSession = await session.save();

      expect(savedSession.customerDetails.name).toBe("Jane Customer");
      expect(savedSession.customerDetails.email).toBe("jane@example.com");
      expect(savedSession.customerDetails.phoneNumber).toBeUndefined();
    });

    test("should create session with only customer name", async () => {
      const session = await Session.create({
        businessId: testBusiness._id,
        customerDetails: {
          name: "Anonymous Customer",
        },
      });

      expect(session.customerDetails.name).toBe("Anonymous Customer");
      expect(session.customerDetails.email).toBeUndefined();
      expect(session.customerDetails.phoneNumber).toBeUndefined();
    });

    test("should create session with only customer email", async () => {
      const session = await Session.create({
        businessId: testBusiness._id,
        customerDetails: {
          email: "email-only@example.com",
        },
      });

      expect(session.customerDetails.email).toBe("email-only@example.com");
      expect(session.customerDetails.name).toBeUndefined();
      expect(session.customerDetails.phoneNumber).toBeUndefined();
    });
  });

  describe("Session Timestamps", () => {
    test("should automatically set createdAt and updatedAt timestamps", async () => {
      const session = await Session.create({
        businessId: testBusiness._id,
        customerDetails: {
          name: "Timestamp Test Customer",
          email: "timestamp@example.com",
        },
      });

      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
      expect(session.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
      expect(session.updatedAt.getTime()).toBeLessThanOrEqual(Date.now());
    });

    test("should update updatedAt timestamp on modification", async () => {
      const session = await Session.create({
        businessId: testBusiness._id,
        customerDetails: {
          name: "Update Test",
        },
      });

      const originalUpdatedAt = session.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      session.customerDetails.email = "updated@example.com";
      await session.save();

      expect(session.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });

    test("should not change createdAt on update", async () => {
      const session = await Session.create({
        businessId: testBusiness._id,
        customerDetails: {
          name: "CreatedAt Test",
        },
      });

      const originalCreatedAt = session.createdAt;

      session.customerDetails.phoneNumber = "+9876543210";
      await session.save();

      expect(session.createdAt.getTime()).toBe(originalCreatedAt.getTime());
    });
  });

  describe("Session Query Operations", () => {
    test("should find sessions by businessId", async () => {
      const anotherBusiness = await Business.create({
        name: "Another Business",
        slug: "another-business",
        category: "Finance",
      });

      await Session.create({
        businessId: testBusiness._id,
        customerDetails: { name: "Customer 1" },
      });

      await Session.create({
        businessId: testBusiness._id,
        customerDetails: { name: "Customer 2" },
      });

      await Session.create({
        businessId: anotherBusiness._id,
        customerDetails: { name: "Other Customer" },
      });

      const businessSessions = await Session.find({
        businessId: testBusiness._id,
      });
      expect(businessSessions).toHaveLength(2);
      expect(
        businessSessions.every(
          (s) => s.businessId.toString() === testBusiness._id.toString()
        )
      ).toBe(true);
    });

    test("should find session by customer email", async () => {
      await Session.create({
        businessId: testBusiness._id,
        customerDetails: {
          name: "Search Customer",
          email: "search@example.com",
        },
      });

      const foundSession = await Session.findOne({
        "customerDetails.email": "search@example.com",
      });

      expect(foundSession).toBeDefined();
      expect(foundSession.customerDetails.name).toBe("Search Customer");
      expect(foundSession.customerDetails.email).toBe("search@example.com");
    });

    test("should find session by customer name", async () => {
      await Session.create({
        businessId: testBusiness._id,
        customerDetails: {
          name: "Unique Customer Name",
          email: "unique@example.com",
        },
      });

      const foundSession = await Session.findOne({
        "customerDetails.name": "Unique Customer Name",
      });

      expect(foundSession).toBeDefined();
      expect(foundSession.customerDetails.email).toBe("unique@example.com");
    });

    test("should update customer details", async () => {
      const session = await Session.create({
        businessId: testBusiness._id,
        customerDetails: {
          name: "Original Name",
          email: "original@example.com",
        },
      });

      session.customerDetails.name = "Updated Name";
      session.customerDetails.email = "updated@example.com";
      session.customerDetails.phoneNumber = "+1111111111";
      const updatedSession = await session.save();

      expect(updatedSession.customerDetails.name).toBe("Updated Name");
      expect(updatedSession.customerDetails.email).toBe("updated@example.com");
      expect(updatedSession.customerDetails.phoneNumber).toBe("+1111111111");
    });

    test("should delete session", async () => {
      const session = await Session.create({
        businessId: testBusiness._id,
        customerDetails: {
          name: "Delete Test",
        },
      });

      await Session.deleteOne({ _id: session._id });
      const deletedSession = await Session.findById(session._id);

      expect(deletedSession).toBeNull();
    });

    test("should populate businessId reference", async () => {
      const session = await Session.create({
        businessId: testBusiness._id,
        customerDetails: {
          name: "Populate Test",
          email: "populate@example.com",
        },
      });

      const populatedSession = await Session.findById(session._id).populate(
        "businessId"
      );

      expect(populatedSession.businessId).toBeDefined();
      expect(populatedSession.businessId.name).toBe("Test Business");
      expect(populatedSession.businessId.slug).toBe("test-business");
    });

    test("should find all sessions", async () => {
      await Session.create({
        businessId: testBusiness._id,
        customerDetails: { name: "Customer 1" },
      });

      await Session.create({
        businessId: testBusiness._id,
        customerDetails: { name: "Customer 2" },
      });

      await Session.create({
        businessId: testBusiness._id,
        customerDetails: { name: "Customer 3" },
      });

      const allSessions = await Session.find();
      expect(allSessions).toHaveLength(3);
    });
  });

  describe("Session Customer Details Updates", () => {
    test("should add customer details to existing session", async () => {
      const session = await Session.create({
        businessId: testBusiness._id,
      });

      expect(session.customerDetails.name).toBeUndefined();

      session.customerDetails.name = "Added Name";
      session.customerDetails.email = "added@example.com";
      session.customerDetails.phoneNumber = "+1234567890";
      const updatedSession = await session.save();

      expect(updatedSession.customerDetails.name).toBe("Added Name");
      expect(updatedSession.customerDetails.email).toBe("added@example.com");
      expect(updatedSession.customerDetails.phoneNumber).toBe("+1234567890");
    });

    test("should partially update customer details", async () => {
      const session = await Session.create({
        businessId: testBusiness._id,
        customerDetails: {
          name: "Original Name",
          email: "original@example.com",
          phoneNumber: "+1111111111",
        },
      });

      // Only update email
      session.customerDetails.email = "newemail@example.com";
      const updatedSession = await session.save();

      expect(updatedSession.customerDetails.name).toBe("Original Name");
      expect(updatedSession.customerDetails.email).toBe("newemail@example.com");
      expect(updatedSession.customerDetails.phoneNumber).toBe("+1111111111");
    });

    test("should clear customer detail field", async () => {
      const session = await Session.create({
        businessId: testBusiness._id,
        customerDetails: {
          name: "Test Name",
          email: "test@example.com",
          phoneNumber: "+1234567890",
        },
      });

      session.customerDetails.phoneNumber = undefined;
      const updatedSession = await session.save();

      expect(updatedSession.customerDetails.name).toBe("Test Name");
      expect(updatedSession.customerDetails.email).toBe("test@example.com");
      expect(updatedSession.customerDetails.phoneNumber).toBeUndefined();
    });
  });
});
