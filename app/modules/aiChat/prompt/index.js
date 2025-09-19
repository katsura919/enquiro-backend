// Import all fallback prompts
const pricingAvailablePrompt = require('./pricing-available');
const serviceInquiryPrompt = require('./service-inquiry');
const checkFaqPolicyPrompt = require('./check-faq-policy');
const generalInfoAvailablePrompt = require('./general-info-available');
const caseFollowupFallbackPrompt = require('./case-followup-fallback');
const generalFallbackPrompt = require('./general-fallback');
const suggestAvailableTopicsPrompt = require('./suggest-available-topics');

// Export all prompts in a convenient object
const fallbackPrompts = {
  pricing_available: pricingAvailablePrompt,
  service_inquiry: serviceInquiryPrompt,
  check_faq_policy: checkFaqPolicyPrompt,
  general_info_available: generalInfoAvailablePrompt,
  case_followup_fallback: caseFollowupFallbackPrompt,
  general_fallback: generalFallbackPrompt,
  suggest_available_topics: suggestAvailableTopicsPrompt
};

module.exports = fallbackPrompts;