const Product = require('../../models/product-model');

// Create new Product
const createProduct = async (req, res) => {
  try {
    const { businessId, name, sku, description, category, price, quantity, isActive } = req.body;

    const product = new Product({
      businessId,
      name,
      sku,
      description,
      category,
      price,
      quantity,
      isActive
    });

    await product.save();
    res.status(201).json({ 
      success: true, 
      product 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get all Products for a business
const getProducts = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { category, isActive, inStock } = req.query;

    let filter = { businessId };
    
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (inStock !== undefined) {
      if (inStock === 'true') {
        filter.quantity = { $gt: 0 };
      } else if (inStock === 'false') {
        filter.quantity = 0;
      }
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      count: products.length,
      products 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get single Product by ID
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findById(id);
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    res.json({ 
      success: true, 
      product 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get Product by SKU
const getProductBySku = async (req, res) => {
  try {
    const { businessId, sku } = req.params;
    
    const product = await Product.findOne({ businessId, sku, isActive: true });
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    res.json({ 
      success: true, 
      product 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Update Product
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, sku, description, category, price, quantity, isActive } = req.body;

    const product = await Product.findByIdAndUpdate(
      id,
      { name, sku, description, category, price, quantity, isActive },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    res.json({ 
      success: true, 
      product 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Delete Product
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Product deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Search Products
const searchProducts = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { query } = req.query;

    const products = await Product.find({
      businessId,
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
        { sku: { $regex: query, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      count: products.length,
      query: query.trim(),
      products 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get Product categories for a business
const getProductCategories = async (req, res) => {
  try {
    const { businessId } = req.params;

    const categories = await Product.distinct('category', { 
      businessId, 
      isActive: true 
    });

    res.json({ 
      success: true, 
      categories 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get Products by category
const getProductsByCategory = async (req, res) => {
  try {
    const { businessId, category } = req.params;

    const products = await Product.find({
      businessId,
      category,
      isActive: true
    }).sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      count: products.length,
      category,
      products 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Update Product quantity (for inventory management)
const updateProductQuantity = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity < 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Quantity cannot be negative' 
      });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { quantity },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Product quantity updated successfully', 
      product 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  getProductBySku,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductCategories,
  getProductsByCategory,
  updateProductQuantity,
};
