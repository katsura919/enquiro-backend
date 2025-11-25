const mongoose = require("mongoose");
const { connect, closeDatabase, clearDatabase } = require("../helpers/db");
const Escalation = require("../../app/models/escalation-model");
const Business = require("../../app/models/business-model");
const Agent = require("../../app/models/agent-model");
const Session = require("../../app/models/session-model");
const bcrypt = require("bcryptjs");

describe("Escalation Model Test", () => {
  let testBusiness;
  let testAgent;
  let testSession;

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

    // Create test agent
    testAgent = await Agent.create({
      businessId: testBusiness._id,
      name: "Test Agent",
      email: "agent@example.com",
      password: await bcrypt.hash("password123", 10),
    });

    // Create test session
    testSession = await Session.create({
      businessId: testBusiness._id,
      customerDetails: {
        name: "Test Customer",
        email: "customer@test.com",
        phoneNumber: "+1234567890",
      },
    });
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("Escalation Schema Validation", () => {
    test("should create an escalation successfully with valid data", async () => {
      const validEscalation = {
        businessId: testBusiness._id,
        sessionId: testSession._id,
        caseNumber: "CASE-2024-001",
        caseOwner: testAgent._id,
        customerName: "John Customer",
        customerEmail: "customer@example.com",
        customerPhone: "+1234567890",
        concern: "Technical Issue",
        description: "Detailed description of the issue",
        status: "escalated",
        emailThreadId: "thread-123",
      };

      const escalation = new Escalation(validEscalation);
      const savedEscalation = await escalation.save();

      expect(savedEscalation._id).toBeDefined();
      expect(savedEscalation.businessId.toString()).toBe(
        testBusiness._id.toString()
      );
      expect(savedEscalation.sessionId.toString()).toBe(
        testSession._id.toString()
      );
      expect(savedEscalation.caseNumber).toBe(validEscalation.caseNumber);
      expect(savedEscalation.caseOwner.toString()).toBe(
        testAgent._id.toString()
      );
      expect(savedEscalation.customerName).toBe(validEscalation.customerName);
      expect(savedEscalation.customerEmail).toBe(validEscalation.customerEmail);
      expect(savedEscalation.customerPhone).toBe(validEscalation.customerPhone);
      expect(savedEscalation.concern).toBe(validEscalation.concern);
      expect(savedEscalation.description).toBe(validEscalation.description);
      expect(savedEscalation.status).toBe("escalated");
      expect(savedEscalation.emailThreadId).toBe(validEscalation.emailThreadId);
      expect(savedEscalation.createdAt).toBeDefined();
      expect(savedEscalation.updatedAt).toBeDefined();
    });

    test("should fail to create escalation without required fields", async () => {
      const escalationWithoutRequiredFields = new Escalation({
        customerName: "John Customer",
      });

      let err;
      try {
        await escalationWithoutRequiredFields.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.businessId).toBeDefined();
      expect(err.errors.sessionId).toBeDefined();
      expect(err.errors.caseNumber).toBeDefined();
      expect(err.errors.customerEmail).toBeDefined();
    });

    test("should fail to create escalation with duplicate caseNumber", async () => {
      const escalationData = {
        businessId: testBusiness._id,
        sessionId: testSession._id,
        caseNumber: "CASE-DUPLICATE-001",
        customerName: "John Customer",
        customerEmail: "customer@example.com",
      };

      await Escalation.create(escalationData);

      let err;
      try {
        await Escalation.create(escalationData);
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.code).toBe(11000); // Duplicate key error code
    });

    test("should set default status to escalated", async () => {
      const escalation = new Escalation({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        caseNumber: "CASE-2024-002",
        customerName: "Jane Customer",
        customerEmail: "jane@example.com",
      });

      const savedEscalation = await escalation.save();
      expect(savedEscalation.status).toBe("escalated");
    });

    test("should accept valid status values", async () => {
      const statuses = ["escalated", "resolved", "pending"];

      for (const status of statuses) {
        const escalation = await Escalation.create({
          businessId: testBusiness._id,
          sessionId: testSession._id,
          caseNumber: `CASE-STATUS-${status}`,
          customerName: "Customer",
          customerEmail: "customer@example.com",
          status: status,
        });

        expect(escalation.status).toBe(status);
      }
    });

    test("should reject invalid status values", async () => {
      const escalation = new Escalation({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        caseNumber: "CASE-2024-003",
        customerName: "Customer",
        customerEmail: "customer@example.com",
        status: "invalid-status",
      });

      let err;
      try {
        await escalation.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.status).toBeDefined();
    });

    test("should create escalation with only required fields", async () => {
      const minimalEscalation = {
        businessId: testBusiness._id,
        sessionId: testSession._id,
        caseNumber: "CASE-MINIMAL-001",
        customerName: "Minimal Customer",
        customerEmail: "minimal@example.com",
      };

      const escalation = new Escalation(minimalEscalation);
      const savedEscalation = await escalation.save();

      expect(savedEscalation._id).toBeDefined();
      expect(savedEscalation.status).toBe("escalated");
      expect(savedEscalation.caseOwner).toBeUndefined();
      expect(savedEscalation.customerPhone).toBeUndefined();
      expect(savedEscalation.concern).toBeUndefined();
      expect(savedEscalation.description).toBeUndefined();
      expect(savedEscalation.emailThreadId).toBeUndefined();
    });
  });

  describe("Escalation Query Operations", () => {
    test("should find escalation by caseNumber", async () => {
      const escalationData = {
        businessId: testBusiness._id,
        sessionId: testSession._id,
        caseNumber: "CASE-SEARCH-001",
        customerName: "Search Customer",
        customerEmail: "search@example.com",
      };

      await Escalation.create(escalationData);
      const foundEscalation = await Escalation.findOne({
        caseNumber: "CASE-SEARCH-001",
      });

      expect(foundEscalation).toBeDefined();
      expect(foundEscalation.customerName).toBe(escalationData.customerName);
      expect(foundEscalation.customerEmail).toBe(escalationData.customerEmail);
    });

    test("should find escalations by businessId", async () => {
      const anotherBusiness = await Business.create({
        name: "Another Business",
        slug: "another-business",
        category: "Finance",
      });

      const anotherSession = await Session.create({
        businessId: anotherBusiness._id,
        customerDetails: {
          name: "Another Customer",
          email: "another@test.com",
        },
      });

      await Escalation.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        caseNumber: "CASE-BUS1-001",
        customerName: "Customer 1",
        customerEmail: "customer1@example.com",
      });

      await Escalation.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        caseNumber: "CASE-BUS1-002",
        customerName: "Customer 2",
        customerEmail: "customer2@example.com",
      });

      await Escalation.create({
        businessId: anotherBusiness._id,
        sessionId: anotherSession._id,
        caseNumber: "CASE-BUS2-001",
        customerName: "Other Customer",
        customerEmail: "other@example.com",
      });

      const businessEscalations = await Escalation.find({
        businessId: testBusiness._id,
      });
      expect(businessEscalations).toHaveLength(2);
      expect(
        businessEscalations.every(
          (e) => e.businessId.toString() === testBusiness._id.toString()
        )
      ).toBe(true);
    });

    test("should find escalations by status", async () => {
      await Escalation.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        caseNumber: "CASE-ESCALATED-001",
        customerName: "Customer 1",
        customerEmail: "customer1@example.com",
        status: "escalated",
      });

      await Escalation.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        caseNumber: "CASE-RESOLVED-001",
        customerName: "Customer 2",
        customerEmail: "customer2@example.com",
        status: "resolved",
      });

      await Escalation.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        caseNumber: "CASE-ESCALATED-002",
        customerName: "Customer 3",
        customerEmail: "customer3@example.com",
        status: "escalated",
      });

      const escalatedCases = await Escalation.find({ status: "escalated" });
      expect(escalatedCases).toHaveLength(2);
      expect(escalatedCases.every((e) => e.status === "escalated")).toBe(true);
    });

    test("should find escalations by caseOwner", async () => {
      const anotherAgent = await Agent.create({
        businessId: testBusiness._id,
        name: "Another Agent",
        email: "another.agent@example.com",
        password: await bcrypt.hash("password123", 10),
      });

      await Escalation.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        caseNumber: "CASE-AGENT1-001",
        customerName: "Customer 1",
        customerEmail: "customer1@example.com",
        caseOwner: testAgent._id,
      });

      await Escalation.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        caseNumber: "CASE-AGENT1-002",
        customerName: "Customer 2",
        customerEmail: "customer2@example.com",
        caseOwner: testAgent._id,
      });

      await Escalation.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        caseNumber: "CASE-AGENT2-001",
        customerName: "Customer 3",
        customerEmail: "customer3@example.com",
        caseOwner: anotherAgent._id,
      });

      const agentCases = await Escalation.find({ caseOwner: testAgent._id });
      expect(agentCases).toHaveLength(2);
      expect(
        agentCases.every(
          (e) => e.caseOwner.toString() === testAgent._id.toString()
        )
      ).toBe(true);
    });

    test("should update escalation status", async () => {
      const escalation = await Escalation.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        caseNumber: "CASE-UPDATE-001",
        customerName: "Update Customer",
        customerEmail: "update@example.com",
        status: "escalated",
      });

      escalation.status = "resolved";
      const updatedEscalation = await escalation.save();

      expect(updatedEscalation.status).toBe("resolved");
    });

    test("should assign caseOwner to escalation", async () => {
      const escalation = await Escalation.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        caseNumber: "CASE-ASSIGN-001",
        customerName: "Assign Customer",
        customerEmail: "assign@example.com",
      });

      expect(escalation.caseOwner).toBeUndefined();

      escalation.caseOwner = testAgent._id;
      const updatedEscalation = await escalation.save();

      expect(updatedEscalation.caseOwner.toString()).toBe(
        testAgent._id.toString()
      );
    });

    test("should populate references", async () => {
      const escalation = await Escalation.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        caseNumber: "CASE-POPULATE-001",
        customerName: "Populate Customer",
        customerEmail: "populate@example.com",
        caseOwner: testAgent._id,
      });

      const populatedEscalation = await Escalation.findById(escalation._id)
        .populate("businessId")
        .populate("sessionId")
        .populate("caseOwner");

      expect(populatedEscalation.businessId.name).toBe("Test Business");
      expect(populatedEscalation.sessionId.businessId.toString()).toBe(
        testBusiness._id.toString()
      );
      expect(populatedEscalation.sessionId.customerDetails.name).toBe(
        "Test Customer"
      );
      expect(populatedEscalation.caseOwner.name).toBe("Test Agent");
    });

    test("should find escalations by emailThreadId", async () => {
      await Escalation.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        caseNumber: "CASE-THREAD-001",
        customerName: "Customer",
        customerEmail: "customer@example.com",
        emailThreadId: "thread-abc-123",
      });

      const foundEscalation = await Escalation.findOne({
        emailThreadId: "thread-abc-123",
      });
      expect(foundEscalation).toBeDefined();
      expect(foundEscalation.caseNumber).toBe("CASE-THREAD-001");
    });
  });

  describe("Escalation Timestamps", () => {
    test("should automatically set createdAt and updatedAt timestamps", async () => {
      const escalation = await Escalation.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        caseNumber: "CASE-TIMESTAMP-001",
        customerName: "Timestamp Customer",
        customerEmail: "timestamp@example.com",
      });

      expect(escalation.createdAt).toBeInstanceOf(Date);
      expect(escalation.updatedAt).toBeInstanceOf(Date);
    });

    test("should update updatedAt timestamp on modification", async () => {
      const escalation = await Escalation.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        caseNumber: "CASE-UPDATE-TIME-001",
        customerName: "Customer",
        customerEmail: "customer@example.com",
      });

      const originalUpdatedAt = escalation.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      escalation.status = "resolved";
      await escalation.save();

      expect(escalation.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });
  });
});
