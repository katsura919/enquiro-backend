const Business = require("../models/businessModel");
const FAQ = require("../models/faqModel");
const Policy = require("../models/policyModel");  
const Product = require("../models/productModel");
const Service = require("../models/serviceModel");
const { searchMultipleCollections } = require("./queryProcessingService");

/**
 * Fetch business data with all related collections using Atlas Search
 * @param {string} slug - Business slug
 * @param {string|null} query - Optional query for search
 * @returns {Object} - Business and all related data
 */
const fetchBusinessDataBySlug = async (slug, query = null) => {
  const business = await Business.findOne({ slug }).lean();
  if (!business) return { business: null, allData: null };

  if (!query) {
    // If no query, fetch recent data from all collections
    const [faqs, policies, products, services] = await Promise.all([
      FAQ.find({ businessId: business._id })
        .sort({ createdAt: -1 })
        .select('question answer category')
        .limit(2)
        .lean(),
      
      Policy.find({ businessId: business._id })
        .sort({ createdAt: -1 })
        .select('title content type')
        .limit(2)
        .lean(),
      
      Product.find({ businessId: business._id })
        .sort({ createdAt: -1 })
        .select('name description price category')
        .limit(2)
        .lean(),
      
      Service.find({ businessId: business._id })
        .sort({ createdAt: -1 })
        .select('name description price duration')
        .limit(2)
        .lean()
    ]);

    // Combine and add type
    const allData = [
      ...faqs.map(item => ({ ...item, type: 'faq' })),
      ...policies.map(item => ({ ...item, type: 'policy' })),
      ...products.map(item => ({ ...item, type: 'product' })),
      ...services.map(item => ({ ...item, type: 'service' }))
    ];

    return { business, allData, faqs, policies, products, services };
  }

  // Use Atlas Search for query-based search
  const collections = [
    { model: FAQ, type: 'faq' },
    { model: Policy, type: 'policy' },
    { model: Product, type: 'product' },
    { model: Service, type: 'service' }
  ];

  console.log('Searching with query:', query, 'for business:', business._id);
  const searchResults = await searchMultipleCollections(business._id, query, collections);
  console.log('Search results:', searchResults.length, 'items found');

  // If no search results, fall back to getting some general data
  if (searchResults.length === 0) {
    console.log('No search results, falling back to general data fetch');
    const [faqs, policies, products, services] = await Promise.all([
      FAQ.find({ businessId: business._id })
        .sort({ createdAt: -1 })
        .select('question answer category')
        .limit(2)
        .lean(),
      
      Policy.find({ businessId: business._id })
        .sort({ createdAt: -1 })
        .select('title content type')
        .limit(2)
        .lean(),
      
      Product.find({ businessId: business._id })
        .sort({ createdAt: -1 })
        .select('name description price category')
        .limit(2)
        .lean(),
      
      Service.find({ businessId: business._id })
        .sort({ createdAt: -1 })
        .select('name description price duration')
        .limit(2)
        .lean()
    ]);

    const fallbackData = [
      ...faqs.map(item => ({ ...item, type: 'faq', relevanceScore: 0.1 })),
      ...policies.map(item => ({ ...item, type: 'policy', relevanceScore: 0.1 })),
      ...products.map(item => ({ ...item, type: 'product', relevanceScore: 0.1 })),
      ...services.map(item => ({ ...item, type: 'service', relevanceScore: 0.1 }))
    ];

    console.log('Fallback data:', fallbackData.length, 'items found');

    // Separate fallback results by type
    const fallbackFaqs = fallbackData.filter(item => item.type === 'faq');
    const fallbackPolicies = fallbackData.filter(item => item.type === 'policy');
    const fallbackProducts = fallbackData.filter(item => item.type === 'product');
    const fallbackServices = fallbackData.filter(item => item.type === 'service');

    return { 
      business, 
      allData: fallbackData, 
      faqs: fallbackFaqs, 
      policies: fallbackPolicies, 
      products: fallbackProducts, 
      services: fallbackServices 
    };
  }

  // Separate results by type for backward compatibility
  const faqs = searchResults.filter(item => item.type === 'faq');
  const policies = searchResults.filter(item => item.type === 'policy');
  const products = searchResults.filter(item => item.type === 'product');
  const services = searchResults.filter(item => item.type === 'service');

  return { 
    business, 
    allData: searchResults, 
    faqs, 
    policies, 
    products, 
    services 
  };
};

module.exports = {
  fetchBusinessDataBySlug
};
