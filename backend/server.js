require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// ==============================================
// MIDDLEWARE
// ==============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==============================================
// DEBUG MIDDLEWARE - Log all requests
// ==============================================
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// ==============================================
// ROUTE IMPORTS WITH ERROR HANDLING
// ==============================================
console.log('Loading routes...');

let authRoutes, bookRoutes, orderRoutes, statsRoutes, cartRoutes, purchaseRoutes, passwordResetRoutes, checkoutRoutes;

try {
  authRoutes = require('./routes/authRoutes');
  console.log('✅ authRoutes loaded');
} catch (err) {
  console.error('❌ Failed to load authRoutes:', err.message);
  authRoutes = express.Router();
}

try {
  bookRoutes = require('./routes/bookRoutes');
  console.log('✅ bookRoutes loaded');
} catch (err) {
  console.error('❌ Failed to load bookRoutes:', err.message);
  bookRoutes = express.Router();
}

try {
  orderRoutes = require('./routes/orderRoutes');
  console.log('✅ orderRoutes loaded');
} catch (err) {
  console.error('❌ Failed to load orderRoutes:', err.message);
  orderRoutes = express.Router();
}

try {
  statsRoutes = require('./routes/statsRoutes');
  console.log('✅ statsRoutes loaded');
} catch (err) {
  console.error('❌ Failed to load statsRoutes:', err.message);
  statsRoutes = express.Router();
}

try {
  cartRoutes = require('./routes/cartRoutes');
  console.log('✅ cartRoutes loaded');
} catch (err) {
  console.error('❌ Failed to load cartRoutes:', err.message);
  cartRoutes = express.Router();
}

try {
  purchaseRoutes = require('./routes/purchaseRoutes');
  console.log('✅ purchaseRoutes loaded');
} catch (err) {
  console.error('❌ Failed to load purchaseRoutes:', err.message);
  purchaseRoutes = express.Router();
}

try {
  passwordResetRoutes = require('./routes/passwordResetRoutes');
  console.log('✅ passwordResetRoutes loaded');
} catch (err) {
  console.error('❌ Failed to load passwordResetRoutes:', err.message);
  passwordResetRoutes = express.Router();
}

try {
  checkoutRoutes = require('./routes/checkoutRoutes'); // NEW: Checkout routes
  console.log('✅ checkoutRoutes loaded');
} catch (err) {
  console.error('❌ Failed to load checkoutRoutes:', err.message);
  checkoutRoutes = express.Router();
}

// ==============================================
// ROUTE MIDDLEWARE
// ==============================================
console.log('Setting up routes...');

// Mount routes with error handling
try {
  app.use('/api/auth', authRoutes);
  console.log('✅ /api/auth route mounted');
} catch (err) {
  console.error('❌ Error mounting /api/auth:', err.message);
}

try {
  app.use('/api/books', bookRoutes);
  console.log('✅ /api/books route mounted');
} catch (err) {
  console.error('❌ Error mounting /api/books:', err.message);
}

try {
  app.use('/api/orders', orderRoutes);
  console.log('✅ /api/orders route mounted');
} catch (err) {
  console.error('❌ Error mounting /api/orders:', err.message);
}

try {
  app.use('/api/stats', statsRoutes);
  console.log('✅ /api/stats route mounted');
} catch (err) {
  console.error('❌ Error mounting /api/stats:', err.message);
}

try {
  app.use('/api/cart', cartRoutes);
  console.log('✅ /api/cart route mounted');
} catch (err) {
  console.error('❌ Error mounting /api/cart:', err.message);
}

try {
  app.use('/api/purchases', purchaseRoutes);
  console.log('✅ /api/purchases route mounted');
} catch (err) {
  console.error('❌ Error mounting /api/purchases:', err.message);
}

try {
  app.use('/api/auth', passwordResetRoutes);
  console.log('✅ /api/auth (password reset) route mounted');
} catch (err) {
  console.error('❌ Error mounting password reset routes:', err.message);
}

// NEW: Mount checkout routes
try {
  app.use('/api/checkouts', checkoutRoutes);
  console.log('✅ /api/checkouts route mounted');
} catch (err) {
  console.error('❌ Error mounting /api/checkouts:', err.message);
}

