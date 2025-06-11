const Escalation = require('../models/escalationModel');
const Business = require('../models/businessModel');
const Session = require('../models/sessionModel');
const { sendEscalationEmail } = require('../services/escalationEmail');

// Helper function to generate a unique case number
const generateUniqueCaseNumber = async () => {
  while (true) {
    // Generate a random 6-digit number
    const caseNumber = String(Math.floor(100000 + Math.random() * 900000));
    
    // Check if this number already exists
    const exists = await Escalation.findOne({ caseNumber });
    
    // If it doesn't exist, return it
    if (!exists) {
      return caseNumber;
    }
  }
};

// Create an escalation
const createEscalation = async (req, res) => {
  try {
    const { businessId, sessionId, customerName, customerEmail, customerPhone, concern, description } = req.body;
    if (!businessId || !sessionId || !customerName || !customerEmail || !concern) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // Fetch business details
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found.' });
    }

    const sessionExists = await Session.findById(sessionId);
    if (!sessionExists) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    // Generate unique case number
    const caseNumber = await generateUniqueCaseNumber();

    const escalation = new Escalation({ 
      businessId, 
      sessionId, 
      caseNumber,
      customerName, 
      customerEmail, 
      customerPhone, 
      concern, 
      description 
    });
    await escalation.save();

    // Send confirmation email to customer with business name
    try {
      await sendEscalationEmail(customerEmail, customerName, caseNumber, concern, business.name);
    } catch (emailError) {
      console.error('Failed to send escalation email:', emailError);
      // Continue with the response even if email fails
    }

    res.status(201).json(escalation);
  } catch (err) {
    console.error('Error creating escalation:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get all escalations for a specific business
const getEscalationsByBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const escalations = await Escalation.find({ businessId }).sort({ createdAt: -1 });
    res.json(escalations);
  } catch (err) {
    console.error('Error fetching escalations by business:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get all escalations for a specific session
const getEscalationsBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const escalations = await Escalation.find({ sessionId }).sort({ createdAt: -1 });
    res.json(escalations);
  } catch (err) {
    console.error('Error fetching escalations by session:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get one escalation by ID
const getEscalationById = async (req, res) => {
  try {
    const { id } = req.params;
    const escalation = await Escalation.findById(id);
    if (!escalation) return res.status(404).json({ error: 'Escalation not found.' });
    res.json(escalation);
  } catch (err) {
    console.error('Error fetching escalation by ID:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Update an escalation by ID
const updateEscalation = async (req, res) => {
  try {
    const { id } = req.params;
    const { caseNumber, customerName, customerEmail, customerPhone, concern, description } = req.body;
    const escalation = await Escalation.findByIdAndUpdate(
      id,
      { caseNumber, customerName, customerEmail, customerPhone, concern, description },
      { new: true, runValidators: true }
    );
    if (!escalation) return res.status(404).json({ error: 'Escalation not found.' });
    res.json(escalation);
  } catch (err) {
    console.error('Error updating escalation:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Delete an escalation by ID
const deleteEscalation = async (req, res) => {
  try {
    const { id } = req.params;
    const escalation = await Escalation.findByIdAndDelete(id);
    if (!escalation) return res.status(404).json({ error: 'Escalation not found.' });
    res.json({ message: 'Escalation deleted successfully.' });
  } catch (err) {
    console.error('Error deleting escalation:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = { createEscalation, getEscalationsByBusiness, getEscalationsBySession, getEscalationById, updateEscalation, deleteEscalation }; 