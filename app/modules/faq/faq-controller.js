const FAQ = require('../../models/faq-model');

// Create new FAQ
const createFAQ = async (req, res) => {
  try {
    const { businessId, question, answer, category, isActive, tags } = req.body;

    const faq = new FAQ({
      businessId,
      question,
      answer,
      category,
      isActive,
      tags
    });

    await faq.save();
    res.status(201).json({ 
      success: true, 
      faq 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get all FAQs for a business with optional filters, search, and pagination
const getFAQs = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { category, isActive, search, page = 1, limit = 10 } = req.query;
    const query = { businessId };
    
    // Add category filter
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Add isActive filter
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Add search functionality
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i'); // Case-insensitive search
      query.$or = [
        { question: searchRegex },
        { answer: searchRegex },
        { category: searchRegex },
        { tags: { $in: [searchRegex] } }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const faqs = await FAQ.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await FAQ.countDocuments(query);
    
    res.json({ 
      success: true,
      faqs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      searchTerm: search || null, // Include search term in response for frontend reference
      category: category || null,
      isActive: isActive !== undefined ? (isActive === 'true') : null
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Get single FAQ by ID
const getFAQById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const faq = await FAQ.findById(id);
    
    if (!faq) {
      return res.status(404).json({ 
        success: false, 
        message: 'FAQ not found' 
      });
    }

    res.json({ 
      success: true, 
      faq 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Update FAQ
const updateFAQ = async (req, res) => {
  try {
    const { id } = req.params;
    const { question, answer, category, isActive, tags } = req.body;

    const faq = await FAQ.findByIdAndUpdate(
      id,
      { question, answer, category, isActive, tags },
      { new: true, runValidators: true }
    );

    if (!faq) {
      return res.status(404).json({ 
        success: false, 
        message: 'FAQ not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'FAQ updated successfully', 
      faq 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// Delete FAQ
const deleteFAQ = async (req, res) => {
  try {
    const { id } = req.params;

    const faq = await FAQ.findByIdAndDelete(id);

    if (!faq) {
      return res.status(404).json({ 
        success: false, 
        message: 'FAQ not found' 
      });
    }

    res.json({ 
      success: true, 
      message: 'FAQ deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};



// Get FAQ categories for a business
const getFAQCategories = async (req, res) => {
  try {
    const { businessId } = req.params;

    const categories = await FAQ.distinct('category', { 
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

module.exports = {
  createFAQ,
  getFAQs,
  getFAQById,
  updateFAQ,
  deleteFAQ,
  getFAQCategories,
};
