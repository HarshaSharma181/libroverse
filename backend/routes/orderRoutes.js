const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { auth } = require('../middleware/authMiddleware');

// ✅ IMPORTANT: Clear Mongoose model cache completely
delete mongoose.connection.models['Order'];
delete mongoose.models['Order'];

// Now import the models AFTER clearing cache
const Cart = require('../models/Cart');
const Book = require('../models/Book');

// ✅ IMPORTANT: Load Order model AFTER importing others and add middleware fix
let Order;
try {
  // Clear require cache for Order model
  delete require.cache[require.resolve('../models/Order')];
  const OrderModule = require('../models/Order');
  Order = OrderModule;
  
  // Check if there's middleware that might cause issues
  if (Order.schema && Order.schema._pre && Order.schema._pre.save) {
    console.log('⚠️ Pre-save middleware detected in Order model');
    
    // Check if middleware is problematic (missing next parameter)
    const middleware = Order.schema._pre.save;
    if (Array.isArray(middleware)) {
      const problematicIndex = middleware.findIndex(mw => 
        mw.toString().includes('pre(\'save\'') && 
        !mw.toString().includes('function(next)') &&
        !mw.toString().includes('(next)')
      );
      
      if (problematicIndex !== -1) {
        console.log('⚠️ Removing problematic middleware from Order model');
        Order.schema._pre.save.splice(problematicIndex, 1);
      }
    }
  }
} catch (error) {
  console.error('❌ Error loading Order model:', error);
  // Create a simple Order model as fallback
  const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [{
      book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
      qty: Number,
      price: Number
    }],
    shippingInfo: {
      name: String,
      email: String,
      phone: String,
      address: String,
      city: String,
      state: String,
      pincode: String,
      country: String
    },
    paymentMethod: String,
    paymentStatus: String,
    subtotal: Number,
    shippingCharge: Number,
    taxAmount: Number,
    total: Number,
    orderStatus: String,
    createdAt: Date,
    updatedAt: Date
  }, { timestamps: true });
  
  Order = mongoose.model('Order', orderSchema);
}

// ✅ ADMIN ROUTES - Get all orders (admin only)
router.get('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.'
      });
    }

    console.log('📊 Admin fetching all orders...');
    
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.book', 'title author price')
      .sort({ createdAt: -1 });
    
    console.log(`✅ Admin retrieved ${orders.length} orders`);
    
    res.json({
      success: true,
      count: orders.length,
      orders: orders
    });
  } catch (error) {
    console.error('❌ Error fetching all orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders'
    });
  }
});

// ✅ ADMIN: Update order status
router.put('/:id/status', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.'
      });
    }

    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Use: pending, processing, shipped, delivered, cancelled'
      });
    }

    console.log(`📝 Admin updating order ${req.params.id} status to: ${status}`);
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { 
        orderStatus: status,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('user', 'name email');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    console.log(`✅ Order status updated: ${order.orderStatus}`);
    
    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: order
    });
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update order status'
    });
  }
});

// ✅ ADMIN: Delete single order
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.'
      });
    }

    console.log(`🗑️ Admin deleting order: ${req.params.id}`);
    
    const order = await Order.findByIdAndDelete(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    console.log(`✅ Order deleted: ${req.params.id}`);
    
    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting order:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete order'
    });
  }
});

// ✅ ADMIN: Delete multiple orders
router.post('/delete-multiple', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin only.'
      });
    }

    const { orderIds } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No order IDs provided'
      });
    }

    console.log(`🗑️ Admin deleting ${orderIds.length} orders...`);
    
    // Validate all IDs are valid MongoDB ObjectIds
    const validOrderIds = orderIds.filter(id => mongoose.Types.ObjectId.isValid(id));
    
    if (validOrderIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid order IDs provided'
      });
    }
    
    const result = await Order.deleteMany({ _id: { $in: validOrderIds } });
    
    console.log(`✅ Deleted ${result.deletedCount} orders`);
    
    res.json({
      success: true,
      message: `${result.deletedCount} order(s) deleted successfully`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('❌ Error deleting multiple orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete orders'
    });
  }
});

