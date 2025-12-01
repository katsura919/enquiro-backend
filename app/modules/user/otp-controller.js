const User = require("../../models/user-model");
const Otp = require("../../models/otp-model");
const {
  sendOtpEmail,
  generateOtpCode,
  generateBackupCodes,
} = require("../../services/otpService");
const bcrypt = require("bcryptjs");

// Toggle OTP (Enable/Disable combined)
const toggleOtp = async (req, res) => {
  try {
    const { password, otpCode, enable } = req.body;
    const userId = req.user.userId;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid password" });
    }

    // If disabling OTP, require current OTP verification
    if (user.otpEnabled && !enable) {
      if (!otpCode) {
        return res
          .status(400)
          .json({ error: "OTP code required to disable OTP" });
      }

      const isOtpValid = await verifyOtp(userId, otpCode, "settings_change");
      if (!isOtpValid) {
        return res.status(400).json({ error: "Invalid or expired OTP code" });
      }
    }

    // Toggle OTP status
    user.otpEnabled = enable;

    // Generate backup codes when enabling
    let backupCodes = null;
    if (enable) {
      backupCodes = generateBackupCodes();
      user.backupCodes = backupCodes.map((code) => ({
        code: bcrypt.hashSync(code, 10),
      }));
    } else {
      user.backupCodes = [];
    }

    await user.save();

    res.json({
      message: `OTP ${enable ? "enabled" : "disabled"} successfully`,
      otpEnabled: user.otpEnabled,
      backupCodes: enable ? backupCodes : undefined, // Only return codes when enabling
    });
  } catch (error) {
    console.error("Toggle OTP error:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating OTP settings" });
  }
};

// Send OTP for settings changes
const sendSettingsOtp = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate and send OTP
    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP to database
    await Otp.create({
      userId,
      code: bcrypt.hashSync(otpCode, 10),
      type: "settings_change",
      expiresAt,
    });

    // Send email
    await sendOtpEmail(user.email, user.firstName, otpCode, "settings_change");

    res.json({
      message: "OTP sent to your email",
      expiresIn: "5 minutes",
    });
  } catch (error) {
    console.error("Send settings OTP error:", error);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

// Verify OTP (utility function)
const verifyOtp = async (userId, code, type) => {
  try {
    const otps = await Otp.find({
      userId,
      type,
      used: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    for (const otp of otps) {
      if (bcrypt.compareSync(code, otp.code)) {
        // Mark as used
        otp.used = true;
        await otp.save();
        return true;
      }

      // Increment attempts
      otp.attempts += 1;
      await otp.save();

      // Block after 5 attempts
      if (otp.attempts >= 5) {
        otp.used = true;
        await otp.save();
      }
    }

    return false;
  } catch (error) {
    console.error("OTP verification error:", error);
    return false;
  }
};

// Get OTP status
const getOtpStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select("otpEnabled backupCodes");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const unusedBackupCodes = user.backupCodes
      ? user.backupCodes.filter((bc) => !bc.used).length
      : 0;

    res.json({
      otpEnabled: user.otpEnabled,
      hasBackupCodes: unusedBackupCodes > 0,
      backupCodesCount: unusedBackupCodes,
    });
  } catch (error) {
    console.error("Get OTP status error:", error);
    res.status(500).json({ error: "Failed to get OTP status" });
  }
};

// Generate new backup codes
const generateNewBackupCodes = async (req, res) => {
  try {
    const { password, otpCode } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: "Invalid password" });
    }

    // If OTP is enabled, require OTP verification
    if (user.otpEnabled) {
      if (!otpCode) {
        return res.status(400).json({ error: "OTP code required" });
      }

      const isOtpValid = await verifyOtp(userId, otpCode, "settings_change");
      if (!isOtpValid) {
        return res.status(400).json({ error: "Invalid or expired OTP code" });
      }
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes();
    user.backupCodes = backupCodes.map((code) => ({
      code: bcrypt.hashSync(code, 10),
    }));
    await user.save();

    res.json({
      message: "New backup codes generated successfully",
      backupCodes,
    });
  } catch (error) {
    console.error("Generate backup codes error:", error);
    res.status(500).json({ error: "Failed to generate backup codes" });
  }
};

// Verify backup code
const verifyBackupCode = async (userId, code) => {
  try {
    const user = await User.findById(userId).select("backupCodes");
    if (!user || !user.backupCodes || user.backupCodes.length === 0) {
      return false;
    }

    // Find matching unused backup code
    for (const backupCode of user.backupCodes) {
      if (!backupCode.used && bcrypt.compareSync(code, backupCode.code)) {
        // Mark as used
        backupCode.used = true;
        backupCode.usedAt = new Date();
        await user.save();
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("Backup code verification error:", error);
    return false;
  }
};

module.exports = {
  toggleOtp,
  sendSettingsOtp,
  getOtpStatus,
  generateNewBackupCodes,
  verifyOtp, // Export for use in other modules
  verifyBackupCode, // Export for backup code verification
};
