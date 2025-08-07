const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter for images and documents
const fileFilter = (req, file, cb) => {
  // Allow images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  }
  // Allow common document types
  else if (
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'application/msword' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.mimetype === 'text/plain'
  ) {
    cb(null, true);
  }
  else {
    cb(new Error('Invalid file type. Only images and documents are allowed.'), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Helper function to determine resource type
const getResourceType = (mimeType) => {
  if (mimeType.startsWith('image/')) {
    return 'image';
  } else {
    return 'raw';
  }
};

// Upload file to Cloudinary
const uploadToCloudinary = async (file, options = {}) => {
  return new Promise((resolve, reject) => {
    // Determine resource type based on file type
    const resourceType = getResourceType(file.mimetype);

    const uploadOptions = {
      resource_type: resourceType,
      folder: 'chat-uploads', // Organize files in a folder
      use_filename: true,
      unique_filename: true,
      ...options,
    };

    // For images, add additional options
    if (file.mimetype.startsWith('image/')) {
      uploadOptions.quality = 'auto:good';
      uploadOptions.fetch_format = 'auto';
    }

    cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            originalName: file.originalname,
            size: result.bytes,
            mimeType: file.mimetype,
            format: result.format,
            resourceType: resourceType, // Include resource type for future operations
          });
        }
      }
    ).end(file.buffer);
  });
};

// Delete file from Cloudinary
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

// Get file info from Cloudinary
const getFileInfo = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Cloudinary get file info error:', error);
    throw error;
  }
};

module.exports = {
  upload,
  uploadToCloudinary,
  deleteFromCloudinary,
  getFileInfo,
  getResourceType,
  cloudinary,
};
