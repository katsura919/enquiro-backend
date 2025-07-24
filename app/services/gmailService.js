const { google } = require('googleapis');

class GmailService {
  constructor() {
    this.gmail = null;
    this.auth = null;
    this.isInitialized = false;
    // Auto-initialize when the service is created
    this.initialize().catch(error => {
      console.error('Failed to auto-initialize Gmail service:', error.message);
    });
  }

  /**
   * Initialize Gmail service with environment variables
   */
  async initialize() {
    try {
      // Get credentials from environment variables
      const clientId = process.env.CLIENT_ID;
      const clientSecret = process.env.CLIENT_SECRET;
      const redirectUri = process.env.REDIRECT_URI;
      const refreshToken = process.env.REFRESH_TOKEN;

      if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
        throw new Error('Missing Gmail OAuth credentials in environment variables');
      }

      // Create OAuth2 client
      this.auth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

      // Set credentials using refresh token
      this.auth.setCredentials({
        refresh_token: refreshToken
      });

      // Initialize Gmail API
      this.gmail = google.gmail({ version: 'v1', auth: this.auth });
      this.isInitialized = true;
      
      console.log('Gmail service initialized successfully with environment credentials');
      return true;
    } catch (error) {
      console.error('Error initializing Gmail service:', error.message);
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Get full email details by message ID with raw headers
   * @param {string} messageId - Gmail message ID
   */
  async getEmailWithHeaders(messageId) {
    await this.ensureInitialized();
    
    if (!this.gmail) {
      throw new Error('Gmail service not initialized');
    }

    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      
      // Parse email headers into an object
      const headers = {};
      if (message.payload && message.payload.headers) {
        message.payload.headers.forEach(header => {
          headers[header.name.toLowerCase()] = header.value;
        });
      }

      // Extract email body
      const body = this.extractBody(message.payload);

      return {
        id: message.id,
        threadId: message.threadId,
        snippet: message.snippet,
        subject: headers.subject || 'No Subject',
        from: headers.from || 'Unknown Sender',
        to: headers.to || '',
        date: headers.date || '',
        body: body,
        labels: message.labelIds || [],
        headers: headers // Include all raw headers
      };
    } catch (error) {
      console.error('Error getting email with headers:', error.message);
      throw error;
    }
  }

  /**
   * Extract body content from email payload
   * @param {Object} payload - Email payload
   */
  extractBody(payload) {
    let body = '';

    if (payload.parts) {
      // Multi-part message
      payload.parts.forEach(part => {
        if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
          if (part.body.data) {
            body += Buffer.from(part.body.data, 'base64').toString('utf-8');
          }
        } else if (part.parts) {
          // Nested parts
          body += this.extractBody(part);
        }
      });
    } else if (payload.body && payload.body.data) {
      // Single part message
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    return body;
  }

