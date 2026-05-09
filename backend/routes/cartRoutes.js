const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/authMiddleware');
const Cart = require('../models/Cart');
const Book = require('../models/Book');

// =================== DEBUG ROUTES ===================
// Get detailed cart info for debugging
router.get('/debug/info', auth, async (req, res) => {
  try {
    console.log('\n🔍 DEBUG: Cart info for user:', req.user);
    
    // Find cart using both possible ID fields
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.book', 'title author price imageUrl category');
    
    if (!cart) {
      console.log('❌ No cart found in database');
      
      // Check if any carts exist
      const allCarts = await Cart.find().populate('user', 'name email');
      console.log('📊 All carts in database:', allCarts.length);
      
      return res.json({
        success: false,
        message: 'No cart found for user',
        debug: {
          userId: req.user._id,
          userEmail: req.user.email,
          cartExists: false,
          totalCarts: allCarts.length,
          allCarts: allCarts
        }
      });
    }
    
    console.log('✅ Cart found! Details:', {
      cartId: cart._id,
      userId: cart.user,
      itemsCount: cart.items.length,
      items: cart.items.map(item => ({
        bookId: item.book?._id,
        title: item.book?.title,
        quantity: item.quantity,
        price: item.price
      }))
    });
    
    res.json({
      success: true,
      cart: {
        _id: cart._id,
        user: cart.user,
        itemsCount: cart.items.length,
        items: cart.items,
        subtotal: cart.subtotal,
        shipping: cart.shipping,
        total: cart.total,
        updatedAt: cart.updatedAt
      },
      debug: {
        userId: req.user._id,
        userEmail: req.user.email,
        cartExists: true,
        itemsCount: cart.items.length
      }
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

// Create test cart with sample data
router.post('/debug/create-test', auth, async (req, res) => {
  try {
    console.log('\n🛠️ DEBUG: Creating test cart for user:', req.user);
    
    // Find a book to add
    const sampleBook = await Book.findOne();
    
    if (!sampleBook) {
      return res.status(404).json({
        success: false,
        error: 'No books found in database'
      });
    }
    
    console.log('📚 Sample book found:', sampleBook.title);
    
    // Create or get cart
    let cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      console.log('🛒 Creating new cart...');
      cart = new Cart({ 
        user: req.user._id, 
        items: [] 
      });
    }
    
    // Add sample book to cart
    cart.items.push({
      book: sampleBook._id,
      quantity: 1,
      price: sampleBook.price
    });
    
    await cart.save();
    await cart.populate('items.book', 'title author price imageUrl category');
    
    console.log('✅ Test cart created:', cart._id);
    
    res.json({
      success: true,
      message: 'Test cart created',
      cart: cart,
      debug: {
        cartId: cart._id,
        itemsCount: cart.items.length,
        sampleBook: {
          id: sampleBook._id,
          title: sampleBook.title,
          price: sampleBook.price
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Debug create error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

// =================== MAIN CART ROUTES ===================

// Get user's cart
router.get('/', auth, async (req, res) => {
  try {
    console.log('\n🛒 GET cart request');
    console.log('👤 req.user:', req.user);
    console.log('👤 User ID:', req.user._id);
    
    // Use req.user._id (from updated authMiddleware)
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.book', 'title author price imageUrl category');
    
    console.log('📦 Cart query result:', cart ? 'Found' : 'Not found');
    
    if (!cart) {
      console.log('ℹ️ No cart found for user');
      // Create empty cart automatically
      const newCart = new Cart({
        user: req.user._id,
        items: []
      });
      await newCart.save();
      
      return res.json({ 
        success: true,
        items: [], 
        subtotal: 0, 
        shipping: 0, 
        total: 0,
        message: 'Cart is empty'
      });
    }
    
    console.log('✅ Cart retrieved:', {
      itemsCount: cart.items.length,
      subtotal: cart.subtotal,
      total: cart.total
    });
    
    res.json({
      success: true,
      ...cart.toObject(),
      message: 'Cart retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ Get cart error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Add item to cart
router.post('/add', auth, async (req, res) => {
  try {
    console.log('\n➕ ADD to cart request');
    console.log('👤 User:', req.user);
    console.log('📦 Request body:', req.body);
    
    const { bookId, quantity = 1 } = req.body;
    
    if (!bookId) {
      return res.status(400).json({ 
        success: false,
        error: 'Book ID is required' 
      });
    }
    
    // Get book details
    const book = await Book.findById(bookId);
    if (!book) {
      console.log('❌ Book not found:', bookId);
      return res.status(404).json({ 
        success: false,
        error: 'Book not found' 
      });
    }
    
    console.log('📚 Book found:', book.title, 'Price:', book.price);
    
    // Find or create cart using req.user._id
    let cart = await Cart.findOne({ user: req.user._id });
    
    console.log('🛒 Existing cart:', cart ? 'Found' : 'Not found');
    
    if (!cart) {
      console.log('🆕 Creating new cart...');
      cart = new Cart({ 
        user: req.user._id, 
        items: [] 
      });
    }
    
    // Check if book already in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.book.toString() === bookId
    );
    
    console.log('🔍 Existing item index:', existingItemIndex);
    
    if (existingItemIndex > -1) {
      // Update quantity
      cart.items[existingItemIndex].quantity += quantity;
      console.log('📈 Updated quantity to:', cart.items[existingItemIndex].quantity);
    } else {
      // Add new item
      cart.items.push({
        book: bookId,
        quantity,
        price: book.price
      });
      console.log('🆕 Added new item');
    }
    
    await cart.save();
    console.log('💾 Cart saved:', cart._id);
    
    await cart.populate('items.book', 'title author price imageUrl category');
    
    console.log('✅ Add successful. Items count:', cart.items.length);
    
    res.json({
      success: true,
      cart: cart,
      message: 'Book added to cart'
    });
    
  } catch (error) {
    console.error('❌ Add to cart error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Remove item from cart
router.delete('/remove/:bookId', auth, async (req, res) => {
  try {
    const { bookId } = req.params;
    console.log('\n🗑️ Remove item from cart:', bookId);
    console.log('👤 User:', req.user._id);
    
    const cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      return res.status(404).json({ 
        success: false,
        error: 'Cart not found' 
      });
    }
    
    // Remove the item
    cart.items = cart.items.filter(
      item => item.book.toString() !== bookId
    );
    
    await cart.save();
    await cart.populate('items.book', 'title author price imageUrl category');
    
    res.json({
      success: true,
      cart: cart,
      message: 'Item removed from cart'
    });
    
  } catch (error) {
    console.error('❌ Remove item error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Update item quantity
router.put('/update/:bookId', auth, async (req, res) => {
  try {
    const { bookId } = req.params;
    const { quantity } = req.body;
    
    console.log('\n📊 Update quantity:', { bookId, quantity });
    console.log('👤 User:', req.user._id);
    
    if (quantity < 1) {
      return res.status(400).json({ 
        success: false,
        error: 'Quantity must be at least 1' 
      });
    }
    
    const cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      return res.status(404).json({ 
        success: false,
        error: 'Cart not found' 
      });
    }
    
    const itemIndex = cart.items.findIndex(
      item => item.book.toString() === bookId
    );
    
    if (itemIndex === -1) {
      return res.status(404).json({ 
        success: false,
        error: 'Item not found in cart' 
      });
    }
    
    cart.items[itemIndex].quantity = quantity;
    await cart.save();
    await cart.populate('items.book', 'title author price imageUrl category');
    
    res.json({
      success: true,
      cart: cart,
      message: 'Cart updated'
    });
    
  } catch (error) {
    console.error('❌ Update quantity error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Clear cart
router.delete('/clear', auth, async (req, res) => {
  try {
    console.log('\n🧹 Clear cart request');
    console.log('👤 User:', req.user._id);
    
    const cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      return res.status(404).json({ 
        success: false,
        error: 'Cart not found' 
      });
    }
    
    cart.items = [];
    await cart.save();
    
    res.json({
      success: true,
      message: 'Cart cleared'
    });
    
  } catch (error) {
    console.error('❌ Clear cart error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;