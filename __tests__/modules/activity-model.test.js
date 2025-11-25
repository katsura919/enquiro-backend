const mongoose = require("mongoose");
const { connect, closeDatabase, clearDatabase } = require("../helpers/db");
const Activity = require("../../app/models/activity-model");
const Escalation = require("../../app/models/escalation-model");
const Business = require("../../app/models/business-model");
const Session = require("../../app/models/session-model");

describe("Activity Model Test", () => {
  let testBusiness;
  let testSession;
  let testEscalation;

  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
    testBusiness = await Business.create({
      name: "Test Business",
      slug: "test-business",
      category: "Technology",
    });

    testSession = await Session.create({
      businessId: testBusiness._id,
      customerDetails: { name: "Test Customer" },
    });

    testEscalation = await Escalation.create({
      businessId: testBusiness._id,
      sessionId: testSession._id,
      caseNumber: "CASE-001",
      customerName: "Test Customer",
      customerEmail: "customer@example.com",
    });
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("Activity Schema Validation", () => {
    test("should create an activity successfully with valid data", async () => {
      const validActivity = {
        escalationId: testEscalation._id,
        action: "Case created",
        details: "New escalation case was created",
      };

      const activity = new Activity(validActivity);
      const savedActivity = await activity.save();

      expect(savedActivity._id).toBeDefined();
      expect(savedActivity.escalationId.toString()).toBe(
        testEscalation._id.toString()
      );
      expect(savedActivity.action).toBe(validActivity.action);
      expect(savedActivity.details).toBe(validActivity.details);
      expect(savedActivity.timestamp).toBeDefined();
      expect(savedActivity.timestamp).toBeInstanceOf(Date);
    });

    test("should fail to create activity without required fields", async () => {
      const activityWithoutRequired = new Activity({
        details: "Missing required fields",
      });

      let err;
      try {
        await activityWithoutRequired.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.escalationId).toBeDefined();
      expect(err.errors.action).toBeDefined();
    });

    test("should create activity with only required fields", async () => {
      const minimalActivity = {
        escalationId: testEscalation._id,
        action: "Status updated",
      };

      const activity = new Activity(minimalActivity);
      const savedActivity = await activity.save();

      expect(savedActivity._id).toBeDefined();
      expect(savedActivity.timestamp).toBeDefined();
      expect(savedActivity.details).toBeUndefined();
    });

    test("should set default timestamp", async () => {
      const activity = await Activity.create({
        escalationId: testEscalation._id,
        action: "Test action",
      });

      expect(activity.timestamp).toBeInstanceOf(Date);
      expect(activity.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("Activity Query Operations", () => {
    test("should find activities by escalationId", async () => {
      await Activity.create({
        escalationId: testEscalation._id,
        action: "Activity 1",
      });

      await Activity.create({
        escalationId: testEscalation._id,
        action: "Activity 2",
      });

      const activities = await Activity.find({
        escalationId: testEscalation._id,
      });
      expect(activities).toHaveLength(2);
    });

    test("should find activities by action", async () => {
      await Activity.create({
        escalationId: testEscalation._id,
        action: "Case created",
      });

      await Activity.create({
        escalationId: testEscalation._id,
        action: "Status updated",
      });

      await Activity.create({
        escalationId: testEscalation._id,
        action: "Case created",
      });

      const createdActivities = await Activity.find({ action: "Case created" });
      expect(createdActivities).toHaveLength(2);
    });

    test("should sort activities by timestamp", async () => {
      const first = await Activity.create({
        escalationId: testEscalation._id,
        action: "First activity",
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const second = await Activity.create({
        escalationId: testEscalation._id,
        action: "Second activity",
      });

      const activities = await Activity.find({
        escalationId: testEscalation._id,
      }).sort({ timestamp: 1 });

      expect(activities[0].action).toBe("First activity");
      expect(activities[1].action).toBe("Second activity");
    });

    test("should populate escalationId reference", async () => {
      const activity = await Activity.create({
        escalationId: testEscalation._id,
        action: "Populate test",
      });

      const populatedActivity = await Activity.findById(activity._id).populate(
        "escalationId"
      );

      expect(populatedActivity.escalationId.caseNumber).toBe("CASE-001");
      expect(populatedActivity.escalationId.customerName).toBe("Test Customer");
    });

    test("should delete activity", async () => {
      const activity = await Activity.create({
        escalationId: testEscalation._id,
        action: "Delete test",
      });

      await Activity.deleteOne({ _id: activity._id });
      const deletedActivity = await Activity.findById(activity._id);

      expect(deletedActivity).toBeNull();
    });
  });

  describe("Activity Tracking", () => {
    test("should track multiple activities for an escalation", async () => {
      const actions = [
        "Case created",
        "Assigned to agent",
        "Status updated to pending",
        "Note added",
        "Case resolved",
      ];

      for (const action of actions) {
        await Activity.create({
          escalationId: testEscalation._id,
          action: action,
          details: `Details for ${action}`,
        });
      }

      const activities = await Activity.find({
        escalationId: testEscalation._id,
      });
      expect(activities).toHaveLength(5);
    });

    test("should find recent activities", async () => {
      await Activity.create({
        escalationId: testEscalation._id,
        action: "Recent activity",
        timestamp: new Date(),
      });

      await Activity.create({
        escalationId: testEscalation._id,
        action: "Old activity",
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      });

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentActivities = await Activity.find({
        escalationId: testEscalation._id,
        timestamp: { $gte: oneDayAgo },
      });

      expect(recentActivities).toHaveLength(1);
      expect(recentActivities[0].action).toBe("Recent activity");
    });

    test("should store detailed activity information", async () => {
      const detailedActivity = await Activity.create({
        escalationId: testEscalation._id,
        action: "Case updated",
        details:
          "Status changed from escalated to pending. Assigned to Agent John Doe.",
      });

      expect(detailedActivity.details).toContain("Status changed");
      expect(detailedActivity.details).toContain("Agent John Doe");
    });
  });

  describe("Activity Timeline", () => {
    test("should create activity timeline for escalation", async () => {
      const timeline = [
        { action: "Case created", delay: 0 },
        { action: "Assigned to agent", delay: 100 },
        { action: "Agent responded", delay: 200 },
        { action: "Case resolved", delay: 300 },
      ];

      for (const item of timeline) {
        await new Promise((resolve) => setTimeout(resolve, item.delay));
        await Activity.create({
          escalationId: testEscalation._id,
          action: item.action,
        });
      }

      const activities = await Activity.find({
        escalationId: testEscalation._id,
      }).sort({ timestamp: 1 });

      expect(activities).toHaveLength(4);
      expect(activities[0].action).toBe("Case created");
      expect(activities[activities.length - 1].action).toBe("Case resolved");
    });
  });
});
