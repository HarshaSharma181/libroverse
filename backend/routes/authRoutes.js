const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const { auth, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Add a simple test route
router.get('/test', (req, res) => {
  res.json({
    message: 'Auth routes working',
    time: new Date().toISOString()
  });
});

// Debug route to see all users (NO AUTH REQUIRED - FOR TESTING)
router.get('/debug/users', async (req, res) => {
  try {
    console.log('Debug route: Fetching all users...');
    const users = await User.find({}, 'name email role createdAt updatedAt');
    console.log(`Found ${users.length} users`);
    res.json({
      count: users.length,
      users: users
    });
  } catch (err) {
    console.error('Debug route error:', err.message);
    res.status(500).json({ 
      error: err.message,
      message: 'Database error'
    });
  }
});

// ==============================================
// ADMIN ROUTES
// ==============================================

// Get all users (Admin only)
router.get('/admin/users', auth, admin, async (req, res) => {
  console.log('\n=== GET ALL USERS (ADMIN) ===');
  console.log('Requested by admin ID:', req.user.id);
  console.log('Admin email:', req.user.email);
  
  try {
    const users = await User.find({}, '-passwordHash').sort({ createdAt: -1 });
    
    console.log(`✅ Retrieved ${users.length} users`);
    
    res.json({
      success: true,
      count: users.length,
      users: users
    });
    
  } catch (err) {
    console.error('💥 Get all users error:', err.message);
    
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

// DELETE SINGLE USER (Admin only)
router.delete('/admin/users/:userId', auth, admin, async (req, res) => {
  console.log('\n=== DELETE SINGLE USER (ADMIN) ===');
  console.log('Admin ID:', req.user.id);
  console.log('Target User ID:', req.params.userId);
  
  try {
    const { userId } = req.params;
    
    // Check if user is trying to delete themselves
    if (userId === req.user.id) {
      console.log('❌ Admin cannot delete their own account');
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete your own account' 
      });
    }
    
    // Check if target user exists
    const targetUser = await User.findById(userId);
    
    if (!targetUser) {
      console.log('❌ User not found');
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    console.log(`🔍 Deleting user: ${targetUser.email} (${targetUser.role})`);
    
    // Delete user from database
    const result = await User.findByIdAndDelete(userId);
    
    // Also delete user's cart and orders if they exist
    await Cart.deleteMany({ userId });
    await Order.deleteMany({ userId });
    
    console.log(`✅ User deleted: ${targetUser.email}`);
    
    res.json({ 
      success: true, 
      message: 'User deleted successfully',
      deletedUser: {
        id: result._id,
        name: result.name,
        email: result.email,
        role: result.role
      }
    });
  } catch (error) {
    console.error('💥 Error deleting user:', error.message);
    
    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID format' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error while deleting user' 
    });
  }
});

// DELETE MULTIPLE USERS (Admin only)
router.post('/admin/delete-users', auth, admin, async (req, res) => {
  console.log('\n=== DELETE MULTIPLE USERS (ADMIN) ===');
  console.log('Admin ID:', req.user.id);
  console.log('Request body:', req.body);
  
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      console.log('❌ No users selected');
      return res.status(400).json({ 
        success: false, 
        message: 'No users selected' 
      });
    }
    
    // Prevent deleting own account
    const filteredUserIds = userIds.filter(id => id !== req.user.id);
    
    if (filteredUserIds.length === 0) {
      console.log('❌ Admin cannot delete their own account');
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete your own account' 
      });
    }
    
    // Find users to be deleted (for response)
    const usersToDelete = await User.find({ _id: { $in: filteredUserIds } });
    
    if (usersToDelete.length === 0) {
      console.log('❌ No valid users found to delete');
      return res.status(404).json({ 
        success: false, 
        message: 'No valid users found to delete' 
      });
    }
    
    console.log(`🔍 Deleting ${usersToDelete.length} users...`);
    console.log('Users to delete:', usersToDelete.map(u => ({ email: u.email, role: u.role })));
    
    // Delete multiple users
    const result = await User.deleteMany({ _id: { $in: filteredUserIds } });
    
    // Delete associated carts and orders
    await Cart.deleteMany({ userId: { $in: filteredUserIds } });
    await Order.deleteMany({ userId: { $in: filteredUserIds } });
    
    console.log(`✅ Deleted ${result.deletedCount} users successfully`);
    
    res.json({ 
      success: true, 
      message: `Deleted ${result.deletedCount} users successfully`,
      deletedCount: result.deletedCount,
      deletedUsers: usersToDelete.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }))
    });
  } catch (error) {
    console.error('💥 Error deleting users:', error.message);
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error while deleting users' 
    });
  }
});

