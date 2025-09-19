const Escalation = require("../../../models/escalation-model");

// Extract case number from query
const extractCaseNumber = (query) => {
  // Look for various case number patterns
  const patterns = [
    /case\s*#?\s*([A-Z0-9]{6,})/i,
    /ticket\s*#?\s*([A-Z0-9]{6,})/i,
    /reference\s*#?\s*([A-Z0-9]{6,})/i,
    /escalation\s*#?\s*([A-Z0-9]{6,})/i,
    /#([A-Z0-9]{6,})/i,
    /([A-Z0-9]{8,})/i // Generic alphanumeric pattern for case numbers
  ];
  
  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match) {
      return match[1].toUpperCase();
    }
  }
  
  return null;
};

// Fetch escalation case status
const getEscalationCaseStatus = async (caseNumber, businessId) => {
  try {
    // Look for escalation by case number and business - only fetch case number and status
    const escalation = await Escalation.findOne({ 
      caseNumber: caseNumber,
      businessId: businessId 
    })
    .select('caseNumber status')
    .lean();
    
    if (!escalation) {
      return null;
    }
    
    // Return only case number and status
    return {
      caseNumber: escalation.caseNumber,
      status: escalation.status
    };
  } catch (error) {
    console.error('Error fetching escalation case:', error);
    return null;
  }
};

// Fetch full escalation details for live chat continuation
const getEscalationForLiveChat = async (caseNumber, businessId) => {
  try {
    // Look for escalation by case number and business - get full details for live chat
    const escalation = await Escalation.findOne({ 
      caseNumber: caseNumber,
      businessId: businessId 
    })
    .select('_id caseNumber sessionId status customerName customerEmail')
    .lean();
    
    if (!escalation) {
      return null;
    }
    
    // Return escalation details needed for live chat continuation
    return {
      escalationId: escalation._id,
      caseNumber: escalation.caseNumber,
      sessionId: escalation.sessionId,
      status: escalation.status,
      customerName: escalation.customerName,
      customerEmail: escalation.customerEmail
    };
  } catch (error) {
    console.error('Error fetching escalation for live chat:', error);
    return null;
  }
};

module.exports = {
  extractCaseNumber,
  getEscalationCaseStatus,
  getEscalationForLiveChat
};