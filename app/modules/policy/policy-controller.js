const Policy = require('../../models/policy-model');

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

// Get all Policies for a business with optional filters, search, and pagination
const getPolicies = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { type, isActive, search, page = 1, limit = 10 } = req.query;
    const query = { businessId };
    
    // Add type filter
    if (type && type !== 'all') {
      query.type = type;
    }
    
    // Add isActive filter
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Add search functionality
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i'); // Case-insensitive search
      query.$or = [
        { title: searchRegex },
        { content: searchRegex },
        { type: searchRegex },
        { tags: { $in: [searchRegex] } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const policies = await Policy.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await Policy.countDocuments(query);
    
    res.json({ 
      success: true,
      policies,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      searchTerm: search || null, // Include search term in response for frontend reference
      type: type || null,
      isActive: isActive !== undefined ? (isActive === 'true') : null
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
