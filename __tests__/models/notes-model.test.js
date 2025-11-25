const mongoose = require("mongoose");
const { connect, closeDatabase, clearDatabase } = require("../helpers/db");
const Notes = require("../../app/models/notes-model");
const Escalation = require("../../app/models/escalation-model");
const Business = require("../../app/models/business-model");
const Session = require("../../app/models/session-model");

describe("Notes Model Test", () => {
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

  describe("Notes Schema Validation", () => {
    test("should create a note successfully with valid data", async () => {
      const validNote = {
        escalationId: testEscalation._id,
        content: "This is a test note",
        createdBy: "Agent John",
      };

      const note = new Notes(validNote);
      const savedNote = await note.save();

      expect(savedNote._id).toBeDefined();
      expect(savedNote.escalationId.toString()).toBe(
        testEscalation._id.toString()
      );
      expect(savedNote.content).toBe(validNote.content);
      expect(savedNote.createdBy).toBe(validNote.createdBy);
      expect(savedNote.createdAt).toBeDefined();
      expect(savedNote.updatedAt).toBeDefined();
    });

    test("should fail to create note without required fields", async () => {
      const noteWithoutRequired = new Notes({
        content: "Missing required fields",
      });

      let err;
      try {
        await noteWithoutRequired.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.escalationId).toBeDefined();
      expect(err.errors.createdBy).toBeDefined();
    });

    test("should trim content and createdBy fields", async () => {
      const note = await Notes.create({
        escalationId: testEscalation._id,
        content: "  This is trimmed content  ",
        createdBy: "  Agent Name  ",
      });

      expect(note.content).toBe("This is trimmed content");
      expect(note.createdBy).toBe("Agent Name");
    });
  });

  describe("Notes Query Operations", () => {
    test("should find notes by escalationId", async () => {
      await Notes.create({
        escalationId: testEscalation._id,
        content: "Note 1",
        createdBy: "Agent 1",
      });

      await Notes.create({
        escalationId: testEscalation._id,
        content: "Note 2",
        createdBy: "Agent 2",
      });

      const notes = await Notes.find({ escalationId: testEscalation._id });
      expect(notes).toHaveLength(2);
    });

    test("should find notes by createdBy", async () => {
      await Notes.create({
        escalationId: testEscalation._id,
        content: "Note by Agent 1",
        createdBy: "Agent 1",
      });

      await Notes.create({
        escalationId: testEscalation._id,
        content: "Another note by Agent 1",
        createdBy: "Agent 1",
      });

      await Notes.create({
        escalationId: testEscalation._id,
        content: "Note by Agent 2",
        createdBy: "Agent 2",
      });

      const agent1Notes = await Notes.find({ createdBy: "Agent 1" });
      expect(agent1Notes).toHaveLength(2);
    });

    test("should sort notes by createdAt descending", async () => {
      const first = await Notes.create({
        escalationId: testEscalation._id,
        content: "First note",
        createdBy: "Agent",
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const second = await Notes.create({
        escalationId: testEscalation._id,
        content: "Second note",
        createdBy: "Agent",
      });

      const notes = await Notes.find({ escalationId: testEscalation._id }).sort(
        { createdAt: -1 }
      );

      expect(notes[0].content).toBe("Second note");
      expect(notes[1].content).toBe("First note");
    });

    test("should populate escalationId reference", async () => {
      const note = await Notes.create({
        escalationId: testEscalation._id,
        content: "Populate test",
        createdBy: "Agent",
      });

      const populatedNote = await Notes.findById(note._id).populate(
        "escalationId"
      );

      expect(populatedNote.escalationId.caseNumber).toBe("CASE-001");
      expect(populatedNote.escalationId.customerName).toBe("Test Customer");
    });

    test("should update note content", async () => {
      const note = await Notes.create({
        escalationId: testEscalation._id,
        content: "Original content",
        createdBy: "Agent",
      });

      note.content = "Updated content";
      const updatedNote = await note.save();

      expect(updatedNote.content).toBe("Updated content");
      expect(updatedNote.updatedAt.getTime()).toBeGreaterThan(
        updatedNote.createdAt.getTime()
      );
    });

    test("should delete note", async () => {
      const note = await Notes.create({
        escalationId: testEscalation._id,
        content: "Delete test",
        createdBy: "Agent",
      });

      await Notes.deleteOne({ _id: note._id });
      const deletedNote = await Notes.findById(note._id);

      expect(deletedNote).toBeNull();
    });
  });

  describe("Notes Instance Methods", () => {
    test("should check if note is recent using isRecent method", async () => {
      const recentNote = await Notes.create({
        escalationId: testEscalation._id,
        content: "Recent note",
        createdBy: "Agent",
      });

      expect(recentNote.isRecent()).toBe(true);
    });

    test("should return false for old notes using isRecent method", async () => {
      const oldNote = await Notes.create({
        escalationId: testEscalation._id,
        content: "Old note",
        createdBy: "Agent",
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
      });

      expect(oldNote.isRecent()).toBe(false);
    });
  });

  describe("Notes Static Methods", () => {
    test("should find notes by escalation with pagination", async () => {
      // Create 15 notes
      for (let i = 1; i <= 15; i++) {
        await Notes.create({
          escalationId: testEscalation._id,
          content: `Note ${i}`,
          createdBy: "Agent",
        });
      }

      // Get first page
      const page1 = await Notes.findByEscalation(testEscalation._id, {
        page: 1,
        limit: 10,
      });
      expect(page1).toHaveLength(10);

      // Get second page
      const page2 = await Notes.findByEscalation(testEscalation._id, {
        page: 2,
        limit: 10,
      });
      expect(page2).toHaveLength(5);
    });

    test("should get escalation stats", async () => {
      await Notes.create({
        escalationId: testEscalation._id,
        content: "Note 1",
        createdBy: "Agent",
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await Notes.create({
        escalationId: testEscalation._id,
        content: "Note 2",
        createdBy: "Agent",
      });

      const stats = await Notes.getEscalationStats(testEscalation._id);

      expect(stats).toHaveLength(1);
      expect(stats[0].totalNotes).toBe(2);
      expect(stats[0].lastNoteDate).toBeDefined();
    });
  });

  describe("Notes Timestamps", () => {
    test("should automatically set createdAt and updatedAt", async () => {
      const note = await Notes.create({
        escalationId: testEscalation._id,
        content: "Timestamp test",
        createdBy: "Agent",
      });

      expect(note.createdAt).toBeInstanceOf(Date);
      expect(note.updatedAt).toBeInstanceOf(Date);
    });

    test("should update updatedAt on modification", async () => {
      const note = await Notes.create({
        escalationId: testEscalation._id,
        content: "Original",
        createdBy: "Agent",
      });

      const originalUpdatedAt = note.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      note.content = "Modified";
      await note.save();

      expect(note.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });
  });

  describe("Notes and Escalation Relationship", () => {
    test("should allow multiple notes for one escalation", async () => {
      const notes = [
        "Initial assessment completed",
        "Contacted customer for more details",
        "Issue identified and solution proposed",
        "Waiting for customer approval",
        "Issue resolved",
      ];

      for (const content of notes) {
        await Notes.create({
          escalationId: testEscalation._id,
          content: content,
          createdBy: "Agent",
        });
      }

      const allNotes = await Notes.find({ escalationId: testEscalation._id });
      expect(allNotes).toHaveLength(5);
    });
  });
});