  /**
   * Send an email
   * @param {Object} emailData - Email content
   * @param {string} emailData.to - Recipient email
   * @param {string} emailData.subject - Email subject
   * @param {string} emailData.body - Email body (HTML or plain text)
   * @param {string} emailData.from - Display name for sender (optional)
   * @param {Array} emailData.attachments - File attachments (optional)
   */
  async sendEmail(emailData) {
    await this.ensureInitialized();
    
    if (!this.gmail) {
      throw new Error('Gmail service not initialized');
    }

    const { to, subject, body, from, attachments = [] } = emailData;

    try {
      // Create email message with proper from formatting
      let email = '';
      email += `To: ${to}\r\n`;
      
      // Handle the from field - if it's just an email, use it as is
      // If it's a display name, format it properly
      if (from) {
        if (from.includes('@')) {
          // It's an email address - use as display name with actual sender
          const displayName = from.split('@')[0];
          email += `From: "${displayName}" <janllatuna27@gmail.com>\r\n`;
        } else {
          // It's a display name
          email += `From: "${from}" <janllatuna27@gmail.com>\r\n`;
        }
      } else {
        email += `From: janllatuna27@gmail.com\r\n`;
      }
      
      email += `Subject: ${subject}\r\n`;
      email += `Content-Type: text/html; charset=utf-8\r\n`;
      email += `\r\n${body}`;

      // Encode email in base64url format
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail
        }
      });

      return {
        success: true,
        messageId: response.data.id,
        threadId: response.data.threadId
      };
    } catch (error) {
      console.error('Error sending email:', error.message);
      throw error;
    }
  }

  /**
   * Reply to an email in the same thread (RFC 2822 compliant)
   * @param {Object} replyData - Reply email data
   * @param {string} replyData.threadId - Thread ID to reply to
   * @param {string} replyData.to - Recipient email
   * @param {string} replyData.subject - Reply subject (should match original)
   * @param {string} replyData.body - Reply body content
   * @param {string} replyData.from - Display name for sender (optional)
   * @param {string} replyData.originalMessageId - Original message ID being replied to
   */
  async replyToEmail(replyData) {
    await this.ensureInitialized();
    
    if (!this.gmail) {
      throw new Error('Gmail service not initialized');
    }

    const { threadId, to, subject, body, from, originalMessageId } = replyData;

    try {
      let messageId = null;
      let references = null;
      let originalSubject = subject;

      // Get original message headers for proper RFC 2822 threading
      if (originalMessageId) {
        try {
          const originalMessage = await this.getEmailWithHeaders(originalMessageId);
          
          // Get Message-ID from original message for In-Reply-To
          messageId = originalMessage.headers['message-id'];
          
          // Get original subject to ensure exact match (important for threading)
          originalSubject = originalMessage.headers['subject'] || subject;
          
          // Build References header according to RFC 2822
          const existingReferences = originalMessage.headers['references'];
          if (existingReferences && messageId) {
            // Append current message-id to existing references
            references = `${existingReferences} ${messageId}`;
          } else if (messageId) {
            // First reply - just use the original message-id
            references = messageId;
          }
        } catch (error) {
          console.log('Could not get original message headers for threading');
        }
      }

      // Create reply email message with proper RFC 2822 headers
      let email = '';
      email += `To: ${to}\r\n`;
      
      // Handle the from field
      if (from) {
        if (from.includes('@')) {
          const displayName = from.split('@')[0];
          email += `From: "${displayName}" <janllatuna27@gmail.com>\r\n`;
        } else {
          email += `From: "${from}" <janllatuna27@gmail.com>\r\n`;
        }
      } else {
        email += `From: janllatuna27@gmail.com\r\n`;
      }
      
      // Subject MUST match exactly for proper threading (add Re: if not present)
      let replySubject = originalSubject;
      if (!replySubject.toLowerCase().startsWith('re:')) {
        replySubject = `Re: ${originalSubject}`;
      }
      email += `Subject: ${replySubject}\r\n`;
      
      // Add RFC 2822 compliant threading headers
      if (messageId) {
        email += `In-Reply-To: ${messageId}\r\n`;
      }
      if (references) {
        email += `References: ${references}\r\n`;
      }
      
      email += `Content-Type: text/html; charset=utf-8\r\n`;
      email += `\r\n${body}`;

      // Encode email in base64url format
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
          threadId: threadId // This ensures the reply stays in the same thread
        }
      });

      return {
        success: true,
        messageId: response.data.id,
        threadId: response.data.threadId,
        isReply: true,
        inReplyTo: messageId,
        references: references,
        subject: replySubject
      };
    } catch (error) {
      console.error('Error replying to email:', error.message);
      throw error;
    }
  }

  /**
   * Mark email as read
   * @param {string} messageId - Gmail message ID
   */
  async markAsRead(messageId) {
    await this.ensureInitialized();
    
    if (!this.gmail) {
      throw new Error('Gmail service not initialized');
    }

    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error marking email as read:', error.message);
      throw error;
    }
  }

  /**
   * List email threads
   * @param {Object} options - Query options
   * @param {string} options.query - Gmail search query
   * @param {number} options.maxResults - Maximum number of results (default: 10)
   * @param {Array} options.labelIds - Label IDs to filter by
   */
  async listThreads(options = {}) {
    await this.ensureInitialized();
    
    if (!this.gmail) {
      throw new Error('Gmail service not initialized');
    }

    const {
      query = '',
      maxResults = 10,
      labelIds = ['INBOX']
    } = options;

    try {
      const response = await this.gmail.users.threads.list({
        userId: 'me',
        q: query,
        maxResults,
        labelIds
      });

      return response.data.threads || [];
    } catch (error) {
      console.error('Error listing threads:', error.message);
      throw error;
    }
  }

  /**
   * Get a specific thread with all messages
   * @param {string} threadId - Thread ID
   */
  async getThread(threadId) {
    await this.ensureInitialized();
    
    if (!this.gmail) {
      throw new Error('Gmail service not initialized');
    }

    try {
      const response = await this.gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full'
      });

      return response.data;
    } catch (error) {
      console.error('Error getting thread:', error.message);
      throw error;
    }
  }

  /**
   * Ensure Gmail service is initialized and ready
   */
  async ensureInitialized() {
    if (!this.isInitialized || !this.gmail) {
      console.log('Gmail service not ready, attempting to initialize...');
      await this.initialize();
    }
    return this.isInitialized;
  }

  /**
   * Get full email details by message ID (original method)
   * @param {string} messageId - Gmail message ID
   */
  async getEmail(messageId) {
    const emailWithHeaders = await this.getEmailWithHeaders(messageId);
    // Return without the headers object for backward compatibility
    const { headers, ...email } = emailWithHeaders;
    return email;
  }

  /**
   * Get attachment data
   * @param {string} messageId - Gmail message ID
   * @param {string} attachmentId - Attachment ID
   */
  async getAttachment(messageId, attachmentId) {
    await this.ensureInitialized();
    
    if (!this.gmail) {
      throw new Error('Gmail service not initialized');
    }

    try {
      const response = await this.gmail.users.messages.attachments.get({
        userId: 'me',
        messageId: messageId,
        id: attachmentId
      });

      return {
        data: response.data.data,
        size: response.data.size
      };
    } catch (error) {
      console.error('Error getting attachment:', error.message);
      throw error;
    }
  }
}

module.exports = new GmailService();
