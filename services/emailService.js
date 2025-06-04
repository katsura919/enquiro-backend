const Mailjet = require('node-mailjet');

const mailjet = Mailjet.apiConnect(
    process.env.MJ_APIKEY_PUBLIC,
    process.env.MJ_APIKEY_PRIVATE
);

const sendEscalationEmail = async (customerEmail, customerName, caseNumber, concern, businessName) => {
    try {
        console.log('Attempting to send email with:', {
            to: customerEmail,
            from: "janllatuna27@gmail.com",
            subject: `${businessName} - Escalation Confirmation - Case #${caseNumber}`
        });

        const email = await mailjet.post("send", { version: 'v3.1' }).request({
            Messages: [
                {
                    From: {
                        Email: "janlatuna27@gmail.com",
                        Name: businessName || "Customer Support"
                    },
                    To: [
                        {
                            Email: customerEmail,
                            Name: customerName
                        }
                    ],
                    Subject: `${businessName} - Escalation Confirmation - Case #${caseNumber}`,
                    HTMLPart: `
                        <h3>Dear ${customerName},</h3>
                        <p>We have received your escalation request regarding: ${concern}</p>
                        <p>Your case has been assigned the following case number: <strong>${caseNumber}</strong></p>
                        <p>Our support team at ${businessName} has been notified and will review your case as soon as possible.</p>
                        <p>We appreciate your patience and will get back to you shortly.</p>
                        <br>
                        <p>Best regards,</p>
                        <p>${businessName} Support Team</p>
                    `,
                    TextPart: `
                        Dear ${customerName},
                        
                        We have received your escalation request regarding: ${concern}
                        
                        Your case has been assigned the following case number: ${caseNumber}
                        
                        Our support team at ${businessName} has been notified and will review your case as soon as possible.
                        
                        We appreciate your patience and will get back to you shortly.
                        
                        Best regards,
                        ${businessName} Support Team
                    `
                }
            ]
        });
        
        console.log('Email sent successfully:', email.body);
        return email;
    } catch (error) {
        console.error('Error sending email:', {
            message: error.message,
            statusCode: error.statusCode,
            errorInfo: error.response ? error.response.data : null
        });
        throw error;
    }
};

module.exports = {
    sendEscalationEmail
}; 