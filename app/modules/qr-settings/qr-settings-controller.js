const QRSettings = require('../../models/qr-settings-model');

// Get QR settings for a business
const getQRSettings = async (req, res) => {
  try {
    const { businessId } = req.params;

    let qrSettings = await QRSettings.findOne({ businessId });
    
    // If no settings exist, create default ones
    if (!qrSettings) {
      qrSettings = new QRSettings({
        businessId,
        bgColor: "#ffffff",
        fgColor: "#000000",
        includeLogo: true,
        errorCorrectionLevel: "M"
      });
      await qrSettings.save();
    }

    res.status(200).json({
      success: true,
      data: qrSettings
    });
  } catch (error) {
    console.error('Error fetching QR settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching QR settings',
      error: error.message
    });
  }
};

// Update QR settings for a business
const updateQRSettings = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { bgColor, fgColor, includeLogo, errorCorrectionLevel } = req.body;

    // Validate hex colors if provided
    if (bgColor && !/^#[0-9A-Fa-f]{6}$/.test(bgColor)) {
      return res.status(400).json({
        success: false,
        message: 'Background color must be a valid hex color'
      });
    }

    if (fgColor && !/^#[0-9A-Fa-f]{6}$/.test(fgColor)) {
      return res.status(400).json({
        success: false,
        message: 'Foreground color must be a valid hex color'
      });
    }

    // Validate error correction level if provided
    if (errorCorrectionLevel && !['L', 'M', 'Q', 'H'].includes(errorCorrectionLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Error correction level must be L, M, Q, or H'
      });
    }

    const updateData = {};
    if (bgColor !== undefined) updateData.bgColor = bgColor;
    if (fgColor !== undefined) updateData.fgColor = fgColor;
    if (includeLogo !== undefined) updateData.includeLogo = includeLogo;
    if (errorCorrectionLevel !== undefined) updateData.errorCorrectionLevel = errorCorrectionLevel;

    const qrSettings = await QRSettings.findOneAndUpdate(
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
      data: qrSettings,
      message: 'QR settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating QR settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating QR settings',
      error: error.message
    });
  }
};

// Reset QR settings to default
const resetQRSettings = async (req, res) => {
  try {
    const { businessId } = req.params;

    const defaultSettings = {
      bgColor: "#ffffff",
      fgColor: "#000000",
      includeLogo: true,
      errorCorrectionLevel: "M"
    };

    const qrSettings = await QRSettings.findOneAndUpdate(
      { businessId },
      defaultSettings,
      { 
        new: true, 
        upsert: true,
        runValidators: true 
      }
    );

    res.status(200).json({
      success: true,
      data: qrSettings,
      message: 'QR settings reset to default successfully'
    });
  } catch (error) {
    console.error('Error resetting QR settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting QR settings',
      error: error.message
    });
  }
};

module.exports = {
  getQRSettings,
  updateQRSettings,
  resetQRSettings
};