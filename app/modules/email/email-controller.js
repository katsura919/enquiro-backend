const gmailService = require('../../services/gmailService');
const Escalation = require('../../models/escalation-model');
const { cleanMessage } = require('../../utils/emailParser');

// Get specific email by ID
const getEmail = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: 'Message ID is required'
      });
    }

    const email = await gmailService.getEmail(messageId);
    
    res.status(200).json({
      success: true,
      email: email
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get email',
      error: error.message
    });
  }
};

// Send email
const sendEmail = async (req, res) => {
  try {
    const { to, subject, body, from, escalationId } = req.body;
    
    if (!to || !subject || !body) {
      return res.status(400).json({
        success: false,
        message: 'To, subject, and body are required fields'
      });
    }

    const result = await gmailService.sendEmail({
      to,
      subject,
      body,
      from: from || 'janllatuna27@gmail.com' // Use provided name or default
    });

    // If escalationId is provided, store the threadId in the escalation
    if (escalationId && result.threadId) {
      try {
        await Escalation.findByIdAndUpdate(
          escalationId,
          { emailThreadId: result.threadId },
          { new: true }
        );
      } catch (escalationError) {
        console.error('Failed to update escalation with threadId:', escalationError);
        // Continue with response even if escalation update fails
      }
    }

    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      result: result,
      actualSender: 'janllatuna27@gmail.com'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send email',
      error: error.message
    });
  }
};

// Mark email as read
const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    
    if (!messageId) {
      return res.status(400).json({
        success: false,
        message: 'Message ID is required'
      });
    }

    const result = await gmailService.markAsRead(messageId);
    
    res.status(200).json({
      success: true,
      message: 'Email marked as read',
      result: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark email as read',
      error: error.message
    });
  }
};

// List email threads
const listThreads = async (req, res) => {
  try {
    const { 
      query = '', 
      maxResults = 10, 
      labelIds = ['INBOX'] 
    } = req.query;

    const threads = await gmailService.listThreads({
      query,
      maxResults: parseInt(maxResults),
      labelIds: Array.isArray(labelIds) ? labelIds : labelIds.split(',')
    });

    res.status(200).json({
      success: true,
      count: threads.length,
      threads: threads
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to list threads',
      error: error.message
    });
  }
};

// Get specific thread
const getThread = async (req, res) => {
  try {
    const { threadId } = req.params;
    
    if (!threadId) {
      return res.status(400).json({
        success: false,
        message: 'Thread ID is required'
      });
    }

    const thread = await gmailService.getThread(threadId);
    
    res.status(200).json({
      success: true,
      thread: thread
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get thread',
      error: error.message
    });
  }
};

// Get all messages in a thread with parsed content (alias for getThread)
const getThreadMessages = async (req, res) => {
  try {
    const { threadId } = req.params;
    
    if (!threadId) {
      return res.status(400).json({
        success: false,
        message: 'Thread ID is required'
      });
    }

    const thread = await gmailService.getThread(threadId);
    
    // Parse and clean up the messages using utility function
    const cleanMessages = thread.messages.map(message => cleanMessage(message));
    
    // Return the cleaned messages from the thread
    res.status(200).json({
      success: true,
      data: {
        threadId: thread.id,
        messageCount: cleanMessages.length,
        messages: cleanMessages
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get thread messages',
      error: error.message
    });
  }
};

// Reply to an email in the same thread (RFC 2822 compliant)
const replyToEmail = async (req, res) => {
  try {
    const { threadId, to, body, from, originalMessageId } = req.body;
    
    if (!threadId || !to || !body || !originalMessageId) {
      return res.status(400).json({
        success: false,
        message: 'ThreadId, to, body, and originalMessageId are required fields'
      });
    }

    // Get original message to extract proper subject for threading
    let originalSubject = 'No Subject';
    try {
      const originalMessage = await gmailService.getEmailWithHeaders(originalMessageId);
      originalSubject = originalMessage.headers['subject'] || 'No Subject';
    } catch (error) {
      console.log('Could not get original message, using default subject');
    }

    const result = await gmailService.replyToEmail({
      threadId,
      to,
      subject: originalSubject, // Use exact original subject for proper threading
      body,
      from: from || 'janllatuna27@gmail.com',
      originalMessageId
    });

    res.status(200).json({
      success: true,
      message: 'Reply sent successfully',
      result: result,
      actualSender: 'janllatuna27@gmail.com',
      displayFrom: from || 'janllatuna27@gmail.com'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send reply',
      error: error.message
    });
  }
};

// Download attachment
const downloadAttachment = async (req, res) => {
  try {
    const { messageId, attachmentId } = req.params;
    
    if (!messageId || !attachmentId) {
      return res.status(400).json({
        success: false,
        message: 'Message ID and Attachment ID are required'
      });
    }

    const attachment = await gmailService.getAttachment(messageId, attachmentId);
    
    // Convert base64url to buffer (Gmail uses base64url encoding)
    const buffer = Buffer.from(attachment.data, 'base64url');
    
    // Get the message to extract attachment filename and mime type
    const message = await gmailService.getEmailWithHeaders(messageId);
    let filename = 'attachment';
    let mimeType = 'application/octet-stream';
    
    // Find the attachment in the message to get proper filename and mime type
    const findAttachmentInfo = (payload) => {
      if (payload.parts) {
        for (const part of payload.parts) {
          if (part.body && part.body.attachmentId === attachmentId) {
            filename = part.filename || 'attachment';
            mimeType = part.mimeType || 'application/octet-stream';
            return;
          }
          if (part.parts) {
            findAttachmentInfo(part);
          }
        }
      }
    };
    
    findAttachmentInfo(message.payload || {});
    
    // Set appropriate headers for file download
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send(buffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to download attachment',
      error: error.message
    });
  }
};

// Preview attachment (returns base64 data for inline viewing)
const previewAttachment = async (req, res) => {
  try {
    const { messageId, attachmentId } = req.params;
    
    if (!messageId || !attachmentId) {
      return res.status(400).json({
        success: false,
        message: 'Message ID and Attachment ID are required'
      });
    }

    const attachment = await gmailService.getAttachment(messageId, attachmentId);
    
    // Return base64 data for frontend to display
    res.status(200).json({
      success: true,
      data: {
        attachmentId: attachmentId,
        base64Data: attachment.data,
        size: attachment.size
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to preview attachment',
      error: error.message
    });
  }
};

module.exports = {
  getEmail,
  sendEmail,
  markAsRead,
  listThreads,
  getThread,
  getThreadMessages,
  replyToEmail,
  downloadAttachment,
  previewAttachment
};
