const gmailService = require('./gmailService');

const sendEscalationEmail = async (customerEmail, customerName, caseNumber, concern, businessName, businessLogo = null) => {
    try {
        console.log('Attempting to send escalation email with:', {
            to: customerEmail,
            from: businessName || 'Customer Support',
            subject: `${businessName} - Escalation Confirmation - Case #${caseNumber}`
        });

        // Email content with HTML formatting
        const htmlBody = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
                    .banner { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
                    .logo { max-width: 150px; height: auto; margin-bottom: 15px; }
                    .banner-title { color: #ffffff; margin: 0; font-size: 24px; font-weight: bold; }
                    .content { background-color: #ffffff; padding: 30px 20px; }
                    .case-number { background-color: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin: 20px 0; border-radius: 4px; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
                    .button { display: inline-block; padding: 12px 24px; background-color: #2196f3; color: #ffffff; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="banner">
                        ${businessLogo 
                            ? `<img src="${businessLogo}" alt="${businessName} Logo" class="logo">` 
                            : `<h1 style="color: #ffffff; margin: 0; font-size: 32px;">${businessName}</h1>`
                        }
                        <h1 class="banner-title">Escalation Confirmation</h1>
                    </div>
                    <div class="content">
                        
                        <h3>Dear ${customerName},</h3>
                        
                        <p>We have received your escalation request regarding:</p>
                        <p><strong>${concern}</strong></p>
                        
                        <div class="case-number">
                            <p style="margin: 0;">Your case number is:</p>
                            <h2 style="margin: 10px 0 0 0; color: #2196f3;">#${caseNumber}</h2>
                        </div>
                        
                        <p>Our support team at ${businessName} has been notified and will review your case as soon as possible.</p>
                        
                        <p>Please keep this case number for your records. You can reference it in any future communications regarding this issue.</p>
                        
                        <p>We appreciate your patience and will get back to you shortly.</p>
                        
                        <div class="footer">
                            <p><strong>Best regards,</strong></p>
                            <p>${businessName} Support Team</p>
                            <p style="color: #999; font-size: 12px; margin-top: 15px;">
                                This is an automated message. Please do not reply directly to this email.
                            </p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Send the email using Gmail service
        const result = await gmailService.sendEmail({
            to: customerEmail,
            subject: `${businessName} - Escalation Confirmation - Case #${caseNumber}`,
            body: htmlBody,
            from: businessName || 'Customer Support'
        });

        console.log('Escalation email sent successfully:', {
            messageId: result.messageId,
            threadId: result.threadId
        });
        
        return result;
    } catch (error) {
        console.error('Error sending escalation email:', {
            message: error.message,
            errorInfo: error
        });
        throw error;
    }
};

module.exports = {
    sendEscalationEmail
};