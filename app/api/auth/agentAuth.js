
const Agent = require('../../models/agentModel');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Controller for agent login
// Expects req.body: { email, password }
// Returns: { token }
const loginAgent = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const agent = await Agent.findOne({ email });
    if (!agent) {
      return res.status(401).json(
        { 
          success: false,
          message: 'Invalid email or password.',
        });
    }

    // If password is not stored in the model, this will need to be updated
    const isMatch = await bcrypt.compare(password, agent.password);
    if (!isMatch) {
      return res.status(401).json(
       {
        success: false,
        message: 'Invalid password.'
       });
    }

    const payload = {
      id: agent._id,
      businessId: agent.businessId
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    return res.json({ token });
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = {
  loginAgent,
};