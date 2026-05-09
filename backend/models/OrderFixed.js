// backend/models/OrderFixed.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  items: [{
    book: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Book', 
      required: true 
    },
    qty: { 
      type: Number, 
      required: true, 
      min: 1,
      default: 1 
    },
    price: { 
      type: Number, 
      required: true 
    }
  }],
  
  // Shipping Information
  shippingInfo: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, default: 'India' }
  },
  
  // Payment Information
  paymentMethod: { 
    type: String, 
    enum: ['cod', 'credit_card', 'upi', 'paypal', 'bank_transfer'], 
    default: 'cod',
    required: true 
  },
  
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'refunded'], 
    default: 'pending' 
  },
  
  // Order Amounts
  subtotal: { type: Number, required: true },
  shippingCharge: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  
  // Order Status
  orderStatus: { 
    type: String, 
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'], 
    default: 'pending' 
  },
  
  // Dates
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// ✅ SIMPLE CORRECT middleware
orderSchema.pre('save', function(next) {
  console.log('📝 Order pre-save middleware called');
  this.updatedAt = Date.now();
  next();
});

// No other middleware - keep it simple

module.exports = mongoose.model('OrderFixed', orderSchema);