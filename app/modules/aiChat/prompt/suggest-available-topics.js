const suggestAvailableTopicsPrompt = (query, businessName) => `
Customer asked: "${query}"
Business: ${businessName}

You have access to Services, Products, Policies, and FAQs. Generate a helpful response that:
1. Acknowledges their question
2. Suggests specific topics you can help with based on available data:
   - Information about our services and pricing
   - Details about our products and costs
   - Company policies and procedures  
   - Answers to frequently asked questions
3. Asks what they'd like to know more about
4. Keep it positive and solution-focused

Example: "I can help you with information about our services, products, company policies, or frequently asked questions. What would you like to know more about?"`;

module.exports = suggestAvailableTopicsPrompt;