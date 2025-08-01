const { Server } = require('socket.io');
const ChatQueue = require('../models/chatQueueModel');
const AgentStatus = require('../models/agentStatusModel');
const Agent = require('../models/agentModel');
const Escalation = require('../models/escalationModel');
const messageEvents = require('./socketEvents/messageEvents');

function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  const agentSockets = {};

  io.on('connection', (socket) => {
    let joinedEscalationId = null;
    let joinedAgentId = null;
    let joinedBusinessId = null;
    let isCustomerConnection = false; // Track if this is a customer connection

    console.log(`[SOCKET] New connection: ${socket.id}`);

    // Agent joins status room
    socket.on('join_status', async ({ businessId, agentId }) => {
      try {
        socket.join(`status_${businessId}`);
        socket.join(`agent_${agentId}`);
        
        // Track agent socket
        agentSockets[businessId] = agentSockets[businessId] || {};
        agentSockets[businessId][agentId] = socket.id;

        joinedAgentId = agentId;
        joinedBusinessId = businessId;

        console.log(`[SOCKET] Agent joined status: agentId=${agentId}, businessId=${businessId}, socketId=${socket.id}`);

        // Update agent status to online (but not available for chat yet)
        await AgentStatus.findOneAndUpdate(
          { agentId, businessId },
          { status: 'online', lastActive: new Date() },
          { upsert: true }
        );

        io.to(`status_${businessId}`).emit('agent_status_update', { agentId, status: 'online' });
      } catch (error) {
        console.error('[SOCKET] Error in join_status:', error);
      }
    });

    // Agent updates status (online -> available -> away -> offline)
    socket.on('update_status', async ({ businessId, agentId, status }) => {
      try {
        await AgentStatus.findOneAndUpdate(
          { agentId, businessId },
          { status, lastActive: new Date() },
          { upsert: true }
        );

        console.log(`[SOCKET] Agent status updated: agentId=${agentId}, businessId=${businessId}, status=${status}`);
        io.to(`status_${businessId}`).emit('agent_status_update', { agentId, status });

        // When agent becomes available, check for waiting customers
        if (status === 'available') {
          await checkAndAssignWaitingCustomers(businessId);
        }
      } catch (error) {
        console.error('[SOCKET] Error in update_status:', error);
      }
    });

    // Customer requests chat (escalation)
    socket.on('request_chat', async ({ businessId, escalationId }) => {
      try {
        socket.join(`queue_${businessId}`);
        joinedBusinessId = businessId;
        joinedEscalationId = escalationId;
        isCustomerConnection = true; // Mark this as a customer connection

        console.log(`[SOCKET] Customer requesting chat: businessId=${businessId}, escalationId=${escalationId}, socketId=${socket.id}`);

        // Add to queue
        const queueEntry = await ChatQueue.create({ 
          businessId, 
          escalationId, 
          status: 'waiting', 
          requestedAt: new Date() 
        });

        console.log(`[SOCKET] Customer added to queue:`, queueEntry);

        // Try to assign an available agent immediately
        const immediateAssignment = await assignAgent(businessId, escalationId);
        if (immediateAssignment) {
          console.log(`[SOCKET] Customer ${escalationId} was immediately assigned to an agent`);
        } else {
          console.log(`[SOCKET] Customer ${escalationId} is waiting in queue - no available agents`);
        }
      } catch (error) {
        console.error('[SOCKET] Error in request_chat:', error);
        socket.emit('chat_error', { message: 'Failed to join chat queue' });
      }
    });

    // Customer joins escalation room
    socket.on('join_escalation', ({ escalationId }) => {
      socket.join(escalationId);
      joinedEscalationId = escalationId;
      isCustomerConnection = true; // Mark this as a customer connection
      console.log(`[SOCKET] Customer joined escalation room: escalationId=${escalationId}, socketId=${socket.id}`);
    });

    // Customer leaves queue
    socket.on('leave_queue', async ({ businessId, escalationId }) => {
      try {
        await ChatQueue.findOneAndUpdate(
          { businessId, escalationId, status: 'waiting' },
          { status: 'completed' }
        );
        console.log(`[SOCKET] Customer left queue: escalationId=${escalationId}`);
      } catch (error) {
        console.error('[SOCKET] Error in leave_queue:', error);
      }
    });

    // Check and assign waiting customers to available agents
    async function checkAndAssignWaitingCustomers(businessId) {
      try {
        const waitingCustomers = await ChatQueue.find({ 
          businessId, 
          status: 'waiting' 
        }).sort({ requestedAt: 1 });

        console.log(`[SOCKET] Checking for waiting customers in business ${businessId}: found ${waitingCustomers.length} waiting`);

        for (const customer of waitingCustomers) {
          const assigned = await assignAgent(businessId, customer.escalationId.toString());
          if (assigned) {
            console.log(`[SOCKET] Auto-assigned customer ${customer.escalationId} to agent`);
            break; // Only assign one customer per agent becoming available
          } else {
            console.log(`[SOCKET] Could not assign customer ${customer.escalationId} - no available agents`);
          }
        }
      } catch (error) {
        console.error('[SOCKET] Error checking waiting customers:', error);
      }
    }

    // Assign available agent to customer
    async function assignAgent(businessId, escalationId) {
      try {
        console.log(`[SOCKET] Attempting to assign agent: businessId=${businessId}, escalationId=${escalationId}`);

        // Find available agent
        const availableAgentStatus = await AgentStatus.findOne({ 
          businessId, 
          status: 'available' 
        });

        if (!availableAgentStatus) {
          console.log(`[SOCKET] No available agent for businessId=${businessId}`);
          return false;
        }

        // Find waiting customer in queue
        const queueEntry = await ChatQueue.findOne({ 
          businessId, 
          escalationId, 
          status: 'waiting' 
        });

        if (!queueEntry) {
          console.log(`[SOCKET] No waiting customer in queue for escalationId=${escalationId}`);
          return false;
        }

        // Update queue entry
        await ChatQueue.findByIdAndUpdate(queueEntry._id, {
          status: 'assigned',
          agentId: availableAgentStatus.agentId,
        });

        // Mark agent as in-chat (engaged with customer)
        await AgentStatus.findOneAndUpdate(
          { agentId: availableAgentStatus.agentId, businessId },
          { status: 'in-chat' }
        );

        // Broadcast status change to other agents in the business
        io.to(`status_${businessId}`).emit('agent_status_update', { 
          agentId: availableAgentStatus.agentId, 
          status: 'in-chat' 
        });

        const room = `chat_${escalationId}`;
        const agentId = availableAgentStatus.agentId;

        // Join agent to chat room
        let agentSocketId = agentSockets[businessId]?.[agentId];
        if (!agentSocketId) {
          // Try to find agent socket
          for (let [sid, s] of io.sockets.sockets) {
            if (s.rooms.has(`agent_${agentId}`)) {
              agentSocketId = sid;
              agentSockets[businessId][agentId] = sid;
              break;
            }
          }
        }

        if (agentSocketId && io.sockets.sockets.get(agentSocketId)) {
          io.sockets.sockets.get(agentSocketId).join(room);
          console.log(`[SOCKET] Agent joined chat room: agentId=${agentId}, room=${room}`);
        }

        // Join customer to chat room
        let customerJoined = false;
        io.sockets.sockets.forEach((s) => {
          if (s.rooms.has(escalationId)) {
            s.join(room);
            customerJoined = true;
            console.log(`[SOCKET] Customer joined chat room: escalationId=${escalationId}, room=${room}`);
          }
        });

        if (!customerJoined) {
          console.warn(`[SOCKET] No customer socket found for escalationId=${escalationId}`);
        }

        // Notify both parties that chat has started
        io.to(room).emit('chat_started', {
          agentId,
          escalationId,
          room,
          startedAt: Date.now()
        });

        // Send additional events for specific handling
        io.to(`agent_${agentId}`).emit('agent_assigned', {
          escalationId,
          room,
          customerInfo: await getCustomerInfo(escalationId)
        });

        io.to(escalationId).emit('agent_connected', {
          agentId,
          room,
          message: 'An agent has been assigned to help you'
        });

        console.log(`[SOCKET] Chat started successfully: agent=${agentId}, customer=${escalationId}, room=${room}`);
        return true;

      } catch (error) {
        console.error('[SOCKET] Error in assignAgent:', error);
        return false;
      }
    }

    // Helper function to get customer info
    async function getCustomerInfo(escalationId) {
      try {
        const escalation = await Escalation.findById(escalationId);
        return escalation ? {
          name: escalation.customerName,
          email: escalation.customerEmail,
          concern: escalation.concern
        } : null;
      } catch (error) {
        console.error('[SOCKET] Error getting customer info:', error);
        return null;
      }
    }

    // Disconnect handling
    socket.on('disconnect', async () => {
      try {
        if (joinedAgentId && joinedBusinessId) {
          // Check if agent was in-chat before disconnecting
          const agentStatus = await AgentStatus.findOne({
            agentId: joinedAgentId, 
            businessId: joinedBusinessId 
          });

          // If agent was in-chat, we need to handle the active chat
          if (agentStatus && agentStatus.status === 'in-chat') {
            // Find active chat for this agent
            const activeChat = await ChatQueue.findOne({
              businessId: joinedBusinessId,
              agentId: joinedAgentId,
              status: 'assigned'
            });

            if (activeChat) {
              console.log(`[SOCKET] Agent ${joinedAgentId} disconnected during active chat ${activeChat.escalationId}`);
              
              // Notify customer about agent disconnection
              const room = `chat_${activeChat.escalationId}`;
              io.to(room).emit('agent_disconnected_during_chat', {
                agentId: joinedAgentId,
                escalationId: activeChat.escalationId,
                message: 'Agent has disconnected. You will be reassigned to another agent.',
                disconnectedAt: Date.now()
              });

              // Reset chat queue entry back to waiting for reassignment
              await ChatQueue.findByIdAndUpdate(activeChat._id, {
                status: 'waiting',
                agentId: null
              });

              // Try to reassign to another available agent
              setTimeout(async () => {
                await assignAgent(joinedBusinessId, activeChat.escalationId.toString());
              }, 1000); // Small delay to ensure everything is cleaned up
            }
          }

          // Set agent status to offline
          await AgentStatus.findOneAndUpdate(
            { agentId: joinedAgentId, businessId: joinedBusinessId },
            { status: 'offline', lastActive: new Date() }
          );

          if (agentSockets[joinedBusinessId]) {
            delete agentSockets[joinedBusinessId][joinedAgentId];
          }

          io.to(`status_${joinedBusinessId}`).emit('agent_status_update', {
            agentId: joinedAgentId,
            status: 'offline',
          });

          console.log(`[SOCKET] Agent disconnected: agentId=${joinedAgentId}, businessId=${joinedBusinessId}`);
        }

        if (joinedEscalationId && isCustomerConnection) {
          // Only remove from queue if this is actually a customer socket disconnecting
          // and the queue entry is still waiting (not assigned to an agent)
          const queueEntry = await ChatQueue.findOne({ 
            escalationId: joinedEscalationId, 
            status: 'waiting' 
          });
          
          if (queueEntry) {
            await ChatQueue.findOneAndUpdate(
              { escalationId: joinedEscalationId, status: 'waiting' },
              { status: 'completed' }
            );
            console.log(`[SOCKET] Customer disconnected from waiting queue: escalationId=${joinedEscalationId}`);
          } else {
            console.log(`[SOCKET] Customer disconnected but was not in waiting queue: escalationId=${joinedEscalationId}`);
          }
        } else if (joinedEscalationId && !isCustomerConnection) {
          console.log(`[SOCKET] Agent disconnected with escalationId ${joinedEscalationId} but not clearing customer queue`);
        }
      } catch (error) {
        console.error('[SOCKET] Error on disconnect:', error);
      }
    });

    // Register message events
    messageEvents(io, socket);

    // Additional chat room management events
    socket.on('join_chat_room', ({ room, agentId, escalationId }) => {
      socket.join(room);
      console.log(`[SOCKET] Agent manually joined chat room: agentId=${agentId}, room=${room}, escalationId=${escalationId}`);
      
      // Confirm join to the agent
      socket.emit('agent_joined', { agentId, escalationId, room, joinedAt: Date.now() });
      
      // Notify customer that agent joined
      socket.to(room).emit('agent_connected', { agentId, escalationId, joinedAt: Date.now() });
    });

    socket.on('leave_chat_room', ({ room, agentId }) => {
      socket.leave(room);
      console.log(`[SOCKET] Agent left chat room: agentId=${agentId}, room=${room}`);
      
      // Notify others in room that agent left
      socket.to(room).emit('agent_disconnected', { agentId, leftAt: Date.now() });
    });

    // Typing indicators for live chat
    socket.on('agent_typing', ({ escalationId, agentId }) => {
      const room = `chat_${escalationId}`;
      socket.to(room).emit('agent_typing', { agentId, escalationId });
      console.log(`[SOCKET] Agent typing: agentId=${agentId}, escalationId=${escalationId}`);
    });

    socket.on('agent_stopped_typing', ({ escalationId, agentId }) => {
      const room = `chat_${escalationId}`;
      socket.to(room).emit('agent_stopped_typing', { agentId, escalationId });
    });

    socket.on('customer_typing', ({ escalationId }) => {
      const room = `chat_${escalationId}`;
      socket.to(room).emit('customer_typing', { escalationId, senderType: 'customer' });
      console.log(`[SOCKET] Customer typing: escalationId=${escalationId}`);
    });

    socket.on('customer_stopped_typing', ({ escalationId }) => {
      const room = `chat_${escalationId}`;
      socket.to(room).emit('customer_stopped_typing', { escalationId });
    });

    // End chat event with proper cleanup
    socket.on('end_chat', async ({ escalationId, agentId }) => {
      try {
        const room = `chat_${escalationId}`;
        
        // Update agent status back to away (was busy before chat)
        await AgentStatus.findOneAndUpdate(
          { agentId, businessId: joinedBusinessId },
          { status: 'away' }
        );

        // Broadcast status change to other agents in the business
        io.to(`status_${joinedBusinessId}`).emit('agent_status_update', { 
          agentId, 
          status: 'away' 
        });

        // Update queue entry to completed
        await ChatQueue.findOneAndUpdate(
          { escalationId, status: 'assigned' },
          { status: 'completed', completedAt: new Date() }
        );

        // Notify room about chat end
        io.to(room).emit('chat_ended', { escalationId, agentId, endedAt: Date.now() });
        
        // Leave the room
        socket.leave(room);
        
        console.log(`[SOCKET] Chat ended: escalationId=${escalationId}, agentId=${agentId}`);
      } catch (error) {
        console.error('[SOCKET] Error ending chat:', error);
      }
    });
  });

  console.log('Socket.IO initialized and live chat is ready.');
  return io;
}

module.exports = setupSocket;
