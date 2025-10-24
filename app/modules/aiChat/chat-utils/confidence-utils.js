// Calculate response confidence score
const calculateResponseConfidence = (query, foundData, historyContext = []) => {
  let confidence = 0;
  const lowerQuery = query.toLowerCase();
  
  // Factor 1: Data relevance (0-40 points)
  if (foundData && foundData.length > 0) {
    const queryWords = query.toLowerCase().split(/\s+/);
    let relevanceScore = 0;
    
    foundData.forEach(item => {
      const itemText = `${item.question || item.name || item.title || ''} ${item.answer || item.description || item.content || ''}`.toLowerCase();
      const matchingWords = queryWords.filter(word => word.length > 2 && itemText.includes(word));
      relevanceScore += (matchingWords.length / queryWords.length) * 10;
    });
    
    confidence += Math.min(relevanceScore, 40);
  }
  
  // Factor 2: Query complexity (0-20 points)
  const queryLength = query.split(/\s+/).length;
  if (queryLength <= 5) {
    confidence += 20; // Simple queries are easier to handle
  } else if (queryLength <= 10) {
    confidence += 15;
  } else {
    confidence += 10; // Complex queries are harder
  }
  
  // Factor 3: Context availability (0-25 points)
  if (historyContext.length > 0) {
    confidence += Math.min(historyContext.length * 5, 25);
  }
  
  // Factor 4: Data quality (0-15 points)
  if (foundData && foundData.length > 0) {
    const hasCompleteData = foundData.some(item => 
      (item.answer && item.answer.length > 50) ||
      (item.description && item.description.length > 50) ||
      (item.content && item.content.length > 50)
    );
    
    if (hasCompleteData) {
      confidence += 15;
    } else {
      confidence += 8;
    }
  }
  
  // Factor 5: Penalty for complex topics (-20 to -40 points)
  // These topics typically require human intervention regardless of knowledge base
  const complexTopics = [
    'return', 'refund', 'money back', 'cancel order', 'change order',
    'dispute', 'complaint', 'billing issue', 'payment problem',
    'account locked', 'technical issue', 'not working', 'broken', 'error',
    'warranty', 'guarantee', 'defective', 'lost package', 'damaged'
  ];
  
  const hasComplexTopic = complexTopics.some(topic => lowerQuery.includes(topic));
  if (hasComplexTopic) {
    confidence -= 30; // Reduce confidence significantly for complex topics
  }
  
  // Factor 6: Penalty for repeated unhelpful history (-15 to -30 points)
  if (historyContext.length > 0) {
    const aiMessages = historyContext.filter(msg => msg.role === 'assistant');
    const unhelpfulCount = aiMessages.filter(msg => {
      const content = msg.content.toLowerCase();
      return content.includes("don't have") || 
             content.includes("don't know") ||
             content.includes("not available") ||
             content.includes("wish i had more") ||
             content.includes("i'd love to help with that, but");
    }).length;
    
    if (unhelpfulCount >= 2) {
      confidence -= 30; // Significant penalty for multiple failures
    } else if (unhelpfulCount === 1) {
      confidence -= 15; // Moderate penalty for one failure
    }
  }
  
  // Ensure confidence stays within 0-100 range
  return Math.max(0, Math.min(confidence, 100));
};

module.exports = calculateResponseConfidence;