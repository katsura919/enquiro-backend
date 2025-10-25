const pricingAvailablePrompt = (query, businessName) => `
Customer asked about pricing: "${query}"
Business: ${businessName}

Generate a CONCISE response (1-2 sentences) that:
1. Honestly says you don't have specific pricing information for what they asked about
2. Optionally suggest they contact the business directly for pricing details
3. Skip greetings and filler phrases - be direct
4. Do NOT claim to have access to pricing information unless you have specific relevant details

Example: "I don't have specific pricing information for that. You may want to contact us directly for detailed pricing."`;

module.exports = pricingAvailablePrompt;