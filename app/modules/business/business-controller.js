const Business = require('../../models/business-model');
const { uploadToCloudinary, deleteFromCloudinary } = require('../../services/fileUploadService');

// Upload business logo
const uploadLogo = async (req, res) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Check if file is an image
    if (!file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Only image files are allowed for logo' });
    }

    // Find the business
    const business = await Business.findById(id);
    if (!business) {
      return res.status(404).json({ error: 'Business not found.' });
    }

    // Delete old logo from Cloudinary if it exists
    if (business.logo) {
      try {
        // Extract public ID from Cloudinary URL
        const urlParts = business.logo.split('/');
        const publicIdWithExtension = urlParts.slice(-2).join('/'); // Gets folder/filename.ext
        const publicId = publicIdWithExtension.split('.')[0]; // Removes extension
        await deleteFromCloudinary(publicId, 'image');
      } catch (deleteError) {
        console.error('Error deleting old logo:', deleteError);
        // Continue with upload even if deletion fails
      }
    }

    // Upload new logo to Cloudinary
    const uploadResult = await uploadToCloudinary(file, {
      folder: `business-logos/${business.slug || id}`,
      transformation: [
        { width: 500, height: 500, crop: 'limit' },
        { quality: 'auto:good' }
      ]
    });

    // Update business with new logo URL
    business.logo = uploadResult.url;
    await business.save();

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      data: {
        logo: business.logo,
        publicId: uploadResult.publicId
      }
    });

  } catch (error) {
    console.error('Error uploading logo:', error);
    res.status(500).json({ error: 'Failed to upload logo: ' + error.message });
  }
};

// Create a business
const createBusiness = async (req, res) => {
  try {
    const { name, slug, description, logo, category, address } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ error: 'name and slug are required.' });
    }
    const business = new Business({ name, slug, description, logo, category, address });
    await business.save();
    res.status(201).json(business);
  } catch (err) {
    console.error('Error creating business:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get business by slug
const getBusinessBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const business = await Business.findOne({ slug });
    if (!business) {
      return res.status(404).json({ error: 'Business not found.' });
    }
    res.json(business);
  } catch (err) {
    console.error('Error fetching business by slug:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get all businesses
const getBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find().sort({ createdAt: -1 });
    res.json(businesses);
  } catch (err) {
    console.error('Error fetching businesses:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get one business by ID
const getBusinessById = async (req, res) => {
  try {
    const { id } = req.params;
    const business = await Business.findById(id);
    if (!business) return res.status(404).json({ error: 'Business not found.' });
    res.json(business);
  } catch (err) {
    console.error('Error fetching business by ID:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Update a business by ID
const updateBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, logo, category, address } = req.body;
    const business = await Business.findByIdAndUpdate(
      id,
      { name, slug, description, logo, category, address },
      { new: true, runValidators: true }
    );
    if (!business) return res.status(404).json({ error: 'Business not found.' });
    res.json(business);
  } catch (err) {
    console.error('Error updating business:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Delete a business by ID
const deleteBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const business = await Business.findById(id);
    if (!business) return res.status(404).json({ error: 'Business not found.' });

    // Delete logo from Cloudinary if it exists
    if (business.logo) {
      try {
        const urlParts = business.logo.split('/');
        const publicIdWithExtension = urlParts.slice(-2).join('/');
        const publicId = publicIdWithExtension.split('.')[0];
        await deleteFromCloudinary(publicId, 'image');
      } catch (deleteError) {
        console.error('Error deleting logo from Cloudinary:', deleteError);
        // Continue with business deletion even if logo deletion fails
      }
    }

    await Business.findByIdAndDelete(id);
    res.json({ message: 'Business deleted successfully.' });
  } catch (err) {
    console.error('Error deleting business:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = { 
  createBusiness, 
  getBusinesses, 
  getBusinessById, 
  updateBusiness, 
  deleteBusiness, 
  getBusinessBySlug,
  uploadLogo
};
