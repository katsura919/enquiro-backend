const { uploadToCloudinary } = require('../../services/fileUploadService');

// Handle file upload
const uploadFile = async (req, res) => {
  try {
    const file = req.file;
    const { businessId, sessionId, escalationId } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(file, {
      folder: `chat-uploads/${businessId}`,
    });

    res.json({
      success: true,
      data: {
        fileName: uploadResult.originalName,
        fileUrl: uploadResult.url,
        fileSize: uploadResult.size,
        mimeType: uploadResult.mimeType,
        publicId: uploadResult.publicId,
        resourceType: uploadResult.resourceType,
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload file: ' + error.message });
  }
};

// Download file with proper headers
const downloadFile = async (req, res) => {
  try {
    const { fileUrl } = req.query;
    const { filename } = req.query;
    
    if (!fileUrl) {
      return res.status(400).json({ error: 'File URL is required' });
    }

    // For Cloudinary URLs, we can directly redirect with proper headers
    // But we set the proper content-disposition header for download
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'download'}"`);
    
    // Let the browser handle the actual download from Cloudinary
    res.redirect(fileUrl);

  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ error: 'Failed to download file: ' + error.message });
  }
};

module.exports = {
  uploadFile,
  downloadFile,
};
