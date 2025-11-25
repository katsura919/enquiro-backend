const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { connect, closeDatabase, clearDatabase } = require("../helpers/db");
const AgentStatus = require("../../app/models/agent-status-model");
const Agent = require("../../app/models/agent-model");
const Business = require("../../app/models/business-model");

describe("AgentStatus Model Test", () => {
  let testBusiness;
  let testAgent;

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
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("AgentStatus Schema Validation", () => {
    test("should create agent status successfully with valid data", async () => {
      const validStatus = {
        agentId: testAgent._id,
        businessId: testBusiness._id,
        status: "online",
      };

      const agentStatus = new AgentStatus(validStatus);
      const savedStatus = await agentStatus.save();

      expect(savedStatus._id).toBeDefined();
      expect(savedStatus.agentId.toString()).toBe(testAgent._id.toString());
      expect(savedStatus.businessId.toString()).toBe(
        testBusiness._id.toString()
      );
      expect(savedStatus.status).toBe("online");
      expect(savedStatus.lastActive).toBeDefined();
      expect(savedStatus.createdAt).toBeDefined();
    });

    test("should fail to create agent status without required fields", async () => {
      const statusWithoutRequired = new AgentStatus({
        status: "online",
      });

      let err;
      try {
        await statusWithoutRequired.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.agentId).toBeDefined();
      expect(err.errors.businessId).toBeDefined();
    });

    test("should set default values correctly", async () => {
      const agentStatus = await AgentStatus.create({
        agentId: testAgent._id,
        businessId: testBusiness._id,
      });

      expect(agentStatus.status).toBe("offline");
      expect(agentStatus.lastActive).toBeInstanceOf(Date);
    });

    test("should accept valid status values", async () => {
      const statuses = ["offline", "online", "available", "away", "in-chat"];

      for (const status of statuses) {
        const agentStatus = await AgentStatus.create({
          agentId: testAgent._id,
          businessId: testBusiness._id,
          status: status,
        });

        expect(agentStatus.status).toBe(status);
        await AgentStatus.deleteOne({ _id: agentStatus._id });
      }
    });

    test("should reject invalid status value", async () => {
      const invalidStatus = new AgentStatus({
        agentId: testAgent._id,
        businessId: testBusiness._id,
        status: "invalid-status",
      });

      let err;
      try {
        await invalidStatus.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.status).toBeDefined();
    });

    test("should enforce unique agentId and businessId combination", async () => {
      await AgentStatus.create({
        agentId: testAgent._id,
        businessId: testBusiness._id,
        status: "online",
      });

      let err;
      try {
        await AgentStatus.create({
          agentId: testAgent._id,
          businessId: testBusiness._id,
          status: "available",
        });
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.code).toBe(11000); // Duplicate key error
    });
  });

  describe("AgentStatus Query Operations", () => {
    test("should find agent status by agentId", async () => {
      await AgentStatus.create({
        agentId: testAgent._id,
        businessId: testBusiness._id,
        status: "online",
      });

      const status = await AgentStatus.findOne({ agentId: testAgent._id });

      expect(status).toBeDefined();
      expect(status.agentId.toString()).toBe(testAgent._id.toString());
    });

    test("should find agent status by businessId", async () => {
      const anotherAgent = await Agent.create({
        businessId: testBusiness._id,
        name: "Another Agent",
        email: "another@example.com",
        password: await bcrypt.hash("password123", 10),
      });

      await AgentStatus.create({
        agentId: testAgent._id,
        businessId: testBusiness._id,
        status: "online",
      });

      await AgentStatus.create({
        agentId: anotherAgent._id,
        businessId: testBusiness._id,
        status: "available",
      });

      const statuses = await AgentStatus.find({ businessId: testBusiness._id });
      expect(statuses).toHaveLength(2);
    });

    test("should find agents by status", async () => {
      const agent2 = await Agent.create({
        businessId: testBusiness._id,
        name: "Agent 2",
        email: "agent2@example.com",
        password: await bcrypt.hash("password123", 10),
      });

      const agent3 = await Agent.create({
        businessId: testBusiness._id,
        name: "Agent 3",
        email: "agent3@example.com",
        password: await bcrypt.hash("password123", 10),
      });

      await AgentStatus.create({
        agentId: testAgent._id,
        businessId: testBusiness._id,
        status: "online",
      });

      await AgentStatus.create({
        agentId: agent2._id,
        businessId: testBusiness._id,
        status: "online",
      });

      await AgentStatus.create({
        agentId: agent3._id,
        businessId: testBusiness._id,
        status: "offline",
      });

      const onlineAgents = await AgentStatus.find({ status: "online" });
      expect(onlineAgents).toHaveLength(2);
    });

    test("should update agent status", async () => {
      const agentStatus = await AgentStatus.create({
        agentId: testAgent._id,
        businessId: testBusiness._id,
        status: "offline",
      });

      agentStatus.status = "online";
      agentStatus.lastActive = new Date();
      const updatedStatus = await agentStatus.save();

      expect(updatedStatus.status).toBe("online");
    });

    test("should populate agent reference", async () => {
      const agentStatus = await AgentStatus.create({
        agentId: testAgent._id,
        businessId: testBusiness._id,
        status: "online",
      });

      const populated = await AgentStatus.findById(agentStatus._id).populate(
        "agentId"
      );

      expect(populated.agentId.name).toBe("Test Agent");
      expect(populated.agentId.email).toBe("agent@example.com");
    });

    test("should populate business reference", async () => {
      const agentStatus = await AgentStatus.create({
        agentId: testAgent._id,
        businessId: testBusiness._id,
        status: "online",
      });

      const populated = await AgentStatus.findById(agentStatus._id).populate(
        "businessId"
      );

      expect(populated.businessId.name).toBe("Test Business");
      expect(populated.businessId.slug).toBe("test-business");
    });

    test("should delete agent status", async () => {
      const agentStatus = await AgentStatus.create({
        agentId: testAgent._id,
        businessId: testBusiness._id,
        status: "online",
      });

      await AgentStatus.deleteOne({ _id: agentStatus._id });
      const deleted = await AgentStatus.findById(agentStatus._id);

      expect(deleted).toBeNull();
    });
  });

  describe("AgentStatus Activity Tracking", () => {
    test("should update lastActive timestamp", async () => {
      const agentStatus = await AgentStatus.create({
        agentId: testAgent._id,
        businessId: testBusiness._id,
        status: "online",
      });

      const originalLastActive = agentStatus.lastActive;

      await new Promise((resolve) => setTimeout(resolve, 10));

      agentStatus.lastActive = new Date();
      await agentStatus.save();

      expect(agentStatus.lastActive.getTime()).toBeGreaterThan(
        originalLastActive.getTime()
      );
    });

    test("should find recently active agents", async () => {
      const recentTime = new Date();
      const oldTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

      await AgentStatus.create({
        agentId: testAgent._id,
        businessId: testBusiness._id,
        status: "available",
        lastActive: recentTime,
      });

      const agent2 = await Agent.create({
        businessId: testBusiness._id,
        name: "Agent 2",
        email: "agent2@example.com",
        password: await bcrypt.hash("password123", 10),
      });

      await AgentStatus.create({
        agentId: agent2._id,
        businessId: testBusiness._id,
        status: "away",
        lastActive: oldTime,
      });

      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const recentlyActive = await AgentStatus.find({
        lastActive: { $gte: thirtyMinutesAgo },
      });

      expect(recentlyActive).toHaveLength(1);
    });
  });

  describe("AgentStatus State Transitions", () => {
    test("should transition from offline to online", async () => {
      const agentStatus = await AgentStatus.create({
        agentId: testAgent._id,
        businessId: testBusiness._id,
        status: "offline",
      });

      agentStatus.status = "online";
      await agentStatus.save();

      expect(agentStatus.status).toBe("online");
    });

    test("should transition from online to available", async () => {
      const agentStatus = await AgentStatus.create({
        agentId: testAgent._id,
        businessId: testBusiness._id,
        status: "online",
      });

      agentStatus.status = "available";
      await agentStatus.save();

      expect(agentStatus.status).toBe("available");
    });

    test("should transition from available to in-chat", async () => {
      const agentStatus = await AgentStatus.create({
        agentId: testAgent._id,
        businessId: testBusiness._id,
        status: "available",
      });

      agentStatus.status = "in-chat";
      await agentStatus.save();

      expect(agentStatus.status).toBe("in-chat");
    });

    test("should transition from in-chat to available", async () => {
      const agentStatus = await AgentStatus.create({
        agentId: testAgent._id,
        businessId: testBusiness._id,
        status: "in-chat",
      });

      agentStatus.status = "available";
      await agentStatus.save();

      expect(agentStatus.status).toBe("available");
    });

    test("should transition to away status", async () => {
      const agentStatus = await AgentStatus.create({
        agentId: testAgent._id,
        businessId: testBusiness._id,
        status: "available",
      });

      agentStatus.status = "away";
      await agentStatus.save();

      expect(agentStatus.status).toBe("away");
    });
  });

  describe("AgentStatus Timestamps", () => {
    test("should automatically set timestamps", async () => {
      const agentStatus = await AgentStatus.create({
        agentId: testAgent._id,
        businessId: testBusiness._id,
        status: "online",
      });

      expect(agentStatus.createdAt).toBeInstanceOf(Date);
      expect(agentStatus.updatedAt).toBeInstanceOf(Date);
    });

    test("should update updatedAt on modification", async () => {
      const agentStatus = await AgentStatus.create({
        agentId: testAgent._id,
        businessId: testBusiness._id,
        status: "offline",
      });

      const originalUpdatedAt = agentStatus.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      agentStatus.status = "online";
      await agentStatus.save();

      expect(agentStatus.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });
  });
});
