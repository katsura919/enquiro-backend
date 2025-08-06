const Session = require('../../models/sessionModel');
const Business = require('../../models/businessModel');

// Create a session
const createSession = async (req, res) => {
  try {
    const { businessId, customerDetails } = req.body;
    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required.' });
    }
    const businessExists = await Business.findById(businessId);
    if (!businessExists) {
      return res.status(404).json({ error: 'Business not found.' });
    }
    const session = new Session({ businessId, customerDetails });
    await session.save();
    res.status(201).json(session);
  } catch (err) {
    console.error('Error creating session:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get all sessions for a specific business
const getSessionsByBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const sessions = await Session.find({ businessId }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) {
    console.error('Error fetching sessions:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get one session by ID
const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Session.findById(id);
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    res.json(session);
  } catch (err) {
    console.error('Error fetching session by ID:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Update a session by ID
const updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerDetails } = req.body;
    const session = await Session.findByIdAndUpdate(
      id,
      { customerDetails },
      { new: true, runValidators: true }
    );
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    res.json(session);
  } catch (err) {
    console.error('Error updating session:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Delete a session by ID
const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Session.findByIdAndDelete(id);
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    res.json({ message: 'Session deleted successfully.' });
  } catch (err) {
    console.error('Error deleting session:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = {
  createSession,
  getSessionsByBusiness,
  getSessionById,
  updateSession,
  deleteSession
};
