const Policy = require('../../models/policyModel');

// Create new Policy
const createPolicy = async (req, res) => {
  try {
    const { businessId, title, content, type, isActive, tags } = req.body;

    const policy = new Policy({
      businessId,
      title,
      content,
      type,
      isActive,
      tags
    });

    await policy.save();
    res.status(201).json({ 
      success: true, 
      policy 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get all Policies for a business
const getPolicies = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { type, isActive } = req.query;

    let filter = { businessId };
    
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const policies = await Policy.find(filter).sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      count: policies.length,
      policies 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get single Policy by ID
const getPolicyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const policy = await Policy.findById(id);
    
    if (!policy) {
      return res.status(404).json({ 
        success: false, 
        message: 'Policy not found' 
      });
    }

    res.json({ 
      success: true, 
      policy 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Update Policy
const updatePolicy = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, type, isActive, tags } = req.body;

    const policy = await Policy.findByIdAndUpdate(
      id,
      { title, content, type, isActive, tags },
      { new: true, runValidators: true }
    );

    if (!policy) {
      return res.status(404).json({ 
        success: false, 
        message: 'Policy not found' 
      });
    }

    res.json({ 
      success: true, 
      policy 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Delete Policy
const deletePolicy = async (req, res) => {
  try {
    const { id } = req.params;

    const policy = await Policy.findByIdAndDelete(id);

    if (!policy) {
      return res.status(404).json({ 
        success: false, 
        message: 'Policy not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Policy deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Search Policies
const searchPolicies = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: 'Query must be at least 2 characters' 
      });
    }

    const policies = await Policy.find({
      businessId,
      isActive: true,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { content: { $regex: query, $options: 'i' } },
        { type: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    }).sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      count: policies.length,
      query: query.trim(),
      policies 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get Policy types for a business
const getPolicyTypes = async (req, res) => {
  try {
    const { businessId } = req.params;

    const types = await Policy.distinct('type', { 
      businessId, 
      isActive: true 
    });

    res.json({ 
      success: true, 
      types 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get Policy by type
const getPolicyByType = async (req, res) => {
  try {
    const { businessId, type } = req.params;

    const policy = await Policy.findOne({
      businessId,
      type,
      isActive: true
    }).sort({ createdAt: -1 });

    if (!policy) {
      return res.status(404).json({ 
        success: false, 
        message: `${type} policy not found` 
      });
    }

    res.json({ 
      success: true, 
      policy 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

module.exports = {
  createPolicy,
  getPolicies,
  getPolicyById,
  updatePolicy,
  deletePolicy,
  searchPolicies,
  getPolicyTypes,
  getPolicyByType,
};
