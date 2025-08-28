const Chat = require('../models/chat-model');
const Agent = require('../models/agent-model');
const Escalation = require('../models/escalation-model');

/**
 * Helper class for creating and storing system messages in chat
 */
class SystemMessageHelper {
  
  /**
   * Create a system message for agent joining chat
   * @param {string} businessId - Business ID
   * @param {string} sessionId - Session ID
   * @param {string} escalationId - Escalation ID
   * @param {string} agentId - Agent ID
   * @param {Object} io - Socket.io instance
   * @returns {Promise<Object>} Created chat message
   */
  static async agentJoined(businessId, sessionId, escalationId, agentId, io = null) {
    try {
      const agent = await Agent.findById(agentId).select('name');
      const agentName = agent ? agent.name : 'Agent';
      
      const message = `${agentName} has joined the chat`;
      
      const systemMessage = await this.createSystemMessage({
        businessId,
        sessionId,
        escalationId,
        message,
        systemMessageType: 'agent_joined',
        agentId
      });

      // Emit to chat room if io is available
      if (io && escalationId) {
        const room = `chat_${escalationId}`;
        io.to(room).emit('system_message', {
          ...systemMessage.toObject(),
          timestamp: systemMessage.createdAt
        });
      }

      return systemMessage;
    } catch (error) {
      console.error('[SystemMessage] Error creating agent joined message:', error);
      throw error;
    }
  }

  /**
   * Create a system message for agent leaving chat
   * @param {string} businessId - Business ID
   * @param {string} sessionId - Session ID
   * @param {string} escalationId - Escalation ID
   * @param {string} agentId - Agent ID
   * @param {Object} io - Socket.io instance
   * @param {string} reason - Reason for leaving (optional)
   * @returns {Promise<Object>} Created chat message
   */
  static async agentLeft(businessId, sessionId, escalationId, agentId, io = null, reason = null) {
    try {
      const agent = await Agent.findById(agentId).select('name');
      const agentName = agent ? agent.name : 'Agent';
      
      let message = `${agentName} has left the chat`;
      if (reason) {
        message += ` (${reason})`;
      }
      
      const systemMessage = await this.createSystemMessage({
        businessId,
        sessionId,
        escalationId,
        message,
        systemMessageType: 'agent_left',
        agentId
      });

      // Emit to chat room if io is available
      if (io && escalationId) {
        const room = `chat_${escalationId}`;
        io.to(room).emit('system_message', {
          ...systemMessage.toObject(),
          timestamp: systemMessage.createdAt,
          reason
        });
      }

      return systemMessage;
    } catch (error) {
      console.error('[SystemMessage] Error creating agent left message:', error);
      throw error;
    }
  }

  /**
   * Create a system message for customer joining chat
   * @param {string} businessId - Business ID
   * @param {string} sessionId - Session ID
   * @param {string} escalationId - Escalation ID
   * @param {Object} io - Socket.io instance
   * @returns {Promise<Object>} Created chat message
   */
  static async customerJoined(businessId, sessionId, escalationId, io = null) {
    try {
      const escalation = await Escalation.findById(escalationId).select('customerName');
      const customerName = escalation?.customerName || 'Customer';
      
      const message = `${customerName} has joined the chat`;
      
      const systemMessage = await this.createSystemMessage({
        businessId,
        sessionId,
        escalationId,
        message,
        systemMessageType: 'customer_joined'
      });

      // Emit to chat room if io is available
      if (io && escalationId) {
        const room = `chat_${escalationId}`;
        io.to(room).emit('system_message', {
          ...systemMessage.toObject(),
          timestamp: systemMessage.createdAt
        });
      }

      return systemMessage;
    } catch (error) {
      console.error('[SystemMessage] Error creating customer joined message:', error);
      throw error;
    }
  }

  /**
   * Create a system message for customer leaving chat
   * @param {string} businessId - Business ID
   * @param {string} sessionId - Session ID
   * @param {string} escalationId - Escalation ID
   * @param {Object} io - Socket.io instance
   * @param {string} reason - Reason for leaving (optional)
   * @returns {Promise<Object>} Created chat message
   */
  static async customerLeft(businessId, sessionId, escalationId, io = null, reason = null) {
    try {
      const escalation = await Escalation.findById(escalationId).select('customerName');
      const customerName = escalation?.customerName || 'Customer';
      
      let message = `${customerName} has left the chat`;
      if (reason) {
        message += ` (${reason})`;
      }
      
      const systemMessage = await this.createSystemMessage({
        businessId,
        sessionId,
        escalationId,
        message,
        systemMessageType: 'customer_left'
      });

      // Emit to chat room if io is available
      if (io && escalationId) {
        const room = `chat_${escalationId}`;
        io.to(room).emit('system_message', {
          ...systemMessage.toObject(),
          timestamp: systemMessage.createdAt,
          reason
        });
      }

      return systemMessage;
    } catch (error) {
      console.error('[SystemMessage] Error creating customer left message:', error);
      throw error;
    }
  }

  /**
   * Create a system message for chat starting
   * @param {string} businessId - Business ID
   * @param {string} sessionId - Session ID
   * @param {string} escalationId - Escalation ID
   * @param {string} agentId - Agent ID
   * @param {Object} io - Socket.io instance
   * @returns {Promise<Object>} Created chat message
   */
  static async chatStarted(businessId, sessionId, escalationId, agentId, io = null) {
    try {
      const message = 'Chat session has started';
      
      const systemMessage = await this.createSystemMessage({
        businessId,
        sessionId,
        escalationId,
        message,
        systemMessageType: 'chat_started',
        agentId
      });

      // Emit to chat room if io is available
      if (io && escalationId) {
        const room = `chat_${escalationId}`;
        io.to(room).emit('system_message', {
          ...systemMessage.toObject(),
          timestamp: systemMessage.createdAt
        });
      }

      return systemMessage;
    } catch (error) {
      console.error('[SystemMessage] Error creating chat started message:', error);
      throw error;
    }
  }

