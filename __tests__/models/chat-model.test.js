const mongoose = require("mongoose");
const { connect, closeDatabase, clearDatabase } = require("../helpers/db");
const Chat = require("../../app/models/chat-model");
const Business = require("../../app/models/business-model");
const Session = require("../../app/models/session-model");
const Agent = require("../../app/models/agent-model");
const bcrypt = require("bcryptjs");

describe("Chat Model Test", () => {
  let testBusiness;
  let testSession;
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

    testSession = await Session.create({
      businessId: testBusiness._id,
      customerDetails: {
        name: "Test Customer",
        email: "customer@test.com",
      },
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

  describe("Chat Schema Validation", () => {
    test("should create a text message successfully", async () => {
      const validChat = {
        businessId: testBusiness._id,
        sessionId: testSession._id,
        message: "Hello, this is a test message",
        messageType: "text",
        senderType: "customer",
      };

      const chat = new Chat(validChat);
      const savedChat = await chat.save();

      expect(savedChat._id).toBeDefined();
      expect(savedChat.message).toBe(validChat.message);
      expect(savedChat.messageType).toBe("text");
      expect(savedChat.senderType).toBe("customer");
      expect(savedChat.createdAt).toBeDefined();
    });

    test("should fail to create chat without required fields", async () => {
      const chatWithoutRequired = new Chat({
        message: "Test message",
      });

      let err;
      try {
        await chatWithoutRequired.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.businessId).toBeDefined();
      expect(err.errors.sessionId).toBeDefined();
    });

    test("should set default values correctly", async () => {
      const chat = await Chat.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        message: "Test message",
      });

      expect(chat.messageType).toBe("text");
      expect(chat.senderType).toBe("ai");
      expect(chat.isGoodResponse).toBeNull();
      expect(chat.agentId).toBeNull();
    });

    test("should accept valid senderType values", async () => {
      const senderTypes = ["agent", "ai", "customer", "system"];

      for (const senderType of senderTypes) {
        const chat = await Chat.create({
          businessId: testBusiness._id,
          sessionId: testSession._id,
          message: "Test message",
          senderType: senderType,
        });

        expect(chat.senderType).toBe(senderType);
      }
    });

    test("should reject invalid senderType", async () => {
      const chat = new Chat({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        message: "Test",
        senderType: "invalid",
      });

      let err;
      try {
        await chat.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.senderType).toBeDefined();
    });
  });

  describe("Chat Message Types", () => {
    test("should create image message with attachments", async () => {
      const imageChat = await Chat.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        messageType: "image",
        senderType: "customer",
        attachments: [
          {
            fileName: "test-image.jpg",
            fileUrl: "https://example.com/test-image.jpg",
            fileSize: 102400,
            mimeType: "image/jpeg",
            publicId: "cloudinary-id-123",
          },
        ],
      });

      expect(imageChat.messageType).toBe("image");
      expect(imageChat.attachments).toHaveLength(1);
      expect(imageChat.attachments[0].fileName).toBe("test-image.jpg");
      expect(imageChat.attachments[0].fileUrl).toBeDefined();
      expect(imageChat.attachments[0].mimeType).toBe("image/jpeg");
    });

    test("should create file message with attachments", async () => {
      const fileChat = await Chat.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        messageType: "file",
        senderType: "customer",
        attachments: [
          {
            fileName: "document.pdf",
            fileUrl: "https://example.com/document.pdf",
            fileSize: 204800,
            mimeType: "application/pdf",
          },
        ],
      });

      expect(fileChat.messageType).toBe("file");
      expect(fileChat.attachments[0].fileName).toBe("document.pdf");
      expect(fileChat.attachments[0].mimeType).toBe("application/pdf");
    });

    test("should accept valid messageType values", async () => {
      const messageTypes = ["text", "image", "file"];

      for (const messageType of messageTypes) {
        const chat = await Chat.create({
          businessId: testBusiness._id,
          sessionId: testSession._id,
          messageType: messageType,
          message: messageType === "text" ? "Test" : undefined,
          senderType: "customer",
          attachments:
            messageType !== "text"
              ? [
                  {
                    fileName: "test.jpg",
                    fileUrl: "https://example.com/test.jpg",
                    mimeType: "image/jpeg",
                  },
                ]
              : [],
        });

        expect(chat.messageType).toBe(messageType);
      }
    });
  });

  describe("Agent Messages", () => {
    test("should create agent message with agentId", async () => {
      const agentChat = await Chat.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        message: "Hello from agent",
        senderType: "agent",
        agentId: testAgent._id,
      });

      expect(agentChat.senderType).toBe("agent");
      expect(agentChat.agentId.toString()).toBe(testAgent._id.toString());
    });

    test("should populate agentId reference", async () => {
      const agentChat = await Chat.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        message: "Agent message",
        senderType: "agent",
        agentId: testAgent._id,
      });

      const populatedChat = await Chat.findById(agentChat._id).populate(
        "agentId"
      );

      expect(populatedChat.agentId.name).toBe("Test Agent");
      expect(populatedChat.agentId.email).toBe("agent@example.com");
    });
  });

  describe("System Messages", () => {
    test("should create system message with systemMessageType", async () => {
      const systemChat = await Chat.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        message: "Agent has joined the chat",
        senderType: "system",
        systemMessageType: "agent_joined",
      });

      expect(systemChat.senderType).toBe("system");
      expect(systemChat.systemMessageType).toBe("agent_joined");
    });

    test("should accept valid systemMessageType values", async () => {
      const systemTypes = [
        "agent_joined",
        "agent_left",
        "customer_joined",
        "customer_left",
        "chat_started",
        "chat_ended",
        "agent_assigned",
        "agent_reassigned",
        "queue_joined",
        "queue_left",
      ];

      for (const systemType of systemTypes) {
        const chat = await Chat.create({
          businessId: testBusiness._id,
          sessionId: testSession._id,
          message: `System message: ${systemType}`,
          senderType: "system",
          systemMessageType: systemType,
        });

        expect(chat.systemMessageType).toBe(systemType);
      }
    });
  });

  describe("Chat Query Operations", () => {
    test("should find chats by sessionId", async () => {
      await Chat.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        message: "Message 1",
        senderType: "customer",
      });

      await Chat.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        message: "Message 2",
        senderType: "ai",
      });

      const chats = await Chat.find({ sessionId: testSession._id });
      expect(chats).toHaveLength(2);
    });

    test("should find chats by businessId", async () => {
      await Chat.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        message: "Business message",
        senderType: "ai",
      });

      const chats = await Chat.find({ businessId: testBusiness._id });
      expect(chats).toHaveLength(1);
    });

    test("should find chats by senderType", async () => {
      await Chat.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        message: "Customer message",
        senderType: "customer",
      });

      await Chat.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        message: "Agent message",
        senderType: "agent",
        agentId: testAgent._id,
      });

      const customerChats = await Chat.find({ senderType: "customer" });
      expect(customerChats).toHaveLength(1);
      expect(customerChats[0].message).toBe("Customer message");
    });

    test("should update isGoodResponse", async () => {
      const chat = await Chat.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        message: "AI response",
        senderType: "ai",
      });

      expect(chat.isGoodResponse).toBeNull();

      chat.isGoodResponse = true;
      await chat.save();

      const updatedChat = await Chat.findById(chat._id);
      expect(updatedChat.isGoodResponse).toBe(true);
    });

    test("should sort chats by createdAt", async () => {
      await Chat.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        message: "First message",
        senderType: "customer",
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await Chat.create({
        businessId: testBusiness._id,
        sessionId: testSession._id,
        message: "Second message",
        senderType: "ai",
      });

      const chats = await Chat.find({ sessionId: testSession._id }).sort({
        createdAt: 1,
      });
      expect(chats[0].message).toBe("First message");
      expect(chats[1].message).toBe("Second message");
    });
  });
});
