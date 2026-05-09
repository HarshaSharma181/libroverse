// src/components/Navbar.jsx
import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";

const Navbar = ({ user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Helper function to check if user is admin
  const isAdmin = () => {
    if (!user) return false;
    
    // Check for role property
    if (user.role === "admin") return true;
    
    // Fallback: check if email contains 'admin' (for testing)
    if (user.email && user.email.toLowerCase().includes("admin")) return true;
    
    // Check if user has admin in name (another fallback)
    if (user.name && user.name.toLowerCase().includes("admin")) return true;
    
    return false;
  };

  const handleDashboardClick = () => {
    if (isAdmin()) {
      // If user is admin, go to admin dashboard
      navigate('/admin');
    } else {
      // If user is regular user, go to user dashboard (books page)
      navigate('/books');
    }
  };

  const logout = () => {
    localStorage.removeItem('lv_token');
    localStorage.removeItem('lv_user');
    setUser(null);
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Left: Brand Logo */}
        <div className="nav-left">
          <Link to="/" className="brand">
            <span className="brand-icon">📚</span>
            <span className="brand-text">LIBROVERSE</span>
          </Link>
        </div>

        {/* Right: All Navigation Items */}
        <div className="nav-right">
          {/* Navigation Links */}
          <div className="nav-links">
            <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>
              HOME
            </Link>
            <Link to="/about" className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}>
              ABOUT
            </Link>
            <Link to="/contact" className={`nav-link ${location.pathname === '/contact' ? 'active' : ''}`}>
              CONTACT
            </Link>
            
            {/* Dashboard link for logged-in users on homepage */}
            {user && location.pathname === '/' && (
              <button 
                className="dashboard-nav-btn" 
                onClick={handleDashboardClick}
              >
                DASHBOARD
              </button>
            )}
          </div>

          {/* Auth Buttons / User Info */}
          <div className="nav-auth">
            {!user ? (
              <div className="auth-buttons">
                <Link to="/login" className="login-btn">Login</Link>
                <Link to="/register" className="register-btn">Register</Link>
              </div>
            ) : (
              <div className="user-section">
                <span className="username">Hi, {user.name}</span>
                
                {/* Dashboard button when NOT on homepage */}
                {location.pathname !== '/' && (
                  <button 
                    className="dashboard-btn" 
                    onClick={handleDashboardClick}
                  >
                    Dashboard
                  </button>
                )}
                
                <button className="logout-btn" onClick={logout}>Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;