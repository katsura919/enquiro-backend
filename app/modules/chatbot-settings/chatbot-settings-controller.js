const ChatbotSettings = require('../../models/chatbot-settings-model');

// Create chatbot settings for a business
const createChatbotSettings = async (req, res) => {
  try {
    const { businessId, chatbotName, chatbotIcon, enableLiveChat } = req.body;

    // Validate required fields
    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business ID is required'
      });
    }

    // Check if settings already exist for this business
    const existingSettings = await ChatbotSettings.findOne({ businessId });
    if (existingSettings) {
      return res.status(409).json({
        success: false,
        message: 'Chatbot settings already exist for this business',
        data: existingSettings
      });
    }

    // Create new settings
    const settingsData = { businessId };
    if (chatbotName !== undefined) settingsData.chatbotName = chatbotName;
    if (chatbotIcon !== undefined) settingsData.chatbotIcon = chatbotIcon;
    if (enableLiveChat !== undefined) settingsData.enableLiveChat = enableLiveChat;

    const settings = await ChatbotSettings.create(settingsData);

    res.status(201).json({
      success: true,
      message: 'Chatbot settings created successfully',
      data: settings
    });
  } catch (error) {
    console.error('Error creating chatbot settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create chatbot settings',
      error: error.message
    });
  }
};

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
    const { chatbotName, chatbotIcon, enableLiveChat } = req.body;

    const updateData = {};
    if (chatbotName !== undefined) updateData.chatbotName = chatbotName;
    if (chatbotIcon !== undefined) updateData.chatbotIcon = chatbotIcon;
    if (enableLiveChat !== undefined) updateData.enableLiveChat = enableLiveChat;

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
  createChatbotSettings,
  getChatbotSettings,
  updateChatbotSettings
};
