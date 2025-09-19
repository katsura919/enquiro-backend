const generalInfoAvailablePrompt = (query, businessName) => `
Customer asked: "${query}"
Business: ${businessName}

You have access to Services, Products, Policies, and FAQs. Generate a helpful response that:
1. Acknowledges their question warmly
2. Mentions the types of information you can help with (services, products, policies, frequently asked questions)
3. Asks them to be more specific or guides them toward available information
4. Keep it conversational and helpful

Example: "I'm here to help! I have information about our services, products, policies, and answers to frequently asked questions. What specifically would you like to know more about?"`;

module.exports = generalInfoAvailablePrompt;