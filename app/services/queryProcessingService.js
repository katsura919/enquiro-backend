/**
 * MongoDB Atlas Search Service
 * Handles search operations using MongoDB Atlas Search capabilities
 */

/**
 * Intent patterns for detecting listing queries
 * These queries should return all items from a category instead of keyword search
 */
const LISTING_INTENT_PATTERNS = {
  product: [
    /what\s+(products?|items?)\s+(do|does|can)\s+(you|i)\s+(sell|have|offer|get|buy)/i,
    /show\s+(me\s+)?(your\s+)?(all\s+)?(products?|items?)/i,
    /list\s+(of\s+)?(your\s+)?(all\s+)?(products?|items?)/i,
    /what\s+(products?|items?)\s+(are\s+)?available/i,
    /do\s+you\s+(sell|have|offer)\s+(any\s+)?(products?|items?)/i,
    /can\s+i\s+(see|view|browse)\s+(your\s+)?(products?|items?)/i,
    /what\s+(do|can)\s+(you|i)\s+(sell|buy|purchase|get)/i,
    /browse\s+(your\s+)?(products?|items?|catalog)/i,
    /view\s+(all\s+)?(your\s+)?(products?|items?)/i,
    /\b(products?|items?)\s+list/i,
    /what.*\b(available|in\s+stock)\b/i,
  ],
  service: [
    /what\s+services?\s+(do|does|can)\s+(you|i)\s+(provide|offer|have|get)/i,
    /show\s+(me\s+)?(your\s+)?(all\s+)?services?/i,
    /list\s+(of\s+)?(your\s+)?(all\s+)?services?/i,
    /what\s+services?\s+(are\s+)?available/i,
    /do\s+you\s+(provide|have|offer)\s+(any\s+)?services?/i,
    /can\s+i\s+(see|view|browse)\s+(your\s+)?services?/i,
    /browse\s+(your\s+)?services?/i,
    /view\s+(all\s+)?(your\s+)?services?/i,
    /\b(services?)\s+list/i,
  ],
  policy: [
    /what\s+(is|are)\s+(your\s+)?(policies|policy)/i,
    /show\s+(me\s+)?(your\s+)?(all\s+)?(policies|policy)/i,
    /list\s+(of\s+)?(your\s+)?(all\s+)?(policies|policy)/i,
    /do\s+you\s+have\s+(any\s+)?(policies|policy)/i,
    /can\s+i\s+(see|view|read)\s+(your\s+)?(policies|policy)/i,
    /what\s+(are|is)\s+(the\s+)?(return|refund|shipping|privacy|terms)\s+(policy|policies)/i,
    /tell\s+me\s+about\s+(your\s+)?(policies|policy)/i,
  ],
  faq: [
    /what\s+(are|is)\s+(your\s+)?(frequently\s+asked\s+questions?|faqs?)/i,
    /show\s+(me\s+)?(your\s+)?(all\s+)?(frequently\s+asked\s+questions?|faqs?)/i,
    /list\s+(of\s+)?(your\s+)?(frequently\s+asked\s+questions?|faqs?)/i,
    /do\s+you\s+have\s+(any\s+)?(frequently\s+asked\s+questions?|faqs?)/i,
    /can\s+i\s+(see|view)\s+(your\s+)?(frequently\s+asked\s+questions?|faqs?)/i,
    /common\s+questions?/i,
    /help\s+(me\s+)?(with\s+)?questions?/i,
  ],
};

/**
 * Detect if query is asking for a listing of a specific collection type
 * @param {string} query - User query
 * @param {string} collectionType - Type of collection to check
 * @returns {boolean} - True if query matches listing intent
 */
const detectListingIntent = (query, collectionType) => {
  if (!query || !collectionType) return false;

  const patterns = LISTING_INTENT_PATTERNS[collectionType];
  if (!patterns) return false;

  return patterns.some((pattern) => pattern.test(query));
};

/**
 * Common stop words to remove from search queries
 */
const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "can",
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "my",
  "your",
  "his",
  "her",
  "its",
  "our",
  "their",
  "this",
  "that",
  "these",
  "those",
  "what",
  "where",
  "when",
  "why",
  "how",
  "who",
  "which",
  "any",
]);

/**
 * Clean and filter a search query by removing stop words
 * @param {string} query - Raw search query
 * @returns {string} - Cleaned query with meaningful keywords only
 */
const cleanQuery = (query) => {
  if (!query || typeof query !== "string") return "";

  // Extract meaningful keywords
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/[^\w]/g, "")) // Remove punctuation
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  const cleanedQuery = keywords.join(" ");

  console.log(`Query filtering: "${query}" -> "${cleanedQuery}"`);
  console.log(
    `Removed stop words: ${query
      .split(/\s+/)
      .filter((word) =>
        STOP_WORDS.has(word.toLowerCase().replace(/[^\w]/g, ""))
      )
      .join(", ")}`
  );

  return cleanedQuery;
};

/**
 * Build MongoDB text search query for specific collection type
 * @param {string} query - Search query
 * @param {Object} businessId - Business ID to filter by
 * @param {string} collectionType - Type of collection (faq, product, policy, service)
 * @param {Object} options - Search options
 * @returns {Object} - MongoDB query object
 */
