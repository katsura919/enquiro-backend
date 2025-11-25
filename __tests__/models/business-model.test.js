const mongoose = require("mongoose");
const { connect, closeDatabase, clearDatabase } = require("../helpers/db");
const Business = require("../../app/models/business-model");

describe("Business Model Test", () => {
  beforeAll(async () => {
    await connect();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("Business Schema Validation", () => {
    test("should create a business successfully with valid data", async () => {
      const validBusiness = {
        name: "Tech Solutions Inc",
        slug: "tech-solutions-inc",
        description: "A technology solutions company",
        logo: "https://example.com/logo.png",
        category: "Technology",
        address: "123 Tech Street, Silicon Valley, CA",
      };

      const business = new Business(validBusiness);
      const savedBusiness = await business.save();

      expect(savedBusiness._id).toBeDefined();
      expect(savedBusiness.name).toBe(validBusiness.name);
      expect(savedBusiness.slug).toBe(validBusiness.slug);
      expect(savedBusiness.description).toBe(validBusiness.description);
      expect(savedBusiness.logo).toBe(validBusiness.logo);
      expect(savedBusiness.category).toBe(validBusiness.category);
      expect(savedBusiness.address).toBe(validBusiness.address);
      expect(savedBusiness.createdAt).toBeDefined();
      expect(savedBusiness.updatedAt).toBeDefined();
    });

    test("should fail to create business without required fields", async () => {
      const businessWithoutRequiredFields = new Business({
        description: "Some description",
      });

      let err;
      try {
        await businessWithoutRequiredFields.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.name).toBeDefined();
      expect(err.errors.slug).toBeDefined();
    });

    test("should fail to create business with duplicate slug", async () => {
      const businessData = {
        name: "First Business",
        slug: "unique-slug",
        category: "Technology",
      };

      await Business.create(businessData);

      let err;
      try {
        await Business.create({
          name: "Second Business",
          slug: "unique-slug", // Same slug
          category: "Finance",
        });
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.code).toBe(11000); // Duplicate key error code
    });

    test("should create business with only required fields", async () => {
      const minimalBusiness = {
        name: "Minimal Business",
        slug: "minimal-business",
      };

      const business = new Business(minimalBusiness);
      const savedBusiness = await business.save();

      expect(savedBusiness._id).toBeDefined();
      expect(savedBusiness.name).toBe(minimalBusiness.name);
      expect(savedBusiness.slug).toBe(minimalBusiness.slug);
      expect(savedBusiness.description).toBeUndefined();
      expect(savedBusiness.logo).toBeUndefined();
      expect(savedBusiness.category).toBeUndefined();
      expect(savedBusiness.address).toBeUndefined();
    });

    test("should accept optional fields", async () => {
      const businessWithOptionalFields = {
        name: "Optional Fields Business",
        slug: "optional-fields-business",
        description: "This business has optional fields",
        logo: "https://example.com/optional-logo.png",
        category: "Retail",
        address: "456 Optional Ave, Test City",
      };

      const business = new Business(businessWithOptionalFields);
      const savedBusiness = await business.save();

      expect(savedBusiness.description).toBe(
        businessWithOptionalFields.description
      );
      expect(savedBusiness.logo).toBe(businessWithOptionalFields.logo);
      expect(savedBusiness.category).toBe(businessWithOptionalFields.category);
      expect(savedBusiness.address).toBe(businessWithOptionalFields.address);
    });
  });

  describe("Business Timestamps", () => {
    test("should automatically set createdAt and updatedAt timestamps", async () => {
      const business = await Business.create({
        name: "Timestamp Test Business",
        slug: "timestamp-test-business",
      });

      expect(business.createdAt).toBeInstanceOf(Date);
      expect(business.updatedAt).toBeInstanceOf(Date);
      expect(business.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
      expect(business.updatedAt.getTime()).toBeLessThanOrEqual(Date.now());
    });

    test("should update updatedAt timestamp on modification", async () => {
      const business = await Business.create({
        name: "Update Test Business",
        slug: "update-test-business",
      });

      const originalUpdatedAt = business.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      business.name = "Modified Business Name";
      await business.save();

      expect(business.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });

    test("should not change createdAt on update", async () => {
      const business = await Business.create({
        name: "CreatedAt Test Business",
        slug: "createdat-test-business",
      });

      const originalCreatedAt = business.createdAt;

      business.description = "Updated description";
      await business.save();

      expect(business.createdAt.getTime()).toBe(originalCreatedAt.getTime());
    });
  });

  describe("Business Query Operations", () => {
    test("should find business by slug", async () => {
      const businessData = {
        name: "Search Test Business",
        slug: "search-test-business",
        category: "Technology",
      };

      await Business.create(businessData);
      const foundBusiness = await Business.findOne({
        slug: "search-test-business",
      });

      expect(foundBusiness).toBeDefined();
      expect(foundBusiness.name).toBe(businessData.name);
      expect(foundBusiness.slug).toBe(businessData.slug);
    });

    test("should find business by name", async () => {
      const businessData = {
        name: "Unique Business Name",
        slug: "unique-business-name",
      };

      await Business.create(businessData);
      const foundBusiness = await Business.findOne({
        name: "Unique Business Name",
      });

      expect(foundBusiness).toBeDefined();
      expect(foundBusiness.name).toBe(businessData.name);
    });

    test("should find businesses by category", async () => {
      await Business.create({
        name: "Tech Business 1",
        slug: "tech-business-1",
        category: "Technology",
      });

      await Business.create({
        name: "Tech Business 2",
        slug: "tech-business-2",
        category: "Technology",
      });

      await Business.create({
        name: "Finance Business",
        slug: "finance-business",
        category: "Finance",
      });

      const techBusinesses = await Business.find({ category: "Technology" });
      expect(techBusinesses).toHaveLength(2);
      expect(techBusinesses.every((b) => b.category === "Technology")).toBe(
        true
      );
    });

    test("should update business data", async () => {
      const business = await Business.create({
        name: "Update Business",
        slug: "update-business",
      });

      business.name = "Updated Business Name";
      business.description = "New description";
      business.category = "Updated Category";
      const updatedBusiness = await business.save();

      expect(updatedBusiness.name).toBe("Updated Business Name");
      expect(updatedBusiness.description).toBe("New description");
      expect(updatedBusiness.category).toBe("Updated Category");
    });

    test("should delete business", async () => {
      const business = await Business.create({
        name: "Delete Business",
        slug: "delete-business",
      });

      await Business.deleteOne({ _id: business._id });
      const deletedBusiness = await Business.findById(business._id);

      expect(deletedBusiness).toBeNull();
    });

    test("should find all businesses", async () => {
      await Business.create({ name: "Business 1", slug: "business-1" });
      await Business.create({ name: "Business 2", slug: "business-2" });
      await Business.create({ name: "Business 3", slug: "business-3" });

      const allBusinesses = await Business.find();
      expect(allBusinesses).toHaveLength(3);
    });
  });

  describe("Business Slug Uniqueness", () => {
    test("should allow same name with different slugs", async () => {
      await Business.create({
        name: "Same Name Business",
        slug: "same-name-business-1",
      });

      const secondBusiness = await Business.create({
        name: "Same Name Business",
        slug: "same-name-business-2",
      });

      expect(secondBusiness._id).toBeDefined();
    });

    test("should enforce slug uniqueness case-sensitively", async () => {
      await Business.create({
        name: "Business 1",
        slug: "test-slug",
      });

      // Different case slug should work (MongoDB is case-sensitive by default)
      const secondBusiness = await Business.create({
        name: "Business 2",
        slug: "Test-Slug",
      });

      expect(secondBusiness._id).toBeDefined();
    });
  });
});
