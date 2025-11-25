const mongoose = require("mongoose");
const { connect, closeDatabase, clearDatabase } = require("../helpers/db");
const Product = require("../../app/models/product-model");
const Business = require("../../app/models/business-model");

describe("Product Model Test", () => {
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

  describe("Product Schema Validation", () => {
    test("should create a product successfully with valid data", async () => {
      const validProduct = {
        businessId: testBusiness._id,
        name: "Test Product",
        sku: "PROD-001",
        description: "A test product description",
        category: "Electronics",
        price: {
          amount: 999.99,
          currency: "USD",
        },
        quantity: 50,
        isActive: true,
      };

      const product = new Product(validProduct);
      const savedProduct = await product.save();

      expect(savedProduct._id).toBeDefined();
      expect(savedProduct.name).toBe(validProduct.name);
      expect(savedProduct.sku).toBe(validProduct.sku);
      expect(savedProduct.description).toBe(validProduct.description);
      expect(savedProduct.category).toBe(validProduct.category);
      expect(savedProduct.price.amount).toBe(999.99);
      expect(savedProduct.price.currency).toBe("USD");
      expect(savedProduct.quantity).toBe(50);
      expect(savedProduct.isActive).toBe(true);
      expect(savedProduct.createdAt).toBeDefined();
    });

    test("should fail to create product without required fields", async () => {
      const productWithoutRequired = new Product({
        description: "Missing required fields",
      });

      let err;
      try {
        await productWithoutRequired.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.businessId).toBeDefined();
      expect(err.errors.name).toBeDefined();
    });

    test("should create product with only required fields", async () => {
      const minimalProduct = {
        businessId: testBusiness._id,
        name: "Minimal Product",
      };

      const product = new Product(minimalProduct);
      const savedProduct = await product.save();

      expect(savedProduct._id).toBeDefined();
      expect(savedProduct.name).toBe("Minimal Product");
      expect(savedProduct.isActive).toBe(true);
      expect(savedProduct.quantity).toBe(0);
    });

    test("should set default values correctly", async () => {
      const product = await Product.create({
        businessId: testBusiness._id,
        name: "Default Product",
      });

      expect(product.isActive).toBe(true);
      expect(product.quantity).toBe(0);
      expect(product.price.currency).toBe("PHP");
    });

    test("should trim name field", async () => {
      const product = await Product.create({
        businessId: testBusiness._id,
        name: "  Trimmed Product  ",
      });

      expect(product.name).toBe("Trimmed Product");
    });

    test("should validate minimum price amount", async () => {
      const invalidProduct = new Product({
        businessId: testBusiness._id,
        name: "Invalid Price Product",
        price: {
          amount: -100,
        },
      });

      let err;
      try {
        await invalidProduct.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors["price.amount"]).toBeDefined();
    });

    test("should validate minimum quantity", async () => {
      const invalidProduct = new Product({
        businessId: testBusiness._id,
        name: "Invalid Quantity Product",
        quantity: -10,
      });

      let err;
      try {
        await invalidProduct.save();
      } catch (error) {
        err = error;
      }

      expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
      expect(err.errors.quantity).toBeDefined();
    });
  });

  describe("Product Query Operations", () => {
    test("should find products by businessId", async () => {
      const anotherBusiness = await Business.create({
        name: "Another Business",
        slug: "another-business",
        category: "Retail",
      });

      await Product.create({
        businessId: testBusiness._id,
        name: "Product 1",
      });

      await Product.create({
        businessId: testBusiness._id,
        name: "Product 2",
      });

      await Product.create({
        businessId: anotherBusiness._id,
        name: "Other Product",
      });

      const businessProducts = await Product.find({
        businessId: testBusiness._id,
      });
      expect(businessProducts).toHaveLength(2);
    });

    test("should find active products only", async () => {
      await Product.create({
        businessId: testBusiness._id,
        name: "Active Product 1",
        isActive: true,
      });

      await Product.create({
        businessId: testBusiness._id,
        name: "Active Product 2",
        isActive: true,
      });

      await Product.create({
        businessId: testBusiness._id,
        name: "Inactive Product",
        isActive: false,
      });

      const activeProducts = await Product.find({
        businessId: testBusiness._id,
        isActive: true,
      });

      expect(activeProducts).toHaveLength(2);
      expect(activeProducts.every((p) => p.isActive === true)).toBe(true);
    });

    test("should find products by category", async () => {
      await Product.create({
        businessId: testBusiness._id,
        name: "Electronics Product 1",
        category: "Electronics",
      });

      await Product.create({
        businessId: testBusiness._id,
        name: "Electronics Product 2",
        category: "Electronics",
      });

      await Product.create({
        businessId: testBusiness._id,
        name: "Clothing Product",
        category: "Clothing",
      });

      const electronicsProducts = await Product.find({
        category: "Electronics",
      });
      expect(electronicsProducts).toHaveLength(2);
    });

    test("should find product by SKU", async () => {
      await Product.create({
        businessId: testBusiness._id,
        name: "SKU Product",
        sku: "UNIQUE-SKU-123",
      });

      const product = await Product.findOne({ sku: "UNIQUE-SKU-123" });
      expect(product).toBeDefined();
      expect(product.name).toBe("SKU Product");
    });

    test("should update product details", async () => {
      const product = await Product.create({
        businessId: testBusiness._id,
        name: "Original Product",
        price: { amount: 100 },
        quantity: 10,
      });

      product.name = "Updated Product";
      product.price.amount = 150;
      product.quantity = 20;
      const updatedProduct = await product.save();

      expect(updatedProduct.name).toBe("Updated Product");
      expect(updatedProduct.price.amount).toBe(150);
      expect(updatedProduct.quantity).toBe(20);
    });

    test("should deactivate product", async () => {
      const product = await Product.create({
        businessId: testBusiness._id,
        name: "Active Product",
        isActive: true,
      });

      product.isActive = false;
      await product.save();

      const deactivatedProduct = await Product.findById(product._id);
      expect(deactivatedProduct.isActive).toBe(false);
    });

    test("should populate businessId reference", async () => {
      const product = await Product.create({
        businessId: testBusiness._id,
        name: "Populate Test Product",
      });

      const populatedProduct = await Product.findById(product._id).populate(
        "businessId"
      );

      expect(populatedProduct.businessId.name).toBe("Test Business");
      expect(populatedProduct.businessId.slug).toBe("test-business");
    });

    test("should delete product", async () => {
      const product = await Product.create({
        businessId: testBusiness._id,
        name: "Delete Product",
      });

      await Product.deleteOne({ _id: product._id });
      const deletedProduct = await Product.findById(product._id);

      expect(deletedProduct).toBeNull();
    });
  });

  describe("Product Pricing", () => {
    test("should store product with different currencies", async () => {
      const currencies = ["PHP", "USD", "EUR", "GBP"];

      for (const currency of currencies) {
        const product = await Product.create({
          businessId: testBusiness._id,
          name: `${currency} Product`,
          price: {
            amount: 100,
            currency: currency,
          },
        });

        expect(product.price.currency).toBe(currency);
      }
    });

    test("should update product price", async () => {
      const product = await Product.create({
        businessId: testBusiness._id,
        name: "Price Update Product",
        price: { amount: 100, currency: "PHP" },
      });

      product.price.amount = 150;
      product.price.currency = "USD";
      await product.save();

      const updated = await Product.findById(product._id);
      expect(updated.price.amount).toBe(150);
      expect(updated.price.currency).toBe("USD");
    });
  });

  describe("Product Inventory", () => {
    test("should track product quantity", async () => {
      const product = await Product.create({
        businessId: testBusiness._id,
        name: "Inventory Product",
        quantity: 100,
      });

      expect(product.quantity).toBe(100);
    });

    test("should update quantity on stock changes", async () => {
      const product = await Product.create({
        businessId: testBusiness._id,
        name: "Stock Product",
        quantity: 50,
      });

      // Simulate selling 10 items
      product.quantity -= 10;
      await product.save();

      expect(product.quantity).toBe(40);
    });

    test("should find out-of-stock products", async () => {
      await Product.create({
        businessId: testBusiness._id,
        name: "In Stock 1",
        quantity: 10,
      });

      await Product.create({
        businessId: testBusiness._id,
        name: "Out of Stock",
        quantity: 0,
      });

      const outOfStock = await Product.find({
        businessId: testBusiness._id,
        quantity: 0,
      });

      expect(outOfStock).toHaveLength(1);
      expect(outOfStock[0].name).toBe("Out of Stock");
    });
  });
});
