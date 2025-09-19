const checkFaqPolicyPrompt = (query, businessName) => `
Customer asked for technical help: "${query}"
Business: ${businessName}

You have access to FAQs and Policies that might contain technical information. Generate a helpful response that:
1. Acknowledges their technical question
2. Mentions you can check our FAQs and policies for relevant information
3. Asks them to be more specific about their technical issue
4. Offers to search through available documentation
5. Keep it supportive and solution-oriented

Example: "I'd like to help with your technical question! Let me check our FAQs and policies for relevant information. Could you provide a bit more detail about the specific issue you're experiencing?"`;

module.exports = checkFaqPolicyPrompt;