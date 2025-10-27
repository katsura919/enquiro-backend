
const jwt = require('jsonwebtoken');
const Agent = require('../../models/agent-model');
const { uploadToCloudinary, deleteFromCloudinary, upload } = require('../../services/fileUploadService');

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
    const { password, email, ...rest } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    // Check if email already exists (manual check as fallback)
    const existingAgent = await Agent.findOne({ email: email });
    if (existingAgent) {
      return res.status(409).json({ error: 'Email address is already taken. Please use a different email.' });
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);
    const agent = new Agent({ email, ...rest, password: hashedPassword });
    await agent.save();
    res.status(201).json(agent);
  } catch (err) {
    // Check if it's a duplicate key error (email already exists)
    if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
      return res.status(409).json({ error: 'Email address is already taken. Please use a different email.' });
    }
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
    const { search, page = 1, limit = 10 } = req.query;
    
    // Parse pagination parameters
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);
    const skip = (pageNumber - 1) * limitNumber;
    
    // Build query using the model's notDeleted helper
    let query = Agent.find().notDeleted().where({ businessId: businessId });
    
    // Add search functionality
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query = query.where({
        $or: [
          { name: searchRegex },
          { email: searchRegex }
        ]
      });
    }
    
    // Get total count for pagination (filtered results)
    const totalQuery = query.clone();
    const total = await totalQuery.countDocuments();
    
    // Get total count of all non-deleted agents for this business
    const totalAgentsInBusiness = await Agent.find()
      .notDeleted()
      .where({ businessId: businessId })
      .countDocuments();
    
    // Apply pagination and exclude password
    const agents = await query
      .select('-password')
      .skip(skip)
      .limit(limitNumber)
      .sort({ createdAt: -1 });
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;
    
    res.json({
      agents,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNumber,
        hasNextPage,
        hasPrevPage
      },
      totalAgentsInBusiness
    });
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

// Update agent's own profile
const updateAgentProfile = async (req, res) => {
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

    // Don't allow updating password, email, role, or businessId through this endpoint
    const { password, email, role, businessId, ...allowedUpdates } = req.body;
    
    const agent = await Agent.findOneAndUpdate(
      { _id: decoded.id, deletedAt: null },
      allowedUpdates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json(agent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Change agent's password
const changePassword = async (req, res) => {
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

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    if (newPassword.length > 50) {
      return res.status(400).json({ error: 'Password must be less than 50 characters.' });
    }

    // Check if new password is same as current
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password.' });
    }

    const agent = await Agent.findOne({ _id: decoded.id, deletedAt: null });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(currentPassword, agent.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    agent.password = hashedPassword;
    await agent.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Upload/update agent's profile picture
const uploadProfilePicture = async (req, res) => {
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

    // Check if file is provided
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    // Validate file type (only images allowed for profile pictures)
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image files are allowed for profile pictures.' });
    }

    // Find the agent
    const agent = await Agent.findOne({ _id: decoded.id, deletedAt: null });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    // Delete old profile picture from Cloudinary if it exists
    if (agent.profilePic) {
      try {
        // Extract public ID from the Cloudinary URL
        const urlParts = agent.profilePic.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = `chat-uploads/${publicIdWithExtension.split('.')[0]}`;
        await deleteFromCloudinary(publicId, 'image');
      } catch (deleteError) {
        console.error('Error deleting old profile picture:', deleteError);
        // Continue with upload even if deletion fails
      }
    }

    // Upload new profile picture to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file, {
      folder: 'chat-uploads/profile-pictures',
      transformation: [
        { width: 300, height: 300, crop: 'fill' },
        { quality: 'auto:good' }
      ]
    });

    // Update agent's profile picture URL
    agent.profilePic = uploadResult.url;
    await agent.save();

    res.json({
      message: 'Profile picture updated successfully',
      profilePic: uploadResult.url,
      uploadDetails: {
        publicId: uploadResult.publicId,
        size: uploadResult.size,
        format: uploadResult.format
      }
    });
  } catch (err) {
    console.error('Profile picture upload error:', err);
    res.status(500).json({ error: 'Failed to upload profile picture. Please try again.' });
  }
};

// Delete agent's profile picture
const deleteProfilePicture = async (req, res) => {
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

    // Find the agent
    const agent = await Agent.findOne({ _id: decoded.id, deletedAt: null });
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    if (!agent.profilePic) {
      return res.status(400).json({ error: 'No profile picture to delete.' });
    }

    // Delete profile picture from Cloudinary
    try {
      // Extract public ID from the Cloudinary URL
      const urlParts = agent.profilePic.split('/');
      const publicIdWithExtension = urlParts[urlParts.length - 1];
      const publicId = `chat-uploads/profile-pictures/${publicIdWithExtension.split('.')[0]}`;
      await deleteFromCloudinary(publicId, 'image');
    } catch (deleteError) {
      console.error('Error deleting profile picture from Cloudinary:', deleteError);
      // Continue with database update even if Cloudinary deletion fails
    }

    // Remove profile picture URL from agent
    agent.profilePic = null;
    await agent.save();

    res.json({ message: 'Profile picture deleted successfully' });
  } catch (err) {
    console.error('Profile picture delete error:', err);
    res.status(500).json({ error: 'Failed to delete profile picture. Please try again.' });
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
  searchAgents,
  updateAgentProfile,
  changePassword,
  uploadProfilePicture,
  deleteProfilePicture
};