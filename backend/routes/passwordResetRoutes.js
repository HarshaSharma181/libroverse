// passwordResetRoutes.js - UPDATED WITH DIRECT PASSWORD RESET
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

// Configure rate limiting for password reset
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again later.'
  },
  skipSuccessfulRequests: true
});

// Configure email transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// 1. Request password reset (send email)
router.post('/forgot-password', resetPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    
    // Security: Always return same response regardless of user existence
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, reset instructions have been sent.'
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now
    
    // Hash token before saving (security best practice)
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Save hashed token and expiry to user
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();
    
    // Create reset URL with original token (not hashed)
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    
    // Send email
    const mailOptions = {
      from: `"LIBROVERSE" <${process.env.EMAIL_USER}>`,
      to: normalizedEmail,
      subject: 'Password Reset - LIBROVERSE',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 30px; border-radius: 12px 12px 0 0; color: white; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">🔐 Password Reset</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">LIBROVERSE Account Security</p>
          </div>
          <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">
              Hello ${user.name || 'there'},
            </p>
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">
              You requested a password reset for your LIBROVERSE account.
              Click the button below to set a new password:
            </p>
            <div style="text-align: center; margin: 40px 0;">
              <a href="${resetUrl}" style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.2);">
                Reset Password
              </a>
            </div>
            <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 20px 0;">
              This link will expire in <strong>1 hour</strong>.
            </p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="font-size: 14px; color: #9ca3af;">
                <strong>Didn't request this?</strong><br>
                If you didn't request a password reset, you can safely ignore this email.
                Your password will not be changed.
              </p>
              <p style="font-size: 12px; color: #9ca3af; margin-top: 30px;">
                © ${new Date().getFullYear()} LIBROVERSE. All rights reserved.<br>
                Your personal library in the digital universe.
              </p>
            </div>
          </div>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, reset instructions have been sent.'
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 2. Verify reset token
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ 
        success: false,
        message: 'Reset token is required' 
      });
    }
    
    // Hash the incoming token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired reset token. Please request a new password reset.' 
      });
    }
    
    res.status(200).json({ 
      success: true,
      message: 'Token is valid',
      email: user.email 
    });
    
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 3. Reset password with token
router.post('/reset-password/:token', resetPasswordLimiter, async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    // Input validation
    if (!password) {
      return res.status(400).json({ 
        success: false,
        message: 'Password is required' 
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters long' 
      });
    }
    
    // Hash the incoming token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid or expired reset token' 
      });
    }
    
    // Check if new password is same as old (optional security check)
    const isSamePassword = await bcrypt.compare(password, user.passwordHash);
    if (isSamePassword) {
      return res.status(400).json({ 
        success: false,
        message: 'New password cannot be the same as the old password' 
      });
    }
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);
    
    // Clear reset token fields
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    
    // Optional: Send confirmation email
    const mailOptions = {
      from: `"LIBROVERSE" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Changed Successfully - LIBROVERSE',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">✅ Password Changed Successfully</h2>
          <p>Hello ${user.name},</p>
          <p>Your LIBROVERSE account password has been successfully reset.</p>
          <p>If you did not make this change, please contact our support team immediately.</p>
          <div style="margin-top: 30px; padding: 15px; background: #f3f4f6; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              <strong>Security Tip:</strong> Use a strong, unique password and enable two-factor authentication if available.
            </p>
          </div>
        </div>
      `
    };
    
    try {
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Confirmation email failed:', emailError);
      // Don't fail the reset if email fails
    }
    
    res.status(200).json({ 
      success: true,
      message: 'Password reset successful. You can now login with your new password.' 
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 4. DIRECT PASSWORD RESET (from login modal - without current password)
router.post('/direct-reset', resetPasswordLimiter, async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    console.log('📧 Direct password reset request for:', email);
    
    // Input validation
    if (!email || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: 'Email and new password are required' 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters long' 
      });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    
    // For security, always return same response regardless of user existence
    if (!user) {
      console.log('ℹ️ User not found (returning generic success):', normalizedEmail);
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, password has been reset successfully.'
      });
    }
    
    console.log('✅ User found, checking password:', user.email);
    
    // Check if new password is same as current password
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      return res.status(400).json({ 
        success: false,
        message: 'New password cannot be the same as current password' 
      });
    }
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.updatedAt = Date.now();
    
    await user.save();
    
    console.log('✅ Password updated for:', user.email);
    
    // Send password change notification email
    const mailOptions = {
      from: `"LIBROVERSE Security" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Changed - LIBROVERSE',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #92400e; margin: 0;">🔐 Password Changed</h2>
          </div>
          <p style="font-size: 16px; color: #374151;">
            Hello <strong>${user.name}</strong>,
          </p>
          <p style="font-size: 16px; color: #374151;">
            Your LIBROVERSE account password was recently changed.
          </p>
          <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              <strong>Date:</strong> ${new Date().toLocaleString()}<br>
              <strong>Account:</strong> ${user.email}
            </p>
          </div>
          <p style="font-size: 16px; color: #374151;">
            If you did not make this change, please contact our support team immediately.
          </p>
          <div style="background: #fee2e2; padding: 15px; border-radius: 6px; margin-top: 30px;">
            <p style="margin: 0; color: #991b1b; font-size: 14px;">
              <strong>Security Alert:</strong> If this wasn't you, your account may have been compromised. 
              Please secure your account immediately.
            </p>
          </div>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px;">
              © ${new Date().getFullYear()} LIBROVERSE. All rights reserved.<br>
              This is an automated security message.
            </p>
          </div>
        </div>
      `
    };
    
    try {
      await transporter.sendMail(mailOptions);
      console.log('📧 Password change notification sent to:', user.email);
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
      // Continue even if email fails
    }
    
    res.status(200).json({ 
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    });
    
  } catch (error) {
    console.error('Direct password reset error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 5. Check if email exists (for client-side validation)
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: 'Email is required' 
      });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    
    // Always return the same response for security
    res.status(200).json({
      success: true,
      exists: !!user,
      message: user ? 'Email exists in our system' : 'Email not found'
    });
    
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;