const Knowledge = require('../../models/knowledge-model');
const Business = require('../../models/business-model');

// Create a knowledge entry
const createKnowledge = async (req, res) => {
  try {
    const { businessId, categoryId, title, content } = req.body;

    if (!businessId || !categoryId || !title || !content) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const businessExists = await Business.findById(businessId);
    if (!businessExists) {
      return res.status(404).json({ error: 'Business not found.' });
    }

    const knowledge = new Knowledge({
      businessId,
      categoryId,
      title,
      content,
    });

    await knowledge.save();
    res.status(201).json(knowledge);
  } catch (err) {
    console.error('Error creating knowledge:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get all knowledge for a specific business
const getKnowledgeByBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const knowledge = await Knowledge.find({ businessId }).sort({ createdAt: -1 });
    res.json(knowledge);
  } catch (err) {
    console.error('Error fetching knowledge:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get one knowledge entry by ID
const getKnowledgeById = async (req, res) => {
  try {
    const { id } = req.params;
    const knowledge = await Knowledge.findById(id);
    if (!knowledge) return res.status(404).json({ error: 'Knowledge not found.' });
    res.json(knowledge);
  } catch (err) {
    console.error('Error fetching knowledge by ID:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Update a knowledge entry by ID
const updateKnowledge = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, categoryId } = req.body;
    const knowledge = await Knowledge.findByIdAndUpdate(
      id,
      { title, content, categoryId },
      { new: true, runValidators: true }
    );
    if (!knowledge) return res.status(404).json({ error: 'Knowledge not found.' });
    res.json(knowledge);
  } catch (err) {
    console.error('Error updating knowledge:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Delete a knowledge entry by ID
const deleteKnowledge = async (req, res) => {
  try {
    const { id } = req.params;
    const knowledge = await Knowledge.findByIdAndDelete(id);
    if (!knowledge) return res.status(404).json({ error: 'Knowledge not found.' });
    res.json({ message: 'Knowledge deleted successfully.' });
  } catch (err) {
    console.error('Error deleting knowledge:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = {
  createKnowledge,
  getKnowledgeByBusiness,
  getKnowledgeById,
  updateKnowledge,
  deleteKnowledge
};
