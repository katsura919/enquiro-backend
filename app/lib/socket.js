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
    // Customer requests chat (using escalationId)
    socket.on('request_chat', async ({ businessId, escalationId }) => {
      socket.join(`queue_${businessId}`);
      await ChatQueue.create({ businessId, escalationId });
      assignAgent(businessId, escalationId);
    });

    // Helper: Assign available agent to next user in queue and join both to a chat room
    async function assignAgent(businessId, escalationId) {
      const availableAgentStatus = await AgentStatus.findOne({ businessId, status: 'available' });
      if (!availableAgentStatus) return;
      const nextInQueue = await ChatQueue.findOne({ businessId, escalationId, status: 'waiting' }).sort({ requestedAt: 1 });
      if (!nextInQueue) return;

      // Assign agent to user
      await ChatQueue.findByIdAndUpdate(nextInQueue._id, { status: 'assigned', agentId: availableAgentStatus.agentId });
      await AgentStatus.findOneAndUpdate(
        { agentId: availableAgentStatus.agentId, businessId },
        { status: 'busy' }
      );

      // Create chat room and join both agent and customer sockets
      const room = `chat_${escalationId}`;
      const agentSocketId = agentSockets[businessId]?.[availableAgentStatus.agentId];
      if (agentSocketId) {
        io.sockets.sockets.get(agentSocketId)?.join(room);
      }
      // User socket should have joined with their userId
      io.sockets.sockets.forEach((s) => {
        if (s.rooms.has(escalationId)) {
          s.join(room);
        }
      });

      // Notify both agent and customer that chat has started
      io.to(room).emit('chat_started', {
        agentId: availableAgentStatus.agentId,
        escalationId,
        room
      });
    }

    // User joins with their userId for direct messaging
    // Customer joins with escalationId for direct messaging
    socket.on('join_escalation', ({ escalationId }) => {
      socket.join(escalationId);
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
