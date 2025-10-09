const User = require('../../models/user-model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


// Fetch user info using JWT token
const getUserInfoByToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided.' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a user
const createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phoneNumber, profilePicture } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'firstName, lastName, email, and password are required.' });
    }
    const user = new User({ firstName, lastName, email, password, phoneNumber, profilePicture });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get all users
const getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Get one user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    console.error('Error fetching user by ID:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Update a user by ID
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, password, phoneNumber, profilePicture } = req.body;
    const user = await User.findByIdAndUpdate(
      id,
      { firstName, lastName, email, password, phoneNumber, profilePicture },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Delete a user by ID
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

// Change user password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    // Get user ID from authenticated token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token.' });
    }

    // Find user with password field
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    // Validate new password strength (optional but recommended)
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    // Check if new password is same as current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ error: 'New password must be different from current password.' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(500).json({ error: 'Server error.' });
  }
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserInfoByToken,
  changePassword,
};


