// routes/purchaseRoutes.js
const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// GET all purchases
router.get('/', async (req, res) => {
  try {
    const purchases = await Order.find({})
      .populate('user', 'name email') // Populate user info
      .populate('items.book', 'title author imageUrl price') // Populate book details
      .sort({ createdAt: -1 }) // Show newest first
      .exec();
    
    // Transform the data to match frontend expectations
    const formattedPurchases = purchases.map(order => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      date: order.formattedDate || order.createdAt.toLocaleDateString(),
      status: order.orderStatus,
      totalAmount: order.total,
      formattedTotal: order.formattedTotal,
      items: order.items.map(item => ({
        book: item.book ? {
          _id: item.book._id,
          title: item.book.title,
          author: item.book.author,
          price: item.book.price
        } : { title: 'Book not found' },
        quantity: item.qty,
        price: item.price
      })),
      user: order.user,
      shippingInfo: order.shippingInfo,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));
    
    res.json({
      success: true,
      data: formattedPurchases,
      count: purchases.length,
      message: `Found ${purchases.length} orders in database`
    });
  } catch (error) {
    console.error("❌ Error fetching purchases:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch purchase history from database",
      details: error.message
    });
  }
});

// GET purchase by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.book', 'title author imageUrl price');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found"
      });
    }
    
    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error("❌ Error fetching order:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch order details"
    });
  }
});

// DELETE all purchases (optional - for testing/clearing)
router.delete('/', async (req, res) => {
  try {
    // Optional: Add authentication/authorization check here
    const result = await Order.deleteMany({});
    
    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} purchase records from database`
    });
  } catch (error) {
    console.error("❌ Error clearing purchases:", error);
    res.status(500).json({
      success: false,
      error: "Failed to clear purchase history"
    });
  }
});

module.exports = router;