  /**
   * Create a system message for chat ending
   * @param {string} businessId - Business ID
   * @param {string} sessionId - Session ID
   * @param {string} escalationId - Escalation ID
   * @param {string} agentId - Agent ID
   * @param {Object} io - Socket.io instance
   * @returns {Promise<Object>} Created chat message
   */
  static async chatEnded(businessId, sessionId, escalationId, agentId, io = null) {
    try {
      const agent = await Agent.findById(agentId).select('name');
      const agentName = agent ? agent.name : 'Agent';
      
      const message = `${agentName} has ended the chat session. Thank you for contacting us!`;
      
      const systemMessage = await this.createSystemMessage({
        businessId,
        sessionId,
        escalationId,
        message,
        systemMessageType: 'chat_ended',
        agentId
      });

      // Emit to chat room if io is available
      if (io && escalationId) {
        const room = `chat_${escalationId}`;
        io.to(room).emit('system_message', {
          ...systemMessage.toObject(),
          timestamp: systemMessage.createdAt
        });
      }

      return systemMessage;
    } catch (error) {
      console.error('[SystemMessage] Error creating chat ended message:', error);
      throw error;
    }
  }

  /**
   * Create a system message for agent being assigned
   * @param {string} businessId - Business ID
   * @param {string} sessionId - Session ID
   * @param {string} escalationId - Escalation ID
   * @param {string} agentId - Agent ID
   * @param {Object} io - Socket.io instance
   * @returns {Promise<Object>} Created chat message
   */
  // DISABLED: Not showing agent assignment messages to avoid noise
  // static async agentAssigned(businessId, sessionId, escalationId, agentId, io = null) {
  //   try {
  //     const agent = await Agent.findById(agentId).select('name');
  //     const agentName = agent ? agent.name : 'An agent';
      
  //     const message = `${agentName} has been assigned to help you`;
      
  //     const systemMessage = await this.createSystemMessage({
  //       businessId,
  //       sessionId,
  //       escalationId,
  //       message,
  //       systemMessageType: 'agent_assigned',
  //       agentId
  //     });

  //     // Emit to chat room if io is available
  //     if (io && escalationId) {
  //       const room = `chat_${escalationId}`;
  //       io.to(room).emit('system_message', {
  //         ...systemMessage.toObject(),
  //         timestamp: systemMessage.createdAt
  //       });
  //     }

  //     return systemMessage;
  //   } catch (error) {
  //     console.error('[SystemMessage] Error creating agent assigned message:', error);
  //     throw error;
  //   }
  // }

  /**
   * Create a system message for customer joining queue
   * @param {string} businessId - Business ID
   * @param {string} sessionId - Session ID
   * @param {string} escalationId - Escalation ID
   * @param {Object} io - Socket.io instance
   * @returns {Promise<Object>} Created chat message
   */
  // DISABLED: Not showing queue messages to avoid noise
  // static async queueJoined(businessId, sessionId, escalationId, io = null) {
  //   try {
  //     const message = 'You have been added to the chat queue. Please wait for an available agent.';
      
  //     const systemMessage = await this.createSystemMessage({
  //       businessId,
  //       sessionId,
  //       escalationId,
  //       message,
  //       systemMessageType: 'queue_joined'
  //     });

  //     // Emit to chat room if io is available
  //     if (io && escalationId) {
  //       const room = `chat_${escalationId}`;
  //       io.to(room).emit('system_message', {
  //         ...systemMessage.toObject(),
  //         timestamp: systemMessage.createdAt
  //       });
  //     }

  //     return systemMessage;
  //   } catch (error) {
  //     console.error('[SystemMessage] Error creating queue joined message:', error);
  //     throw error;
  //   }
  // }

  /**
   * Core method to create a system message
   * @param {Object} messageData - Message data object
   * @returns {Promise<Object>} Created chat message
   */
  static async createSystemMessage(messageData) {
    const {
      businessId,
      sessionId,
      escalationId,
      message,
      systemMessageType,
      agentId = null
    } = messageData;

    const systemMessage = new Chat({
      businessId,
      sessionId,
      escalationId,
      message,
      senderType: 'system',
      systemMessageType,
      agentId,
      isGoodResponse: null // System messages don't have feedback
    });

    await systemMessage.save();
    console.log(`[SystemMessage] Created ${systemMessageType} message for escalation ${escalationId}`);
    
    return systemMessage;
  }

  /**
   * Get all system messages for a session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Array>} Array of system messages
   */
  static async getSystemMessages(sessionId) {
    try {
      return await Chat.find({
        sessionId,
        senderType: 'system'
      }).sort({ createdAt: 1 });
    } catch (error) {
      console.error('[SystemMessage] Error getting system messages:', error);
      throw error;
    }
  }

  /**
   * Get system messages by type for a session
   * @param {string} sessionId - Session ID
   * @param {string} systemMessageType - Type of system message
   * @returns {Promise<Array>} Array of system messages
   */
  static async getSystemMessagesByType(sessionId, systemMessageType) {
    try {
      return await Chat.find({
        sessionId,
        senderType: 'system',
        systemMessageType
      }).sort({ createdAt: 1 });
    } catch (error) {
      console.error('[SystemMessage] Error getting system messages by type:', error);
      throw error;
    }
  }
}

module.exports = SystemMessageHelper;
