const Category = require('../models/categoryModel');
const Business = require('../models/businessModel');

// Create a category
exports.createCategory = async (req, res) => {
  try {
    const { businessId, name, description } = req.body;
    if (!businessId || !name) {
      return res.status(400).json({ error: 'businessId and name are required.' });
    }
    const businessExists = await Business.findById(businessId);
    if (!businessExists) {
      return res.status(404).json({ error: 'Business not found.' });
    }
    const category = new Category({ businessId, name, description });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get all categories for a specific business
exports.getCategoriesByBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const categories = await Category.find({ businessId }).sort({ createdAt: -1 });
    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get one category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ error: 'Category not found.' });
    res.json(category);
  } catch (err) {
    console.error('Error fetching category by ID:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Update a category by ID
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const category = await Category.findByIdAndUpdate(
      id,
      { name, description },
      { new: true, runValidators: true }
    );
    if (!category) return res.status(404).json({ error: 'Category not found.' });
    res.json(category);
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Delete a category by ID
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndDelete(id);
    if (!category) return res.status(404).json({ error: 'Category not found.' });
    res.json({ message: 'Category deleted successfully.' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: 'Server error.' });
  }
}; 