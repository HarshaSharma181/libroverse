import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import './TrackOrder.css';

export default function TrackOrder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams();
  const api = "http://localhost:5000/api";
  
  // Get user and token from localStorage
  const user = JSON.parse(localStorage.getItem('lv_user') || localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('lv_token') || localStorage.getItem('token') || user.token;
  
  // State for order tracking
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancellationReason, setCancellationReason] = useState(null);
  const [trackingSteps, setTrackingSteps] = useState([
    { id: 'order-processing', label: 'Order Processing', status: 'pending', icon: '📝', date: null },
    { id: 'shipping', label: 'Shipping', status: 'pending', icon: '📦', date: null },
    { id: 'delivery', label: 'Delivery', status: 'pending', icon: '🚚', date: null }
  ]);

  // Poll for order updates every 30 seconds if order is not completed/delivered/cancelled
  useEffect(() => {
    if (order && order._id && !['delivered', 'completed', 'cancelled'].includes(order.status?.toLowerCase())) {
      const intervalId = setInterval(() => {
        console.log('🔄 Polling for order updates...');
        fetchOrderFromDatabase(order._id, true); // Silent update
      }, 30000); // 30 seconds

      return () => clearInterval(intervalId);
    }
  }, [order]);

  // Check if we received order data from navigation state
  useEffect(() => {
    if (location.state && location.state.orderData) {
      console.log('📦 Order data received from navigation:', location.state.orderData);
      setOrder(location.state.orderData);
      if (location.state.orderData.cancellationReason) {
        setCancellationReason(location.state.orderData.cancellationReason);
      }
      updateTrackingSteps(location.state.orderData);
      setLoading(false);
    } else if (orderId) {
      fetchOrderFromDatabase(orderId);
    } else {
      fetchMostRecentOrder();
    }
  }, [location, orderId]);

  // Update tracking steps based on order status
  const updateTrackingSteps = (orderData) => {
    if (!orderData) return;
    
    const status = orderData.status || 'Processing';
    const updatedSteps = [...trackingSteps];
    
    // If order is cancelled, mark all steps as cancelled
    if (status.toLowerCase() === 'cancelled') {
      updatedSteps[0] = { 
        ...updatedSteps[0], 
        status: 'cancelled', 
        date: orderData.cancelledAt || orderData.updatedAt || orderData.createdAt 
      };
      updatedSteps[1] = { 
        ...updatedSteps[1], 
        status: 'cancelled', 
        date: orderData.cancelledAt || orderData.updatedAt || orderData.createdAt 
      };
      updatedSteps[2] = { 
        ...updatedSteps[2], 
        status: 'cancelled', 
        date: orderData.cancelledAt || orderData.updatedAt || orderData.createdAt 
      };
    } 
    // Determine which steps are complete based on order status
    else {
      switch(status.toLowerCase()) {
        case 'delivered':
        case 'completed':
          updatedSteps[0] = { 
            ...updatedSteps[0], 
            status: 'completed', 
            date: orderData.processingDate || orderData.createdAt 
          };
          updatedSteps[1] = { 
            ...updatedSteps[1], 
            status: 'completed', 
            date: orderData.shippedDate 
          };
          updatedSteps[2] = { 
            ...updatedSteps[2], 
            status: 'completed', 
            date: orderData.deliveredDate || new Date().toISOString() 
          };
          break;
          
        case 'shipped':
          updatedSteps[0] = { 
            ...updatedSteps[0], 
            status: 'completed', 
            date: orderData.processingDate || orderData.createdAt 
          };
          updatedSteps[1] = { 
            ...updatedSteps[1], 
            status: 'in-progress', 
            date: orderData.shippedDate || new Date().toISOString() 
          };
          updatedSteps[2] = { 
            ...updatedSteps[2], 
            status: 'pending' 
          };
          break;
          
        case 'processing':
        case 'pending':
        default:
          updatedSteps[0] = { 
            ...updatedSteps[0], 
            status: 'in-progress', 
            date: orderData.createdAt 
          };
          updatedSteps[1] = { ...updatedSteps[1], status: 'pending' };
          updatedSteps[2] = { ...updatedSteps[2], status: 'pending' };
          break;
      }
    }
    
    setTrackingSteps(updatedSteps);
  };

  // Fetch order from MongoDB by ID
  const fetchOrderFromDatabase = async (id, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    
    try {
      console.log(`🔍 Fetching order from database: ${api}/orders/${id}`);
      
      const res = await fetch(`${api}/orders/${id}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Order fetched from database:', data);
        
        let orderData = null;
        if (data.success && data.data) {
          orderData = data.data;
        } else if (data.order) {
          orderData = data.order;
        } else if (data._id) {
          orderData = data;
        }
        
        if (orderData) {
          // Check if status changed
          if (order && order.status !== orderData.status) {
            console.log(`🔄 Order status changed from ${order.status} to ${orderData.status}`);
            // Show notification for status change
            if (orderData.status?.toLowerCase() === 'cancelled') {
              alert(`❌ Your order #${orderData.orderNumber || orderData._id?.slice(-8)} has been cancelled by the admin.`);
              if (orderData.cancellationReason) {
                alert(`Reason: ${orderData.cancellationReason}`);
              }
            } else if (orderData.status?.toLowerCase() === 'shipped') {
              alert(`📦 Good news! Your order #${orderData.orderNumber || orderData._id?.slice(-8)} has been shipped!`);
            } else if (orderData.status?.toLowerCase() === 'delivered') {
              alert(`✅ Your order #${orderData.orderNumber || orderData._id?.slice(-8)} has been delivered!`);
            }
          }
          
          setOrder(orderData);
          if (orderData.cancellationReason) {
            setCancellationReason(orderData.cancellationReason);
          }
          updateTrackingSteps(orderData);
          
          // Update in localStorage
          updateOrderInLocalStorage(orderData);
        } else {
          if (!silent) setError('Order not found');
        }
      } else {
        console.error('❌ Failed to fetch order:', res.status);
        if (!silent) {
          // Try fallback to localStorage
          loadOrderFromLocalStorage(id);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching order:', error);
      if (!silent) {
        // Try fallback to localStorage
        loadOrderFromLocalStorage(id);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Update order in localStorage
  const updateOrderInLocalStorage = (updatedOrder) => {
    try {
      const purchaseHistory = JSON.parse(localStorage.getItem('user_purchase_history') || '[]');
      const updatedHistory = purchaseHistory.map(order => 
        (order._id === updatedOrder._id || order.orderNumber === updatedOrder.orderNumber) ? updatedOrder : order
      );
      localStorage.setItem('user_purchase_history', JSON.stringify(updatedHistory));
      console.log('💾 Order updated in localStorage');
    } catch (error) {
      console.error('❌ Error updating order in localStorage:', error);
    }
  };

  // Fetch most recent order
  const fetchMostRecentOrder = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First try to get from localStorage purchase history
      const purchaseHistory = JSON.parse(localStorage.getItem('user_purchase_history') || '[]');
      if (purchaseHistory.length > 0) {
        const mostRecent = purchaseHistory[0];
        console.log('📦 Using most recent order from localStorage:', mostRecent);
        setOrder(mostRecent);
        if (mostRecent.cancellationReason) {
          setCancellationReason(mostRecent.cancellationReason);
        }
        updateTrackingSteps(mostRecent);
        setLoading(false);
        return;
      }
      
      // If not in localStorage, try to fetch from API
      if (token) {
        console.log('🔍 Fetching most recent order from API...');
        
        const res = await fetch(`${api}/orders/my-orders?limit=1`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          console.log('✅ Recent orders fetched:', data);
          
          let orders = [];
          if (data.success && Array.isArray(data.data)) {
            orders = data.data;
          } else if (Array.isArray(data)) {
            orders = data;
          } else if (data.orders && Array.isArray(data.orders)) {
            orders = data.orders;
          }
          
          if (orders.length > 0) {
            setOrder(orders[0]);
            if (orders[0].cancellationReason) {
              setCancellationReason(orders[0].cancellationReason);
            }
            updateTrackingSteps(orders[0]);
          } else {
            setError('No orders found');
          }
        } else {
          setError('Could not fetch orders');
        }
      } else {
        setError('No orders found. Please log in to view your orders.');
      }
    } catch (error) {
      console.error('❌ Error fetching recent order:', error);
      setError('Error loading order information');
    } finally {
      setLoading(false);
    }
  };

  // Fallback: Load order from localStorage
  const loadOrderFromLocalStorage = (id) => {
    console.log('📦 Attempting to load order from localStorage');
    
    const purchaseHistory = JSON.parse(localStorage.getItem('user_purchase_history') || '[]');
    const foundOrder = purchaseHistory.find(o => o._id === id || o.orderNumber === id);
    
    if (foundOrder) {
      console.log('✅ Order found in localStorage:', foundOrder);
      setOrder(foundOrder);
      if (foundOrder.cancellationReason) {
        setCancellationReason(foundOrder.cancellationReason);
      }
      updateTrackingSteps(foundOrder);
      setError(null);
    } else {
      setError('Order not found in database or local storage');
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return null;
    }
  };

  // Get status badge class
  const getStatusClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'delivered':
      case 'completed':
        return 'status-delivered';
      case 'shipped':
        return 'status-shipped';
      case 'processing':
      case 'pending':
        return 'status-processing';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  };

  // Handle continue shopping - Go back to previous page
  const handleContinueShopping = () => {
    // Go back to the previous page (Browse Books)
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="track-order-container">
        <div className="track-order-loading">
          <div className="loading-spinner"></div>
          <p>Loading your order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="track-order-container">
        <div className="track-order-error">
          <div className="error-icon">❌</div>
          <h2>Order Not Found</h2>
          <p>{error || 'We could not find the order you are looking for.'}</p>
          <div className="error-actions">
            <button 
              className="continue-shopping-btn"
              onClick={handleContinueShopping}
            >
              ← Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isCancelled = order.status?.toLowerCase() === 'cancelled';

  return (
    <div className="track-order-container">
      {/* Header */}
      <div className="track-order-header">
        <h1>Track Your Order</h1>
        <div className="order-info">
          <span className="order-number">Order #{order.orderNumber || order._id?.slice(-8)}</span>
          <span className={`order-status-badge ${getStatusClass(order.status)}`}>
            {order.status || 'Processing'}
          </span>
        </div>
        <p className="order-date">
          Placed on {formatDate(order.createdAt) || new Date().toLocaleDateString()}
        </p>
        {isCancelled && order.cancelledAt && (
          <p className="order-cancelled-date">
            Cancelled on {formatDate(order.cancelledAt || order.updatedAt)}
          </p>
        )}
      </div>

      {/* Cancellation Reason (if cancelled) */}
      {isCancelled && (cancellationReason || order.cancellationReason) && (
        <div className="cancellation-reason-section">
          <div className="cancellation-reason-card">
            <div className="cancellation-icon">❌</div>
            <div className="cancellation-content">
              <h3>Order Cancelled</h3>
              <p className="reason-label">Reason for cancellation:</p>
              <p className="reason-text">"{cancellationReason || order.cancellationReason}"</p>
              {order.cancelledBy && (
                <p className="cancelled-by">Cancelled by: {order.cancelledBy}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* What's Next Section */}
      <div className="whats-next-section">
        <h2>What's Next?</h2>
        
        {/* Tracking Steps */}
        <div className="tracking-steps">
          {trackingSteps.map((step, index) => (
            <div 
              key={step.id} 
              className={`tracking-step ${step.status} ${isCancelled ? 'cancelled' : ''}`}
            >
              <div className="step-icon">
                {isCancelled ? '❌' : (step.status === 'completed' ? '✅' : step.icon)}
              </div>
              <div className="step-content">
                <h3>{step.label}</h3>
                {isCancelled ? (
                  <p className="step-status cancelled">Cancelled</p>
                ) : (
                  <>
                    {step.status === 'completed' ? (
                      <p className="step-status completed">Complete ✓</p>
                    ) : step.status === 'in-progress' ? (
                      <p className="step-status in-progress">In Progress</p>
                    ) : (
                      <p className="step-status pending">Pending</p>
                    )}
                  </>
                )}
                {step.date && (
                  <p className="step-date">{formatDate(step.date)}</p>
                )}
              </div>
              {index < trackingSteps.length - 1 && !isCancelled && (
                <div className={`step-connector ${step.status === 'completed' ? 'completed' : ''}`}>
                  <span className="connector-line"></span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Order Processing Details */}
        <div className="order-processing-details">
          {isCancelled ? (
            // Show cancelled state for all cards
            <>
              <div className="processing-card cancelled">
                <div className="card-icon">❌</div>
                <div className="card-content">
                  <h3>Order Processing</h3>
                  <p className="cancelled-text">Order was cancelled</p>
                  {order.cancelledAt && (
                    <p className="cancelled-date">Cancelled on {formatDate(order.cancelledAt)}</p>
                  )}
                </div>
              </div>

              <div className="processing-card cancelled">
                <div className="card-icon">❌</div>
                <div className="card-content">
                  <h3>Shipping</h3>
                  <p className="cancelled-text">Cancelled - No shipment</p>
                </div>
              </div>

              <div className="processing-card cancelled">
                <div className="card-icon">❌</div>
                <div className="card-content">
                  <h3>Delivery</h3>
                  <p className="cancelled-text">Cancelled - No delivery</p>
                </div>
              </div>
            </>
          ) : (
            // Normal flow
            <>
              <div className={`processing-card ${trackingSteps[0].status === 'in-progress' ? 'active' : ''} ${trackingSteps[0].status === 'completed' ? 'completed' : ''}`}>
                <div className="card-icon">{trackingSteps[0].icon}</div>
                <div className="card-content">
                  <h3>Order Processing</h3>
                  <p>We're preparing your order</p>
                  {trackingSteps[0].status === 'in-progress' && (
                    <p className="eta-text">Estimated completion: Today</p>
                  )}
                  {trackingSteps[0].status === 'completed' && (
                    <p className="complete-text">Order processed on {formatDate(trackingSteps[0].date)}</p>
                  )}
                </div>
              </div>

              <div className={`processing-card ${trackingSteps[1].status === 'in-progress' ? 'active' : ''} ${trackingSteps[1].status === 'completed' ? 'completed' : ''}`}>
                <div className="card-icon">{trackingSteps[1].icon}</div>
                <div className="card-content">
                  <h3>Shipping</h3>
                  <p>Your books will be shipped within 24 hours</p>
                  {trackingSteps[1].status === 'completed' ? (
                    <p className="complete-text">Shipped on {formatDate(trackingSteps[1].date)}</p>
                  ) : trackingSteps[1].status === 'in-progress' ? (
                    <p className="eta-text">Preparing for shipment</p>
                  ) : (
                    <p className="pending-text">Awaiting processing</p>
                  )}
                </div>
              </div>

              <div className={`processing-card ${trackingSteps[2].status === 'in-progress' ? 'active' : ''} ${trackingSteps[2].status === 'completed' ? 'completed' : ''}`}>
                <div className="card-icon">{trackingSteps[2].icon}</div>
                <div className="card-content">
                  <h3>Delivery</h3>
                  <p>Estimated delivery: 3-5 business days</p>
                  {trackingSteps[2].status === 'completed' ? (
                    <p className="complete-text">Delivered on {formatDate(trackingSteps[2].date)}</p>
                  ) : trackingSteps[1].status === 'completed' ? (
                    <p className="eta-text">Expected delivery: {new Date(new Date().getTime() + 3*24*60*60*1000).toLocaleDateString()}</p>
                  ) : (
                    <p className="pending-text">Will update once shipped</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Order Items Summary */}
      <div className="order-items-section">
        <h2>Order Items</h2>
        <div className="order-items-list">
          {order.items && order.items.length > 0 ? (
            order.items.map((item, index) => (
              <div key={index} className={`order-item ${isCancelled ? 'cancelled-item' : ''}`}>
                <div className="item-image">
                  <img 
                    src={item.book?.imageUrl || item.imageUrl || '/placeholder.png'} 
                    alt={item.book?.title || 'Book'}
                    onError={(e) => { e.target.src = '/placeholder.png'; }}
                  />
                  {isCancelled && (
                    <div className="cancelled-overlay">Cancelled</div>
                  )}
                </div>
                <div className="item-details">
                  <h4>{item.book?.title || 'Unknown Book'}</h4>
                  <p className="item-author">by {item.book?.author || 'Unknown Author'}</p>
                  <p className="item-category">{item.book?.category || 'General'}</p>
                </div>
                <div className="item-price">
                  <span className="item-quantity">Qty: {item.quantity || 1}</span>
                  <span className="item-total">₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="no-items">No items found in this order</p>
          )}
        </div>
        
        <div className="order-total-section">
          <div className="total-row">
            <span>Subtotal</span>
            <span>₹{(order.totalAmount || 0).toFixed(2)}</span>
          </div>
          <div className="total-row">
            <span>Shipping</span>
            <span className="free-shipping">FREE</span>
          </div>
          <div className="total-row grand-total">
            <span>Total</span>
            <span>₹{(order.totalAmount || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Shipping Information */}
      {order.shippingInfo && !isCancelled && (
        <div className="shipping-info-section">
          <h2>Shipping Information</h2>
          <div className="shipping-card">
            <p className="shipping-name">{order.shippingInfo.name || user.name}</p>
            <p className="shipping-email">{order.shippingInfo.email || user.email}</p>
            <p className="shipping-address">{order.shippingInfo.address}</p>
            <p className="shipping-city">{order.shippingInfo.city}, {order.shippingInfo.state} {order.shippingInfo.pincode}</p>
            <p className="shipping-phone">{order.shippingInfo.phone}</p>
          </div>
        </div>
      )}

      {/* Action Buttons - Only Continue Shopping button remains */}
      <div className="track-order-actions">
        <button 
          className="continue-shopping-btn"
          onClick={handleContinueShopping}
        >
          ← Continue Shopping
        </button>
      </div>

      {/* Help Section */}
      <div className="help-section">
        <p>Need help with your order? <a href="/contact">Contact Support</a></p>
      </div>
    </div>
  );
}