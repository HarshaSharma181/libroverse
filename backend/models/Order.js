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
      required: true,
      min: 0
    }
  }],
  shippingInfo: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    pincode: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      default: 'India',
      trim: true
    }
  },
  paymentMethod: {
    type: String,
    enum: ['cod', 'credit_card', 'debit_card', 'upi', 'netbanking'],
    default: 'cod'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentDetails: {
    transactionId: String,
    paymentId: String,
    paymentSignature: String,
    paymentDate: Date
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  shippingCharge: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  taxAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  },
  orderNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  trackingNumber: String,
  estimatedDelivery: Date,
  deliveredAt: Date,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ✅ FIXED: CORRECT Middleware - with next parameter
orderSchema.pre('save', function(next) {
  // Update timestamps
  if (this.isNew) {
    this.createdAt = new Date();
  }
  this.updatedAt = new Date();
  
  // Generate order number if not present
  if (this.isNew && !this.orderNumber) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    this.orderNumber = `ORD-${timestamp}-${random}`;
  }
  
  next(); // ✅ IMPORTANT: Always call next()
});

// ✅ Alternative async middleware (if needed)
orderSchema.pre('save', async function(next) {
  try {
    // If you need async operations, do them here
    // Example: await someAsyncFunction();
    
    next(); // ✅ Call next() when done
  } catch (error) {
    next(error); // ✅ Pass errors to next()
  }
});

// Virtual for formatted total
orderSchema.virtual('formattedTotal').get(function() {
  return `₹${this.total.toFixed(2)}`;
});

// Virtual for formatted date
orderSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
});

// Indexes for better query performance
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 }, { unique: true, sparse: true });
orderSchema.index({ 'shippingInfo.email': 1 });
orderSchema.index({ orderStatus: 1 });
orderSchema.index({ createdAt: -1 });

// Static method to find orders by user
orderSchema.statics.findByUser = function(userId) {
  return this.find({ user: userId })
    .populate('items.book', 'title author imageUrl price')
    .sort({ createdAt: -1 });
};

// Instance method to get order summary
orderSchema.methods.getSummary = function() {
  return {
    orderId: this._id,
    orderNumber: this.orderNumber,
    total: this.total,
    status: this.orderStatus,
    itemCount: this.items.length,
    createdAt: this.createdAt
  };
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;