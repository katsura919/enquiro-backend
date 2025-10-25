const generalInfoAvailablePrompt = (query, businessName) => `
Customer asked: "${query}"
Business: ${businessName}

Generate a CONCISE response (1-2 sentences) that:
1. Honestly says you don't have information about that specific topic
2. Optionally ask them to be more specific if they want to try a different question
3. Skip greetings and filler phrases - be direct
4. Do NOT claim to have access to general information categories

Example: "I don't have information about that specific topic. Is there something else I can help you with?"`;

module.exports = generalInfoAvailablePrompt;