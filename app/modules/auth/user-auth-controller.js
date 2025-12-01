const bcrypt = require("bcryptjs");
const User = require("../../models/user-model");
const Business = require("../../models/business-model");
const TempRegistration = require("../../models/temp-registration-model");
const slugify = require("slugify");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendConfirmationEmail = require("../../services/confirmationEmail");
const {
  sendVerificationCode,
  generateVerificationCode,
} = require("../../services/verificationCodeService");
const JWT_SECRET = process.env.JWT_SECRET;

const register = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      businessName,
      description,
      logo,
      category,
      address,
    } = req.body;

    // Check if email is already registered in permanent users
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification code
    const verificationCode = generateVerificationCode();

    // Remove any existing temporary registration for this email
    await TempRegistration.deleteOne({ email });

    // Create temporary registration
    const tempRegistration = new TempRegistration({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phoneNumber,
      businessName,
      description,
      logo,
      category,
      address,
      verificationCode,
    });
    await tempRegistration.save();

    // Send verification code via email
    await sendVerificationCode(email, firstName, verificationCode);

    res.status(200).json({
      message:
        "Verification code sent to your email. Please verify to complete registration.",
      email: email,
      expiresIn: "30 minutes",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "An error occurred during registration" });
  }
};

// VERIFY CODE ONLY (don't complete registration yet)
const verifyCodeOnly = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res
        .status(400)
        .json({ error: "Email and verification code are required" });
    }

    // Find temporary registration
    const tempRegistration = await TempRegistration.findOne({
      email,
      verificationCode: code,
    });

    if (!tempRegistration) {
      return res
        .status(400)
        .json({ error: "Invalid or expired verification code" });
    }

    // Mark as verified but don't complete registration yet
    tempRegistration.isVerified = true;
    await tempRegistration.save();

    res.status(200).json({
      message:
        "Email verified successfully. Please complete your registration.",
      verified: true,
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: "An error occurred during verification" });
  }
};

// COMPLETE REGISTRATION (after terms acceptance)
const completeRegistration = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Find verified temporary registration
    const tempRegistration = await TempRegistration.findOne({
      email,
      isVerified: true,
    });

    if (!tempRegistration) {
      return res.status(400).json({ error: "Please verify your email first" });
    }

    // Check if email is now registered (race condition protection)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Clean up temp registration
      await TempRegistration.deleteOne({ _id: tempRegistration._id });
      return res.status(400).json({ error: "Email already registered" });
    }

    // Generate unique slug for business name
    const baseSlug = slugify(tempRegistration.businessName, {
      lower: true,
      strict: true,
    });
    let slug = baseSlug;
    let counter = 1;
    while (await Business.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Create business
    const business = new Business({
      name: tempRegistration.businessName,
      slug,
      description: tempRegistration.description,
      logo: tempRegistration.logo,
      category: tempRegistration.category,
      address: tempRegistration.address,
    });
    await business.save();

    // Create user with businessId (already verified)
    const user = new User({
      firstName: tempRegistration.firstName,
      lastName: tempRegistration.lastName,
      email: tempRegistration.email,
      password: tempRegistration.password,
      phoneNumber: tempRegistration.phoneNumber,
      businessId: business._id,
      isVerified: true, // Email is verified
    });
    await user.save();

    // Clean up temporary registration
    await TempRegistration.deleteOne({ _id: tempRegistration._id });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: "24h" } // Add expiration
    );

    res.status(201).json({
      message: "Registration completed successfully!",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        businessId: user.businessId,
        isVerified: user.isVerified,
      },
      business: {
        id: business._id,
        name: business.name,
        slug: business.slug,
        description: business.description,
        logo: business.logo,
        category: business.category,
        address: business.address,
      },
    });
  } catch (error) {
    console.error("Registration completion error:", error);
    res
      .status(500)
      .json({ error: "An error occurred during registration completion" });
  }
};

