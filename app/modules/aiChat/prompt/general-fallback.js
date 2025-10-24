const generalFallbackPrompt = (query, businessName) => `
Customer asked: "${query}"
Business: ${businessName}

Generate a CONCISE response (1-2 sentences) that:
1. Briefly says you need more specific information
2. Ask a direct clarifying question
3. Skip greetings and filler phrases - be direct

Don't mention missing data, databases, or technical limitations.

Example: "I need more details to help you. Could you be more specific about what you're looking for?"`;

module.exports = generalFallbackPrompt;