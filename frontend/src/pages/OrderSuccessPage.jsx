// OrderSuccessPage.jsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './OrderSuccessPage.css';

export default function OrderSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const orderId = location.state?.orderId || 'ORD-' + Date.now().toString(36).substring(2, 10);
  const orderDetails = location.state?.orderDetails;
  const orderData = location.state?.orderData; // Full order data from backend

  const handleContinueShopping = () => {
    navigate('/dashboard');
  };

  const handleTrackOrder = () => {
    if (orderData) {
      // If we have the full order data, pass it to track order page
      navigate(`/track-order/${orderData._id || orderId}`, { 
        state: { orderData: orderData }
      });
    } else {
      // Otherwise just pass the order ID
      navigate(`/track-order/${orderId}`, { 
        state: { orderData: { orderId: orderId, ...orderDetails } }
      });
    }
  };

  return (
    <div className="order-success-page">
      <div className="success-container">
        <div className="success-icon">✅</div>
        <h1>Order Placed Successfully!</h1>
        <p className="success-message">
          Thank you for your order. Your books will be shipped soon.
        </p>
        
        <div className="order-details">
          <div className="detail-card">
            <h3>Order Details</h3>
            <div className="detail-row">
              <span>Order ID:</span>
              <strong>{orderId}</strong>
            </div>
            <div className="detail-row">
              <span>Date:</span>
              <span>{new Date().toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
            </div>
            {orderDetails?.total && (
              <div className="detail-row">
                <span>Total Amount:</span>
                <strong className="total-amount">₹{orderDetails.total}</strong>
              </div>
            )}
          </div>
        </div>

        <div className="whats-next">
          <h3>What's Next?</h3>
          <div className="steps">
            <div className="step">
              <span className="step-number">1</span>
              <div>
                <strong>Order Processing</strong>
                <p>We're preparing your order</p>
              </div>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <div>
                <strong>Shipping</strong>
                <p>Your books will be shipped within 24 hours</p>
              </div>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <div>
                <strong>Delivery</strong>
                <p>Estimated delivery: 3-5 business days</p>
              </div>
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button 
            className="continue-btn"
            onClick={handleContinueShopping}
          >
            Continue Shopping
          </button>
          <button 
            className="track-btn"
            onClick={handleTrackOrder}
          >
            Track Order
          </button>
        </div>
      </div>
    </div>
  );
}