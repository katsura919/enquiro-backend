const pricingAvailablePrompt = (query, businessName) => `
Customer asked about pricing: "${query}"
Business: ${businessName}

You have access to Services and Products with pricing information. Generate a CONCISE response (1-2 sentences) that:
1. Asks them to specify which service or product they need pricing for
2. Skip greetings and filler phrases - be direct

Example: "I can help with pricing. Which specific service or product are you interested in?"`;

module.exports = pricingAvailablePrompt;