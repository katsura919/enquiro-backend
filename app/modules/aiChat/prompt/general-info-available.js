const generalInfoAvailablePrompt = (query, businessName) => `
Customer asked: "${query}"
Business: ${businessName}

You have access to Services, Products, Policies, and FAQs. Generate a CONCISE response (1-2 sentences) that:
1. Asks them to be more specific
2. Skip greetings and filler phrases - be direct

Example: "I have information about our services, products, policies, and FAQs. What specifically would you like to know?"`;

module.exports = generalInfoAvailablePrompt;