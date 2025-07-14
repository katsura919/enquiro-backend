const Activity = require('../../models/activityModel');

// Get all activities for a specific escalation
const getActivitiesByEscalation = async (req, res) => {
  try {
    const { escalationId } = req.params;
    
    if (!escalationId) {
      return res.status(400).json({ error: 'Escalation ID is required.' });
    }

    const activities = await Activity.find({ escalationId })
      .sort({ timestamp: -1 }); // Sort by timestamp, newest first
    
    res.json(activities);
  } catch (err) {
    console.error('Error fetching activities by escalation:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get all activities for a specific escalation with pagination
const getActivitiesByEscalationPaginated = async (req, res) => {
  try {
    const { escalationId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    if (!escalationId) {
      return res.status(400).json({ error: 'Escalation ID is required.' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const activities = await Activity.find({ escalationId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Activity.countDocuments({ escalationId });
    
    res.json({
      activities,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error('Error fetching paginated activities by escalation:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get a specific activity by ID
const getActivityById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const activity = await Activity.findById(id);
    
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found.' });
    }
    
    res.json(activity);
  } catch (err) {
    console.error('Error fetching activity by ID:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Create a manual activity log (for manual entries)
const createActivity = async (req, res) => {
  try {
    const { escalationId, action, details } = req.body;
    
    if (!escalationId || !action) {
      return res.status(400).json({ error: 'Escalation ID and action are required.' });
    }

    const activity = new Activity({
      escalationId,
      action,
      details
    });
    
    await activity.save();
    
    res.status(201).json(activity);
  } catch (err) {
    console.error('Error creating activity:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Delete an activity by ID
const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;
    
    const activity = await Activity.findByIdAndDelete(id);
    
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found.' });
    }
    
    res.json({ message: 'Activity deleted successfully.' });
  } catch (err) {
    console.error('Error deleting activity:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = {
  getActivitiesByEscalation,
  getActivitiesByEscalationPaginated,
  getActivityById,
  createActivity,
  deleteActivity
};