// ==============================================
// AUTHENTICATION ROUTES
// ==============================================

// register
router.post('/register', async (req, res) => {
  console.log('\n=== REGISTER REQUEST ===');
  console.log('Request body:', req.body);
  
  try {
    const { name, email, password, role } = req.body;
    
    if (!name || !email || !password) {
      console.log('❌ Missing fields');
      return res.status(400).json({ 
        success: false,
        message: 'All fields are required: name, email, password' 
      });
    }

    console.log(`🔍 Checking for existing user: ${email}`);
    const existing = await User.findOne({ email });
    
    if (existing) {
      console.log(`❌ Email already exists: ${email}`);
      return res.status(400).json({ 
        success: false,
        message: 'Email already in use' 
      });
    }

    console.log('🔒 Hashing password...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Use provided role or default to 'user'
    const userRole = role || 'user';
    console.log(`👤 Creating user with role: ${userRole}`);
    
    const user = new User({ 
      name, 
      email, 
      passwordHash, 
      role: userRole 
    });
    
    await user.save();
    console.log(`✅ User created: ${user.email}, ID: ${user._id}, Role: ${user.role}`);

    const token = jwt.sign({ 
      id: user._id,
      email: user.email,
      role: user.role 
    }, process.env.JWT_SECRET, { 
      expiresIn: process.env.TOKEN_EXPIRES_IN || '7d' 
    });
    
    console.log(`🎉 Registration successful for: ${user.email} (${user.role})`);
    
    res.status(201).json({ 
      success: true,
      message: `Registration successful! Account created as ${user.role}.`,
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      } 
    });
    
  } catch (err) {
    console.error('💥 Register error:', err.message);
    
    // Handle specific errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        message: 'Validation error',
        error: err.message 
      });
    }
    
    if (err.code === 11000) {
      return res.status(400).json({ 
        success: false,
        message: 'Email already exists',
        error: 'Duplicate email' 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error during registration',
      error: err.message 
    });
  }
});

// login
router.post('/login', async (req, res) => {
  console.log('\n=== LOGIN REQUEST ===');
  console.log('Login attempt for:', req.body.email);
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ 
        success: false,
        message: 'Email and password are required' 
      });
    }

    console.log(`🔍 Finding user: ${email}`);
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    console.log('🔒 Comparing password...');
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    
    if (!isMatch) {
      console.log(`❌ Password incorrect for: ${email}`);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    const token = jwt.sign({ 
      id: user._id,
      email: user.email,
      role: user.role 
    }, process.env.JWT_SECRET, { 
      expiresIn: process.env.TOKEN_EXPIRES_IN || '7d' 
    });
    
    console.log(`✅ Login successful: ${user.email} (${user.role})`);
    
    res.json({ 
      success: true,
      message: `Login successful! Welcome ${user.name}.`,
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role 
      } 
    });
    
  } catch (err) {
    console.error('💥 Login error:', err.message);
    
    res.status(500).json({ 
      success: false,
      message: 'Server error during login',
      error: err.message 
    });
  }
});

