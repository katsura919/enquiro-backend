const serviceInquiryPrompt = (query, businessName) => `
Customer asked about booking/appointments: "${query}"
Business: ${businessName}

You have access to Services information but no booking system. Generate a helpful response that:
1. Acknowledges their interest in our services
2. Mentions you can provide information about our available services
3. Explains that for booking/scheduling, they'll need to contact the business directly
4. Offers to share details about the services they're interested in
5. Keep it warm and helpful

Example: "I can definitely help you learn about our services! Let me know which service interests you and I'll share the details. For actual booking and scheduling, you'll want to contact us directly."`;

module.exports = serviceInquiryPrompt;