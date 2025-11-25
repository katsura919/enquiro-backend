const mongoose = require("mongoose");
const { connect, closeDatabase, clearDatabase } = require("../helpers/db");
const Notification = require("../../app/models/notification-model");
const Business = require("../../app/models/business-model");
const Agent = require("../../app/models/agent-model");
const Escalation = require("../../app/models/escalation-model");
const Session = require("../../app/models/session-model");
const bcrypt = require("bcryptjs");

describe("Notification Model Test", () => {
  let testBusiness;
  let testAgent;
  let testEscalation;
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

  describe("Notification Schema Validation", () => {
    test("should create case_created notification successfully", async () => {
      const notification = await Notification.create({
        businessId: testBusiness._id,
        type: "case_created",
        caseId: testEscalation._id,
        caseTitle: "New Support Case",
        casePriority: "high",
        customerName: "John Customer",
        agentId: testAgent._id,
        agentName: "Test Agent",
      });

      expect(notification._id).toBeDefined();
      expect(notification.type).toBe("case_created");
      expect(notification.caseTitle).toBe("New Support Case");
      expect(notification.read).toBe(false);
      expect(notification.createdAt).toBeDefined();
    });

    test("should create rating_received notification successfully", async () => {
      const notification = await Notification.create({
        businessId: testBusiness._id,
        type: "rating_received",
        rating: 5,
        ratedAgentId: testAgent._id,
        ratedAgentName: "Test Agent",
        feedback: "Excellent service!",
      });

      expect(notification._id).toBeDefined();
      expect(notification.type).toBe("rating_received");
      expect(notification.rating).toBe(5);
      expect(notification.feedback).toBe("Excellent service!");
      expect(notification.read).toBe(false);
    });

    test("should fail to create notification without required fields", async () => {
      const notification = new Notification({
        caseTitle: "Test",
      });

      let err;
      try {
        await notification.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.businessId).toBeDefined();
      expect(err.errors.type).toBeDefined();
    });

    test("should reject invalid notification type", async () => {
      const notification = new Notification({
        businessId: testBusiness._id,
        type: "invalid_type",
      });

      let err;
      try {
        await notification.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.type).toBeDefined();
    });

    test("should set default values correctly", async () => {
      const notification = await Notification.create({
        businessId: testBusiness._id,
        type: "case_created",
      });

      expect(notification.read).toBe(false);
      expect(notification.caseId).toBeNull();
      expect(notification.rating).toBeNull();
    });

    test("should validate rating range", async () => {
      const invalidRating = new Notification({
        businessId: testBusiness._id,
        type: "rating_received",
        rating: 6, // Invalid: max is 5
      });

      let err;
      try {
        await invalidRating.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    });
  });

  describe("Notification Query Operations", () => {
    test("should find notifications by businessId", async () => {
      await Notification.create({
        businessId: testBusiness._id,
        type: "case_created",
        caseTitle: "Case 1",
      });

      await Notification.create({
        businessId: testBusiness._id,
        type: "rating_received",
        rating: 4,
      });

      const notifications = await Notification.find({
        businessId: testBusiness._id,
      });
      expect(notifications).toHaveLength(2);
    });

    test("should find unread notifications", async () => {
      await Notification.create({
        businessId: testBusiness._id,
        type: "case_created",
        read: false,
      });

      await Notification.create({
        businessId: testBusiness._id,
        type: "case_created",
        read: true,
      });

      const unreadNotifications = await Notification.find({
        businessId: testBusiness._id,
        read: false,
      });

      expect(unreadNotifications).toHaveLength(1);
      expect(unreadNotifications[0].read).toBe(false);
    });

    test("should mark notification as read", async () => {
      const notification = await Notification.create({
        businessId: testBusiness._id,
        type: "case_created",
        caseTitle: "Test Case",
      });

      expect(notification.read).toBe(false);

      notification.read = true;
      await notification.save();

      const updatedNotification = await Notification.findById(notification._id);
      expect(updatedNotification.read).toBe(true);
    });

    test("should find notifications by type", async () => {
      await Notification.create({
        businessId: testBusiness._id,
        type: "case_created",
      });

      await Notification.create({
        businessId: testBusiness._id,
        type: "rating_received",
        rating: 5,
      });

      await Notification.create({
        businessId: testBusiness._id,
        type: "case_created",
      });

      const caseNotifications = await Notification.find({
        type: "case_created",
      });
      expect(caseNotifications).toHaveLength(2);

      const ratingNotifications = await Notification.find({
        type: "rating_received",
      });
      expect(ratingNotifications).toHaveLength(1);
    });

    test("should sort notifications by createdAt descending", async () => {
      const first = await Notification.create({
        businessId: testBusiness._id,
        type: "case_created",
        caseTitle: "First",
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const second = await Notification.create({
        businessId: testBusiness._id,
        type: "case_created",
        caseTitle: "Second",
      });

      const notifications = await Notification.find({
        businessId: testBusiness._id,
      }).sort({ createdAt: -1 });

      expect(notifications[0].caseTitle).toBe("Second");
      expect(notifications[1].caseTitle).toBe("First");
    });

    test("should populate agent reference", async () => {
      const notification = await Notification.create({
        businessId: testBusiness._id,
        type: "case_created",
        agentId: testAgent._id,
        agentName: "Test Agent",
      });

      const populated = await Notification.findById(notification._id).populate(
        "agentId"
      );

      expect(populated.agentId.name).toBe("Test Agent");
      expect(populated.agentId.email).toBe("agent@example.com");
    });

    test("should populate case reference", async () => {
      const notification = await Notification.create({
        businessId: testBusiness._id,
        type: "case_created",
        caseId: testEscalation._id,
      });

      const populated = await Notification.findById(notification._id).populate(
        "caseId"
      );

      expect(populated.caseId.caseNumber).toBe("CASE-001");
      expect(populated.caseId.customerName).toBe("Test Customer");
    });

    test("should delete notification", async () => {
      const notification = await Notification.create({
        businessId: testBusiness._id,
        type: "case_created",
      });

      await Notification.deleteOne({ _id: notification._id });
      const deleted = await Notification.findById(notification._id);

      expect(deleted).toBeNull();
    });
  });

  describe("Notification with Links", () => {
    test("should store notification link", async () => {
      const notification = await Notification.create({
        businessId: testBusiness._id,
        type: "case_created",
        caseId: testEscalation._id,
        link: "/cases/CASE-001",
      });

      expect(notification.link).toBe("/cases/CASE-001");
    });
  });
});
