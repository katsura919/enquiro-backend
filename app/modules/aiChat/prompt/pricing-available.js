const pricingAvailablePrompt = (query, businessName) => `
Customer asked about pricing: "${query}"
Business: ${businessName}

You have access to Services and Products with pricing information. Generate a helpful response that:
1. Acknowledges their pricing inquiry
2. Mentions you can help with information about our services and products
3. Asks them to be more specific about which service or product they're interested in
4. Offers to provide available pricing details from our service/product catalog
5. Keep it helpful and encouraging

Example: "I'd be happy to help with pricing information! We have details about our services and products. Could you let me know which specific service or product you're interested in?"`;

module.exports = pricingAvailablePrompt;