const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { connect, closeDatabase, clearDatabase } = require("../helpers/db");
const Agent = require("../../app/models/agent-model");
const Business = require("../../app/models/business-model");

describe("Agent Model Test", () => {
  let testBusiness;

  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
    // Create a test business for agent references
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

  describe("Agent Schema Validation", () => {
    test("should create an agent successfully with valid data", async () => {
      const validAgent = {
        businessId: testBusiness._id,
        name: "John Agent",
        email: "agent@example.com",
        password: await bcrypt.hash("password123", 10),
        phone: "+1234567890",
      };

      const agent = new Agent(validAgent);
      const savedAgent = await agent.save();

      expect(savedAgent._id).toBeDefined();
      expect(savedAgent.name).toBe(validAgent.name);
      expect(savedAgent.email).toBe(validAgent.email);
      expect(savedAgent.businessId.toString()).toBe(
        testBusiness._id.toString()
      );
      expect(savedAgent.role).toBe("agent"); // default value
      expect(savedAgent.deletedAt).toBeNull(); // default value
      expect(savedAgent.createdAt).toBeDefined();
    });

    test("should fail to create agent without required fields", async () => {
      const agentWithoutRequiredFields = new Agent({
        name: "John Agent",
      });

      let err;
      try {
        await agentWithoutRequiredFields.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.businessId).toBeDefined();
      expect(err.errors.email).toBeDefined();
      expect(err.errors.password).toBeDefined();
    });

    test("should fail to create agent with duplicate email", async () => {
      const agentData = {
        businessId: testBusiness._id,
        name: "John Agent",
        email: "duplicate@example.com",
        password: await bcrypt.hash("password123", 10),
      };

      await Agent.create(agentData);

      let err;
      try {
        await Agent.create(agentData);
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.code).toBe(11000); // Duplicate key error code
    });

    test("should set default values correctly", async () => {
      const agent = new Agent({
        businessId: testBusiness._id,
        name: "Jane Agent",
        email: "jane.agent@example.com",
        password: await bcrypt.hash("password123", 10),
      });

      const savedAgent = await agent.save();

      expect(savedAgent.role).toBe("agent");
      expect(savedAgent.deletedAt).toBeNull();
      expect(savedAgent.createdAt).toBeInstanceOf(Date);
    });

    test("should accept optional fields", async () => {
      const agentWithOptionalFields = {
        businessId: testBusiness._id,
        name: "Alice Agent",
        email: "alice@example.com",
        password: await bcrypt.hash("password123", 10),
        phone: "+9876543210",
        profilePic: "https://example.com/avatar.jpg",
      };

      const agent = new Agent(agentWithOptionalFields);
      const savedAgent = await agent.save();

      expect(savedAgent.phone).toBe(agentWithOptionalFields.phone);
      expect(savedAgent.profilePic).toBe(agentWithOptionalFields.profilePic);
    });
  });

  describe("Soft Delete Functionality", () => {
    test("should soft delete an agent using softDelete method", async () => {
      const agent = await Agent.create({
        businessId: testBusiness._id,
        name: "Bob Agent",
        email: "bob@example.com",
        password: await bcrypt.hash("password123", 10),
      });

      expect(agent.deletedAt).toBeNull();

      await agent.softDelete();

      const deletedAgent = await Agent.findById(agent._id);
      expect(deletedAgent.deletedAt).toBeInstanceOf(Date);
      expect(deletedAgent.deletedAt).not.toBeNull();
    });

    test("should restore a soft-deleted agent using restore method", async () => {
      const agent = await Agent.create({
        businessId: testBusiness._id,
        name: "Charlie Agent",
        email: "charlie@example.com",
        password: await bcrypt.hash("password123", 10),
      });

      await agent.softDelete();
      expect(agent.deletedAt).not.toBeNull();

      await agent.restore();

      const restoredAgent = await Agent.findById(agent._id);
      expect(restoredAgent.deletedAt).toBeNull();
    });

    test("should query only non-deleted agents using notDeleted helper", async () => {
      // Create active agents
      await Agent.create({
        businessId: testBusiness._id,
        name: "Active Agent 1",
        email: "active1@example.com",
        password: await bcrypt.hash("password123", 10),
      });

      await Agent.create({
        businessId: testBusiness._id,
        name: "Active Agent 2",
        email: "active2@example.com",
        password: await bcrypt.hash("password123", 10),
      });

      // Create and soft delete an agent
      const deletedAgent = await Agent.create({
        businessId: testBusiness._id,
        name: "Deleted Agent",
        email: "deleted@example.com",
        password: await bcrypt.hash("password123", 10),
      });
      await deletedAgent.softDelete();

      const activeAgents = await Agent.find().notDeleted();
      expect(activeAgents).toHaveLength(2);
      expect(activeAgents.every((a) => a.deletedAt === null)).toBe(true);
    });

    test("should query only deleted agents using onlyDeleted helper", async () => {
      // Create active agents
      await Agent.create({
        businessId: testBusiness._id,
        name: "Active Agent",
        email: "active@example.com",
        password: await bcrypt.hash("password123", 10),
      });

      // Create and soft delete agents
      const deletedAgent1 = await Agent.create({
        businessId: testBusiness._id,
        name: "Deleted Agent 1",
        email: "deleted1@example.com",
        password: await bcrypt.hash("password123", 10),
      });
      await deletedAgent1.softDelete();

      const deletedAgent2 = await Agent.create({
        businessId: testBusiness._id,
        name: "Deleted Agent 2",
        email: "deleted2@example.com",
        password: await bcrypt.hash("password123", 10),
      });
      await deletedAgent2.softDelete();

      const deletedAgents = await Agent.find().onlyDeleted();
      expect(deletedAgents).toHaveLength(2);
      expect(deletedAgents.every((a) => a.deletedAt !== null)).toBe(true);
    });
  });

  describe("Agent Query Operations", () => {
    test("should find agent by email", async () => {
      const agentData = {
        businessId: testBusiness._id,
        name: "Search Agent",
        email: "search@example.com",
        password: await bcrypt.hash("password123", 10),
      };

      await Agent.create(agentData);
      const foundAgent = await Agent.findOne({ email: "search@example.com" });

      expect(foundAgent).toBeDefined();
      expect(foundAgent.name).toBe(agentData.name);
      expect(foundAgent.email).toBe(agentData.email);
    });

    test("should find agents by businessId", async () => {
      // Create another business
      const anotherBusiness = await Business.create({
        name: "Another Business",
        slug: "another-business",
        category: "Finance",
      });

      // Create agents for different businesses
      await Agent.create({
        businessId: testBusiness._id,
        name: "Agent 1",
        email: "agent1@example.com",
        password: await bcrypt.hash("password123", 10),
      });

      await Agent.create({
        businessId: testBusiness._id,
        name: "Agent 2",
        email: "agent2@example.com",
        password: await bcrypt.hash("password123", 10),
      });

      await Agent.create({
        businessId: anotherBusiness._id,
        name: "Other Agent",
        email: "other@example.com",
        password: await bcrypt.hash("password123", 10),
      });

      const businessAgents = await Agent.find({ businessId: testBusiness._id });
      expect(businessAgents).toHaveLength(2);
      expect(
        businessAgents.every(
          (a) => a.businessId.toString() === testBusiness._id.toString()
        )
      ).toBe(true);
    });

    test("should update agent data", async () => {
      const agent = await Agent.create({
        businessId: testBusiness._id,
        name: "Update Agent",
        email: "update@example.com",
        password: await bcrypt.hash("password123", 10),
      });

      agent.name = "Updated Name";
      agent.phone = "+1111111111";
      const updatedAgent = await agent.save();

      expect(updatedAgent.name).toBe("Updated Name");
      expect(updatedAgent.phone).toBe("+1111111111");
    });

    test("should populate businessId reference", async () => {
      const agent = await Agent.create({
        businessId: testBusiness._id,
        name: "Populate Agent",
        email: "populate@example.com",
        password: await bcrypt.hash("password123", 10),
      });

      const populatedAgent = await Agent.findById(agent._id).populate(
        "businessId"
      );

      expect(populatedAgent.businessId).toBeDefined();
      expect(populatedAgent.businessId.name).toBe("Test Business");
      expect(populatedAgent.businessId.slug).toBe("test-business");
    });
  });
});
