const gmailService = require("./gmailService");
const crypto = require("crypto");

const sendOtpEmail = async (email, name, otpCode, type = "login") => {
  try {
    const typeLabels = {
      login: "Login Verification",
      settings_change: "Settings Change Verification",
      password_reset: "Password Reset Verification",
    };

    const emailData = {
      to: email,
      subject: `${typeLabels[type]} - OTP Code`,
      from: "Enquiro Security",
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${typeLabels[type]}</h2>
          <p>Hi ${name},</p>
          <p>Your verification code is:</p>
          <div style="background-color: #f8f9fa; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; border: 2px solid #007bff;">
            <h1 style="color: #007bff; font-size: 36px; margin: 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otpCode}</h1>
          </div>
          <p><strong>Important:</strong> This code will expire in 5 minutes.</p>
          <p><strong>Security Notice:</strong> If you did not request this code, please secure your account immediately.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">Best regards,<br>Enquiro Security Team</p>
          <p style="color: #999; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
        </div>
      `,
    };

    const result = await gmailService.sendEmail(emailData);
    console.log("OTP email sent successfully:", result.messageId);
    return result;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw error;
  }
};

const generateOtpCode = () => {
  // Generate a 6-digit OTP code
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateBackupCodes = () => {
  // Generate 10 backup codes (8 characters each)
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString("hex").toUpperCase());
  }
  return codes;
};

module.exports = {
  sendOtpEmail,
  generateOtpCode,
  generateBackupCodes,
};
