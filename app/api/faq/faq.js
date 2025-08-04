const FAQ = require('../../models/faqModel');

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

// Get all FAQs for a business
const getFAQs = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { category, isActive } = req.query;

    let filter = { businessId };
    
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const faqs = await FAQ.find(filter).sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      count: faqs.length,
      faqs 
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

// Search FAQs
const searchFAQs = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { query } = req.query;

    const faqs = await FAQ.find({
      businessId,
      isActive: true,
      $or: [
        { question: { $regex: query, $options: 'i' } },
        { answer: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    }).sort({ createdAt: -1 });

    res.json({ 
      success: true, 
      count: faqs.length,
      query: query.trim(),
      faqs 
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
  searchFAQs,
  getFAQCategories,
};
