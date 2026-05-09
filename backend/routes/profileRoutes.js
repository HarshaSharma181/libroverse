// routes/profileRoutes.js - UPDATED VERSION
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { auth } = require('../middleware/authMiddleware');

// Get user profile
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name || user.fullName || '', // Return name from either field
        email: user.email,
        role: user.role,
        readingLevel: user.readingLevel,
        favoriteGenres: user.favoriteGenres || [],
        createdAt: user.createdAt,
        favorites: user.favorites || []
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching profile'
    });
  }
});

// Update user profile
router.put('/', auth, async (req, res) => {
  try {
    console.log('📝 Update data received:', req.body);
    
    const { name, readingLevel, favoriteGenres } = req.body;
    
    const updateData = {};
    
    // Handle name update - update both name and fullName for consistency
    if (name !== undefined) {
      updateData.name = name.trim();
      updateData.fullName = name.trim(); // Update both fields
      
      if (updateData.name === '') {
        return res.status(400).json({
          success: false,
          message: 'Name cannot be empty'
        });
      }
    }
    
    if (readingLevel !== undefined) {
      const validLevels = ['Beginner', 'Intermediate', 'Advanced'];
      if (!validLevels.includes(readingLevel)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reading level'
        });
      }
      updateData.readingLevel = readingLevel;
    }
    
    if (favoriteGenres !== undefined) {
      if (!Array.isArray(favoriteGenres)) {
        return res.status(400).json({
          success: false,
          message: 'Favorite genres must be an array'
        });
      }
      updateData.favoriteGenres = favoriteGenres;
    }
    
    console.log('🔄 Saving to database:', updateData);
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { 
        new: true, 
        runValidators: true,
        select: '-passwordHash'
      }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    console.log('✅ Database save successful:', {
      name: updatedUser.name,
      fullName: updatedUser.fullName,
      readingLevel: updatedUser.readingLevel,
      favoriteGenres: updatedUser.favoriteGenres
    });
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: updatedUser._id,
        name: updatedUser.name || updatedUser.fullName || '',
        email: updatedUser.email,
        role: updatedUser.role,
        readingLevel: updatedUser.readingLevel,
        favoriteGenres: updatedUser.favoriteGenres || [],
        createdAt: updatedUser.createdAt,
        favorites: updatedUser.favorites || []
      }
    });
  } catch (error) {
    console.error('❌ Database save error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating profile',
      error: error.message 
    });
  }
});

module.exports = router;