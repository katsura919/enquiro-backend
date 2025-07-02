const { google } = require('googleapis');
const fs = require('fs').promises;
const path = require('path');

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
   * Generate authorization URL for OAuth flow
   * @param {string} credentialsPath - Path to credentials JSON
   */
  async getAuthUrl(credentialsPath) {
    const credentials = JSON.parse(await fs.readFile(credentialsPath));
    const { client_secret, client_id } = credentials.web || credentials.installed;
    
    // Use a default redirect URI if not specified
    const redirectUri = 'http://localhost';
    
    const auth = new google.auth.OAuth2(client_id, client_secret, redirectUri);
    
    const authUrl = auth.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify'
      ]
    });

    return authUrl;
  }

  /**
   * Save authorization token
   * @param {string} code - Authorization code from OAuth flow
   * @param {string} credentialsPath - Path to credentials JSON
   * @param {string} tokenPath - Path to save token
   */
  async saveToken(code, credentialsPath, tokenPath = './token.json') {
    const credentials = JSON.parse(await fs.readFile(credentialsPath));
    const { client_secret, client_id } = credentials.web || credentials.installed;
    
    // Use a default redirect URI if not specified
    const redirectUri = 'http://localhost';
    
    const auth = new google.auth.OAuth2(client_id, client_secret, redirectUri);
    
    const { tokens } = await auth.getToken(code);
    await fs.writeFile(tokenPath, JSON.stringify(tokens));
    
    return tokens;
  }

  /**
   * List emails from inbox or specific label
   * @param {Object} options - Query options
   * @param {string} options.query - Gmail search query
   * @param {number} options.maxResults - Maximum number of results (default: 10)
   * @param {string} options.labelIds - Label IDs to filter by
   */
  async listEmails(options = {}) {
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
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
        labelIds
      });

      return response.data.messages || [];
    } catch (error) {
      console.error('Error listing emails:', error.message);
      throw error;
    }
  }

  /**
   * Get full email details by message ID
   * @param {string} messageId - Gmail message ID
   */
  async getEmail(messageId) {
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
      
      // Parse email headers
      const headers = {};
      message.payload.headers.forEach(header => {
        headers[header.name.toLowerCase()] = header.value;
      });

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
        labels: message.labelIds || []
      };
    } catch (error) {
      console.error('Error getting email:', error.message);
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
          email += `From: "${displayName}" <noreply@gmail.com>\r\n`;
        } else {
          // It's a display name
          email += `From: "${from}" <noreply@gmail.com>\r\n`;
        }
      } else {
        email += `From: noreply@gmail.com\r\n`;
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
   * Mark email as unread
   * @param {string} messageId - Gmail message ID
   */
  async markAsUnread(messageId) {
    await this.ensureInitialized();
    
    if (!this.gmail) {
      throw new Error('Gmail service not initialized');
    }

    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: ['UNREAD']
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error marking email as unread:', error.message);
      throw error;
    }
  }

  /**
   * Delete an email
   * @param {string} messageId - Gmail message ID
   */
  async deleteEmail(messageId) {
    await this.ensureInitialized();
    
    if (!this.gmail) {
      throw new Error('Gmail service not initialized');
    }

    try {
      await this.gmail.users.messages.delete({
        userId: 'me',
        id: messageId
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting email:', error.message);
      throw error;
    }
  }

  /**
   * Search emails by query
   * @param {string} searchQuery - Gmail search query (e.g., 'from:example@gmail.com', 'subject:important')
   * @param {number} maxResults - Maximum results to return
   */
  async searchEmails(searchQuery, maxResults = 20) {
    const messageList = await this.listEmails({
      query: searchQuery,
      maxResults
    });

    const emails = [];
    for (const message of messageList) {
      const email = await this.getEmail(message.id);
      emails.push(email);
    }

    return emails;
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
}

module.exports = new GmailService();
