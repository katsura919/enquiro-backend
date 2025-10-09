const notificationService = require('../../services/notificationService');

/**
 * Get all notifications for a business
 */
const getNotifications = async (req, res) => {
  try {
    const { businessId } = req.query;
    const { limit, skip, unreadOnly } = req.query;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    const options = {
      limit: limit ? parseInt(limit) : 50,
      skip: skip ? parseInt(skip) : 0,
      unreadOnly: unreadOnly === 'true'
    };

    const notifications = await notificationService.getNotifications(
      businessId,
      options
    );

    res.json(notifications);
  } catch (error) {
    console.error('Error getting notifications:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get unread notification count
 */
const getUnreadCount = async (req, res) => {
  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    const count = await notificationService.getUnreadCount(businessId);

    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mark a notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (!notificationId) {
      return res.status(400).json({ error: 'notificationId is required' });
    }

    const notification = await notificationService.markAsRead(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res) => {
  try {
    const { businessId } = req.body;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    const result = await notificationService.markAllAsRead(businessId);

    res.json({ 
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Delete a notification
 */
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    if (!notificationId) {
      return res.status(400).json({ error: 'notificationId is required' });
    }

    const notification = await notificationService.deleteNotification(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
