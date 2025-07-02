const gmailService = require('../services/gmailService');

class EmailController {
  /**
   * Get Gmail service status
   */
  async getStatus(req, res) {
    try {
      const isReady = await gmailService.ensureInitialized();
      
      res.status(200).json({
        success: true,
        message: 'Gmail service status retrieved',
        isInitialized: isReady
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to get Gmail service status',
        error: error.message
      });
    }
  }

  /**
   * List emails
   */
  async listEmails(req, res) {
    try {
      const { 
        query = '', 
        maxResults = 10, 
        labelIds = ['INBOX'] 
      } = req.query;

      const emails = await gmailService.listEmails({
        query,
        maxResults: parseInt(maxResults),
        labelIds: Array.isArray(labelIds) ? labelIds : [labelIds]
      });

      res.status(200).json({
        success: true,
        count: emails.length,
        emails: emails
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to list emails',
        error: error.message
      });
    }
  }

  /**
   * Get specific email by ID
   */
  async getEmail(req, res) {
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
  }

  /**
   * Send email
   */
  async sendEmail(req, res) {
    try {
      const { to, subject, body, from } = req.body;
      
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

      res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        result: result,
        actualSender: 'janllatuna27@gmail.com', // Always this email
        displayFrom: from || 'janllatuna27@gmail.com'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: error.message
      });
    }
  }

  /**
   * Search emails
   */
  async searchEmails(req, res) {
    try {
      const { q: searchQuery, maxResults = 20 } = req.query;
      
      if (!searchQuery) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const emails = await gmailService.searchEmails(searchQuery, parseInt(maxResults));
      
      res.status(200).json({
        success: true,
        count: emails.length,
        emails: emails
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to search emails',
        error: error.message
      });
    }
  }

  /**
   * Mark email as read
   */
  async markAsRead(req, res) {
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
  }

  /**
   * Mark email as unread
   */
  async markAsUnread(req, res) {
    try {
      const { messageId } = req.params;
      
      if (!messageId) {
        return res.status(400).json({
          success: false,
          message: 'Message ID is required'
        });
      }

      const result = await gmailService.markAsUnread(messageId);
      
      res.status(200).json({
        success: true,
        message: 'Email marked as unread',
        result: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to mark email as unread',
        error: error.message
      });
    }
  }

  /**
   * Delete email
   */
  async deleteEmail(req, res) {
    try {
      const { messageId } = req.params;
      
      if (!messageId) {
        return res.status(400).json({
          success: false,
          message: 'Message ID is required'
        });
      }

      const result = await gmailService.deleteEmail(messageId);
      
      res.status(200).json({
        success: true,
        message: 'Email deleted successfully',
        result: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete email',
        error: error.message
      });
    }
  }
}

module.exports = new EmailController();
