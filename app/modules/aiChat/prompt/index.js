// Import all fallback prompts
const pricingAvailablePrompt = require('./pricing-available');
const generalInfoAvailablePrompt = require('./general-info-available');
const generalFallbackPrompt = require('./general-fallback');

// Export all prompts in a convenient object
const fallbackPrompts = {
  pricing_available: pricingAvailablePrompt,
  general_info_available: generalInfoAvailablePrompt,
  general_fallback: generalFallbackPrompt
};

module.exports = fallbackPrompts;