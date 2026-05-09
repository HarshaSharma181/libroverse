// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Main authentication middleware
const auth = async (req, res, next) => {
  try {
    console.log('\n🔐 Auth Middleware Debug:');
    console.log('📨 Authorization header present:', !!req.headers.authorization);
    
    const header = req.headers.authorization;
    if (!header) {
      console.log('❌ No authorization header');
      return res.status(401).json({ 
        success: false,
        message: 'No token provided. Please login again.' 
      });
    }
    
    const token = header.split(' ')[1];
    if (!token) {
      console.log('❌ No token in header');
      return res.status(401).json({ 
        success: false,
        message: 'No token provided. Please login again.' 
      });
    }
    
    console.log('🔑 Token length:', token.length);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔓 Decoded token payload:', decoded);
    
    // Get user ID from token
    const userId = decoded.id || decoded.userId || decoded._id;
    console.log('👤 User ID from token:', userId);
    
    if (!userId) {
      console.log('❌ No user ID in token');
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token: No user ID' 
      });
    }
    
    // Find user by ID
    const user = await User.findById(userId).select('-passwordHash');
    
    if (!user) {
      console.log('❌ User not found with ID:', userId);
      return res.status(401).json({ 
        success: false,
        message: 'User not found. Please login again.' 
      });
    }
    
    // Check if user has active reset token (extra security)
    if (user.resetPasswordToken && user.resetPasswordExpires > Date.now()) {
      console.log('⚠️ User has active reset token. Logging out for security.');
      // Clear reset token if user is logging in (optional security measure)
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
    }
    
    console.log('✅ User authenticated:', {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role
    });
    
    // Attach complete user object
    req.user = {
      _id: user._id,        // MongoDB ObjectId
      id: user._id,         // Also include as id for compatibility
      name: user.name,
      email: user.email,
      role: user.role,
      favorites: user.favorites || []
    };
    
    console.log('📤 Attached to req.user:', req.user);
    next();
  } catch (err) {
    console.error('❌ Auth middleware error:', err.message);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token. Please login again.',
        error: err.message 
      });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Session expired. Please login again.',
        error: err.message 
      });
    }
    
    return res.status(401).json({ 
      success: false,
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Admin-only middleware - rename this to 'admin' to match authRoutes.js import
const admin = (req, res, next) => {
  if (!req.user) {
    console.log('❌ admin middleware: No user in request');
    return res.status(401).json({ 
      success: false,
      message: 'Unauthorized: Please login first' 
    });
  }
  
  if (req.user.role !== 'admin') {
    console.log('❌ admin middleware: User is not admin. Role:', req.user.role);
    return res.status(403).json({ 
      success: false,
      message: 'Admin access required. You do not have permission to access this resource.' 
    });
  }
  
  console.log('✅ Admin access granted for user:', req.user.email);
  next();
};

// Also export as adminOnly for compatibility
const adminOnly = admin;

// Password verification middleware (for sensitive operations)
const verifyPassword = async (req, res, next) => {
  try {
    const { currentPassword } = req.body;
    
    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is required'
      });
    }
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Get user with password hash
    const user = await User.findById(req.user.id).select('passwordHash');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    console.log('✅ Password verified for user:', req.user.email);
    next();
  } catch (error) {
    console.error('❌ Password verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Password verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Optional: Check if user has reset token (for reset flow)
const hasValidResetToken = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { email } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is required'
      });
    }
    
    // You can add additional validation here if needed
    // This is useful for routes that need to ensure user is in reset flow
    
    next();
  } catch (error) {
    console.error('❌ Reset token check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Reset token validation error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Rate limiting middleware for password reset attempts
const resetAttemptLimiter = (req, res, next) => {
  const ip = req.ip;
  const email = req.body.email;
  const now = Date.now();
  
  // In production, use Redis or similar for rate limiting
  // This is a simple in-memory example
  if (!global.resetAttempts) {
    global.resetAttempts = {};
  }
  
  const key = email || ip;
  const attempts = global.resetAttempts[key] || { count: 0, firstAttempt: now };
  
  // Reset after 1 hour
  if (now - attempts.firstAttempt > 3600000) {
    attempts.count = 0;
    attempts.firstAttempt = now;
  }
  
  // Limit to 5 attempts per hour
  if (attempts.count >= 5) {
    console.log(`🚫 Rate limit exceeded for ${key}`);
    return res.status(429).json({
      success: false,
      message: 'Too many password reset attempts. Please try again later.'
    });
  }
  
  attempts.count++;
  global.resetAttempts[key] = attempts;
  
  console.log(`📊 Reset attempt ${attempts.count} for ${key}`);
  next();
};

module.exports = { 
  auth, 
  admin,           // Export as 'admin' to match authRoutes.js import
  adminOnly,       // Also export as adminOnly for compatibility
  verifyPassword, 
  hasValidResetToken,
  resetAttemptLimiter 
};