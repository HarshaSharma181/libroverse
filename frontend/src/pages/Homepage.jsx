import React from 'react';
import { Link } from 'react-router-dom';
import './Homepage.css';

const Homepage = () => {
  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              Welcome to Libroverse
            </h1>
            <h2 className="hero-subtitle">
              Your Digital Gateway to Infinite Knowledge and Stories
            </h2>
            <p className="hero-description">
              Discover, borrow, and explore a vast collection of books from various genres. 
              Join our community of passionate readers and expand your horizons.
            </p>
            <div className="cta-buttons">
              <Link to="/books" className="cta-btn primary">Explore Books</Link>
              <Link to="/register" className="cta-btn secondary">Join Now</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Why Choose Libroverse?</h2>
          <p className="section-subtitle">
            Experience the future of digital reading with our comprehensive platform
          </p>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3>Browse & Discover</h3>
              <p>Explore books across multiple genres with advanced filtering options</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📚</div>
              <h3>Easy Borrowing</h3>
              <p>Borrow books with one click and manage your reading list effortlessly</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">❤️</div>
              <h3>Wishlist & Save</h3>
              <p>Save your favorite books to wishlist for future reading</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Track Reading</h3>
              <p>Monitor your reading progress and manage borrowed books</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">LIBROVERSE</div>
            <div className="footer-info">
              <p>© {new Date().getFullYear()} Libroverse. All rights reserved.</p>
              <p className="developer-credit">Developed by Harsha Sharma</p>
            </div>
            <div className="footer-links">
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Service</a>
              <a href="#contact">Contact Us</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;