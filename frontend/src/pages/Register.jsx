// src/pages/Register.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Register.css";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError("");
  };

  const handleAdminChange = (e) => {
    setIsAdmin(e.target.checked);
  };

  const validateForm = () => {
    const { name, email, password, confirmPassword } = formData;
    
    if (!name.trim()) {
      setError("Name is required");
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }
    
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    
    return true;
  };

  const submit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      console.log("Attempting registration with:", formData);
      
      // Include admin role if checkbox is checked
      const userData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: isAdmin ? 'admin' : 'user'
      };

      console.log("Sending to API:", userData);
      
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const result = await response.json();
      console.log("✅ Registration successful:", result);
      
      // Store token and user data
      if (result.token) {
        localStorage.setItem('token', result.token);
      }
      if (result.user) {
        localStorage.setItem('user', JSON.stringify(result.user));
      }
      
      // If user registered as admin, redirect to admin dashboard
      if (isAdmin) {
        setSuccess("Admin account created! Redirecting to admin dashboard...");
        setTimeout(() => {
          navigate("/admin");
        }, 1500);
      } else {
        setSuccess("Registration successful! Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      }
      
    } catch (err) {
      console.error("❌ Registration error:", err);
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-wrapper">
        {/* Left side - Branding/Illustration */}
        <div className="register-brand">
          <h1 className="logo">LIBROVERSE</h1>
          <p className="tagline">Join Our Reading Community</p>
          
          <div className="benefits">
            <h3>Why Join LIBROVERSE?</h3>
            <ul className="benefits-list">
              <li>
                <i className="fas fa-check-circle"></i>
                Browse books from multiple genres
              </li>
              <li>
                <i className="fas fa-check-circle"></i>
                Borrow books with one click
              </li>
              <li>
                <i className="fas fa-check-circle"></i>
                Add to wishlist & reading lists
              </li>
              <li>
                <i className="fas fa-check-circle"></i>
                Purchase books directly
              </li>
              <li>
                <i className="fas fa-check-circle"></i>
                Track reading progress & history
              </li>
              <li>
                <i className="fas fa-check-circle"></i>
                Manage borrowed & returned books
              </li>
            </ul>
          </div>
          
          <div className="illustration">
            <div className="book-stack">
              <div className="book book-1"></div>
              <div className="book book-2"></div>
              <div className="book book-3"></div>
            </div>
          </div>
        </div>

        {/* Right side - Registration Form */}
        <div className="register-form-container">
          <div className="register-card">
            <div className="form-header">
              <h2>Create Account</h2>
              <p className="subtitle">Start your reading journey today</p>
            </div>

            <form onSubmit={submit}>
              {/* Name Field */}
              <div className="input-group">
                <div className="label-container">
                  <label htmlFor="name">
                    Full Name <span className="required">*</span>
                  </label>
                  <span className="label-help">Enter your full name</span>
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="input-field"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <div className="input-icon">
                  <i className="fas fa-user"></i>
                </div>
              </div>

              {/* Email Field */}
              <div className="input-group">
                <div className="label-container">
                  <label htmlFor="email">
                    Email Address <span className="required">*</span>
                  </label>
                  <span className="label-help">you@example.com</span>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="input-field"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <div className="input-icon">
                  <i className="fas fa-envelope"></i>
                </div>
              </div>

              {/* Password Row - Two equal columns */}
              <div className="password-row">
                <div className="password-column">
                  <div className="input-group">
                    <div className="label-container">
                      <label htmlFor="password">
                        Password <span className="required">*</span>
                      </label>
                      <span className="label-help">At least 6 characters</span>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      className="input-field"
                      placeholder="••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength="6"
                    />
                    <div className="input-icon">
                      <i className="fas fa-lock"></i>
                    </div>
                    <div className="password-strength">
                      <div 
                        className={`strength-bar ${formData.password.length >= 8 ? 'strong' : formData.password.length >= 6 ? 'medium' : 'weak'}`}
                        style={{width: `${Math.min(100, formData.password.length * 20)}%`}}
                      ></div>
                      <span className="strength-text">
                        {formData.password.length >= 8 ? 'Strong' : 
                         formData.password.length >= 6 ? 'Medium' : 
                         formData.password.length > 0 ? 'Weak' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="password-column">
                  <div className="input-group">
                    <div className="label-container">
                      <label htmlFor="confirmPassword">
                        Confirm Password <span className="required">*</span>
                      </label>
                      <span className="label-help">Re-enter your password</span>
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      className="input-field"
                      placeholder="••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                    />
                    <div className="input-icon">
                      <i className="fas fa-lock"></i>
                    </div>
                    {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                      <div className="password-match error">
                        <i className="fas fa-times-circle"></i>
                        Passwords don't match
                      </div>
                    )}
                    {formData.confirmPassword && formData.password === formData.confirmPassword && (
                      <div className="password-match success">
                        <i className="fas fa-check-circle"></i>
                        Passwords match
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Admin Checkbox - ADDED THIS */}
              <div className="admin-checkbox-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={isAdmin}
                    onChange={handleAdminChange}
                  />
                  <span className="checkmark"></span>
                  <span className="admin-text">
                    <i className="fas fa-user-shield"></i>
                    Register as Administrator
                  </span>
                </label>
                <p className="admin-note">
                  <i className="fas fa-info-circle"></i>
                  Check this box if you want to create an administrator account with full access to the dashboard.
                </p>
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="error-message">
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </div>
              )}

              {success && (
                <div className="success-message">
                  <i className="fas fa-check-circle"></i>
                  {success}
                </div>
              )}

              {/* Submit Button */}
              <button 
                type="submit" 
                className="register-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    Creating Account...
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus"></i>
                    {isAdmin ? "Create Admin Account" : "Create Account"}
                  </>
                )}
              </button>

              {/* Login Link */}
              <div className="login-link">
                Already have an account?{" "}
                <Link to="/login" className="login-link-text">
                  Sign in
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}