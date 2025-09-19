const caseFollowupFallbackPrompt = (query, businessName) => `
Customer is asking about case status: "${query}"
Business: ${businessName}

Generate a helpful response that:
1. Acknowledges their request to check case status
2. Asks for their case number if they haven't provided one
3. Explains case number format (usually 6+ characters)
4. Assures them you'll help once you have the case number
5. Keep it professional and supportive

Don't mention database limitations.`;

module.exports = caseFollowupFallbackPrompt;