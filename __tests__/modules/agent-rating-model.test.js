const mongoose = require("mongoose");
const { connect, closeDatabase, clearDatabase } = require("../helpers/db");
const AgentRating = require("../../app/models/agent-rating-model");
const Business = require("../../app/models/business-model");
const Agent = require("../../app/models/agent-model");
const Session = require("../../app/models/session-model");
const bcrypt = require("bcryptjs");

describe("AgentRating Model Test", () => {
  let testBusiness;
  let testAgent;
  let testSession;

  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
    testBusiness = await Business.create({
      name: "Test Business",
      slug: "test-business",
      category: "Technology",
    });

    testAgent = await Agent.create({
      businessId: testBusiness._id,
      name: "Test Agent",
      email: "agent@example.com",
      password: await bcrypt.hash("password123", 10),
    });

    testSession = await Session.create({
      businessId: testBusiness._id,
      customerDetails: {
        name: "Test Customer",
        email: "customer@test.com",
      },
    });
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("AgentRating Schema Validation", () => {
    test("should create agent rating successfully with valid data", async () => {
      const validRating = {
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 5,
        feedback: "Excellent service!",
        caseNumber: "CASE-001",
      };

      const agentRating = new AgentRating(validRating);
      const savedRating = await agentRating.save();

      expect(savedRating._id).toBeDefined();
      expect(savedRating.rating).toBe(5);
      expect(savedRating.feedback).toBe("Excellent service!");
      expect(savedRating.caseNumber).toBe("CASE-001");
      expect(savedRating.ratedAt).toBeDefined();
      expect(savedRating.createdAt).toBeDefined();
    });

    test("should fail to create rating without required fields", async () => {
      const ratingWithoutRequired = new AgentRating({
        rating: 5,
      });

      let err;
      try {
        await ratingWithoutRequired.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.businessId).toBeDefined();
      expect(err.errors.sessionId).toBeDefined();
      expect(err.errors.agentId).toBeDefined();
    });

    test("should create rating without optional fields", async () => {
      const minimalRating = await AgentRating.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 4,
      });

      expect(minimalRating._id).toBeDefined();
      expect(minimalRating.rating).toBe(4);
      expect(minimalRating.feedback).toBeNull();
      expect(minimalRating.caseNumber).toBeNull();
    });

    test("should validate rating range (1-5)", async () => {
      const validRatings = [1, 2, 3, 4, 5];

      for (const rating of validRatings) {
        const agentRating = await AgentRating.create({
          businessId: testBusiness._id,
          sessionId: testSession._id,
          agentId: testAgent._id,
          rating: rating,
        });

        expect(agentRating.rating).toBe(rating);
      }
    });

    test("should reject rating below minimum (1)", async () => {
      const invalidRating = new AgentRating({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 0,
      });

      let err;
      try {
        await invalidRating.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.rating).toBeDefined();
    });

    test("should reject rating above maximum (5)", async () => {
      const invalidRating = new AgentRating({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 6,
      });

      let err;
      try {
        await invalidRating.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.rating).toBeDefined();
    });

    test("should reject non-integer ratings", async () => {
      const invalidRating = new AgentRating({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 3.5,
      });

      let err;
      try {
        await invalidRating.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.rating).toBeDefined();
    });

    test("should set default ratedAt timestamp", async () => {
      const rating = await AgentRating.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 5,
      });

      expect(rating.ratedAt).toBeInstanceOf(Date);
      expect(rating.ratedAt.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("AgentRating Query Operations", () => {
    test("should find ratings by agentId", async () => {
      const anotherAgent = await Agent.create({
        businessId: testBusiness._id,
        name: "Another Agent",
        email: "another@example.com",
        password: await bcrypt.hash("password123", 10),
      });

      await AgentRating.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 5,
      });

      await AgentRating.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 4,
      });

      await AgentRating.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: anotherAgent._id,
        rating: 3,
      });

      const agentRatings = await AgentRating.find({ agentId: testAgent._id });
      expect(agentRatings).toHaveLength(2);
      expect(
        agentRatings.every(
          (r) => r.agentId.toString() === testAgent._id.toString()
        )
      ).toBe(true);
    });

    test("should find ratings by businessId", async () => {
      await AgentRating.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 5,
      });

      const businessRatings = await AgentRating.find({
        businessId: testBusiness._id,
      });
      expect(businessRatings).toHaveLength(1);
    });

    test("should calculate average rating for an agent", async () => {
      await AgentRating.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 5,
      });

      await AgentRating.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 4,
      });

      await AgentRating.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 3,
      });

      const ratings = await AgentRating.find({ agentId: testAgent._id });
      const average =
        ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

      expect(average).toBe(4); // (5 + 4 + 3) / 3 = 4
    });

    test("should find ratings by caseNumber", async () => {
      await AgentRating.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 5,
        caseNumber: "CASE-123",
      });

      const caseRating = await AgentRating.findOne({ caseNumber: "CASE-123" });
      expect(caseRating).toBeDefined();
      expect(caseRating.rating).toBe(5);
    });

    test("should populate agent reference", async () => {
      const rating = await AgentRating.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 5,
      });

      const populated = await AgentRating.findById(rating._id).populate(
        "agentId"
      );

      expect(populated.agentId.name).toBe("Test Agent");
      expect(populated.agentId.email).toBe("agent@example.com");
    });

    test("should populate all references", async () => {
      const rating = await AgentRating.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 5,
      });

      const populated = await AgentRating.findById(rating._id)
        .populate("businessId")
        .populate("sessionId")
        .populate("agentId");

      expect(populated.businessId.name).toBe("Test Business");
      expect(populated.sessionId.businessId.toString()).toBe(
        testBusiness._id.toString()
      );
      expect(populated.agentId.name).toBe("Test Agent");
    });

    test("should sort ratings by ratedAt descending", async () => {
      const first = await AgentRating.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 5,
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const second = await AgentRating.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 4,
      });

      const ratings = await AgentRating.find({ agentId: testAgent._id }).sort({
        ratedAt: -1,
      });

      expect(ratings[0].rating).toBe(4);
      expect(ratings[1].rating).toBe(5);
    });

    test("should filter ratings by rating value", async () => {
      await AgentRating.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 5,
      });

      await AgentRating.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 3,
      });

      await AgentRating.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 5,
      });

      const fiveStarRatings = await AgentRating.find({
        agentId: testAgent._id,
        rating: 5,
      });

      expect(fiveStarRatings).toHaveLength(2);
    });
  });

  describe("AgentRating Feedback", () => {
    test("should store feedback text", async () => {
      const rating = await AgentRating.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 5,
        feedback: "Great support, very helpful and quick response!",
      });

      expect(rating.feedback).toBe(
        "Great support, very helpful and quick response!"
      );
    });

    test("should allow empty feedback", async () => {
      const rating = await AgentRating.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        agentId: testAgent._id,
        rating: 4,
      });

      expect(rating.feedback).toBeNull();
    });
  });
});
