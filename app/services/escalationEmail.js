const nodemailer = require('nodemailer');

// Create a transporter using Nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can replace this with your email provider
    auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS  // Your email password or app-specific password
    }
});

const sendEscalationEmail = async (customerEmail, customerName, caseNumber, concern, businessName) => {
    try {
        console.log('Attempting to send email with:', {
            to: customerEmail,
            from: process.env.EMAIL_USER,
            subject: `${businessName} - Escalation Confirmation - Case #${caseNumber}`
        });

        // Email options
        const mailOptions = {
            from: `"${businessName || 'Customer Support'}" <${process.env.EMAIL_USER}>`,
            to: customerEmail,
            subject: `${businessName} - Escalation Confirmation - Case #${caseNumber}`,
            html: `
                <h3>Dear ${customerName},</h3>
                <p>We have received your escalation request regarding: ${concern}</p>
                <p>Your case has been assigned the following case number: <strong>${caseNumber}</strong></p>
                <p>Our support team at ${businessName} has been notified and will review your case as soon as possible.</p>
                <p>We appreciate your patience and will get back to you shortly.</p>
                <br>
                <p>Best regards,</p>
                <p>${businessName} Support Team</p>
            `,
            text: `
                Dear ${customerName},
                
                We have received your escalation request regarding: ${concern}
                
                Your case has been assigned the following case number: ${caseNumber}
                
                Our support team at ${businessName} has been notified and will review your case as soon as possible.
                
                We appreciate your patience and will get back to you shortly.
                
                Best regards,
                ${businessName} Support Team
            `
        };

        // Send the email
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.response);
        return info;
    } catch (error) {
        console.error('Error sending email:', {
            message: error.message,
            errorInfo: error
        });
        throw error;
    }
};

module.exports = {
    sendEscalationEmail
};