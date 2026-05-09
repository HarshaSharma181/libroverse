// src/components/BookCard.jsx
import React, { useState } from 'react';
import './BookCard.css';

export default function BookCard({ 
  book, 
  onAdd, 
  onBorrow, 
  onAddToList, 
  onWishlist,
  onPreview,
  readingLists, 
  inCart,
  inWishlist 
}) {
  const [showActions, setShowActions] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formatDescription = (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getStatusBadge = () => {
    if (book.stock === 0) return <span className="status-badge out-of-stock">Out of Stock</span>;
    if (book.stock < 5) return <span className="status-badge low-stock">Only {book.stock} left</span>;
    if (book.isNew) return <span className="status-badge new">New</span>;
    if (book.isBestseller) return <span className="status-badge bestseller">Bestseller</span>;
    return null;
  };

  // Get valid image URL
  const getImageUrl = () => {
    if (imageError || !book.imageUrl) {
      return getPlaceholderImage();
    }
    
    const url = book.imageUrl.trim();
    
    // Check if URL is valid
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    if (url.startsWith('/')) {
      return url;
    }
    
    // Try to construct a valid URL
    if (url.includes('.')) {
      return url.startsWith('uploads/') ? `/${url}` : `/uploads/${url}`;
    }
    
    return getPlaceholderImage();
  };

  // Generate placeholder image
  const getPlaceholderImage = () => {
    const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];
    const colorIndex = (book.title || '').length % colors.length;
    const bgColor = colors[colorIndex];
    const firstLetter = (book.title || 'B').charAt(0).toUpperCase();
    const authorLetter = (book.author || 'A').charAt(0).toUpperCase();
    
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300"><rect width="200" height="300" fill="${bgColor}"/><text x="100" y="140" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="60" font-weight="bold">${firstLetter}</text><text x="100" y="180" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="20">${authorLetter}</text><text x="100" y="250" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14">${book.category || 'Book'}</text></svg>`;
  };

  // Handle image error
  const handleImageError = () => {
    console.log(`Image failed to load for: ${book.title}`, book.imageUrl);
    setImageError(true);
  };

  // Check if book is in any list
  const isBookInAnyList = () => {
    if (!readingLists || readingLists.length === 0) return false;
    return readingLists.some(list => 
      list.books && list.books.some(b => b._id === book._id)
    );
  };

  return (
    <div 
      className="book-card" 
      onMouseEnter={() => setShowActions(true)} 
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Book Image with Overlay */}
      <div className="book-image-container">
        <div className="book-image">
          <img 
            src={getImageUrl()} 
            alt={book.title}
            onError={handleImageError}
            loading="lazy"
          />
          {getStatusBadge()}
        </div>
        
        {/* Quick Actions Overlay */}
        {showActions && (
          <div className="quick-actions-overlay">
            {/* Quick Preview button */}
            <button 
              className="quick-action-btn preview-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (onPreview) onPreview(book);
              }}
              title="Quick Preview"
            >
              👁️
            </button>
            
            {/* Wishlist button */}
            <button 
              className={`quick-action-btn wishlist-btn ${inWishlist ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onWishlist) onWishlist(book);
              }}
              title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
            >
              {inWishlist ? '❤️' : '🤍'}
            </button>
            
            {/* Quick Add to Cart button */}
            <button 
              className={`quick-action-btn cart-quick-btn ${inCart ? 'in-cart' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (onAdd) onAdd(book);
              }}
              disabled={book.stock === 0}
              title={inCart ? "Remove from cart" : "Add to cart"}
            >
              {inCart ? '✓' : '🛒'}
            </button>
          </div>
        )}
      </div>
      
      <div className="book-info">
        <div className="book-header">
          <h3 className="book-title" title={book.title}>{book.title}</h3>
          <p className="book-author" title={book.author}>by {book.author}</p>
        </div>
        
        {/* Book Meta */}
        <div className="book-meta">
          {book.category && (
            <span className="book-category">{book.category}</span>
          )}
          
          {book.pages && (
            <span className="book-pages">{book.pages} pages</span>
          )}
          
          {book.publishedDate && (
            <span className="book-year">{new Date(book.publishedDate).getFullYear()}</span>
          )}
        </div>
        
        {/* Rating */}
        {book.rating && (
          <div className="book-rating">
            <div className="stars">
              {'⭐'.repeat(Math.floor(book.rating))}
              {book.rating % 1 >= 0.5 && '⭐'.slice(0, 1)}
            </div>
            <span className="rating-value">{book.rating}/5</span>
            {book.reviewCount && (
              <span className="review-count">({book.reviewCount})</span>
            )}
          </div>
        )}
        
        {/* Description with read more */}
        {book.description && (
          <p className="book-description" title={book.description}>
            {formatDescription(book.description)}
          </p>
        )}
        
        {/* Pricing */}
        <div className="book-pricing">
          <span className="price">₹{book.price}</span>
          {book.originalPrice && book.originalPrice > book.price && (
            <>
              <span className="original-price">₹{book.originalPrice}</span>
              <span className="discount-percent">
                {Math.round(((book.originalPrice - book.price) / book.originalPrice) * 100)}% off
              </span>
            </>
          )}
        </div>
        
        {/* Stock Status */}
        {book.stock !== undefined && (
          <div className="stock-status">
            {book.stock === 0 ? (
              <span className="out-of-stock-text">Currently unavailable</span>
            ) : book.stock < 5 ? (
              <span className="low-stock-text">Only {book.stock} left in stock</span>
            ) : (
              <span className="in-stock-text">In Stock</span>
            )}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="book-actions">
          <button 
            className={`add-to-cart-btn ${inCart ? 'in-cart' : ''} ${book.stock === 0 ? 'disabled' : ''}`}
            onClick={() => onAdd && onAdd(book)}
            disabled={book.stock === 0}
            title={book.stock === 0 ? "Out of stock" : inCart ? "Remove from cart" : "Add to cart"}
          >
            {inCart ? (
              <>
                <span className="check-icon">✓</span> In Cart
              </>
            ) : (
              <>
                <span className="cart-icon">🛒</span> Add to Cart
              </>
            )}
          </button>
          
          {onBorrow && (
            <button 
              className="borrow-btn"
              onClick={() => onBorrow(book)}
              title="Borrow this book"
              disabled={book.stock === 0}
            >
              <span className="borrow-icon">📖</span> Borrow
            </button>
          )}
          
          {/* Wishlist Button */}
          <button 
            className={`wishlist-action-btn ${inWishlist ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onWishlist) onWishlist(book);
            }}
            title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          >
            {inWishlist ? '❤️' : '🤍'}
          </button>
          
          {/* Add to List Button */}
          <button 
            className={`list-action-btn ${isBookInAnyList() ? 'in-list' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onAddToList) onAddToList(book);
            }}
            title={isBookInAnyList() ? "Book is in a reading list" : "Add to reading list"}
          >
            <span className="list-icon">📋</span>
            {isBookInAnyList() && <span className="list-check">✓</span>}
          </button>
        </div>
      </div>
    </div>
  );
}