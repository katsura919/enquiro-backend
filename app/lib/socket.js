const { Server } = require('socket.io');

// In-memory escalation queue
let escalationQueue = [];
let adminSocket = null;

function initSocket(server, allowedOrigins) {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Admin joins
    socket.on('admin-join', () => {
      adminSocket = socket;
      // Send current queue to admin
      socket.emit('queue-update', escalationQueue);
    });

    // Customer requests escalation
    socket.on('escalate', (data) => {
      // data: { sessionId, customerName, message }
      escalationQueue.push({ ...data, socketId: socket.id });
      if (adminSocket) {
        adminSocket.emit('queue-update', escalationQueue);
      }
    });

    // Admin picks up an escalation
    socket.on('pickup-escalation', (sessionId) => {
      const index = escalationQueue.findIndex(e => e.sessionId === sessionId);
      if (index !== -1) {
        const customer = escalationQueue.splice(index, 1)[0];
        // Notify customer
        io.to(customer.socketId).emit('escalation-picked-up', { admin: true });
        // Notify admin
        if (adminSocket) {
          adminSocket.emit('queue-update', escalationQueue);
        }
      }
    });

    // Relay messages between admin and customer
    socket.on('admin-message', ({ sessionId, message, toSocketId }) => {
      io.to(toSocketId).emit('admin-message', { sessionId, message });
    });
    socket.on('customer-message', ({ sessionId, message }) => {
      if (adminSocket) {
        adminSocket.emit('customer-message', { sessionId, message, fromSocketId: socket.id });
      }
    });

    socket.on('disconnect', () => {
      // Remove from queue if customer disconnects
      escalationQueue = escalationQueue.filter(e => e.socketId !== socket.id);
      if (adminSocket) {
        adminSocket.emit('queue-update', escalationQueue);
      }
      if (adminSocket && socket.id === adminSocket.id) {
        adminSocket = null;
      }
      console.log('User disconnected:', socket.id);
    });
  });
}

module.exports = { initSocket }; 