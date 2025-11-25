const mongoose = require("mongoose");
const { connect, closeDatabase, clearDatabase } = require("../helpers/db");
const Policy = require("../../app/models/policy-model");
const Business = require("../../app/models/business-model");

describe("Policy Model Test", () => {
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

  describe("Policy Schema Validation", () => {
    test("should create a policy successfully with valid data", async () => {
      const validPolicy = {
        businessId: testBusiness._id,
        title: "Privacy Policy",
        content: "This is our privacy policy content...",
        type: "privacy",
        isActive: true,
        tags: ["privacy", "data", "security"],
      };

      const policy = new Policy(validPolicy);
      const savedPolicy = await policy.save();

      expect(savedPolicy._id).toBeDefined();
      expect(savedPolicy.title).toBe(validPolicy.title);
      expect(savedPolicy.content).toBe(validPolicy.content);
      expect(savedPolicy.type).toBe(validPolicy.type);
      expect(savedPolicy.isActive).toBe(true);
      expect(savedPolicy.tags).toHaveLength(3);
      expect(savedPolicy.createdAt).toBeDefined();
    });

    test("should fail to create policy without required fields", async () => {
      const policyWithoutRequired = new Policy({
        title: "Incomplete Policy",
      });

      let err;
      try {
        await policyWithoutRequired.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.businessId).toBeDefined();
      expect(err.errors.content).toBeDefined();
    });

    test("should create policy with only required fields", async () => {
      const minimalPolicy = {
        businessId: testBusiness._id,
        title: "Terms of Service",
        content: "These are our terms of service...",
      };

      const policy = new Policy(minimalPolicy);
      const savedPolicy = await policy.save();

      expect(savedPolicy._id).toBeDefined();
      expect(savedPolicy.isActive).toBe(true);
      expect(savedPolicy.tags).toHaveLength(0);
    });

    test("should set default values correctly", async () => {
      const policy = await Policy.create({
        businessId: testBusiness._id,
        title: "Default Policy",
        content: "Default content",
      });

      expect(policy.isActive).toBe(true);
      expect(policy.tags).toEqual([]);
    });

    test("should trim title and content fields", async () => {
      const policy = await Policy.create({
        businessId: testBusiness._id,
        title: "  Privacy Policy  ",
        content: "  This is the policy content.  ",
      });

      expect(policy.title).toBe("Privacy Policy");
      expect(policy.content).toBe("This is the policy content.");
    });

    test("should convert tags to lowercase", async () => {
      const policy = await Policy.create({
        businessId: testBusiness._id,
        title: "Test Policy",
        content: "Test content",
        tags: ["PRIVACY", "MixedCase", "lowercase"],
      });

      expect(policy.tags).toEqual(["privacy", "mixedcase", "lowercase"]);
    });
  });

  describe("Policy Query Operations", () => {
    test("should find policies by businessId", async () => {
      const anotherBusiness = await Business.create({
        name: "Another Business",
        slug: "another-business",
        category: "Retail",
      });

      await Policy.create({
        businessId: testBusiness._id,
        title: "Policy 1",
        content: "Content 1",
      });

      await Policy.create({
        businessId: testBusiness._id,
        title: "Policy 2",
        content: "Content 2",
      });

      await Policy.create({
        businessId: anotherBusiness._id,
        title: "Other Policy",
        content: "Other Content",
      });

      const businessPolicies = await Policy.find({
        businessId: testBusiness._id,
      });
      expect(businessPolicies).toHaveLength(2);
    });

    test("should find active policies only", async () => {
      await Policy.create({
        businessId: testBusiness._id,
        title: "Active Policy 1",
        content: "Content 1",
        isActive: true,
      });

      await Policy.create({
        businessId: testBusiness._id,
        title: "Active Policy 2",
        content: "Content 2",
        isActive: true,
      });

      await Policy.create({
        businessId: testBusiness._id,
        title: "Inactive Policy",
        content: "Content",
        isActive: false,
      });

      const activePolicies = await Policy.find({
        businessId: testBusiness._id,
        isActive: true,
      });

      expect(activePolicies).toHaveLength(2);
    });

    test("should find policies by type", async () => {
      await Policy.create({
        businessId: testBusiness._id,
        title: "Privacy Policy",
        content: "Privacy content",
        type: "privacy",
      });

      await Policy.create({
        businessId: testBusiness._id,
        title: "Terms of Service",
        content: "Terms content",
        type: "terms",
      });

      await Policy.create({
        businessId: testBusiness._id,
        title: "Cookie Policy",
        content: "Cookie content",
        type: "cookie",
      });

      const privacyPolicies = await Policy.find({ type: "privacy" });
      expect(privacyPolicies).toHaveLength(1);
      expect(privacyPolicies[0].title).toBe("Privacy Policy");
    });

    test("should update policy details", async () => {
      const policy = await Policy.create({
        businessId: testBusiness._id,
        title: "Original Title",
        content: "Original Content",
        type: "privacy",
      });

      policy.title = "Updated Title";
      policy.content = "Updated Content";
      policy.type = "terms";
      const updatedPolicy = await policy.save();

      expect(updatedPolicy.title).toBe("Updated Title");
      expect(updatedPolicy.content).toBe("Updated Content");
      expect(updatedPolicy.type).toBe("terms");
    });

    test("should deactivate policy", async () => {
      const policy = await Policy.create({
        businessId: testBusiness._id,
        title: "Active Policy",
        content: "Content",
        isActive: true,
      });

      policy.isActive = false;
      await policy.save();

      const deactivatedPolicy = await Policy.findById(policy._id);
      expect(deactivatedPolicy.isActive).toBe(false);
    });

    test("should populate businessId reference", async () => {
      const policy = await Policy.create({
        businessId: testBusiness._id,
        title: "Test Policy",
        content: "Test Content",
      });

      const populatedPolicy = await Policy.findById(policy._id).populate(
        "businessId"
      );

      expect(populatedPolicy.businessId.name).toBe("Test Business");
      expect(populatedPolicy.businessId.slug).toBe("test-business");
    });

    test("should delete policy", async () => {
      const policy = await Policy.create({
        businessId: testBusiness._id,
        title: "Delete Policy",
        content: "Delete Content",
      });

      await Policy.deleteOne({ _id: policy._id });
      const deletedPolicy = await Policy.findById(policy._id);

      expect(deletedPolicy).toBeNull();
    });
  });

  describe("Policy Tags", () => {
    test("should add tags to policy", async () => {
      const policy = await Policy.create({
        businessId: testBusiness._id,
        title: "Tagged Policy",
        content: "Tagged Content",
        tags: ["privacy", "gdpr", "compliance"],
      });

      expect(policy.tags).toHaveLength(3);
      expect(policy.tags).toContain("privacy");
      expect(policy.tags).toContain("gdpr");
      expect(policy.tags).toContain("compliance");
    });

    test("should update policy tags", async () => {
      const policy = await Policy.create({
        businessId: testBusiness._id,
        title: "Test Policy",
        content: "Test Content",
        tags: ["old", "tags"],
      });

      policy.tags = ["new", "updated", "tags"];
      await policy.save();

      const updated = await Policy.findById(policy._id);
      expect(updated.tags).toEqual(["new", "updated", "tags"]);
    });

    test("should find policies by tags", async () => {
      await Policy.create({
        businessId: testBusiness._id,
        title: "Policy 1",
        content: "Content 1",
        tags: ["privacy", "security"],
      });

      await Policy.create({
        businessId: testBusiness._id,
        title: "Policy 2",
        content: "Content 2",
        tags: ["legal", "compliance"],
      });

      const privacyPolicies = await Policy.find({ tags: "privacy" });
      expect(privacyPolicies).toHaveLength(1);
      expect(privacyPolicies[0].title).toBe("Policy 1");
    });
  });

  describe("Policy Types", () => {
    test("should store different policy types", async () => {
      const types = ["privacy", "terms", "cookie", "refund", "shipping"];

      for (const type of types) {
        const policy = await Policy.create({
          businessId: testBusiness._id,
          title: `${type} Policy`,
          content: `${type} content`,
          type: type,
        });

        expect(policy.type).toBe(type);
      }
    });

    test("should group policies by type", async () => {
      await Policy.create({
        businessId: testBusiness._id,
        title: "Privacy Policy 1",
        content: "Privacy content 1",
        type: "privacy",
      });

      await Policy.create({
        businessId: testBusiness._id,
        title: "Privacy Policy 2",
        content: "Privacy content 2",
        type: "privacy",
      });

      await Policy.create({
        businessId: testBusiness._id,
        title: "Terms Policy",
        content: "Terms content",
        type: "terms",
      });

      const privacyPolicies = await Policy.find({ type: "privacy" });
      const termsPolicies = await Policy.find({ type: "terms" });

      expect(privacyPolicies).toHaveLength(2);
      expect(termsPolicies).toHaveLength(1);
    });
  });
});