// Forgot Password - Send reset email
router.post('/forgot-password', async (req, res) => {
  console.log('\n=== FORGOT PASSWORD REQUEST ===');
  console.log('Request for email:', req.body.email);
  
  try {
    const { email } = req.body;
    
    if (!email) {
      console.log('❌ Email is required');
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }

    const user = await User.findOne({ email });
    
    // For security, always return success even if email doesn't exist
    if (!user) {
      console.log(`ℹ️ Email not found (returning generic message): ${email}`);
      return res.json({ 
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.'
      });
    }

    // In a real application, you would:
    // 1. Generate a reset token
    // 2. Save it to the user's record with an expiry time
    // 3. Send an email with a reset link
    
    console.log(`✅ Password reset email would be sent to: ${email}`);
    
    res.json({ 
      success: true,
      message: 'If an account exists with this email, you will receive password reset instructions.'
    });
    
  } catch (err) {
    console.error('💥 Forgot password error:', err.message);
    
    res.status(500).json({ 
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

// Direct Password Reset (without current password)
router.post('/reset-password-direct', async (req, res) => {
  console.log('\n=== DIRECT PASSWORD RESET REQUEST ===');
  console.log('Request body:', { email: req.body.email, hasPassword: !!req.body.newPassword });
  
  try {
    const { email, newPassword } = req.body;
    
    // Validation
    if (!email || !newPassword) {
      console.log('❌ Missing email or new password');
      return res.status(400).json({ 
        success: false,
        message: 'Email and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      console.log('❌ Password too short');
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters long' 
      });
    }

    console.log(`🔍 Finding user: ${email}`);
    const user = await User.findOne({ email });
    
    // For security, return same message whether user exists or not
    if (!user) {
      console.log(`ℹ️ User not found (returning generic message): ${email}`);
      return res.json({ 
        success: true,
        message: 'If an account exists with this email, password has been reset successfully.' 
      });
    }

    // Check if new password is same as current password
    console.log('🔒 Checking if new password is different from current password...');
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      console.log('❌ New password is same as current password');
      return res.status(400).json({ 
        success: false,
        message: 'New password cannot be the same as current password' 
      });
    }

    // Hash new password
    console.log('🔒 Hashing new password...');
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    console.log(`🔄 Updating password for user: ${email}`);
    user.passwordHash = newPasswordHash;
    user.updatedAt = Date.now();
    await user.save();

    console.log(`✅ Direct password reset successful for: ${email}`);

    res.json({ 
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.' 
    });

  } catch (err) {
    console.error('💥 Direct password reset error:', err.message);
    
    res.status(500).json({ 
      success: false,
      message: 'Server error. Please try again later.' 
    });
  }
});

// Change Password (requires authentication and current password)
router.post('/change-password', auth, async (req, res) => {
  console.log('\n=== CHANGE PASSWORD REQUEST ===');
  console.log('User ID:', req.user.id);
  
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      console.log('❌ Missing current or new password');
      return res.status(400).json({ 
        success: false,
        message: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      console.log('❌ New password too short');
      return res.status(400).json({ 
        success: false,
        message: 'New password must be at least 6 characters long' 
      });
    }

    console.log(`🔍 Finding user by ID: ${userId}`);
    const user = await User.findById(userId);
    
    if (!user) {
      console.log(`❌ User not found: ${userId}`);
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    console.log('🔒 Verifying current password...');
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    
    if (!isMatch) {
      console.log('❌ Current password is incorrect');
      return res.status(401).json({ 
        success: false,
        message: 'Current password is incorrect' 
      });
    }

    // Check if new password is same as current password
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      console.log('❌ New password is same as current password');
      return res.status(400).json({ 
        success: false,
        message: 'New password cannot be the same as current password' 
      });
    }

    // Hash new password
    console.log('🔒 Hashing new password...');
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    console.log(`🔄 Updating password for user: ${user.email}`);
    user.passwordHash = newPasswordHash;
    user.updatedAt = Date.now();
    await user.save();

    console.log(`✅ Password changed successfully for: ${user.email}`);

    res.json({ 
      success: true,
      message: 'Password changed successfully' 
    });

  } catch (err) {
    console.error('💥 Change password error:', err.message);
    
    res.status(500).json({ 
      success: false,
      message: 'Server error. Please try again later.' 
    });
  }
});

// get profile
router.get('/me', auth, async (req, res) => {
  console.log('\n=== GET PROFILE REQUEST ===');
  console.log('User ID:', req.user.id);
  
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    
    if (!user) {
      console.log(`❌ User not found: ${req.user.id}`);
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    console.log(`✅ Profile retrieved for: ${user.email}`);
    
    res.json({ 
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
    
  } catch (err) {
    console.error('💥 Get profile error:', err.message);
    
    res.status(500).json({ 
      success: false,
      message: 'Server error. Please try again later.' 
    });
  }
});

module.exports = router;