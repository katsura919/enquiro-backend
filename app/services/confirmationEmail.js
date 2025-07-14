const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // Replace with your email provider
    auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS  // Your email password or app-specific password
    }
});

const sendConfirmationEmail = async (email, name, confirmationToken) => {
    try {
        const confirmationUrl = `http://yourdomain.com/api/auth/confirm-email?token=${confirmationToken}`;

        const mailOptions = {
            from: `"Your Business Name" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Email Confirmation',
            html: `
                <h3>Hi ${name},</h3>
                <p>Thank you for registering. Please confirm your email by clicking the link below:</p>
                <a href="${confirmationUrl}">Confirm Email</a>
                <p>If you did not register, please ignore this email.</p>
                <br>
                <p>Best regards,</p>
                <p>Your Business Team</p>
            `,
            text: `Hi ${name},

Thank you for registering. Please confirm your email by clicking the link below:
${confirmationUrl}

If you did not register, please ignore this email.

Best regards,
Your Business Team`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Confirmation email sent:', info.response);
        return info;
    } catch (error) {
        console.error('Error sending confirmation email:', error);
        throw error;
    }
};

module.exports = sendConfirmationEmail;
