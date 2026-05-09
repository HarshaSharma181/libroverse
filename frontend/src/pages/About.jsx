import React from 'react';
import './About.css';

const About = () => {
  return (
    <div className="about-page">
      {/* Hero Section */}
      <section className="about-hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">About Libroverse</h1>
            <h2 className="hero-subtitle">Connecting Readers with Their Next Favorite Book</h2>
            <p className="hero-description">
              Discover the story behind our digital library platform and meet the developer who created this 
              innovative solution for book lovers and students.
            </p>
          </div>
        </div>
      </section>

      <div className="container">
        {/* Developer Info */}
        <section className="developer-info">
          <div className="section-header">
            <h2 className="section-title">About the Developer</h2>
            <p className="section-subtitle">Meet the creator behind Libroverse</p>
          </div>
          
          <div className="developer-card">
            <div className="developer-avatar">
              <div className="avatar-icon">👨‍💻</div>
            </div>
            <div className="developer-details">
              <h3 className="developer-name">Harsha Sharma</h3>
              <p className="developer-role">Full Stack Developer & Project Creator</p>
              
              <div className="info-sections">
                <div className="info-section">
                  <h4 className="section-label">EDUCATION</h4>
                  <p className="section-content">Final Year MCA Student</p>
                </div>
                
                <div className="info-section">
                  <h4 className="section-label">INSTITUTION</h4>
                  <p className="section-content">Vellore Institute of Technology, Bhopal</p>
                </div>
                
                <div className="info-section">
                  <h4 className="section-label">PROJECT</h4>
                  <p className="section-content">Libroverse - MERN Stack Application</p>
                </div>
                
                <div className="info-section">
                  <h4 className="section-label">TECH STACK</h4>
                  <p className="section-content">MongoDB, Express.js, React.js, Node.js</p>
                </div>
              </div>
              
              <div className="developer-quote">
                "I created Libroverse to bridge the gap between traditional libraries and modern digital access, 
                making reading more accessible for students everywhere."
              </div>
            </div>
          </div>
        </section>

        {/* Project Purpose */}
        <section className="project-purpose">
          <div className="section-header">
            <h2 className="section-title">Project Purpose</h2>
            <p className="section-subtitle">Why Libroverse was created</p>
          </div>
          
          <div className="purpose-grid">
            <div className="purpose-card">
              <div className="purpose-icon">📚</div>
              <h3>Book Selection</h3>
              <p>Students can browse and select books to take home for reading purposes from our extensive library collection.</p>
            </div>
            <div className="purpose-card">
              <div className="purpose-icon">🛒</div>
              <h3>Book Purchase</h3>
              <p>If students are interested in owning a book, they can easily purchase it through our integrated platform.</p>
            </div>
            <div className="purpose-card">
              <div className="purpose-icon">🎯</div>
              <h3>Easy Access</h3>
              <p>Providing a seamless experience for students to access educational and recreational reading materials.</p>
            </div>
            <div className="purpose-card">
              <div className="purpose-icon">💡</div>
              <h3>Student Focused</h3>
              <p>Designed specifically keeping in mind the needs and preferences of college students.</p>
            </div>
          </div>
        </section>

        {/* Vision */}
        <section className="vision-section">
          <div className="section-header">
            <h2 className="section-title">Our Vision</h2>
            <p className="section-subtitle">What drives Libroverse forward</p>
          </div>
          
          <div className="vision-content">
            <div className="vision-card">
              <div className="vision-icon">🌟</div>
              <h3>Modernizing Libraries</h3>
              <p>
                Libroverse aims to transform traditional library experiences by integrating digital solutions 
                that make book discovery and access effortless for the modern student.
              </p>
            </div>
            
            <div className="vision-card">
              <div className="vision-icon">🎓</div>
              <h3>Empowering Students</h3>
              <p>
                We believe every student deserves easy access to quality reading materials, whether for 
                academic purposes or personal enrichment, without the constraints of physical library hours.
              </p>
            </div>
            
            <div className="vision-card">
              <div className="vision-icon">🌐</div>
              <h3>Digital Accessibility</h3>
              <p>
                Creating a platform that simplifies finding, borrowing, and purchasing books, making reading 
                more accessible and enjoyable for students across all educational institutions.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default About;