const buildTextSearchQuery = (
  query,
  businessId,
  collectionType,
  options = {}
) => {
  const { maxResults = 5 } = options;

  // Check for listing intent BEFORE cleaning the query
  // This preserves context like "what products do you sell"
  const isListingQuery = detectListingIntent(query, collectionType);

  if (isListingQuery) {
    console.log(`🎯 Listing intent detected for ${collectionType}: "${query}"`);

    // Return ALL items from this collection type
    const baseFilter = { businessId };
    const collectionsWithIsActive = ["faq", "product", "service", "policy"];
    if (collectionsWithIsActive.includes(collectionType)) {
      baseFilter.isActive = true;
    }

    return {
      filter: baseFilter,
      sort: { createdAt: -1 },
      limit: 5, // Limit per collection to avoid overwhelming AI model
      isListingQuery: true, // Flag for logging purposes
    };
  }

  // Clean the query first to remove stop words
  const cleanedQuery = cleanQuery(query);

  if (!cleanedQuery || cleanedQuery.trim().length === 0) {
    // Return basic match if no meaningful query after cleaning
    console.log(
      "No meaningful keywords found after cleaning, returning recent items"
    );

    // Add isActive filter for collections that have this field
    const baseFilter = { businessId };
    const collectionsWithIsActive = ["faq", "product", "service", "policy"];
    if (collectionsWithIsActive.includes(collectionType)) {
      baseFilter.isActive = true;
    }

    return {
      filter: baseFilter,
      sort: { createdAt: -1 },
      limit: maxResults,
    };
  }

  // Create regex patterns for each keyword (case-insensitive)
  const keywords = cleanedQuery.split(" ");
  const regexPatterns = keywords.map((keyword) => new RegExp(keyword, "i"));

  // Define search fields based on collection type
  const getSearchFields = (type) => {
    switch (type) {
      case "faq":
        return ["question", "answer"];
      case "product":
        return ["name", "description"];
      case "service":
        return ["name", "description"];
      case "policy":
        return ["title", "content"];
      default:
        return [
          "name",
          "description",
          "question",
          "answer",
          "title",
          "content",
        ];
    }
  };

  const searchFields = getSearchFields(collectionType);

  // Build OR conditions for each field and keyword combination
  const searchConditions = [];

  searchFields.forEach((field) => {
    regexPatterns.forEach((pattern) => {
      searchConditions.push({ [field]: pattern });
    });
  });

  // Add isActive filter for collections that have this field
  const baseFilter = { businessId };

  // Collections that have isActive field
  const collectionsWithIsActive = ["faq", "product", "service", "policy"];
  if (collectionsWithIsActive.includes(collectionType)) {
    baseFilter.isActive = true;
  }

  return {
    filter: {
      ...baseFilter,
      $or: searchConditions,
    },
    sort: { createdAt: -1 },
    limit: maxResults,
  };
};

/**
 * Search across multiple collections using regular MongoDB queries
 * @param {Object} businessId - Business ID
 * @param {string} query - Search query
 * @param {Array} collections - Array of collection objects {model, type}
 * @returns {Array} - Combined search results
 */
const searchMultipleCollections = async (businessId, query, collections) => {
  const searchPromises = collections.map(async ({ model, type }) => {
    const searchQuery = buildTextSearchQuery(query, businessId, type);

    // Execute the search using regular MongoDB find
    const results = await model
      .find(searchQuery.filter)
      .sort(searchQuery.sort)
      .limit(searchQuery.limit)
      .lean();

    return results.map((item) => ({
      ...item,
      type,
      relevanceScore: calculateRelevanceScore(item, query, type),
      isListingQuery: searchQuery.isListingQuery, // Pass through listing flag
    }));
  });

  const allResults = await Promise.all(searchPromises);

  // Flatten and sort by relevance score
  const flatResults = allResults.flat();
  console.log("Total results from all collections:", flatResults.length);

  // Check if ANY result is from a listing query
  const hasListingIntent = flatResults.some((r) => r.isListingQuery);

  // For listing queries, return up to 20 combined (5 per collection x 4)
  // For specific searches, limit to 8 most relevant
  const resultLimit = hasListingIntent ? 20 : 8;

  return flatResults
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
    .slice(0, resultLimit);
};

/**
 * Calculate relevance score for search results
 * @param {Object} item - Search result item
 * @param {string} query - Original search query
 * @param {string} type - Collection type
 * @returns {number} - Relevance score
 */
const calculateRelevanceScore = (item, query, type) => {
  const cleanedQuery = cleanQuery(query);
  if (!cleanedQuery) return 0.1;

  const keywords = cleanedQuery.toLowerCase().split(" ");
  let score = 0;

  // Define searchable fields and their weights by collection type
  const getFieldsAndWeights = (type) => {
    switch (type) {
      case "faq":
        return { question: 3, answer: 2 };
      case "product":
        return { name: 3, description: 1.5 };
      case "service":
        return { name: 3, description: 1.5 };
      case "policy":
        return { title: 3, content: 1 };
      default:
        return {
          name: 2,
          title: 2,
          question: 2,
          description: 1,
          answer: 1,
          content: 1,
        };
    }
  };

  const fieldsAndWeights = getFieldsAndWeights(type);

  // Calculate score based on keyword matches in each field
  Object.entries(fieldsAndWeights).forEach(([field, weight]) => {
    if (item[field]) {
      const fieldText = item[field].toLowerCase();
      keywords.forEach((keyword) => {
        if (fieldText.includes(keyword)) {
          // Exact matches get higher score
          if (
            fieldText.includes(` ${keyword} `) ||
            fieldText.startsWith(`${keyword} `) ||
            fieldText.endsWith(` ${keyword}`)
          ) {
            score += weight * 2;
          } else {
            score += weight;
          }
        }
      });
    }
  });

  return Math.max(score, 0.1); // Minimum score for any result
};

module.exports = {
  cleanQuery,
  buildTextSearchQuery,
  searchMultipleCollections,
  calculateRelevanceScore,
  detectListingIntent,
};
