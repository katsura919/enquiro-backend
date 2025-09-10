
const jwt = require('jsonwebtoken');
const Agent = require('../../models/agent-model');

// Fetch agent info using JWT token
const getAgentInfo = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    const agent = await Agent.findById(decoded.id).select('-password');
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Create a new agent
const createAgent = async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required.' });
    }
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    const agent = new Agent({ ...rest, password: hashedPassword });
    await agent.save();
    res.status(201).json(agent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Get all agents (optionally by business)
const getAgents = async (req, res) => {
  try {
    const filter = { deletedAt: null };
    if (req.query.businessId) filter.businessId = req.query.businessId;
    const agents = await Agent.find(filter);
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get agent by ID
const getAgentById = async (req, res) => {
  try {
    const agent = await Agent.findOne({ _id: req.params.id, deletedAt: null });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update agent
const updateAgent = async (req, res) => {
  try {
    const agent = await Agent.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      req.body,
      { new: true }
    );
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Soft delete agent
const deleteAgent = async (req, res) => {
  try {
    const agent = await Agent.findOne({ _id: req.params.id, deletedAt: null });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    
    await agent.softDelete();
    res.json({ message: 'Agent deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Restore deleted agent
const restoreAgent = async (req, res) => {
  try {
    const agent = await Agent.findOne({ _id: req.params.id, deletedAt: { $ne: null } });
    if (!agent) return res.status(404).json({ error: 'Deleted agent not found' });
    
    await agent.restore();
    res.json({ message: 'Agent restored successfully', agent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get agents by business ID
const getAgentsByBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const filter = { 
      businessId: businessId,
      deletedAt: null 
    };
    
    const agents = await Agent.find(filter).select('-password');
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Search agents by name (for case owner selection)
const searchAgents = async (req, res) => {
  try {
    const { search, businessId } = req.query;
    const filter = { deletedAt: null };
    if (businessId) filter.businessId = businessId;
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }
    const agents = await Agent.find(filter).select('_id name email');
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createAgent,
  getAgents,
  getAgentById,
  updateAgent,
  deleteAgent,
  restoreAgent,
  getAgentInfo,
  getAgentsByBusiness,
  searchAgents
};