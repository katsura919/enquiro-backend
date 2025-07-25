// Handles real-time messaging events for chat rooms
module.exports = function(io, socket) {
  // Listen for send_message event from agent or user
  socket.on('send_message', ({ room, message, senderId }) => {
    // Broadcast message to everyone in the room
    io.to(room).emit('receive_message', { message, senderId, room, timestamp: Date.now() });
  });

  // Listen for typing indicator
  socket.on('typing', ({ room, senderId }) => {
    io.to(room).emit('typing', { senderId });
  });

  // Listen for stop typing indicator
  socket.on('stop_typing', ({ room, senderId }) => {
    io.to(room).emit('stop_typing', { senderId });
  });

  // Listen for message read receipt
  socket.on('message_read', ({ room, messageId, readerId }) => {
    io.to(room).emit('message_read', { messageId, readerId });
  });

  // Listen for chat end event
  socket.on('end_chat', ({ room, senderId }) => {
    io.to(room).emit('chat_ended', { senderId, room, timestamp: Date.now() });
  });

  // Listen for agent/user leaving the room
  socket.on('leave_room', ({ room, senderId }) => {
    socket.leave(room);
    io.to(room).emit('user_left', { senderId, room });
  });
};
