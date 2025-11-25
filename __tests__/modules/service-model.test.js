const mongoose = require("mongoose");
const { connect, closeDatabase, clearDatabase } = require("../helpers/db");
const Service = require("../../app/models/service-model");
const Business = require("../../app/models/business-model");

describe("Service Model Test", () => {
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

  describe("Service Schema Validation", () => {
    test("should create a service successfully with valid data", async () => {
      const validService = {
        businessId: testBusiness._id,
        name: "Web Development",
        description: "Custom web development services",
        category: "Development",
        pricing: {
          type: "hourly",
          amount: 100,
          currency: "USD",
        },
        duration: "2-4 weeks",
        isActive: true,
      };

      const service = new Service(validService);
      const savedService = await service.save();

      expect(savedService._id).toBeDefined();
      expect(savedService.name).toBe(validService.name);
      expect(savedService.description).toBe(validService.description);
      expect(savedService.category).toBe(validService.category);
      expect(savedService.pricing.type).toBe("hourly");
      expect(savedService.pricing.amount).toBe(100);
      expect(savedService.pricing.currency).toBe("USD");
      expect(savedService.duration).toBe("2-4 weeks");
      expect(savedService.isActive).toBe(true);
      expect(savedService.createdAt).toBeDefined();
    });

    test("should fail to create service without required fields", async () => {
      const serviceWithoutRequired = new Service({
        description: "Missing required fields",
      });

      let err;
      try {
        await serviceWithoutRequired.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.businessId).toBeDefined();
      expect(err.errors.name).toBeDefined();
      expect(err.errors["pricing.type"]).toBeDefined();
    });

    test("should create service with only required fields", async () => {
      const minimalService = {
        businessId: testBusiness._id,
        name: "Minimal Service",
        pricing: {
          type: "fixed",
        },
      };

      const service = new Service(minimalService);
      const savedService = await service.save();

      expect(savedService._id).toBeDefined();
      expect(savedService.name).toBe("Minimal Service");
      expect(savedService.isActive).toBe(true);
    });

    test("should set default values correctly", async () => {
      const service = await Service.create({
        businessId: testBusiness._id,
        name: "Default Service",
        pricing: { type: "fixed" },
      });

      expect(service.isActive).toBe(true);
      expect(service.pricing.currency).toBe("USD");
    });

    test("should trim name field", async () => {
      const service = await Service.create({
        businessId: testBusiness._id,
        name: "  Trimmed Service  ",
        pricing: { type: "fixed" },
      });

      expect(service.name).toBe("Trimmed Service");
    });

    test("should accept valid pricing types", async () => {
      const pricingTypes = ["fixed", "hourly", "package", "quote"];

      for (const type of pricingTypes) {
        const service = await Service.create({
          businessId: testBusiness._id,
          name: `${type} Service`,
          pricing: { type: type },
        });

        expect(service.pricing.type).toBe(type);
      }
    });

    test("should reject invalid pricing type", async () => {
      const invalidService = new Service({
        businessId: testBusiness._id,
        name: "Invalid Service",
        pricing: { type: "invalid" },
      });

      let err;
      try {
        await invalidService.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors["pricing.type"]).toBeDefined();
    });

    test("should validate minimum pricing amount", async () => {
      const invalidService = new Service({
        businessId: testBusiness._id,
        name: "Invalid Price Service",
        pricing: {
          type: "fixed",
          amount: -100,
        },
      });

      let err;
      try {
        await invalidService.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors["pricing.amount"]).toBeDefined();
    });
  });

  describe("Service Query Operations", () => {
    test("should find services by businessId", async () => {
      const anotherBusiness = await Business.create({
        name: "Another Business",
        slug: "another-business",
        category: "Consulting",
      });

      await Service.create({
        businessId: testBusiness._id,
        name: "Service 1",
        pricing: { type: "fixed" },
      });

      await Service.create({
        businessId: testBusiness._id,
        name: "Service 2",
        pricing: { type: "hourly" },
      });

      await Service.create({
        businessId: anotherBusiness._id,
        name: "Other Service",
        pricing: { type: "package" },
      });

      const businessServices = await Service.find({
        businessId: testBusiness._id,
      });
      expect(businessServices).toHaveLength(2);
    });

    test("should find active services only", async () => {
      await Service.create({
        businessId: testBusiness._id,
        name: "Active Service 1",
        pricing: { type: "fixed" },
        isActive: true,
      });

      await Service.create({
        businessId: testBusiness._id,
        name: "Active Service 2",
        pricing: { type: "hourly" },
        isActive: true,
      });

      await Service.create({
        businessId: testBusiness._id,
        name: "Inactive Service",
        pricing: { type: "package" },
        isActive: false,
      });

      const activeServices = await Service.find({
        businessId: testBusiness._id,
        isActive: true,
      });

      expect(activeServices).toHaveLength(2);
    });

    test("should find services by category", async () => {
      await Service.create({
        businessId: testBusiness._id,
        name: "Development Service 1",
        category: "Development",
        pricing: { type: "hourly" },
      });

      await Service.create({
        businessId: testBusiness._id,
        name: "Development Service 2",
        category: "Development",
        pricing: { type: "fixed" },
      });

      await Service.create({
        businessId: testBusiness._id,
        name: "Design Service",
        category: "Design",
        pricing: { type: "package" },
      });

      const devServices = await Service.find({ category: "Development" });
      expect(devServices).toHaveLength(2);
    });

    test("should find services by pricing type", async () => {
      await Service.create({
        businessId: testBusiness._id,
        name: "Hourly Service",
        pricing: { type: "hourly", amount: 50 },
      });

      await Service.create({
        businessId: testBusiness._id,
        name: "Fixed Service",
        pricing: { type: "fixed", amount: 500 },
      });

      const hourlyServices = await Service.find({ "pricing.type": "hourly" });
      expect(hourlyServices).toHaveLength(1);
      expect(hourlyServices[0].name).toBe("Hourly Service");
    });

    test("should update service details", async () => {
      const service = await Service.create({
        businessId: testBusiness._id,
        name: "Original Service",
        pricing: { type: "fixed", amount: 100 },
      });

      service.name = "Updated Service";
      service.pricing.amount = 150;
      service.description = "Updated description";
      const updatedService = await service.save();

      expect(updatedService.name).toBe("Updated Service");
      expect(updatedService.pricing.amount).toBe(150);
      expect(updatedService.description).toBe("Updated description");
    });

    test("should deactivate service", async () => {
      const service = await Service.create({
        businessId: testBusiness._id,
        name: "Active Service",
        pricing: { type: "fixed" },
        isActive: true,
      });

      service.isActive = false;
      await service.save();

      const deactivatedService = await Service.findById(service._id);
      expect(deactivatedService.isActive).toBe(false);
    });

    test("should populate businessId reference", async () => {
      const service = await Service.create({
        businessId: testBusiness._id,
        name: "Populate Test Service",
        pricing: { type: "fixed" },
      });

      const populatedService = await Service.findById(service._id).populate(
        "businessId"
      );

      expect(populatedService.businessId.name).toBe("Test Business");
      expect(populatedService.businessId.slug).toBe("test-business");
    });

    test("should delete service", async () => {
      const service = await Service.create({
        businessId: testBusiness._id,
        name: "Delete Service",
        pricing: { type: "fixed" },
      });

      await Service.deleteOne({ _id: service._id });
      const deletedService = await Service.findById(service._id);

      expect(deletedService).toBeNull();
    });
  });

  describe("Service Pricing", () => {
    test("should store fixed pricing", async () => {
      const service = await Service.create({
        businessId: testBusiness._id,
        name: "Fixed Price Service",
        pricing: {
          type: "fixed",
          amount: 500,
          currency: "USD",
        },
      });

      expect(service.pricing.type).toBe("fixed");
      expect(service.pricing.amount).toBe(500);
    });

    test("should store hourly pricing", async () => {
      const service = await Service.create({
        businessId: testBusiness._id,
        name: "Hourly Service",
        pricing: {
          type: "hourly",
          amount: 75,
          currency: "USD",
        },
      });

      expect(service.pricing.type).toBe("hourly");
      expect(service.pricing.amount).toBe(75);
    });

    test("should store package pricing", async () => {
      const service = await Service.create({
        businessId: testBusiness._id,
        name: "Package Service",
        pricing: {
          type: "package",
          amount: 1000,
          currency: "USD",
        },
      });

      expect(service.pricing.type).toBe("package");
      expect(service.pricing.amount).toBe(1000);
    });

    test("should store quote pricing without amount", async () => {
      const service = await Service.create({
        businessId: testBusiness._id,
        name: "Custom Quote Service",
        pricing: {
          type: "quote",
        },
      });

      expect(service.pricing.type).toBe("quote");
      expect(service.pricing.amount).toBeUndefined();
    });

    test("should update pricing details", async () => {
      const service = await Service.create({
        businessId: testBusiness._id,
        name: "Price Update Service",
        pricing: { type: "fixed", amount: 100, currency: "USD" },
      });

      service.pricing.type = "hourly";
      service.pricing.amount = 150;
      service.pricing.currency = "EUR";
      await service.save();

      const updated = await Service.findById(service._id);
      expect(updated.pricing.type).toBe("hourly");
      expect(updated.pricing.amount).toBe(150);
      expect(updated.pricing.currency).toBe("EUR");
    });
  });

  describe("Service Duration", () => {
    test("should store service duration", async () => {
      const service = await Service.create({
        businessId: testBusiness._id,
        name: "Duration Service",
        pricing: { type: "fixed" },
        duration: "1-2 weeks",
      });

      expect(service.duration).toBe("1-2 weeks");
    });

    test("should update duration", async () => {
      const service = await Service.create({
        businessId: testBusiness._id,
        name: "Test Service",
        pricing: { type: "fixed" },
        duration: "1 week",
      });

      service.duration = "2-3 weeks";
      await service.save();

      const updated = await Service.findById(service._id);
      expect(updated.duration).toBe("2-3 weeks");
    });
  });
});
