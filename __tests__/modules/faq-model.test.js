const mongoose = require("mongoose");
const { connect, closeDatabase, clearDatabase } = require("../helpers/db");
const FAQ = require("../../app/models/faq-model");
const Business = require("../../app/models/business-model");

describe("FAQ Model Test", () => {
  let testBusiness;

  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
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

  describe("FAQ Schema Validation", () => {
    test("should create an FAQ successfully with valid data", async () => {
      const validFAQ = {
        businessId: testBusiness._id,
        question: "What are your business hours?",
        answer: "We are open Monday to Friday, 9 AM to 5 PM.",
        category: "General",
        isActive: true,
        tags: ["hours", "schedule", "timing"],
      };

      const faq = new FAQ(validFAQ);
      const savedFAQ = await faq.save();

      expect(savedFAQ._id).toBeDefined();
      expect(savedFAQ.question).toBe(validFAQ.question);
      expect(savedFAQ.answer).toBe(validFAQ.answer);
      expect(savedFAQ.category).toBe(validFAQ.category);
      expect(savedFAQ.isActive).toBe(true);
      expect(savedFAQ.tags).toHaveLength(3);
      expect(savedFAQ.createdAt).toBeDefined();
    });

    test("should fail to create FAQ without required fields", async () => {
      const faqWithoutRequired = new FAQ({
        question: "Incomplete FAQ",
      });

      let err;
      try {
        await faqWithoutRequired.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.businessId).toBeDefined();
      expect(err.errors.answer).toBeDefined();
      expect(err.errors.category).toBeDefined();
    });

    test("should create FAQ with only required fields", async () => {
      const minimalFAQ = {
        businessId: testBusiness._id,
        question: "How do I contact support?",
        answer: "You can email us at support@example.com",
        category: "Support",
      };

      const faq = new FAQ(minimalFAQ);
      const savedFAQ = await faq.save();

      expect(savedFAQ._id).toBeDefined();
      expect(savedFAQ.isActive).toBe(true);
      expect(savedFAQ.tags).toHaveLength(0);
    });

    test("should set default values correctly", async () => {
      const faq = await FAQ.create({
        businessId: testBusiness._id,
        question: "Test question?",
        answer: "Test answer",
        category: "Test",
      });

      expect(faq.isActive).toBe(true);
      expect(faq.tags).toEqual([]);
    });

    test("should trim question and answer fields", async () => {
      const faq = await FAQ.create({
        businessId: testBusiness._id,
        question: "  What is your return policy?  ",
        answer: "  We accept returns within 30 days.  ",
        category: "Returns",
      });

      expect(faq.question).toBe("What is your return policy?");
      expect(faq.answer).toBe("We accept returns within 30 days.");
    });

    test("should convert tags to lowercase", async () => {
      const faq = await FAQ.create({
        businessId: testBusiness._id,
        question: "Test question?",
        answer: "Test answer",
        category: "Test",
        tags: ["UPPERCASE", "MixedCase", "lowercase"],
      });

      expect(faq.tags).toEqual(["uppercase", "mixedcase", "lowercase"]);
    });
  });

  describe("FAQ Query Operations", () => {
    test("should find FAQs by businessId", async () => {
      const anotherBusiness = await Business.create({
        name: "Another Business",
        slug: "another-business",
        category: "Retail",
      });

      await FAQ.create({
        businessId: testBusiness._id,
        question: "Question 1?",
        answer: "Answer 1",
        category: "General",
      });

      await FAQ.create({
        businessId: testBusiness._id,
        question: "Question 2?",
        answer: "Answer 2",
        category: "Support",
      });

      await FAQ.create({
        businessId: anotherBusiness._id,
        question: "Other Question?",
        answer: "Other Answer",
        category: "General",
      });

      const businessFAQs = await FAQ.find({ businessId: testBusiness._id });
      expect(businessFAQs).toHaveLength(2);
    });

    test("should find active FAQs only", async () => {
      await FAQ.create({
        businessId: testBusiness._id,
        question: "Active Question 1?",
        answer: "Answer 1",
        category: "General",
        isActive: true,
      });

      await FAQ.create({
        businessId: testBusiness._id,
        question: "Active Question 2?",
        answer: "Answer 2",
        category: "General",
        isActive: true,
      });

      await FAQ.create({
        businessId: testBusiness._id,
        question: "Inactive Question?",
        answer: "Answer",
        category: "General",
        isActive: false,
      });

      const activeFAQs = await FAQ.find({
        businessId: testBusiness._id,
        isActive: true,
      });

      expect(activeFAQs).toHaveLength(2);
    });

    test("should find FAQs by category", async () => {
      await FAQ.create({
        businessId: testBusiness._id,
        question: "General Question 1?",
        answer: "Answer 1",
        category: "General",
      });

      await FAQ.create({
        businessId: testBusiness._id,
        question: "General Question 2?",
        answer: "Answer 2",
        category: "General",
      });

      await FAQ.create({
        businessId: testBusiness._id,
        question: "Support Question?",
        answer: "Answer",
        category: "Support",
      });

      const generalFAQs = await FAQ.find({ category: "General" });
      expect(generalFAQs).toHaveLength(2);
    });

    test("should update FAQ details", async () => {
      const faq = await FAQ.create({
        businessId: testBusiness._id,
        question: "Original Question?",
        answer: "Original Answer",
        category: "General",
      });

      faq.question = "Updated Question?";
      faq.answer = "Updated Answer";
      faq.category = "Updated";
      const updatedFAQ = await faq.save();

      expect(updatedFAQ.question).toBe("Updated Question?");
      expect(updatedFAQ.answer).toBe("Updated Answer");
      expect(updatedFAQ.category).toBe("Updated");
    });

    test("should deactivate FAQ", async () => {
      const faq = await FAQ.create({
        businessId: testBusiness._id,
        question: "Active Question?",
        answer: "Answer",
        category: "General",
        isActive: true,
      });

      faq.isActive = false;
      await faq.save();

      const deactivatedFAQ = await FAQ.findById(faq._id);
      expect(deactivatedFAQ.isActive).toBe(false);
    });

    test("should populate businessId reference", async () => {
      const faq = await FAQ.create({
        businessId: testBusiness._id,
        question: "Test Question?",
        answer: "Test Answer",
        category: "Test",
      });

      const populatedFAQ = await FAQ.findById(faq._id).populate("businessId");

      expect(populatedFAQ.businessId.name).toBe("Test Business");
      expect(populatedFAQ.businessId.slug).toBe("test-business");
    });

    test("should delete FAQ", async () => {
      const faq = await FAQ.create({
        businessId: testBusiness._id,
        question: "Delete Question?",
        answer: "Delete Answer",
        category: "General",
      });

      await FAQ.deleteOne({ _id: faq._id });
      const deletedFAQ = await FAQ.findById(faq._id);

      expect(deletedFAQ).toBeNull();
    });
  });

  describe("FAQ Tags", () => {
    test("should add tags to FAQ", async () => {
      const faq = await FAQ.create({
        businessId: testBusiness._id,
        question: "Tagged Question?",
        answer: "Tagged Answer",
        category: "General",
        tags: ["shipping", "delivery", "tracking"],
      });

      expect(faq.tags).toHaveLength(3);
      expect(faq.tags).toContain("shipping");
      expect(faq.tags).toContain("delivery");
      expect(faq.tags).toContain("tracking");
    });

    test("should update FAQ tags", async () => {
      const faq = await FAQ.create({
        businessId: testBusiness._id,
        question: "Test Question?",
        answer: "Test Answer",
        category: "General",
        tags: ["old", "tags"],
      });

      faq.tags = ["new", "updated", "tags"];
      await faq.save();

      const updated = await FAQ.findById(faq._id);
      expect(updated.tags).toEqual(["new", "updated", "tags"]);
    });

    test("should find FAQs by tags", async () => {
      await FAQ.create({
        businessId: testBusiness._id,
        question: "Question 1?",
        answer: "Answer 1",
        category: "General",
        tags: ["shipping", "delivery"],
      });

      await FAQ.create({
        businessId: testBusiness._id,
        question: "Question 2?",
        answer: "Answer 2",
        category: "General",
        tags: ["payment", "billing"],
      });

      const shippingFAQs = await FAQ.find({ tags: "shipping" });
      expect(shippingFAQs).toHaveLength(1);
      expect(shippingFAQs[0].question).toBe("Question 1?");
    });
  });

  describe("FAQ Categories", () => {
    test("should group FAQs by category", async () => {
      await FAQ.create({
        businessId: testBusiness._id,
        question: "Q1?",
        answer: "A1",
        category: "Shipping",
      });

      await FAQ.create({
        businessId: testBusiness._id,
        question: "Q2?",
        answer: "A2",
        category: "Shipping",
      });

      await FAQ.create({
        businessId: testBusiness._id,
        question: "Q3?",
        answer: "A3",
        category: "Payment",
      });

      const shippingFAQs = await FAQ.find({ category: "Shipping" });
      const paymentFAQs = await FAQ.find({ category: "Payment" });

      expect(shippingFAQs).toHaveLength(2);
      expect(paymentFAQs).toHaveLength(1);
    });
  });
});
