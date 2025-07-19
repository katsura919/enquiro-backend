const Service = require('../../models/serviceModel');

// Create new Service
const createService = async (req, res) => {
  try {
    const { businessId, name, description, category, pricing, duration, isActive } = req.body;

    const service = new Service({
      businessId,
      name,
      description,
      category,
      pricing,
      duration,
      isActive
    });

    await service.save();
    res.status(201).json({ 
      success: true, 
      service 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get all Services for a business
const getServices = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { category, isActive, pricingType } = req.query;

    let filter = { businessId };
    
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (pricingType) filter['pricing.type'] = pricingType;

    const services = await Service.find(filter).sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      count: services.length,
      services 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get single Service by ID
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const service = await Service.findById(id);
    
    if (!service) {
      return res.status(404).json({ 
        success: false, 
        message: 'Service not found' 
      });
    }

    res.json({ 
      success: true, 
      service 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Update Service
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, pricing, duration, isActive } = req.body;

    const service = await Service.findByIdAndUpdate(
      id,
      { name, description, category, pricing, duration, isActive },
      { new: true, runValidators: true }
    );

    if (!service) {
      return res.status(404).json({ 
        success: false, 
        message: 'Service not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Service updated successfully', 
      service 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Delete Service
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findByIdAndDelete(id);

    if (!service) {
      return res.status(404).json({ 
        success: false, 
        message: 'Service not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Service deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Search Services
const searchServices = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: 'Query must be at least 2 characters' 
      });
    }

    const services = await Service.find({
      businessId,
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      count: services.length,
      query: query.trim(),
      services 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get Service categories for a business
const getServiceCategories = async (req, res) => {
  try {
    const { businessId } = req.params;

    const categories = await Service.distinct('category', { 
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

// Get Services by category
const getServicesByCategory = async (req, res) => {
  try {
    const { businessId, category } = req.params;

    const services = await Service.find({
      businessId,
      category,
      isActive: true
    }).sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      count: services.length,
      category,
      services 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

module.exports = {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
  searchServices,
  getServiceCategories,
  getServicesByCategory,
};
