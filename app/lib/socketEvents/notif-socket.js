const notificationService = require('../../services/notificationService');

/**
 * Attach notification event handlers to a socket connection
 * @param {Object} socket - Socket.io socket instance
 */
const attachNotificationHandlers = (socket) => {
  // Join business notification room
  socket.on('join_notification_room', async (data) => {
    try {
      const { businessId } = data;
      
      if (!businessId) {
        socket.emit('error', { message: 'businessId is required' });
        return;
      }

      const roomName = `notifications_${businessId}`;
      socket.join(roomName);
      
      console.log(`[NOTIFICATIONS] Business ${businessId} joined notification room: ${roomName}`);
      
      // Send current unread count
      const unreadCount = await notificationService.getUnreadCount(businessId);
      socket.emit('unread_count', { count: unreadCount });
      
    } catch (error) {
      console.error('[NOTIFICATIONS] Error joining notification room:', error);
      socket.emit('error', { message: 'Failed to join notification room' });
    }
  });

  // Leave notification room
  socket.on('leave_notification_room', (data) => {
    try {
      const { businessId } = data;
      const roomName = `notifications_${businessId}`;
      socket.leave(roomName);
      console.log(`[NOTIFICATIONS] Business ${businessId} left notification room: ${roomName}`);
    } catch (error) {
      console.error('[NOTIFICATIONS] Error leaving notification room:', error);
    }
  });

  // Mark notification as read via socket
  socket.on('mark_notification_read', async (data) => {
    try {
      const { notificationId, businessId } = data;
      
      await notificationService.markAsRead(notificationId);
      
      // Send updated unread count
      const unreadCount = await notificationService.getUnreadCount(businessId);
      socket.emit('unread_count', { count: unreadCount });
      
    } catch (error) {
      console.error('[NOTIFICATIONS] Error marking notification as read:', error);
      socket.emit('error', { message: 'Failed to mark notification as read' });
    }
  });

  // Mark all as read via socket
  socket.on('mark_all_notifications_read', async (data) => {
    try {
      const { businessId } = data;
      
      await notificationService.markAllAsRead(businessId);
      
      socket.emit('unread_count', { count: 0 });
      socket.emit('all_notifications_read');
      
    } catch (error) {
      console.error('[NOTIFICATIONS] Error marking all notifications as read:', error);
      socket.emit('error', { message: 'Failed to mark all notifications as read' });
    }
  });
};

/**
 * Emit a new notification to a business
 * @param {Object} io - Socket.io instance
 * @param {String} businessId - Business ID
 * @param {Object} notification - Notification object
 */
const emitNotification = (io, businessId, notification) => {
  const roomName = `notifications_${businessId}`;
  io.to(roomName).emit('new_notification', notification);
  console.log(`Notification emitted to room: ${roomName}`);
};

/**
 * Emit unread count update
 * @param {Object} io - Socket.io instance
 * @param {String} businessId - Business ID
 * @param {Number} count - Unread count
 */
const emitUnreadCount = (io, businessId, count) => {
  const roomName = `notifications_${businessId}`;
  io.to(roomName).emit('unread_count', { count });
};

module.exports = {
  attachNotificationHandlers,
  emitNotification,
  emitUnreadCount
};
