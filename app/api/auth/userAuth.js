const bcrypt = require("bcryptjs");
const User = require("../../models/userModel");
const Business = require("../../models/businessModel");
const slugify = require("slugify");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendConfirmationEmail = require('../../services/confirmationEmail');
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

    // Check if email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Generate unique slug for business name
    const baseSlug = slugify(businessName, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;
    while (await Business.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create business
    const business = new Business({
      name: businessName,
      slug,
      description,
      logo,
      category,
      address,
    });
    await business.save();

    // Generate confirmation token
    const confirmationToken = crypto.randomBytes(32).toString('hex');

    // Create user with businessId
    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phoneNumber,
      businessId: business._id,
      confirmationToken
    });
    await user.save();

    // Send confirmation email
    await sendConfirmationEmail(email, firstName, confirmationToken);

    res.status(201).json({
      message: "Registration successful. Please check your email to confirm your account.",
      user: {
        id: user._id,
        firstName,
        lastName,
        email,
        phoneNumber,
        businessId: user.businessId,
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
    console.error("Registration error:", error);
    res.status(500).json({ error: "An error occurred during registration" });
  }
};

// LOGIN
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid email or password" });

    // Generate token (include user ID)
    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        businessId: user.businessId,
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
      return res.status(400).json({ error: 'Invalid or expired token.' });
    }

    // Verify user
    user.isVerified = true;
    user.confirmationToken = null; // Clear the token
    await user.save();

    res.status(200).json({ message: 'Email confirmed. You can now log in.' });
  } catch (err) {
    console.error('Error confirming email:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = {
  register,
  login,
  confirmEmail,
};
