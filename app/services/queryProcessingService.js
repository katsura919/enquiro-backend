/**
 * MongoDB Atlas Search Service
 * Handles search operations using MongoDB Atlas Search capabilities
 */

/**
 * Build MongoDB Atlas Search aggregation pipeline for specific collection type
 * @param {string} query - Search query
 * @param {Object} businessId - Business ID to filter by
 * @param {string} collectionType - Type of collection (faq, product, policy, service)
 * @param {Object} options - Search options
 * @returns {Array} - MongoDB aggregation pipeline
 */
const buildSearchPipeline = (query, businessId, collectionType, options = {}) => {
  const {
    maxResults = 8,
    minScore = 0.5,
    searchIndex = 'business_search'
  } = options;

  if (!query || query.trim().length === 0) {
    // Return basic match if no query
    return [
      { $match: { businessId } },
      { $sort: { createdAt: -1 } },
      { $limit: maxResults }
    ];
  }

  // Define search fields based on collection type
  const getSearchFields = (type) => {
    switch (type) {
      case 'faq':
        return {
          textFields: ["question", "answer"],
          autocompleteField: "question"
        };
      case 'product':
        return {
          textFields: ["name", "description"],
          autocompleteField: "name"
        };
      case 'service':
        return {
          textFields: ["name", "description"],
          autocompleteField: "name"
        };
      case 'policy':
        return {
          textFields: ["title", "content"],
          autocompleteField: "title"
        };
      default:
        return {
          textFields: ["name", "description", "question", "answer", "title", "content"],
          autocompleteField: "name"
        };
    }
  };

  const searchFields = getSearchFields(collectionType);

  return [
    {
      $search: {
        index: searchIndex,
        compound: {
          must: [
            { equals: { path: "businessId", value: businessId } }
          ],
          should: [
            {
              text: {
                query: query,
                path: searchFields.textFields,
                score: { boost: { value: 2 } }
              }
            },
            {
              autocomplete: {
                query: query,
                path: searchFields.autocompleteField,
                score: { boost: { value: 1.5 } }
              }
            }
          ],
          minimumShouldMatch: 1
        }
      }
    },
    {
      $addFields: {
        score: { $meta: "searchScore" }
      }
    },
    {
      $match: {
        score: { $gte: minScore }
      }
    },
    {
      $sort: { score: -1 }
    },
    {
      $limit: maxResults
    }
  ];
};

/**
 * Search across multiple collections using Atlas Search
 * @param {Object} businessId - Business ID
 * @param {string} query - Search query
 * @param {Array} collections - Array of collection objects {model, type}
 * @returns {Array} - Combined search results
 */
const searchMultipleCollections = async (businessId, query, collections) => {
  const searchPromises = collections.map(async ({ model, type }) => {
    const pipeline = buildSearchPipeline(query, businessId, type); // Pass collection type
    const results = await model.aggregate(pipeline);
    
    return results.map(item => ({
      ...item,
      type,
      relevanceScore: item.score || 0
    }));
  });

  const allResults = await Promise.all(searchPromises);
  
  // Flatten and sort by relevance score
  const flatResults = allResults.flat();
  console.log('Total results from all collections:', flatResults.length);
  
  return flatResults
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
    .slice(0, 8);
};

module.exports = {
  buildSearchPipeline,
  searchMultipleCollections
};