// RESEND VERIFICATION CODE
const resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Find temporary registration
    const tempRegistration = await TempRegistration.findOne({ email });
    if (!tempRegistration) {
      return res
        .status(400)
        .json({ error: "No pending registration found for this email" });
    }

    // Generate new verification code
    const newVerificationCode = generateVerificationCode();

    // Update the temporary registration with new code and reset expiry
    tempRegistration.verificationCode = newVerificationCode;
    tempRegistration.expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
    await tempRegistration.save();

    // Send new verification code
    await sendVerificationCode(
      email,
      tempRegistration.firstName,
      newVerificationCode
    );

    res.status(200).json({
      message: "New verification code sent to your email",
      email: email,
      expiresIn: "30 minutes",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res
      .status(500)
      .json({ error: "An error occurred while resending verification code" });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ error: "Invalid email or password" });

    // Check if user is verified (if using verification system)
    if (!user.isVerified) {
      return res.status(400).json({
        error: "Please verify your email before logging in",
        requiresVerification: true,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ error: "Invalid email or password" });

    // Check if OTP is enabled for this user
    if (user.otpEnabled) {
      // Generate and send OTP
      const {
        sendOtpEmail,
        generateOtpCode,
      } = require("../../services/otpService");
      const Otp = require("../../models/otp-model");

      const otpCode = generateOtpCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      // Save OTP to database
      await Otp.create({
        userId: user._id,
        code: bcrypt.hashSync(otpCode, 10),
        type: "login",
        expiresAt,
      });

      // Send email
      await sendOtpEmail(user.email, user.firstName, otpCode, "login");

      return res.json({
        requiresOtp: true,
        email: user.email,
        message: "OTP sent to your email",
        expiresIn: "5 minutes",
      });
    }

    // Regular login (no OTP)
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "An error occurred during login" });
  }
};

// CONFIRM EMAIL
const confirmEmail = async (req, res) => {
  try {
    const { token } = req.query;

    // Find user by confirmation token
    const user = await User.findOne({ confirmationToken: token });
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token." });
    }

    // Verify user
    user.isVerified = true;
    user.confirmationToken = null; // Clear the token
    await user.save();

    res.status(200).json({ message: "Email confirmed. You can now log in." });
  } catch (err) {
    console.error("Error confirming email:", err);
    res.status(500).json({ error: "Server error." });
  }
};

// VERIFY LOGIN OTP
const verifyLoginOtp = async (req, res) => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      return res.status(400).json({ error: "Email and OTP code are required" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Verify OTP or backup code
    const { verifyOtp, verifyBackupCode } = require("../user/otp-controller");
    let isOtpValid = await verifyOtp(user._id, otpCode, "login");
    let usedBackupCode = false;

    // If OTP is invalid, try backup code
    if (!isOtpValid) {
      const isBackupCodeValid = await verifyBackupCode(user._id, otpCode);
      if (isBackupCodeValid) {
        isOtpValid = true;
        usedBackupCode = true;
      }
    }

    if (!isOtpValid) {
      return res
        .status(400)
        .json({ error: "Invalid or expired OTP code or backup code" });
    }

    // Update last OTP used
    user.lastOtpUsed = new Date();
    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        businessId: user.businessId,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res
      .status(500)
      .json({ error: "An error occurred during OTP verification" });
  }
};

// RESEND LOGIN OTP
const resendLoginOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user || !user.otpEnabled) {
      return res.status(400).json({ error: "Invalid request" });
    }

    // Generate and send new OTP
    const {
      sendOtpEmail,
      generateOtpCode,
    } = require("../../services/otpService");
    const Otp = require("../../models/otp-model");

    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save OTP to database
    await Otp.create({
      userId: user._id,
      code: bcrypt.hashSync(otpCode, 10),
      type: "login",
      expiresAt,
    });

    // Send email
    await sendOtpEmail(user.email, user.firstName, otpCode, "login");

    res.json({
      message: "New OTP sent to your email",
      expiresIn: "5 minutes",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(500).json({ error: "Failed to resend OTP" });
  }
};

module.exports = {
  register,
  verifyCodeOnly,
  completeRegistration,
  resendVerificationCode,
  login,
  verifyLoginOtp,
  resendLoginOtp,
  confirmEmail,
};
