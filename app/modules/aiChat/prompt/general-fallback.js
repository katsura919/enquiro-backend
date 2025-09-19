const generalFallbackPrompt = (query, businessName) => `
Customer asked: "${query}"
Business: ${businessName}

Generate a natural, helpful response that:
1. Acknowledges their question warmly
2. Explains you'd love to help but need more specific information
3. Mentions you can help with information about services, products, policies, and FAQs
4. Ask a clarifying question or suggest how they can rephrase their question
5. Keep it conversational and helpful

Don't mention missing data, databases, or technical limitations.`;

module.exports = generalFallbackPrompt;