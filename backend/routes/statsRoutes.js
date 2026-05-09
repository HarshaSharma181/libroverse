const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const Book = require('../models/Book');
const { auth, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// admin stats: total users, total revenue, total purchases
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const usersCount = await User.countDocuments();
    const booksCount = await Book.countDocuments();
    const orders = await Order.find();
    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const totalPurchases = orders.length;
    res.json({ usersCount, booksCount, totalRevenue, totalPurchases });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching stats', error: err.message });
  }
});

module.exports = router;
