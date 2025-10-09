const Notification = require('../models/notification-model');

/**
 * Create a notification for case creation
 */
const createCaseNotification = async ({
  businessId,
  caseId,
  caseTitle,
  casePriority,
  customerId,
  customerName,
  agentId,
  agentName
}) => {
  try {
    const notification = new Notification({
      businessId,
      type: 'case_created',
      caseId,
      caseTitle,
      casePriority,
      customerId,
      customerName,
      agentId,
      agentName,
      link: `/dashboard/escalations/${caseId}` // Link to case details page
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating case notification:', error);
    throw error;
  }
};

/**
 * Create a notification for rating received
 */
const createRatingNotification = async ({
  businessId,
  ratingId,
  rating,
  ratedAgentId,
  ratedAgentName,
  customerName,
  feedback
}) => {
  try {
    const notification = new Notification({
      businessId,
      type: 'rating_received',
      ratingId,
      rating,
      ratedAgentId,
      ratedAgentName,
      customerName,
      feedback,
      link: `/dashboard/ratings/${ratingId}` 
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating rating notification:', error);
    throw error;
  }
};

/**
 * Get all notifications for a business
 */
const getNotifications = async (businessId, options = {}) => {
  try {
    const { limit = 50, skip = 0, unreadOnly = false } = options;
    
    const query = { businessId };
    if (unreadOnly) {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    return notifications;
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw error;
  }
};

/**
 * Get unread notification count
 */
const getUnreadCount = async (businessId) => {
  try {
    const count = await Notification.countDocuments({
      businessId,
      read: false
    });

    return count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
};

/**
 * Mark a notification as read
 */
const markAsRead = async (notificationId) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { read: true },
      { new: true }
    );

    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a business
 */
const markAllAsRead = async (businessId) => {
  try {
    const result = await Notification.updateMany(
      { businessId, read: false },
      { read: true }
    );

    return result;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Delete a notification
 */
const deleteNotification = async (notificationId) => {
  try {
    const notification = await Notification.findByIdAndDelete(notificationId);
    return notification;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Delete old notifications (cleanup job)
 */
const deleteOldNotifications = async (daysOld = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
      read: true
    });

    console.log(`Deleted ${result.deletedCount} old notifications`);
    return result;
  } catch (error) {
    console.error('Error deleting old notifications:', error);
    throw error;
  }
};

module.exports = {
  createCaseNotification,
  createRatingNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteOldNotifications
};
