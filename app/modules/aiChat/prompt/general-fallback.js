const generalFallbackPrompt = (query, businessName) => `
Customer asked: "${query}"
Business: ${businessName}

Generate a CONCISE response (1-2 sentences) that:
1. Honestly says you don't have information about that topic
2. Optionally offer to help with something else
3. Skip greetings and filler phrases - be direct
4. Do NOT mention missing data, databases, or technical limitations
5. Do NOT claim to have access to any information categories

Example: "I don't have information about that topic. Is there something else I can help you with?"`;

module.exports = generalFallbackPrompt;