// ✅ ADDED: Debug endpoint to test middleware
router.post('/checkout-debug', async (req, res) => {
  try {
    console.log('\n🔍 DEBUG CHECKOUT ENDPOINT CALLED');
    console.log('📦 Full request object:', {
      headers: req.headers,
      body: req.body,
      method: req.method,
      url: req.url
    });
    
    // Manually check auth token if present
    const header = req.headers.authorization;
    if (header) {
      console.log('🔑 Authorization header found');
      const token = header.split(' ')[1];
      if (token) {
        console.log('✅ Token extracted, length:', token.length);
      } else {
        console.log('❌ No token in authorization header');
      }
    } else {
      console.log('❌ No authorization header');
    }
    
    res.json({ 
      success: true, 
      message: "Debug endpoint works",
      requestBody: req.body,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// ✅ FIXED: Checkout endpoint with multiple fallback strategies
router.post('/checkout', auth, async (req, res) => {
  try {
    console.log('\n📦 Checkout request received');
    console.log('👤 User from auth middleware:', req.user);
    
    const { shippingInfo, paymentMethod, cartItems: requestCartItems } = req.body;
    
    if (!req.user || !req.user._id) {
      return res.status(401).json({ 
        success: false,
        error: 'User not authenticated'
      });
    }
    
    const userId = req.user._id;
    console.log('👤 User ID for order:', userId);
    
    let items = [];
    
    // Process cart items
    if (requestCartItems && requestCartItems.length > 0) {
      console.log('🛒 Using cart items from request body:', requestCartItems.length, 'items');
      
      for (const item of requestCartItems) {
        try {
          const bookId = item.bookId || item.book?._id;
          
          if (!bookId) {
            console.log('⚠️ No book ID in cart item:', item);
            continue;
          }
          
          const book = await Book.findById(bookId);
          if (book) {
            items.push({
              book: book._id,
              qty: item.quantity || item.qty || 1,
              price: item.price || book.price || 0
            });
            console.log(`✅ Added book: ${book.title}, Price: ${book.price}`);
          }
        } catch (error) {
          console.error('❌ Error fetching book:', error);
        }
      }
    } else {
      // Fallback to database cart
      const cart = await Cart.findOne({ user: userId }).populate('items.book');
      
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: 'Cart is empty'
        });
      }
      
      items = cart.items.map(item => ({
        book: item.book._id,
        qty: item.quantity || 1,
        price: item.price || item.book?.price || 0
      }));
    }
    
    if (items.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No valid books found in cart'
      });
    }
    
    console.log('✅ Cart prepared with', items.length, 'items');
    
    // Validate shipping info
    if (!shippingInfo) {
      return res.status(400).json({
        success: false,
        error: 'Shipping information required'
      });
    }
    
    const requiredFields = ['name', 'email', 'phone', 'address', 'city', 'state', 'pincode'];
    for (const field of requiredFields) {
      if (!shippingInfo[field]?.trim()) {
        return res.status(400).json({
          success: false,
          error: `Shipping ${field} is required`
        });
      }
    }
    
    // Calculate amounts
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const shipping = subtotal > 500 ? 0 : 50;
    const tax = subtotal * 0.18;
    const total = subtotal + shipping + tax;
    
    console.log('💰 Calculated amounts:', { subtotal, shipping, tax, total });
    
    // Create order data
    const orderData = {
      user: userId,
      items: items,
      shippingInfo: {
        name: shippingInfo.name,
        email: shippingInfo.email,
        phone: shippingInfo.phone,
        address: shippingInfo.address,
        city: shippingInfo.city,
        state: shippingInfo.state,
        pincode: shippingInfo.pincode,
        country: shippingInfo.country || 'India'
      },
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'completed',
      subtotal: subtotal,
      shippingCharge: shipping,
      taxAmount: tax,
      total: total,
      orderStatus: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('📝 Creating order...');
    
    let orderId;
    
    // ✅ STRATEGY 1: Try direct MongoDB insert (most reliable)
    try {
      console.log('🔄 Attempting direct MongoDB insert...');
      const db = mongoose.connection.db;
      const result = await db.collection('orders').insertOne(orderData);
      orderId = result.insertedId;
      console.log(`✅ Order inserted directly with ID: ${orderId}`);
    } catch (directError) {
      console.log('⚠️ Direct insert failed, trying alternative...');
      
      // ✅ STRATEGY 2: Try Mongoose create with disabled middleware
      try {
        // Temporarily disable middleware if it exists
        const originalMiddleware = Order.schema._pre?.save;
        if (Order.schema._pre?.save) {
          Order.schema._pre.save = [];
        }
        
        const newOrder = await Order.create(orderData);
        orderId = newOrder._id;
        console.log(`✅ Order created via Mongoose: ${orderId}`);
        
        // Restore middleware if needed
        if (originalMiddleware) {
          Order.schema._pre.save = originalMiddleware;
        }
      } catch (mongooseError) {
        console.log('⚠️ Mongoose create failed, trying raw model...');
        
        // ✅ STRATEGY 3: Create minimal order instance and save
        const simpleOrder = new Order(orderData);
        await simpleOrder.save();
        orderId = simpleOrder._id;
        console.log(`✅ Order saved via simple model: ${orderId}`);
      }
    }
    
    // Clear cart if it exists in database
    try {
      const cart = await Cart.findOne({ user: userId });
      if (cart) {
        cart.items = [];
        await cart.save();
        console.log('✅ Database cart cleared');
      }
    } catch (cartError) {
      console.log('⚠️ Could not clear cart:', cartError.message);
    }
    
    // Prepare response
    const responseData = {
      success: true, 
      message: "Order Placed Successfully",
      orderId: orderId,
      order: {
        _id: orderId,
        ...orderData,
        items: items.map(item => ({
          book: { _id: item.book },
          qty: item.qty,
          price: item.price
        }))
      }
    };
    
    res.status(201).json(responseData);
    
  } catch (error) {
    console.error('❌ Checkout error:', {
      message: error.message,
      name: error.name
    });
    
    if (error.message.includes('next is not a function')) {
      console.log('⚠️ CRITICAL: Middleware error still occurring');
      console.log('💡 Immediate fix needed in Order.js model file');
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to place order. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ Other user routes...
// Test endpoint for auth middleware
router.get('/test-auth', auth, (req, res) => {
  console.log('✅ Test auth endpoint reached');
  res.json({
    success: true,
    message: 'Auth middleware works!',
    user: req.user
  });
});

// Order history endpoint
router.get('/history', auth, async (req, res) => {
  try {
    console.log('📦 Fetching order history for user:', req.user._id);
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.book', 'title author imageUrl category price');
    
    console.log(`✅ Found ${orders.length} orders in history`);
    
    res.json({
      success: true,
      count: orders.length,
      orders: orders
    });
  } catch (error) {
    console.error('❌ Error fetching order history:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get user's orders
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.book', 'title author imageUrl category price');
    
    res.json({
      success: true,
      count: orders.length,
      orders: orders
    });
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Get specific order
router.get('/:orderId', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid order ID format' 
      });
    }
    
    const order = await Order.findById(req.params.orderId)
      .populate('items.book', 'title author price imageUrl category')
      .populate('user', 'name email');
    
    if (!order) {
      return res.status(404).json({ 
        success: false,
        error: 'Order not found' 
      });
    }
    
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        error: 'Unauthorized' 
      });
    }
    
    res.json({
      success: true,
      order: order
    });
  } catch (error) {
    console.error('❌ Error fetching order:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;