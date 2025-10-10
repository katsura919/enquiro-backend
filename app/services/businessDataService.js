const Business = require("../models/business-model");
const FAQ = require("../models/faq-model");
const Policy = require("../models/policy-model");  
const Product = require("../models/product-model");
const Service = require("../models/service-model");
const { searchMultipleCollections } = require("./queryProcessingService");

/**
 * Fetch business data with all related collections using Atlas Search
 * @param {string} slug - Business slug
 * @param {string|null} query - Optional query for search
 * @returns {Object} - Business and all related data
 */
const fetchBusinessDataBySlug = async (slug, query = null) => {
  console.log('🔍 fetchBusinessDataBySlug called with slug:', slug, 'query:', query);
  
  const business = await Business.findOne({ slug }).lean();
  if (!business) {
    console.log('❌ Business not found for slug:', slug);
    return { business: null, allData: null };
  }
  
  console.log('✅ Business found:', business.name, 'ID:', business._id);

  if (!query) {
    console.log('📋 No query provided - fetching recent data from all collections');
    // If no query, fetch recent data from all collections
    const [faqs, policies, products, services] = await Promise.all([
      FAQ.find({ businessId: business._id, isActive: true })
        .sort({ createdAt: -1 })
        .select('question answer category tags')
        .limit(5)
        .lean(),
      
      Policy.find({ businessId: business._id, isActive: true })
        .sort({ createdAt: -1 })
        .select('title content type tags')
        .limit(5)
        .lean(),
      
      Product.find({ businessId: business._id, isActive: true })
        .sort({ createdAt: -1 })
        .select('name description price category sku quantity')
        .limit(5)
        .lean(),
      
      Service.find({ businessId: business._id, isActive: true })
        .sort({ createdAt: -1 })
        .select('name description pricing duration category')
        .limit(5)
        .lean()
    ]);

    console.log('📊 Data fetched:', {
      faqs: faqs.length,
      policies: policies.length,
      products: products.length,
      services: services.length,
      total: faqs.length + policies.length + products.length + services.length
    });

    // Combine and add type
    const allData = [
      ...faqs.map(item => ({ ...item, type: 'faq' })),
      ...policies.map(item => ({ ...item, type: 'policy' })),
      ...products.map(item => ({ ...item, type: 'product' })),
      ...services.map(item => ({ ...item, type: 'service' }))
    ];

    console.log('✅ Returning allData with', allData.length, 'items');
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
