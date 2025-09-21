const ChatbotSettings = require('../../models/chatbot-settings-model');

// Get chatbot settings for a business
const getChatbotSettings = async (req, res) => {
  try {
    const { businessId } = req.params;

    let settings = await ChatbotSettings.findOne({ businessId });
    
    // If no settings exist, create default ones
    if (!settings) {
      settings = await ChatbotSettings.create({ businessId });
    }

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting chatbot settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chatbot settings',
      error: error.message
    });
  }
};

// Update chatbot settings for a business
const updateChatbotSettings = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { chatbotName, chatbotIcon } = req.body;

    const updateData = {};
    if (chatbotName !== undefined) updateData.chatbotName = chatbotName;
    if (chatbotIcon !== undefined) updateData.chatbotIcon = chatbotIcon;

    const settings = await ChatbotSettings.findOneAndUpdate(
      { businessId },
      updateData,
      { 
        new: true, 
        upsert: true, // Create if doesn't exist
        runValidators: true 
      }
    );

    res.status(200).json({
      success: true,
      data: settings,
      message: 'Chatbot settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating chatbot settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update chatbot settings',
      error: error.message
    });
  }
};

module.exports = {
  getChatbotSettings,
  updateChatbotSettings
};
