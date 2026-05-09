import React, { useState, useEffect } from 'react';
import { getCart, removeFromCart, updateCartItem, checkout } from '../services/cartService';
import { getMyOrders } from '../services/orderService';
import './Cart.css';

const Cart = ({ token }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const cartData = await getCart(token);
      setCart(cartData);
    } catch (err) {
      setError(err.error || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (bookId) => {
    try {
      await removeFromCart(bookId, token);
      fetchCart();
      setSuccess('Item removed from cart');
    } catch (err) {
      setError(err.error || 'Failed to remove item');
    }
  };

  const handleQuantityChange = async (bookId, newQuantity) => {
    if (newQuantity < 1) return;
    
    try {
      await updateCartItem(bookId, newQuantity, token);
      fetchCart();
    } catch (err) {
      setError(err.error || 'Failed to update quantity');
    }
  };

  const handleCheckout = async () => {
    if (!cart || cart.items.length === 0) {
      setError('Cart is empty');
      return;
    }

    try {
      const result = await checkout(token);
      setSuccess(result.message);
      setCart({ items: [], subtotal: 0, shipping: 0, total: 0 });
      // You might want to redirect to order confirmation page
    } catch (err) {
      setError(err.error || 'Checkout failed');
    }
  };

  if (loading) return <div className="loading">Loading cart...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="cart-container">
      <h2>Your Cart</h2>
      
      {success && <div className="success-message">{success}</div>}
      
      {(!cart || cart.items.length === 0) ? (
        <div className="empty-cart">
          <p>Your cart is empty</p>
          <p>Add some books to get started!</p>
        </div>
      ) : (
        <>
          <div className="cart-items">
            <div className="cart-header">
              <span>Item</span>
              <span>Price</span>
              <span>Quantity</span>
              <span>Total</span>
              <span>Action</span>
            </div>
            
            {cart.items.map((item, index) => (
              <div key={index} className="cart-item">
                <div className="item-info">
                  {item.book?.imageUrl && (
                    <img src={item.book.imageUrl} alt={item.book.title} />
                  )}
                  <div>
                    <h4>{item.book?.title}</h4>
                    <p>by {item.book?.author}</p>
                    <p className="category">{item.book?.category}</p>
                  </div>
                </div>
                
                <div className="item-price">${item.price?.toFixed(2)}</div>
                
                <div className="item-quantity">
                  <button 
                    onClick={() => handleQuantityChange(item.book._id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button 
                    onClick={() => handleQuantityChange(item.book._id, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                
                <div className="item-total">
                  ${(item.price * item.quantity).toFixed(2)}
                </div>
                
                <div className="item-actions">
                  <button 
                    onClick={() => handleRemove(item.book._id)}
                    className="remove-btn"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="cart-summary">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>${cart.subtotal?.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>${cart.shipping?.toFixed(2)}</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>${cart.total?.toFixed(2)}</span>
            </div>
            
            <button 
              onClick={handleCheckout}
              className="checkout-btn"
              disabled={cart.items.length === 0}
            >
              Proceed to Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;