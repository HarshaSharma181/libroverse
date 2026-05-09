// CheckoutPage.jsx - Updated for React Router v7
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './CheckoutPage.css';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const api = "http://localhost:5000/api";
  const token = localStorage.getItem('lv_token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // State management
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // Shipping form state
  const [shippingInfo, setShippingInfo] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India'
  });

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState('cod');
  
  // Order summary
  const [orderSummary, setOrderSummary] = useState({
    subtotal: 0,
    shipping: 0,
    tax: 0,
    total: 0
  });

  // Initialize cart from localStorage or location state
  useEffect(() => {
    console.log("🚀 CheckoutPage mounted");
    
    // Check if user is logged in
    if (!token) {
      console.log("🔐 No token, redirecting to login");
      navigate('/login', { 
        state: { 
          from: '/checkout',
          message: 'Please login to checkout'
        } 
      });
      return;
    }
    
    // Load cart data
    loadCartData();
    
    setLoading(false);
  }, [location.state, token, navigate]);

  // Load cart data from multiple sources
  const loadCartData = () => {
    // Priority 1: Location state cart
    if (location.state?.cart) {
      console.log("🛒 Cart from location state:", location.state.cart);
      processCartItems(location.state.cart);
      return;
    }
    
    // Priority 2: Saved cart in location state
    if (location.state?.savedCart) {
      console.log("💾 Saved cart from state:", location.state.savedCart);
      processCartItems(location.state.savedCart);
      return;
    }
    
    // Priority 3: localStorage
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (savedCart.length > 0) {
      console.log("💾 Cart from localStorage:", savedCart);
      processCartItems(savedCart);
      return;
    }
    
    // Priority 4: Fetch from API
    fetchCartFromAPI();
  };

  // Process and validate cart items
  const processCartItems = (items) => {
    console.log("🔍 Processing cart items:", items);
    
    // Validate and format items
    const formattedItems = items.map(item => {
      // Handle different possible structures
      const bookData = item.book || item;
      const qty = item.qty || item.quantity || 1;
      const price = bookData.price || item.price || 0;
      
      return {
        book: {
          _id: bookData._id || bookData.id || `book_${Date.now()}`,
          title: bookData.title || 'Unknown Book',
          author: bookData.author || 'Unknown Author',
          price: price,
          imageUrl: bookData.imageUrl || '/placeholder.png',
          category: bookData.category || 'General'
        },
        qty: qty,
        quantity: qty,
        price: price
      };
    });
    
    console.log("✅ Formatted cart items:", formattedItems);
    setCartItems(formattedItems);
    calculateOrderSummary(formattedItems);
  };

  // Fetch cart from API
  const fetchCartFromAPI = async () => {
    if (!token) return;

    try {
      setLoading(true);
      console.log("📡 Fetching cart from API...");
      
      const res = await fetch(`${api}/cart`, {
        headers: { 
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log("✅ Cart data from API:", data);
        
        const items = data.items || data.books || [];
        processCartItems(items);
        
        // Save to localStorage for future use
        localStorage.setItem('cart', JSON.stringify(items));
      } else {
        console.log("⚠️ Cart API failed, showing empty");
        setCartItems([]);
      }
    } catch (error) {
      console.error("💥 Error fetching cart:", error);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate order summary
  const calculateOrderSummary = (items) => {
    console.log("🧮 Calculating order summary for items:", items);
    
    const subtotal = items.reduce((total, item) => {
      const price = item.book?.price || item.price || 0;
      const qty = item.qty || item.quantity || 1;
      return total + (price * qty);
    }, 0);
    
    const shipping = subtotal > 500 ? 0 : 50;
    const tax = subtotal * 0.18;
    const total = subtotal + shipping + tax;
    
    console.log("💰 Order Summary Calculated:", { subtotal, shipping, tax, total });
    
    setOrderSummary({
      subtotal,
      shipping,
      tax,
      total
    });
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  // Validate form
  const validateForm = () => {
    console.log("✅ Validating form data:", shippingInfo);
    
    const requiredFields = ['name', 'email', 'phone', 'address', 'city', 'pincode'];
    for (const field of requiredFields) {
      if (!shippingInfo[field]?.trim()) {
        const fieldName = field.replace(/([A-Z])/g, ' $1').toLowerCase();
        setError(`Please fill in ${fieldName}`);
        return false;
      }
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shippingInfo.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    
    // Validate phone
    const phoneRegex = /^[0-9]{10}$/;
    const cleanPhone = shippingInfo.phone.replace(/\D/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      setError('Please enter a valid 10-digit phone number');
      return false;
    }
    
    // Validate pincode
    if (!/^[0-9]{6}$/.test(shippingInfo.pincode)) {
      setError('Please enter a valid 6-digit pincode');
      return false;
    }
    
    return true;
  };

  // Place order
  const placeOrder = async () => {
    console.log("🛒 Placing order...");
    
    if (!validateForm()) return;
    
    if (cartItems.length === 0) {
      setError('Your cart is empty');
      return;
    }

    setProcessing(true);
    setError('');
    
    try {
      // Prepare cart items for backend - simplified format
      const formattedCartItems = cartItems.map(item => ({
        bookId: item.book._id,
        quantity: item.qty || 1,
        price: item.book.price || 0
      }));

      console.log("📦 Formatted cart items for backend:", formattedCartItems);

      // Prepare order data
      const orderData = {
        shippingInfo: {
          name: shippingInfo.name,
          email: shippingInfo.email,
          phone: shippingInfo.phone,
          address: shippingInfo.address,
          city: shippingInfo.city,
          state: shippingInfo.state,
          pincode: shippingInfo.pincode,
          country: shippingInfo.country
        },
        paymentMethod,
        cartItems: formattedCartItems
      };

      console.log("📤 Sending order data:", {
        ...orderData,
        cartItemsCount: orderData.cartItems.length
      });

      const res = await fetch(`${api}/orders/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(orderData)
      });

      console.log("📥 Response status:", res.status);
      
      let data;
      try {
        data = await res.json();
        console.log("📦 Response data:", data);
      } catch (e) {
        console.error("❌ Failed to parse JSON:", e);
        throw new Error('Invalid response from server');
      }

      if (res.ok) {
        console.log("✅ Order successful:", data);
        
        // Clear all cart data
        localStorage.removeItem('cart');
        localStorage.removeItem('shippingInfoDraft');
        
        // Clear cart items state
        setCartItems([]);
        
        // Navigate to success page
        navigate('/order-success', { 
          state: { 
            orderId: data.order?._id || data.orderId,
            orderDetails: data.order,
            message: data.message
          }
        });
      } else {
        console.error("❌ Order failed:", data);
        setError(data.message || data.error || 'Failed to place order. Please try again.');
      }
    } catch (error) {
      console.error('💥 Order placement error:', error);
      setError(error.message === 'Failed to fetch' 
        ? 'Network error. Please check your connection and try again.' 
        : error.message);
    } finally {
      setProcessing(false);
    }
  };

  // Simulate payment
  const simulatePayment = () => {
    console.log("💳 Simulating payment with method:", paymentMethod);
    
    if (paymentMethod === 'cod') {
      placeOrder();
    } else {
      setProcessing(true);
      setTimeout(() => {
        placeOrder();
      }, 1500);
    }
  };

  // ✅ FIXED for React Router v7: Handle back to cart
  const handleBackToCart = useCallback(() => {
    console.log("🔙 Navigating back to dashboard...");
    
    // Save current form data
    localStorage.setItem('shippingInfoDraft', JSON.stringify(shippingInfo));
    localStorage.setItem('cart', JSON.stringify(cartItems));
    
    // Simple navigation without complex state
    navigate('/dashboard');
  }, [navigate, shippingInfo, cartItems]);

  // Save form data before unload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      localStorage.setItem('shippingInfoDraft', JSON.stringify(shippingInfo));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shippingInfo]);

  // Load saved form data
  useEffect(() => {
    const savedShippingInfo = localStorage.getItem('shippingInfoDraft');
    if (savedShippingInfo) {
      try {
        const parsedInfo = JSON.parse(savedShippingInfo);
        console.log("📂 Loaded saved shipping info:", parsedInfo);
        setShippingInfo(prev => ({
          ...prev,
          ...parsedInfo,
          name: prev.name || parsedInfo.name || parsedInfo.fullName || '',
          email: prev.email || parsedInfo.email || ''
        }));
      } catch (error) {
        console.error("❌ Error loading saved shipping info:", error);
      }
    }
  }, []);

  // Update summary when cart changes
  useEffect(() => {
    if (cartItems.length > 0) {
      calculateOrderSummary(cartItems);
    }
  }, [cartItems]);

  if (loading) {
    return (
      <div className="checkout-loading">
        <div className="spinner"></div>
        <p>Loading checkout...</p>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        {/* Header */}
        <header className="checkout-header">
          <button 
            className="back-btn"
            onClick={handleBackToCart}
            aria-label="Go back to cart"
            disabled={processing}
          >
            ← Back to Cart
          </button>
          <h1>Checkout</h1>
          <div className="checkout-steps">
            <div className="step active">1. Cart</div>
            <div className="step active">2. Shipping</div>
            <div className="step active">3. Payment</div>
            <div className="step">4. Confirmation</div>
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div className="checkout-error">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
            <button 
              className="error-close"
              onClick={() => setError('')}
            >
              ×
            </button>
          </div>
        )}

        <div className="checkout-content">
          {/* Left Column - Shipping & Payment */}
          <div className="checkout-left">
            {/* Shipping Information */}
            <section className="checkout-section">
              <h2>Shipping Information</h2>
              <div className="shipping-form">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="name">Full Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={shippingInfo.name}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter your full name"
                      disabled={processing}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={shippingInfo.email}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter your email"
                      disabled={processing}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="phone">Phone Number *</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={shippingInfo.phone}
                    onChange={handleInputChange}
                    placeholder="10-digit mobile number"
                    required
                    maxLength="10"
                    disabled={processing}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="address">Shipping Address *</label>
                  <textarea
                    id="address"
                    name="address"
                    value={shippingInfo.address}
                    onChange={handleInputChange}
                    rows="3"
                    required
                    placeholder="House no., Street, Area"
                    disabled={processing}
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city">City *</label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={shippingInfo.city}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter city"
                      disabled={processing}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="state">State *</label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={shippingInfo.state}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter state"
                      disabled={processing}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="pincode">Pincode *</label>
                    <input
                      type="text"
                      id="pincode"
                      name="pincode"
                      value={shippingInfo.pincode}
                      onChange={handleInputChange}
                      required
                      placeholder="6-digit pincode"
                      maxLength="6"
                      disabled={processing}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label htmlFor="country">Country</label>
                  <input
                    type="text"
                    id="country"
                    name="country"
                    value={shippingInfo.country}
                    onChange={handleInputChange}
                    readOnly
                    className="read-only"
                    disabled={processing}
                  />
                </div>
              </div>
            </section>

            {/* Payment Method */}
            <section className="checkout-section">
              <h2>Payment Method</h2>
              <div className="payment-methods">
                <label className="payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={processing}
                  />
                  <div className="payment-option-content">
                    <span className="payment-icon">💰</span>
                    <div>
                      <strong>Cash on Delivery</strong>
                      <p>Pay when you receive the order</p>
                    </div>
                  </div>
                </label>
                
                <label className="payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="credit_card"
                    checked={paymentMethod === 'credit_card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={processing}
                  />
                  <div className="payment-option-content">
                    <span className="payment-icon">💳</span>
                    <div>
                      <strong>Credit/Debit Card</strong>
                      <p>Pay securely with your card</p>
                    </div>
                  </div>
                </label>
                
                <label className="payment-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="upi"
                    checked={paymentMethod === 'upi'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={processing}
                  />
                  <div className="payment-option-content">
                    <span className="payment-icon">📱</span>
                    <div>
                      <strong>UPI</strong>
                      <p>Google Pay, PhonePe, Paytm</p>
                    </div>
                  </div>
                </label>
              </div>
              
              <div className="payment-note">
                <p><strong>Note:</strong> For demo purposes, all payment methods simulate successful payment.</p>
              </div>
            </section>
          </div>

          {/* Right Column - Order Summary */}
          <div className="checkout-right">
            <section className="order-summary-section">
              <h2>Order Summary</h2>
              
              {/* Debug Info */}
              <div className="debug-info" style={{fontSize: '12px', color: '#666', marginBottom: '10px', padding: '5px', background: '#f5f5f5', borderRadius: '4px'}}>
                <strong>Debug:</strong> {cartItems.length} items in cart | 
                Total: ₹{orderSummary.total.toFixed(2)} |
                Subtotal: ₹{orderSummary.subtotal.toFixed(2)}
              </div>
              
              {/* Order Items */}
              <div className="order-items">
                <h3>Items ({cartItems.length})</h3>
                {cartItems.length === 0 ? (
                  <div className="empty-cart-message">
                    <p>Your cart is empty</p>
                    <button 
                      className="continue-shopping-btn"
                      onClick={() => navigate('/dashboard')}
                    >
                      Continue Shopping
                    </button>
                  </div>
                ) : (
                  cartItems.map((item, index) => (
                    <div key={index} className="order-item">
                      <div className="order-item-image">
                        <img 
                          src={item.book?.imageUrl || '/placeholder.png'} 
                          alt={item.book?.title}
                          onError={(e) => {
                            e.target.src = '/placeholder.png';
                          }}
                        />
                      </div>
                      <div className="order-item-details">
                        <h4>{item.book?.title}</h4>
                        <p>by {item.book?.author || 'Unknown Author'}</p>
                        <div className="order-item-meta">
                          <span>Qty: {item.qty || 1}</span>
                          <span className="item-price">
                            ₹{((item.book?.price || 0) * (item.qty || 1)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Price Breakdown */}
              {cartItems.length > 0 && (
                <>
                  <div className="price-breakdown">
                    <div className="price-row">
                      <span>Subtotal</span>
                      <span>₹{orderSummary.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="price-row">
                      <span>Shipping</span>
                      <span className={orderSummary.shipping === 0 ? 'free' : ''}>
                        {orderSummary.shipping === 0 ? 'FREE' : `₹${orderSummary.shipping.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="price-row">
                      <span>Tax (GST 18%)</span>
                      <span>₹{orderSummary.tax.toFixed(2)}</span>
                    </div>
                    <div className="price-row total">
                      <strong>Total Amount</strong>
                      <strong className="total-amount">₹{orderSummary.total.toFixed(2)}</strong>
                    </div>
                  </div>

                  {/* Place Order Button */}
                  <button 
                    className="place-order-btn"
                    onClick={simulatePayment}
                    disabled={processing || cartItems.length === 0}
                  >
                    {processing ? (
                      <>
                        <span className="processing-spinner"></span>
                        Processing...
                      </>
                    ) : paymentMethod === 'cod' ? (
                      `Place Order (Pay ₹${orderSummary.total.toFixed(2)} on Delivery)`
                    ) : (
                      `Pay ₹${orderSummary.total.toFixed(2)}`
                    )}
                  </button>

                  {/* Security Info */}
                  <div className="security-info">
                    <div className="security-item">
                      <span className="security-icon">🔒</span>
                      <span>Secure SSL Encryption</span>
                    </div>
                    <div className="security-item">
                      <span className="security-icon">✅</span>
                      <span>100% Safe & Secure</span>
                    </div>
                    <div className="security-item">
                      <span className="security-icon">🔄</span>
                      <span>Easy Returns</span>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}