// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

export default function Login({ setUser }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Forgot Password Modal State
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");
  const [changePasswordSuccess, setChangePasswordSuccess] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      console.log("Attempting login with:", { email, password });
      
      const loginData = {
        email: email.trim().toLowerCase(),
        password: password,
      };

      console.log("Sending to API:", loginData);
      
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const result = await response.json();
      console.log("✅ Login successful:", result);
      
      if (result.token) {
        localStorage.setItem('lv_token', result.token);
        localStorage.setItem('token', result.token);
      }
      
      if (result.user) {
        const userWithToken = {
          ...result.user,
          token: result.token
        };
        localStorage.setItem('lv_user', JSON.stringify(userWithToken));
        localStorage.setItem('user', JSON.stringify(result.user));
      }
      
      if (setUser) {
        setUser(result.user);
      }
      
      if (result.user.role === 'admin') {
        navigate("/admin");
      } else {
        navigate("/books");
      }
      
    } catch (err) {
      console.error("❌ Login error:", err);
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Password Change (without current password)
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setChangePasswordError("");
    setChangePasswordSuccess("");

    // Validation
    if (!forgotEmail) {
      setChangePasswordError("Please enter your email address");
      return;
    }

    if (!newPassword) {
      setChangePasswordError("Please enter a new password");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setChangePasswordError("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setChangePasswordError("New password must be at least 6 characters long");
      return;
    }

    setIsChangingPassword(true);

    try {
      console.log("🔄 Changing password for:", forgotEmail);
      
      // This endpoint needs to be created in your backend
      // It should verify email and update password without requiring current password
      const response = await fetch('http://localhost:5000/api/auth/reset-password-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: forgotEmail.trim().toLowerCase(),
          newPassword: newPassword
        }),
      });

      console.log("Change password response status:", response.status);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to change password');
      }

      setChangePasswordSuccess("Password changed successfully! You can now login with your new password.");
      
      // Clear form fields
      setNewPassword("");
      setConfirmNewPassword("");
      
      // Auto-close modal after 5 seconds
      setTimeout(() => {
        setShowForgotPassword(false);
        setChangePasswordSuccess("");
        setForgotEmail("");
      }, 5000);
      
    } catch (err) {
      console.error("❌ Change password error:", err);
      setChangePasswordError(err.message || "Failed to change password. Please check your email and try again.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const resetModalState = () => {
    setShowForgotPassword(false);
    setForgotEmail("");
    setNewPassword("");
    setConfirmNewPassword("");
    setChangePasswordError("");
    setChangePasswordSuccess("");
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        {/* Left side - Branding/Illustration */}
        <div className="login-brand">
          <h1 className="logo">LIBROVERSE</h1>
          <p className="tagline">Your personal library in the digital universe</p>
          <div className="illustration">
            <div className="book-stack">
              <div className="book book-1"></div>
              <div className="book book-2"></div>
              <div className="book book-3"></div>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="login-form-container">
          <div className="login-card">
            <div className="form-header">
              <h2>Welcome Back</h2>
              <p className="subtitle">Sign in to your account</p>
            </div>

            <form onSubmit={submit}>
              <div className="input-group">
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <div className="password-header">
                  <label htmlFor="password">Password</label>
                  <button
                    type="button"
                    className="forgot-password-link"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="input-field"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength="6"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "🔒" : "👁️"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                className="login-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>

              <div className="register-link">
                Don't have an account?{" "}
                <Link to="/register" className="register-link-text">
                  Create account
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Reset Your Password</h3>
              <button 
                className="modal-close" 
                onClick={resetModalState}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <p className="modal-description">
                Enter your email address and new password to reset your password.
              </p>

              <form onSubmit={handlePasswordChange}>
                {/* Email Field */}
                <div className="input-group">
                  <label htmlFor="forgot-email">Email Address</label>
                  <input
                    id="forgot-email"
                    type="email"
                    className="input-field"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    disabled={isChangingPassword}
                  />
                </div>

                {/* New Password Fields */}
                <div className="input-group">
                  <label htmlFor="new-password">New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      className="input-field"
                      placeholder="Enter new password (min. 6 characters)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength="6"
                      disabled={isChangingPassword}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      disabled={isChangingPassword}
                    >
                      {showNewPassword ? "🔒" : "👁️"}
                    </button>
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="confirm-new-password">Confirm New Password</label>
                  <input
                    id="confirm-new-password"
                    type="password"
                    className="input-field"
                    placeholder="Confirm new password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    required
                    disabled={isChangingPassword}
                  />
                </div>

                {/* Password Strength Indicator */}
                {newPassword.length > 0 && (
                  <div className="password-strength">
                    <div className={`strength-indicator ${newPassword.length >= 6 ? 'strong' : 'weak'}`}>
                      {newPassword.length >= 6 ? '✓ Strong enough' : '❌ Minimum 6 characters required'}
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {changePasswordError && (
                  <div className="error-message">
                    {changePasswordError}
                  </div>
                )}

                {/* Success Message */}
                {changePasswordSuccess && (
                  <div className="success-message">
                    {changePasswordSuccess}
                  </div>
                )}

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={resetModalState}
                    disabled={isChangingPassword}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="login-btn"
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <>
                        <span className="spinner"></span>
                        Changing...
                      </>
                    ) : (
                      "Change Password"
                    )}
                  </button>
                </div>
              </form>
              
              <div className="back-to-login">
                Remember your password?{" "}
                <button 
                  className="link-button"
                  onClick={resetModalState}
                >
                  Back to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}