import React, { useState, useRef } from 'react';
import emailjs from 'emailjs-com';
import './Contact.css';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const formRef = useRef();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    const serviceID = 'service_biajken';
    const templateID = 'template_5e5q6s9';
    const userID = 'x0DctP-x9Yign3D_v';

    const templateParams = {
      from_name: formData.name,
      from_email: formData.email,
      message: formData.message,
      to_email: 'sharmaharsha605@gmail.com',
      to_name: 'Harsha Sharma',
      reply_to: formData.email,
      subject: `Libroverse Feedback from ${formData.name}`,
      date: new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      })
    };

    emailjs.send(serviceID, templateID, templateParams, userID)
      .then((result) => {
        console.log('✅ Email sent successfully:', result.text);
        setSubmitStatus('success');
        setFormData({ name: '', email: '', message: '' });
        
        setTimeout(() => {
          setSubmitStatus(null);
        }, 5000);
      })
      .catch((error) => {
        console.error('❌ Email send failed:', error.text);
        setSubmitStatus('error');
        
        setTimeout(() => {
          setSubmitStatus(null);
        }, 5000);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  };

  const handleEmailClientSubmit = () => {
    const subject = encodeURIComponent(`Libroverse Feedback from ${formData.name || 'User'}`);
    const body = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`
    );
    window.location.href = `mailto:sharmaharsha605@gmail.com?subject=${subject}&body=${body}`;
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', message: '' });
    setSubmitStatus(null);
  };

  return (
    <div className="contact-page">
      {/* Hero Section */}
      <section className="contact-hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">Contact Us</h1>
            <h2 className="hero-subtitle">Get in Touch with Libroverse</h2>
            <p className="hero-description">
              Have questions, feedback, or suggestions about our platform? We'd love to hear from you. 
              Send us a message and we'll respond as soon as possible.
            </p>
          </div>
        </div>
      </section>

      <div className="container">
        <div className="contact-content">
          {/* Contact Information */}
          <section className="contact-info">
            <div className="info-card">
              <div className="section-header">
                <h2 className="section-title">Contact Information</h2>
                <p className="section-subtitle">Reach out through any of these channels</p>
              </div>
              
              <div className="info-items">
                <div className="contact-item">
                  <div className="contact-icon">👨‍💻</div>
                  <div className="contact-details">
                    <h3>Developer</h3>
                    <p>Harsha Sharma</p>
                    <p className="role">Full Stack Developer</p>
                  </div>
                </div>
                
                <div className="contact-item">
                  <div className="contact-icon">📧</div>
                  <div className="contact-details">
                    <h3>Email Address</h3>
                    <a href="mailto:sharmaharsha605@gmail.com" className="contact-link">
                      sharmaharsha605@gmail.com
                    </a>
                    <p className="response-time">Response within 24-48 hours</p>
                  </div>
                </div>
                
                <div className="contact-item">
                  <div className="contact-icon">📱</div>
                  <div className="contact-details">
                    <h3>Phone Number</h3>
                    <a href="tel:+919538717360" className="contact-link">
                      +91 9538717360
                    </a>
                    <p className="availability">Available: 10 AM - 6 PM IST</p>
                  </div>
                </div>
                
                <div className="contact-item">
                  <div className="contact-icon">🎓</div>
                  <div className="contact-details">
                    <h3>Education</h3>
                    <p>Final Year MCA Student</p>
                    <p>Vellore Institute of Technology, Bhopal</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Form */}
          <section className="contact-form-section">
            <div className="form-card">
              <div className="section-header">
                <h2 className="section-title">Send Your Message</h2>
                <p className="section-subtitle">Share your feedback or queries with us</p>
              </div>
              
              {/* Status Messages */}
              {submitStatus === 'success' && (
                <div className="status-message success">
                  <div className="status-icon">✅</div>
                  <div className="status-content">
                    <h4>Message Sent Successfully!</h4>
                    <p>Thank you for your feedback. We'll get back to you soon.</p>
                    <button 
                      onClick={resetForm}
                      className="status-action-btn"
                    >
                      Send Another Message
                    </button>
                  </div>
                </div>
              )}
              
              {submitStatus === 'error' && (
                <div className="status-message error">
                  <div className="status-icon">❌</div>
                  <div className="status-content">
                    <h4>Failed to Send Message</h4>
                    <p>Please try again or use the email client option below.</p>
                    <div className="error-actions">
                      <button 
                        onClick={() => setSubmitStatus(null)}
                        className="status-action-btn"
                      >
                        Try Again
                      </button>
                      <button 
                        onClick={handleEmailClientSubmit}
                        className="email-client-btn"
                      >
                        Use Email Client
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <form ref={formRef} onSubmit={handleSubmit} className="contact-form">
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter your full name"
                    disabled={isSubmitting || submitStatus === 'success'}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter your email address"
                    disabled={isSubmitting || submitStatus === 'success'}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="message">Your Message *</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    placeholder="Type your message, feedback, or query here..."
                    rows="6"
                    disabled={isSubmitting || submitStatus === 'success'}
                  />
                </div>
                
                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="submit-btn primary"
                    disabled={isSubmitting || submitStatus === 'success'}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner"></span>
                        Sending...
                      </>
                    ) : 'Send Message'}
                  </button>
                  
                  <button 
                    type="button"
                    className="submit-btn secondary"
                    onClick={handleEmailClientSubmit}
                    disabled={isSubmitting || submitStatus === 'success'}
                  >
                    📧 Send via Email Client
                  </button>
                  
                  <button 
                    type="button"
                    className="submit-btn tertiary"
                    onClick={resetForm}
                    disabled={isSubmitting}
                  >
                    Clear Form
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>

        {/* Additional Info */}
        <section className="additional-info">
          <div className="section-header">
            <h2 className="section-title">What Happens Next?</h2>
            <p className="section-subtitle">Here's what you can expect after contacting us</p>
          </div>
          
          <div className="info-grid">
            <div className="info-card">
              <div className="info-icon">📨</div>
              <h3>Message Received</h3>
              <p>Your message will be delivered to the developer's inbox immediately after submission.</p>
            </div>
            
            <div className="info-card">
              <div className="info-icon">⏱️</div>
              <h3>Quick Response</h3>
              <p>We aim to respond to all messages within 24-48 hours during business days.</p>
            </div>
            
            <div className="info-card">
              <div className="info-icon">💬</div>
              <h3>Follow-up Communication</h3>
              <p>We may reach out for additional details if needed to better address your query.</p>
            </div>
            
            <div className="info-card">
              <div className="info-icon">🔧</div>
              <h3>Action Taken</h3>
              <p>Your feedback is valuable and will be considered for improving Libroverse.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Contact;