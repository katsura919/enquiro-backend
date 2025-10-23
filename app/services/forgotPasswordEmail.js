const gmailService = require('./gmailService');

/**
 * Send password reset email to user
 * @param {string} userEmail - User's email address
 * @param {string} userName - User's first name
 * @param {string} resetToken - Password reset token
 * @param {string} resetLink - Full reset link URL
 */
const sendPasswordResetEmail = async (userEmail, userName, resetToken, resetLink) => {
  try {
    const subject = 'Password Reset Request';
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
          }
          .content {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 5px 5px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .button:hover {
            background-color: #45a049;
          }
          .footer {
            margin-top: 20px;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 10px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            
            <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
            
            <p>To reset your password, click the button below:</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background-color: #fff; padding: 10px; border: 1px solid #ddd;">
              ${resetLink}
            </p>
            
            <div class="warning">
              <strong>⚠️ Important:</strong> This link will expire in 1 hour for security reasons.
            </div>
            
            <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
            
            <p>Best regards,<br>Your Support Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} Your Company. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailData = {
      to: userEmail,
      subject: subject,
      body: htmlBody,
      from: 'Password Reset'
    };

    const result = await gmailService.sendEmail(emailData);
    
    console.log(`Password reset email sent to ${userEmail}`);
    return result;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

module.exports = {
  sendPasswordResetEmail
};
