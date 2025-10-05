const TempRegistration = require('../models/temp-registration-model');

/**
 * Clean up expired temporary registrations
 * This can be run as a cron job or called periodically
 */
const cleanupExpiredRegistrations = async () => {
    try {
        const result = await TempRegistration.deleteMany({
            expiresAt: { $lt: new Date() }
        });
        
        if (result.deletedCount > 0) {
            console.log(`Cleaned up ${result.deletedCount} expired temporary registrations`);
        }
        
        return result;
    } catch (error) {
        console.error('Error cleaning up expired registrations:', error);
        throw error;
    }
};

/**
 * Get statistics about temporary registrations
 */
const getTempRegistrationStats = async () => {
    try {
        const total = await TempRegistration.countDocuments();
        const expired = await TempRegistration.countDocuments({
            expiresAt: { $lt: new Date() }
        });
        const verified = await TempRegistration.countDocuments({
            isVerified: true
        });
        
        return {
            total,
            expired,
            verified,
            active: total - expired
        };
    } catch (error) {
        console.error('Error getting temp registration stats:', error);
        throw error;
    }
};

/**
 * Initialize cleanup scheduler (call this when server starts)
 * Runs cleanup every 15 minutes
 */
const initCleanupScheduler = () => {
    // Run cleanup immediately
    cleanupExpiredRegistrations();
    
    // Schedule cleanup every 15 minutes
    setInterval(cleanupExpiredRegistrations, 15 * 60 * 1000);
    
    console.log('Temporary registration cleanup scheduler initialized');
};

module.exports = {
    cleanupExpiredRegistrations,
    getTempRegistrationStats,
    initCleanupScheduler
};