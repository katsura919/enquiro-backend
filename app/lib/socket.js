const { Server } = require('socket.io');
const ChatQueue = require('../models/chatQueueModel');
const AgentStatus = require('../models/agentStatusModel');
const Agent = require('../models/agentModel');
const messageEvents = require('./socketEvents/messageEvents');

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // In-memory agent sockets map: { businessId: { agentId: socketId } }
  const agentSockets = {};

  io.on('connection', (socket) => {
    // Agent joins status room
    socket.on('join_status', async ({ businessId, agentId }) => {
      socket.join(`status_${businessId}`);
      agentSockets[businessId] = agentSockets[businessId] || {};
      agentSockets[businessId][agentId] = socket.id;
      await AgentStatus.findOneAndUpdate(
        { agentId, businessId },
        { status: 'online', lastActive: new Date() },
        { upsert: true }
      );
      io.to(`status_${businessId}`).emit('agent_status_update', { agentId, status: 'online' });
    });

    // Agent updates status
    socket.on('update_status', async ({ businessId, agentId, status }) => {
      await AgentStatus.findOneAndUpdate(
        { agentId, businessId },
        { status, lastActive: new Date() },
        { upsert: true }
      );
      io.to(`status_${businessId}`).emit('agent_status_update', { agentId, status });
      if (status === 'available') {
        assignAgent(businessId);
      }
    });

    // User requests chat
    socket.on('request_chat', async ({ businessId, userId }) => {
      socket.join(`queue_${businessId}`);
      await ChatQueue.create({ businessId, userId });
      assignAgent(businessId);
    });

    // Helper: Assign available agent to next user in queue
    async function assignAgent(businessId) {
      const availableAgentStatus = await AgentStatus.findOne({ businessId, status: 'available' });
      if (!availableAgentStatus) return;
      const nextInQueue = await ChatQueue.findOne({ businessId, status: 'waiting' }).sort({ requestedAt: 1 });
      if (!nextInQueue) return;
      // Assign agent to user
      await ChatQueue.findByIdAndUpdate(nextInQueue._id, { status: 'assigned' });
      await AgentStatus.findOneAndUpdate(
        { agentId: availableAgentStatus.agentId, businessId },
        { status: 'busy' }
      );
      // Create chat room
      const room = `chat_${businessId}_${nextInQueue.userId}_${availableAgentStatus.agentId}`;
      io.to(agentSockets[businessId][availableAgentStatus.agentId]).socketsJoin(room);
      io.to(nextInQueue.userId.toString()).socketsJoin(room); // Assumes user socket joins with their userId
      io.to(room).emit('chat_started', {
        agentId: availableAgentStatus.agentId,
        userId: nextInQueue.userId,
        room
      });
    }

    // User joins with their userId for direct messaging
    socket.on('join_user', ({ userId }) => {
      socket.join(userId.toString());
    });

    // Handle disconnects (optional)
    socket.on('disconnect', () => {
      // ...handle agent/user disconnect logic if needed...
    });

    messageEvents(io, socket);
  });

  console.log('Socket.IO initialized and live chat is ready.');

  return io;
}

module.exports = setupSocket;
