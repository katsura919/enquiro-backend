const mongoose = require("mongoose");
const { connect, closeDatabase, clearDatabase } = require("../helpers/db");
const QRSettings = require("../../app/models/qr-settings-model");
const Business = require("../../app/models/business-model");

describe("QRSettings Model Test", () => {
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

  describe("QRSettings Schema Validation", () => {
    test("should create QR settings successfully with valid data", async () => {
      const validSettings = {
        businessId: testBusiness._id,
        bgColor: "#ffffff",
        fgColor: "#000000",
        includeLogo: true,
        errorCorrectionLevel: "M",
      };

      const settings = new QRSettings(validSettings);
      const savedSettings = await settings.save();

      expect(savedSettings._id).toBeDefined();
      expect(savedSettings.businessId.toString()).toBe(
        testBusiness._id.toString()
      );
      expect(savedSettings.bgColor).toBe("#ffffff");
      expect(savedSettings.fgColor).toBe("#000000");
      expect(savedSettings.includeLogo).toBe(true);
      expect(savedSettings.errorCorrectionLevel).toBe("M");
      expect(savedSettings.createdAt).toBeDefined();
    });

    test("should fail to create QR settings without required businessId", async () => {
      const settingsWithoutBusinessId = new QRSettings({
        bgColor: "#ffffff",
      });

      let err;
      try {
        await settingsWithoutBusinessId.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.businessId).toBeDefined();
    });

    test("should create QR settings with only required field", async () => {
      const minimalSettings = {
        businessId: testBusiness._id,
      };

      const settings = new QRSettings(minimalSettings);
      const savedSettings = await settings.save();

      expect(savedSettings._id).toBeDefined();
      expect(savedSettings.bgColor).toBe("#ffffff");
      expect(savedSettings.fgColor).toBe("#000000");
      expect(savedSettings.includeLogo).toBe(true);
      expect(savedSettings.errorCorrectionLevel).toBe("M");
    });

    test("should set default values correctly", async () => {
      const settings = await QRSettings.create({
        businessId: testBusiness._id,
      });

      expect(settings.bgColor).toBe("#ffffff");
      expect(settings.fgColor).toBe("#000000");
      expect(settings.includeLogo).toBe(true);
      expect(settings.errorCorrectionLevel).toBe("M");
    });

    test("should validate hex color format for bgColor", async () => {
      const invalidSettings = new QRSettings({
        businessId: testBusiness._id,
        bgColor: "invalid-color",
      });

      let err;
      try {
        await invalidSettings.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.bgColor).toBeDefined();
    });

    test("should validate hex color format for fgColor", async () => {
      const invalidSettings = new QRSettings({
        businessId: testBusiness._id,
        fgColor: "#xyz123",
      });

      let err;
      try {
        await invalidSettings.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.fgColor).toBeDefined();
    });

    test("should accept valid hex color formats", async () => {
      const validColors = [
        "#ffffff",
        "#000000",
        "#ff0000",
        "#00ff00",
        "#0000ff",
        "#abc123",
      ];

      for (const color of validColors) {
        const settings = await QRSettings.create({
          businessId: testBusiness._id,
          bgColor: color,
          fgColor: color,
        });

        expect(settings.bgColor).toBe(color);
        expect(settings.fgColor).toBe(color);
        await QRSettings.deleteOne({ _id: settings._id });
      }
    });

    test("should accept valid error correction levels", async () => {
      const levels = ["L", "M", "Q", "H"];

      for (const level of levels) {
        const settings = await QRSettings.create({
          businessId: testBusiness._id,
          errorCorrectionLevel: level,
        });

        expect(settings.errorCorrectionLevel).toBe(level);
        await QRSettings.deleteOne({ _id: settings._id });
      }
    });

    test("should reject invalid error correction level", async () => {
      const invalidSettings = new QRSettings({
        businessId: testBusiness._id,
        errorCorrectionLevel: "X",
      });

      let err;
      try {
        await invalidSettings.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.errorCorrectionLevel).toBeDefined();
    });

    test("should enforce unique businessId constraint", async () => {
      await QRSettings.create({
        businessId: testBusiness._id,
        bgColor: "#ffffff",
      });

      let err;
      try {
        await QRSettings.create({
          businessId: testBusiness._id,
          bgColor: "#000000",
        });
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.code).toBe(11000); // Duplicate key error
    });
  });

  describe("QRSettings Query Operations", () => {
    test("should find QR settings by businessId", async () => {
      await QRSettings.create({
        businessId: testBusiness._id,
      });

      const settings = await QRSettings.findOne({
        businessId: testBusiness._id,
      });

      expect(settings).toBeDefined();
      expect(settings.businessId.toString()).toBe(testBusiness._id.toString());
    });

    test("should update QR settings", async () => {
      const settings = await QRSettings.create({
        businessId: testBusiness._id,
        bgColor: "#ffffff",
        fgColor: "#000000",
      });

      settings.bgColor = "#ff0000";
      settings.fgColor = "#0000ff";
      settings.includeLogo = false;
      settings.errorCorrectionLevel = "H";

      const updatedSettings = await settings.save();

      expect(updatedSettings.bgColor).toBe("#ff0000");
      expect(updatedSettings.fgColor).toBe("#0000ff");
      expect(updatedSettings.includeLogo).toBe(false);
      expect(updatedSettings.errorCorrectionLevel).toBe("H");
    });

    test("should populate businessId reference", async () => {
      const settings = await QRSettings.create({
        businessId: testBusiness._id,
      });

      const populatedSettings = await QRSettings.findById(
        settings._id
      ).populate("businessId");

      expect(populatedSettings.businessId.name).toBe("Test Business");
      expect(populatedSettings.businessId.slug).toBe("test-business");
    });

    test("should delete QR settings", async () => {
      const settings = await QRSettings.create({
        businessId: testBusiness._id,
      });

      await QRSettings.deleteOne({ _id: settings._id });
      const deletedSettings = await QRSettings.findById(settings._id);

      expect(deletedSettings).toBeNull();
    });
  });

  describe("QRSettings Color Customization", () => {
    test("should store custom background colors", async () => {
      const settings = await QRSettings.create({
        businessId: testBusiness._id,
        bgColor: "#f0f0f0",
      });

      expect(settings.bgColor).toBe("#f0f0f0");
    });

    test("should store custom foreground colors", async () => {
      const settings = await QRSettings.create({
        businessId: testBusiness._id,
        fgColor: "#333333",
      });

      expect(settings.fgColor).toBe("#333333");
    });

    test("should allow contrasting colors", async () => {
      const settings = await QRSettings.create({
        businessId: testBusiness._id,
        bgColor: "#ffffff",
        fgColor: "#000000",
      });

      expect(settings.bgColor).toBe("#ffffff");
      expect(settings.fgColor).toBe("#000000");
    });
  });

  describe("QRSettings Logo Options", () => {
    test("should enable logo inclusion", async () => {
      const settings = await QRSettings.create({
        businessId: testBusiness._id,
        includeLogo: true,
      });

      expect(settings.includeLogo).toBe(true);
    });

    test("should disable logo inclusion", async () => {
      const settings = await QRSettings.create({
        businessId: testBusiness._id,
        includeLogo: false,
      });

      expect(settings.includeLogo).toBe(false);
    });

    test("should toggle logo inclusion", async () => {
      const settings = await QRSettings.create({
        businessId: testBusiness._id,
        includeLogo: true,
      });

      settings.includeLogo = false;
      await settings.save();

      expect(settings.includeLogo).toBe(false);
    });
  });

  describe("QRSettings Error Correction", () => {
    test("should use Low error correction level", async () => {
      const settings = await QRSettings.create({
        businessId: testBusiness._id,
        errorCorrectionLevel: "L",
      });

      expect(settings.errorCorrectionLevel).toBe("L");
    });

    test("should use Medium error correction level", async () => {
      const settings = await QRSettings.create({
        businessId: testBusiness._id,
        errorCorrectionLevel: "M",
      });

      expect(settings.errorCorrectionLevel).toBe("M");
    });

    test("should use Quartile error correction level", async () => {
      const settings = await QRSettings.create({
        businessId: testBusiness._id,
        errorCorrectionLevel: "Q",
      });

      expect(settings.errorCorrectionLevel).toBe("Q");
    });

    test("should use High error correction level", async () => {
      const settings = await QRSettings.create({
        businessId: testBusiness._id,
        errorCorrectionLevel: "H",
      });

      expect(settings.errorCorrectionLevel).toBe("H");
    });
  });

  describe("QRSettings Timestamps", () => {
    test("should automatically set timestamps", async () => {
      const settings = await QRSettings.create({
        businessId: testBusiness._id,
      });

      expect(settings.createdAt).toBeInstanceOf(Date);
      expect(settings.updatedAt).toBeInstanceOf(Date);
    });

    test("should update updatedAt on modification", async () => {
      const settings = await QRSettings.create({
        businessId: testBusiness._id,
      });

      const originalUpdatedAt = settings.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      settings.bgColor = "#ff0000";
      await settings.save();

      expect(settings.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      );
    });
  });
});
