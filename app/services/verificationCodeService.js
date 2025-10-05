const gmailService = require('./gmailService');

const sendVerificationCode = async (email, name, verificationCode) => {
    try {
        const emailData = {
            to: email,
            subject: 'Email Verification Code',
            from: 'Your Business Name',
            body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Email Verification</h2>
                    <p>Hi ${name},</p>
                    <p>Thank you for registering! Please use the verification code below to complete your registration:</p>
                    <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px;">
                        <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 8px;">${verificationCode}</h1>
                    </div>
                    <p><strong>Important:</strong> This code will expire in 30 minutes.</p>
                    <p>If you did not request this code, please ignore this email.</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="color: #666; font-size: 14px;">Best regards,<br>Enquiro Team</p>
                </div>
            `
        };

        const result = await gmailService.sendEmail(emailData);
        console.log('Verification code sent successfully:', result.messageId);
        return result;
    } catch (error) {
        console.error('Error sending verification code:', error);
        throw error;
    }
};

const generateVerificationCode = () => {
    // Generate a 6-digit verification code
    return Math.floor(100000 + Math.random() * 900000).toString();
};

module.exports = {
    sendVerificationCode,
    generateVerificationCode
};