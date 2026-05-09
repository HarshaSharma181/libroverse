// models/Checkout.js - COMPLETE FIXED VERSION
const mongoose = require('mongoose');

const checkoutSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  book: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  checkoutDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  returnDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Active', 'Renewed', 'Returned', 'Overdue', 'Cancelled'], // FIXED: Added 'Cancelled'
    default: 'Active'
  },
  renewals: {
    type: Number,
    default: 0,
    max: 2
  },
  fineAmount: {
    type: Number,
    default: 0
  },
  isLocalCheckout: {
    type: Boolean,
    default: false
  },
  localId: {
    type: String
  },
  // FIXED: Changed from String to [String] (array of strings)
  notes: {
    type: [String],
    default: []
  },
  createdBy: {
    type: String,
    default: 'User'
  }
}, {
  timestamps: true
});

// Sparse unique index - only applies when localId exists
checkoutSchema.index({ user: 1, localId: 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { localId: { $exists: true, $ne: null } }
});

// Regular indexes for performance
checkoutSchema.index({ user: 1, status: 1 });
checkoutSchema.index({ book: 1, status: 1 });
checkoutSchema.index({ dueDate: 1 });

// Pre-save middleware
checkoutSchema.pre('save', async function() {
  // Set default due date (14 days from now) if not provided
  if (this.isNew && !this.dueDate) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    this.dueDate = dueDate;
  }
  
  // For non-local checkouts, don't set localId
  if (!this.isLocalCheckout) {
    this.localId = undefined;
  }
  
  // Ensure notes is an array
  if (!this.notes || !Array.isArray(this.notes)) {
    this.notes = [];
  }
  
  // Add initial note for new checkouts
  if (this.isNew && this.notes.length === 0) {
    this.notes.push(`Checked out on ${new Date().toLocaleDateString()}`);
  }
  
  // Auto-calculate overdue status
  if (this.isModified('dueDate') || this.isNew) {
    const now = new Date();
    if (this.dueDate < now && this.status !== 'Returned' && this.status !== 'Cancelled') {
      this.status = 'Overdue';
    }
  }
});

// Static method to calculate fines
checkoutSchema.statics.calculateFine = function(dueDate) {
  const today = new Date();
  const due = new Date(dueDate);
  
  if (today <= due) return 0;
  
  const daysLate = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
  const finePerDay = 5;
  return daysLate * finePerDay;
};

// Method to check if checkout can be renewed
checkoutSchema.methods.canRenew = function() {
  if (this.status !== 'Active' && this.status !== 'Renewed' && this.status !== 'Overdue') {
    return { canRenew: false, reason: 'Book must be Active, Renewed, or Overdue to renew' };
  }
  
  if (this.renewals >= 2) {
    return { canRenew: false, reason: 'Maximum renewals (2) reached' };
  }
  
  if (this.fineAmount > 0) {
    return { canRenew: false, reason: 'Outstanding fines must be paid first' };
  }
  
  return { canRenew: true };
};

const Checkout = mongoose.model('Checkout', checkoutSchema);

module.exports = Checkout;