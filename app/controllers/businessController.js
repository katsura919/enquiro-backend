const Business = require('../models/businessModel');

// Create a business
const createBusiness = async (req, res) => {
  try {
    const { name, slug, description, logo, category, address } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ error: 'name and slug are required.' });
    }
    const business = new Business({ name, slug, description, logo, category, address });
    await business.save();
    res.status(201).json(business);
  } catch (err) {
    console.error('Error creating business:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get business by slug
const getBusinessBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const business = await Business.findOne({ slug });
    if (!business) {
      return res.status(404).json({ error: 'Business not found.' });
    }
    res.json(business);
  } catch (err) {
    console.error('Error fetching business by slug:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get all businesses
const getBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find().sort({ createdAt: -1 });
    res.json(businesses);
  } catch (err) {
    console.error('Error fetching businesses:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get one business by ID
const getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;
    const business = await Business.findById(id);
    if (!business) return res.status(404).json({ error: 'Business not found.' });
    res.json(business);
  } catch (err) {
    console.error('Error fetching business by ID:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Update a business by ID
const updateBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, logo, category, address } = req.body;
    const business = await Business.findByIdAndUpdate(
      id,
      { name, slug, description, logo, category, address },
      { new: true, runValidators: true }
    );
    if (!business) return res.status(404).json({ error: 'Business not found.' });
    res.json(business);
  } catch (err) {
    console.error('Error updating business:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Delete a business by ID
const deleteBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const business = await Business.findByIdAndDelete(id);
    if (!business) return res.status(404).json({ error: 'Business not found.' });
    res.json({ message: 'Business deleted successfully.' });
  } catch (err) {
    console.error('Error deleting business:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = { createBusiness, getBusinesses, getBusinessById, updateBusiness, deleteBusiness, getBusinessBySlug }; 