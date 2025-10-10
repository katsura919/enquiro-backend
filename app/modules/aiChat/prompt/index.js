// Import all fallback prompts
const pricingAvailablePrompt = require('./pricing-available');
const generalInfoAvailablePrompt = require('./general-info-available');
const caseFollowupFallbackPrompt = require('./case-followup-fallback');
const generalFallbackPrompt = require('./general-fallback');

// Export all prompts in a convenient object
const fallbackPrompts = {
  pricing_available: pricingAvailablePrompt,
  general_info_available: generalInfoAvailablePrompt,
  case_followup_fallback: caseFollowupFallbackPrompt,
  general_fallback: generalFallbackPrompt
};

module.exports = fallbackPrompts;