import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import "./ResetPassword.css";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  // State for email input (initial form shown in screenshot)
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  
  // State for password reset (after clicking link from email)
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    // If there's a token in URL, verify it and show password reset form
    if (token) {
      verifyToken();
      setShowPasswordForm(true);
    } else {
      setVerifying(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      console.log("🔐 Verifying reset token:", token);
      
      const response = await fetch(`http://localhost:5000/api/auth/verify-reset-token/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid token');
      }

      const data = await response.json();
      console.log("Token verification success:", data);
      
      setTokenValid(true);
      setUserEmail(data.email || "user@example.com");
      setVerifying(false);
      
    } catch (err) {
      console.error("❌ Token verification failed:", err);
      setError(err.message || "Failed to verify reset link. Please request a new one.");
      setTokenValid(false);
      setVerifying(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);

    try {
      console.log("📧 Sending reset instructions to:", email);
      
      const response = await fetch(`http://localhost:5000/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      console.log("Reset instructions response status:", response.status);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset instructions');
      }

      setSuccess(data.message || "Reset instructions sent! Check your email.");
      
    } catch (err) {
      console.error("❌ Send reset instructions error:", err);
      setError(err.message || "Failed to send reset instructions. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);

    try {
      console.log("🔄 Resetting password for token:", token);
      
      const response = await fetch(`http://localhost:5000/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      console.log("Reset response status:", response.status);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      setSuccess(data.message || "Password reset successful!");
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (err) {
      console.error("❌ Reset password error:", err);
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/login');
  };

  // Show loading while verifying token
  if (verifying && token) {
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="form-header">
            <h2>Reset Your Password</h2>
            <p className="subtitle">Verifying reset link...</p>
          </div>
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p className="loading-text">Checking reset token validity...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-container">
      <div className="reset-password-card">
        <div className="form-header">
          <h2>{showPasswordForm ? "Set New Password" : "Reset Your Password"}</h2>
          <p className="subtitle">
            {showPasswordForm 
              ? tokenValid 
                ? `Enter new password for ${userEmail}` 
                : "Reset Link Invalid"
              : "Enter your email address and we'll send you instructions to reset your password."
            }
          </p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            {success}
            {showPasswordForm && tokenValid && success && (
              <p style={{ marginTop: '10px', fontSize: '0.9rem' }}>
                Redirecting to login page...
              </p>
            )}
          </div>
        )}

        {/* Show email form OR password form based on state */}
        {!showPasswordForm ? (
          // Email Input Form (as shown in screenshot)
          <form onSubmit={handleEmailSubmit}>
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
                disabled={isLoading || success}
              />
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="cancel-btn"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="submit-btn"
                disabled={isLoading || success}
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    Sending...
                  </>
                ) : (
                  "Send Reset Instructions"
                )}
              </button>
            </div>

            <div className="back-to-login">
              <p>Remember your password? <Link to="/login">Back to Login</Link></p>
            </div>
          </form>
        ) : (
          // Password Reset Form (when token is valid)
          tokenValid ? (
            <form onSubmit={handlePasswordResetSubmit}>
              <div className="input-group">
                <label htmlFor="password">New Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="input-field"
                    placeholder="Enter new password (min. 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength="6"
                    disabled={isLoading || success}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading || success}
                  >
                    {showPassword ? "🔒" : "👁️"}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="input-field"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading || success}
                />
              </div>

              <div className="password-strength">
                {password.length > 0 && (
                  <div className={`strength-indicator ${password.length >= 6 ? 'strong' : 'weak'}`}>
                    {password.length >= 6 ? '✓ Strong enough' : '❌ Minimum 6 characters required'}
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                className="submit-btn"
                disabled={isLoading || success}
                style={{ width: '100%' }}
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    Resetting Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </button>

              <div className="back-to-login">
                <Link to="/login">← Back to Login</Link>
              </div>
            </form>
          ) : (
            // Token invalid state
            <div className="token-invalid">
              <div className="error-icon">⚠️</div>
              <p>This password reset link is invalid or has expired.</p>
              <p style={{ fontSize: '0.9rem', marginTop: '10px', color: '#6b7280' }}>
                Please request a new password reset link from the login page.
              </p>
              <div className="back-to-login">
                <Link to="/login" className="login-link">
                  Return to Login
                </Link>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}