// ==============================================
// TEST ROUTES
// ==============================================
// Add a simple test route
app.get('/api/test', (req, res) => {
  res.json({
    message: 'API is working',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    routes: {
      auth: '/api/auth',
      books: '/api/books',
      orders: '/api/orders',
      stats: '/api/stats',
      cart: '/api/cart',
      purchases: '/api/purchases',
      checkouts: '/api/checkouts'
    }
  });
});

// Test checkout endpoints
app.get('/api/test-checkouts', (req, res) => {
  res.json({
    message: 'Checkout endpoints are available',
    endpoints: {
      getUserCheckouts: 'GET /api/checkouts/my-checkouts',
      getAllCheckouts: 'GET /api/checkouts',
      createCheckout: 'POST /api/checkouts',
      renewCheckout: 'PUT /api/checkouts/:id/renew',
      returnCheckout: 'PUT /api/checkouts/:id/return',
      deleteCheckout: 'DELETE /api/checkouts/:id',
      checkoutStats: 'GET /api/checkouts/stats'
    }
  });
});

// Simple health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      server: 'running'
    }
  });
});

// ==============================================
// ERROR HANDLING
// ==============================================

// 404 handler - Fixed syntax
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    method: req.method,
    availableRoutes: [
      '/api/auth',
      '/api/books',
      '/api/orders',
      '/api/stats',
      '/api/cart',
      '/api/purchases',
      '/api/checkouts',
      '/api/test',
      '/api/test-checkouts',
      '/health'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global Error Handler:', err.message);
  console.error(err.stack);
  
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// ==============================================
// DATABASE CONNECTION & SERVER START
// ==============================================
console.log('\n🚀 Starting LIBROVERSE Backend Server...');
console.log('=========================================');

// Test database connection first
console.log('\n🔗 Testing MongoDB connection...');

// Simple connection without options first
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully!");
    console.log(`📊 Database: ${mongoose.connection.db.databaseName}`);
    
    // Check if Checkout model exists
    const models = mongoose.modelNames();
    console.log(`📋 Available models: ${models.join(', ')}`);
    
    const PORT = process.env.PORT || 5000;
    
    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT}`);
      console.log('=========================================');
      console.log('\n📋 Test the server:');
      console.log(`   http://localhost:${PORT}/api/test`);
      console.log(`   http://localhost:${PORT}/api/test-checkouts`);
      console.log(`   http://localhost:${PORT}/health`);
      console.log('\n🔐 Authentication endpoints:');
      console.log(`   POST http://localhost:${PORT}/api/auth/login`);
      console.log(`   POST http://localhost:${PORT}/api/auth/register`);
      console.log(`   POST http://localhost:${PORT}/api/auth/direct-reset`);
      console.log('\n📚 Book Management endpoints:');
      console.log(`   GET  http://localhost:${PORT}/api/books`);
      console.log(`   POST http://localhost:${PORT}/api/books/add`);
      console.log('\n📖 Checkout/Borrowing endpoints:');
      console.log(`   GET  http://localhost:${PORT}/api/checkouts/my-checkouts`);
      console.log(`   POST http://localhost:${PORT}/api/checkouts`);
      console.log(`   PUT  http://localhost:${PORT}/api/checkouts/:id/renew`);
      console.log(`   PUT  http://localhost:${PORT}/api/checkouts/:id/return`);
      console.log('=========================================\n');
    });
    
    // Handle server errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error.message);
      if (error.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is already in use. Try a different port.`);
      }
    });
  })
  .catch(err => {
    console.log("\n❌ MongoDB Connection Failed!");
    console.log("Error:", err.message);
    
    console.log("\n⚠️  Starting server WITHOUT database...");
    const PORT = process.env.PORT || 5000;
    
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on port ${PORT} (NO DATABASE)`);
      console.log('⚠️  Database features will not work!');
      console.log(`\n📋 Test: http://localhost:${PORT}/api/test`);
      console.log('💡 To enable database features:');
      console.log('   1. Make sure MongoDB is running');
      console.log('   2. Check your MONGO_URI in .env file');
      console.log('   3. Restart the server');
    });
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Shutting down...');
  mongoose.connection.close();
  console.log('✅ MongoDB connection closed.');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM. Shutting down...');
  mongoose.connection.close();
  console.log('✅ MongoDB connection closed.');
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err.message);
  console.error(err.stack);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

module.exports = app;