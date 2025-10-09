
const Escalation = require('../../models/escalation-model');
const Business = require('../../models/business-model');
const Session = require('../../models/session-model');
const Activity = require('../../models/activity-model');
const Agent = require('../../models/agent-model');
const ChatbotSettings = require('../../models/chatbot-settings-model');
const notificationService = require('../../services/notificationService');
const { emitNotification } = require('../../lib/socketEvents/notif-socket');
const mongoose = require('mongoose');

// Helper function to generate a unique case number
const generateUniqueCaseNumber = async () => {
  while (true) {
    const caseNumber = String(Math.floor(100000 + Math.random() * 900000));
    const exists = await Escalation.findOne({ caseNumber });
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

    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found.' });
    }

    const sessionExists = await Session.findById(sessionId);
    if (!sessionExists) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    // Check chatbot settings for live chat enablement
    const chatbotSettings = await ChatbotSettings.findOne({ businessId });
    const liveChatEnabled = chatbotSettings?.enableLiveChat !== false;

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

    // Create notification for business owner
    try {
      const notification = await notificationService.createCaseNotification({
        businessId,
        caseId: escalation._id,
        caseTitle: concern,
        casePriority: escalation.priority || 'medium',
        customerId: sessionExists._id,
        customerName,
        agentId: null,
        agentName: 'System'
      });

      // Emit notification via socket
      const io = req.app.get('io');
      if (io) {
        emitNotification(io, businessId, notification);
      }
    } catch (notifError) {
      console.error('Error creating case notification:', notifError);
      // Don't fail the request if notification fails
    }

    // Handle response based on live chat settings
    if (liveChatEnabled) {
      // Existing live chat flow - return escalation data for socket connection
      res.status(201).json({
        _id: escalation._id,
        businessId: escalation.businessId,
        sessionId: escalation.sessionId,
        caseNumber: escalation.caseNumber,
        customerName: escalation.customerName,
        customerEmail: escalation.customerEmail,
        customerPhone: escalation.customerPhone,
        concern: escalation.concern,
        description: escalation.description,
        caseOwner: escalation.caseOwner,
        createdAt: escalation.createdAt,
        updatedAt: escalation.updatedAt,
        enableLiveChat: true
      });
    } else {
      // Form-only flow - return confirmation without email
      res.status(201).json({
        _id: escalation._id,
        caseNumber: escalation.caseNumber,
        enableLiveChat: false,
        message: "Your support request has been submitted successfully. Our team will review it and get back to you.",
        success: true
      });
    }
  } catch (err) {
    console.error('Error creating escalation:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get all escalations for a specific business, with optional status filter, search, and pagination
const getEscalationsByBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { status, search, page = 1, limit = 10 } = req.query;
    const query = { businessId };
    
    // Add status filter
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Add search functionality
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i'); // Case-insensitive search
      query.$or = [
        { caseNumber: searchRegex },
        { customerName: searchRegex },
        { customerEmail: searchRegex },
        { customerPhone: searchRegex },
        { concern: searchRegex },
        { description: searchRegex }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const escalations = await Escalation.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('caseOwner', 'name');
    const total = await Escalation.countDocuments(query);
    res.json({
      escalations,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      searchTerm: search || null, // Include search term in response for frontend reference
    });
  } catch (err) {
    console.error('Error fetching escalations by business:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get all escalations for a specific session
const getEscalationsBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const escalations = await Escalation.find({ sessionId })
      .sort({ createdAt: -1 })
      .populate('caseOwner', 'name');
    res.json(escalations);
  } catch (err) {
    console.error('Error fetching escalations by session:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get all escalations for a specific case owner (agent)
const getEscalationsByCaseOwner = async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;
    
    // Verify agent exists
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found.' });
    }
    
    const query = { caseOwner: agentId };
    
    // Add status filter if provided
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const escalations = await Escalation.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('caseOwner', 'name');
      
    const total = await Escalation.countDocuments(query);
    
    // Get total case counts for this agent (all cases regardless of status filter)
    const totalCases = await Escalation.countDocuments({ caseOwner: agentId });
    const totalResolvedCases = await Escalation.countDocuments({ 
      caseOwner: agentId, 
      status: 'resolved' 
    });
    
    res.json({
      escalations,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      agentId,
      status: status || 'all',
      counts: {
        totalCases,
        totalResolvedCases
      }
    });
  } catch (err) {
    console.error('Error fetching escalations by case owner:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get one escalation by ID
const getEscalationById = async (req, res) => {
  try {
    const { id } = req.params;
    const escalation = await Escalation.findById(id).populate('caseOwner', 'name');
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
    const { caseNumber, customerName, customerEmail, customerPhone, concern, description, caseOwner } = req.body;
    const escalation = await Escalation.findByIdAndUpdate(
      id,
      { caseNumber, customerName, customerEmail, customerPhone, concern, description, caseOwner },
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

// Update escalation status by ID
const updateEscalationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['escalated', 'resolved', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be "escalated", "resolved", or "pending".' });
    }

    const currentEscalation = await Escalation.findById(id);
    if (!currentEscalation) {
      return res.status(404).json({ error: 'Escalation not found.' });
    }

    const previousStatus = currentEscalation.status;

    const escalation = await Escalation.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    const activity = new Activity({
      escalationId: id,
      action: 'Change Status',
      details: `Set status from ${previousStatus.charAt(0).toUpperCase() + previousStatus.slice(1)} to ${status.charAt(0).toUpperCase() + status.slice(1)}.`
    });
    await activity.save();

    res.json(escalation);
  } catch (err) {
    console.error('Error updating escalation status:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Update case owner by escalation ID
const updateCaseOwner = async (req, res) => {
  try {
    const { id } = req.params;
    const { caseOwner } = req.body;
    
    // Handle case where caseOwner is empty string (unassigned)
    const caseOwnerValue = caseOwner === "" ? null : caseOwner;
    
    // If caseOwner is provided and not null, verify it's a valid agent
    if (caseOwnerValue) {
      const agent = await Agent.findById(caseOwnerValue);
      if (!agent) {
        return res.status(400).json({ error: 'Invalid agent ID. Agent not found.' });
      }
    }
    
    const escalation = await Escalation.findByIdAndUpdate(
      id,
      { caseOwner: caseOwnerValue },
      { new: true, runValidators: true }
    ).populate('caseOwner', 'name');
    
    if (!escalation) return res.status(404).json({ error: 'Escalation not found.' });
    
    // Log the case owner change activity
    const activityDetails = caseOwnerValue 
      ? `Case assigned to ${escalation.caseOwner?.name || 'agent'}`
      : 'Case unassigned';
      
    const activity = new Activity({
      escalationId: id,
      action: caseOwnerValue ? 'Case Owner Assigned' : 'Case Owner Unassigned',
      details: activityDetails
    });
    await activity.save();
    
    res.json({ success: true, data: escalation });
  } catch (err) {
    console.error('Error updating case owner:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Count escalations for a specific business with status breakdown
const countEscalationsByBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    
    // Verify business exists
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({ error: 'Business not found.' });
    }
    
    // Count escalations grouped by status
    const statusCounts = await Escalation.aggregate([
      { $match: { businessId: new mongoose.Types.ObjectId(businessId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Initialize counts for all possible statuses
    const result = {
      total: 0,
      escalated: 0,
      resolved: 0,
      pending: 0
    };
    
    // Fill in actual counts
    statusCounts.forEach(item => {
      result[item._id] = item.count;
      result.total += item.count;
    });
    
    res.json(result);
  } catch (err) {
    console.error('Error counting escalations by business:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = { 
  createEscalation, 
  getEscalationsByBusiness, 
  getEscalationsBySession, 
  getEscalationsByCaseOwner,
  getEscalationById, 
  updateEscalation, 
  deleteEscalation, 
  updateEscalationStatus,
  updateCaseOwner,
  countEscalationsByBusiness
};
