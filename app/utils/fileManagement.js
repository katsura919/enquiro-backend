const Chat = require('../models/chat-model');
const { deleteFromCloudinary } = require('../services/fileUploadService');

// Delete a chat message and its associated files
const deleteChatWithFiles = async (chatId) => {
  try {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new Error('Chat not found');
    }

    // Delete files from Cloudinary if they exist
    if (chat.attachments && chat.attachments.length > 0) {
      for (const attachment of chat.attachments) {
        if (attachment.publicId) {
          try {
            await deleteFromCloudinary(attachment.publicId);
            console.log(`Deleted file from Cloudinary: ${attachment.publicId}`);
          } catch (error) {
            console.error(`Failed to delete file from Cloudinary: ${attachment.publicId}`, error);
          }
        }
      }
    }

    // Delete the chat message
    await Chat.findByIdAndDelete(chatId);
    
    return { success: true, message: 'Chat and associated files deleted successfully' };
  } catch (error) {
    console.error('Error deleting chat with files:', error);
    throw error;
  }
};

// Clean up orphaned files (files not referenced in any chat)
const cleanupOrphanedFiles = async (businessId) => {
  try {
    // This is a placeholder for a more complex cleanup process
    // You might want to implement this based on your specific needs
    console.log(`Cleanup process initiated for business: ${businessId}`);
    
    // Get all chats for the business
    const chats = await Chat.find({ businessId }).select('attachments');
    
    // Extract all file public IDs
    const activePublicIds = new Set();
    chats.forEach(chat => {
      if (chat.attachments) {
        chat.attachments.forEach(attachment => {
          if (attachment.publicId) {
            activePublicIds.add(attachment.publicId);
          }
        });
      }
    });
    
    console.log(`Found ${activePublicIds.size} active files for business ${businessId}`);
    
    return { success: true, activeFiles: activePublicIds.size };
  } catch (error) {
    console.error('Error cleaning up orphaned files:', error);
    throw error;
  }
};

// Get file usage statistics
const getFileUsageStats = async (businessId) => {
  try {
    const stats = await Chat.aggregate([
      { $match: { businessId: businessId } },
      { $unwind: { path: '$attachments', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$messageType',
          count: { $sum: 1 },
          totalSize: { $sum: '$attachments.fileSize' },
        }
      },
    ]);
    
    return stats;
  } catch (error) {
    console.error('Error getting file usage stats:', error);
    throw error;
  }
};

module.exports = {
  deleteChatWithFiles,
  cleanupOrphanedFiles,
  getFileUsageStats,
};
